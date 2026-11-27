import React, { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Home,
  Phone,
  Mail,
  Tag,
  Package,
  ShoppingCart,
  Flame,
  Plus,
  Trash2,
  Save,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Download,
  Shield,
  ToggleLeft,
  ToggleRight,
} from 'lucide-react';
import { api } from '../lib/api';
import type {
  AdminEmail,
  AuthUser,
  ContactSettings,
  Coupon,
  FirebaseConfig,
  HomePageSettings,
  Order,
  Product,
  Subscriber,
} from '../types';

interface AdminPanelProps {
  user: AuthUser | null;
  homeSettings: HomePageSettings;
  contact: ContactSettings;
  firebaseConfig: FirebaseConfig;
  products: Product[];
  firebaseConnected: boolean;
  onExitAdmin: () => void;
  onOpenAuth: () => void;
  onRefreshStore: () => Promise<void>;
}

type TabKey = 'overview' | 'home' | 'contact' | 'emails' | 'coupons' | 'products' | 'orders' | 'firebase';

const IMAGE_PRESETS = [
  { label: 'Hero Skincare Collection', url: '/images/hero-skincare.jpg' },
  { label: 'Editorial Beauty Portrait', url: '/images/secondary-beauty.jpg' },
  { label: 'Brightening Serum', url: '/images/brightening-serum.jpg' },
  { label: 'Night Repair Serum', url: '/images/night-repair-serum.jpg' },
  { label: 'Skincare Combo Bundle', url: '/images/combo-bundle.jpg' },
  { label: 'Peach Body Butter', url: '/images/body-butter.jpg' },
  { label: 'Botanical Hair Oil', url: '/images/hair-care.jpg' },
  { label: 'Vitamin C Clay Mask', url: '/images/clay-mask.jpg' },
  { label: 'Rose Lip & Cheek Tint', url: '/images/lip-tint.jpg' },
  { label: 'Cleanser & Toner Duo', url: '/images/cleanser-toner.jpg' },
];

export const AdminPanel: React.FC<AdminPanelProps> = ({
  user,
  homeSettings,
  contact,
  firebaseConfig,
  products,
  firebaseConnected,
  onExitAdmin,
  onOpenAuth,
  onRefreshStore,
}) => {
  const [tab, setTab] = useState<TabKey>('overview');
  const [statusMsg, setStatusMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Forms state
  const [homeForm, setHomeForm] = useState<HomePageSettings>(homeSettings);
  const [contactForm, setContactForm] = useState<ContactSettings>(contact);
  const [fbForm, setFbForm] = useState<FirebaseConfig>(firebaseConfig);
  const [fbSnippet, setFbSnippet] = useState('');

  // Lists state
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [adminEmails, setAdminEmails] = useState<AdminEmail[]>([]);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);

  // Email add forms
  const [newSubEmail, setNewSubEmail] = useState('');
  const [newSubName, setNewSubName] = useState('');
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminRole, setNewAdminRole] = useState('Manager');

  // Coupon add form
  const [newCoupon, setNewCoupon] = useState({
    code: '',
    type: 'percent' as 'percent' | 'fixed',
    value: 15,
    min_order: 1500,
    max_uses: 100,
    expires_at: '2027-12-31',
    description: '',
  });

  // Product add form
  const [newProduct, setNewProduct] = useState({
    name: '',
    category: 'Face Care',
    concern: 'Glow',
    price: 1799,
    compare_at_price: 3500,
    size: '30 ML',
    badge: 'NEW',
    is_bestseller: 1,
    is_bundle: 0,
    image: '/images/brightening-serum.jpg',
    description: '',
    ingredients: 'Niacinamide, Hyaluronic Acid, Botanical Extracts',
    how_to_use: 'Apply 3-4 drops morning and night on clean skin.',
  });

  const adminEmail = user?.email || '';

  useEffect(() => {
    setHomeForm(homeSettings);
  }, [homeSettings]);

  useEffect(() => {
    setContactForm(contact);
  }, [contact]);

  useEffect(() => {
    setFbForm(firebaseConfig);
  }, [firebaseConfig]);

  const loadAdminData = async () => {
    if (!user?.isAdmin) return;
    try {
      const [emailsRes, couponsRes, ordersRes] = await Promise.all([
        api.getEmails(adminEmail),
        api.getCoupons(adminEmail),
        api.getOrders(adminEmail),
      ]);
      setSubscribers(emailsRes.subscribers);
      setAdminEmails(emailsRes.adminEmails);
      setCoupons(couponsRes.coupons);
      setOrders(ordersRes.orders);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, [user?.email, user?.isAdmin]);

  const flash = (type: 'ok' | 'err', text: string) => {
    setStatusMsg({ type, text });
    setTimeout(() => setStatusMsg(null), 4000);
  };

  if (!user || !user.isAdmin) {
    return (
      <div className="min-h-screen bg-[#FAF7F2] px-4 py-16">
        <div className="mx-auto max-w-lg rounded-3xl border border-[#E5DDD0] bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#8E4A34]/15 text-[#8E4A34]">
            <Shield className="h-7 w-7" />
          </div>
          <h1 className="mt-4 font-serif-editorial text-3xl font-semibold text-[#1F1815]">
            {contact.brandName} Admin Panel
          </h1>
          <p className="mt-2 text-sm text-[#6B5D54]">
            {user
              ? `Signed in as ${user.email}, which is not on the authorized admin list.`
              : 'Sign in with an authorized admin email (e.g. ' + contact.email + ') to manage your storefront, home page, coupons, emails, and contact details.'}
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <button
              onClick={onOpenAuth}
              className="rounded-full bg-[#1F1815] px-7 py-3 text-xs font-semibold uppercase tracking-wider text-white hover:bg-[#8E4A34]"
            >
              Sign In to Admin
            </button>
            <button
              onClick={onExitAdmin}
              className="rounded-full border border-[#DDD3C4] px-7 py-3 text-xs font-semibold uppercase tracking-wider text-[#1F1815] hover:bg-[#F3ECE1]"
            >
              Back to Store
            </button>
          </div>
        </div>
      </div>
    );
  }

  const handleSaveHome = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.updateHomePage(homeForm, adminEmail);
      await onRefreshStore();
      flash('ok', 'Home page updated and published live!');
    } catch (err: unknown) {
      flash('err', err instanceof Error ? err.message : 'Failed to save home page');
    }
  };

  const handleSaveContact = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.updateContact(contactForm, adminEmail);
      await onRefreshStore();
      flash('ok', 'Brand & contact details saved!');
    } catch (err: unknown) {
      flash('err', err instanceof Error ? err.message : 'Failed to save contact details');
    }
  };

  const handleAddSubscriber = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.addSubscriber(newSubEmail, newSubName, adminEmail);
      setSubscribers(res.subscribers);
      setNewSubEmail('');
      setNewSubName('');
      flash('ok', 'Subscriber email added!');
    } catch (err: unknown) {
      flash('err', err instanceof Error ? err.message : 'Failed to add email');
    }
  };

  const handleAddAdminEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.addAdminEmail(newAdminEmail, newAdminRole, adminEmail);
      setAdminEmails(res.adminEmails);
      setNewAdminEmail('');
      flash('ok', 'Authorized admin email added!');
    } catch (err: unknown) {
      flash('err', err instanceof Error ? err.message : 'Failed to add admin email');
    }
  };

  const handleExportCsv = () => {
    const csv = ['Email,Name,Source,Created At']
      .concat(subscribers.map((s) => `"${s.email}","${s.name}","${s.source}","${s.created_at}"`))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${contact.brandName.toLowerCase()}-subscribers.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.createCoupon(newCoupon, adminEmail);
      setCoupons(res.coupons);
      setNewCoupon({
        code: '',
        type: 'percent',
        value: 15,
        min_order: 1500,
        max_uses: 100,
        expires_at: '2027-12-31',
        description: '',
      });
      await onRefreshStore();
      flash('ok', 'Coupon code created!');
    } catch (err: unknown) {
      flash('err', err instanceof Error ? err.message : 'Failed to create coupon');
    }
  };

  const handleToggleCoupon = async (c: Coupon) => {
    try {
      const res = await api.updateCoupon(c.id, { active: c.active ? 0 : 1 }, adminEmail);
      setCoupons(res.coupons);
      await onRefreshStore();
    } catch (err: unknown) {
      flash('err', err instanceof Error ? err.message : 'Could not update coupon');
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createProduct(newProduct, adminEmail);
      await onRefreshStore();
      setNewProduct({
        ...newProduct,
        name: '',
        description: '',
      });
      flash('ok', 'Product added to catalog!');
    } catch (err: unknown) {
      flash('err', err instanceof Error ? err.message : 'Failed to add product');
    }
  };

  const parseFirebaseSnippet = () => {
    try {
      const extract = (key: string) => {
        const match = fbSnippet.match(new RegExp(`["']?${key}["']?\\s*:\\s*["']([^"']+)["']`));
        return match ? match[1] : '';
      };
      const parsed: FirebaseConfig = {
        apiKey: extract('apiKey') || fbForm.apiKey,
        authDomain: extract('authDomain') || fbForm.authDomain,
        projectId: extract('projectId') || fbForm.projectId,
        storageBucket: extract('storageBucket') || fbForm.storageBucket,
        messagingSenderId: extract('messagingSenderId') || fbForm.messagingSenderId,
        appId: extract('appId') || fbForm.appId,
        measurementId: extract('measurementId') || fbForm.measurementId || '',
      };
      setFbForm(parsed);
      flash('ok', 'Parsed Firebase config! Click "Save & Connect Firebase" to activate.');
    } catch {
      flash('err', 'Could not parse snippet. Please enter the fields manually.');
    }
  };

  const handleSaveFirebase = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.updateFirebaseConfig(fbForm, adminEmail);
      await onRefreshStore();
      flash('ok', 'Firebase config saved! Firebase Auth is now initialized.');
    } catch (err: unknown) {
      flash('err', err instanceof Error ? err.message : 'Failed to save Firebase config');
    }
  };

  const totalRevenue = orders.reduce((sum, o) => sum + o.total, 0);

  const navItems: { key: TabKey; label: string; icon: React.ReactNode }[] = [
    { key: 'overview', label: 'Overview', icon: <LayoutDashboard className="h-4 w-4" /> },
    { key: 'home', label: 'Home Page', icon: <Home className="h-4 w-4" /> },
    { key: 'contact', label: 'Contact & Brand', icon: <Phone className="h-4 w-4" /> },
    { key: 'emails', label: 'Emails & Admins', icon: <Mail className="h-4 w-4" /> },
    { key: 'coupons', label: 'Coupon Codes', icon: <Tag className="h-4 w-4" /> },
    { key: 'products', label: 'Products', icon: <Package className="h-4 w-4" /> },
    { key: 'orders', label: 'Orders', icon: <ShoppingCart className="h-4 w-4" /> },
    { key: 'firebase', label: 'Firebase Login', icon: <Flame className="h-4 w-4" /> },
  ];

  return (
    <div className="min-h-screen w-full overflow-x-clip bg-[#F6F1E9]">
      {/* Admin Top Bar */}
      <header className="sticky top-0 z-30 border-b border-[#E5DDD0] bg-white/95 backdrop-blur-xs">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={onExitAdmin}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#DDD3C4] px-3.5 py-1.5 text-xs font-semibold text-[#1F1815] transition hover:bg-[#F3ECE1]"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Storefront
            </button>
            <div>
              <h1 className="font-serif-editorial text-2xl font-semibold text-[#1F1815]">
                {contactForm.brandName} Admin
              </h1>
              <p className="text-xs text-[#6B5D54]">Signed in as {user.email}</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span
              className={`hidden items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold sm:inline-flex ${
                firebaseConnected ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}
            >
              <Flame className="h-3.5 w-3.5" />
              {firebaseConnected ? 'Firebase Active' : 'Firebase Setup Pending'}
            </span>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[240px_1fr]">
        {/* Sidebar */}
        <aside className="flex gap-1.5 overflow-x-auto pb-2 lg:flex-col lg:pb-0">
          {navItems.map((item) => (
            <button
              key={item.key}
              onClick={() => setTab(item.key)}
              className={`flex shrink-0 items-center gap-2.5 rounded-2xl px-4 py-3 text-left text-sm font-medium transition ${
                tab === item.key
                  ? 'bg-[#1F1815] text-white shadow-xs'
                  : 'bg-white/80 text-[#4F433B] hover:bg-white'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </aside>

        {/* Main Content */}
        <main className="min-w-0 space-y-6">
          {statusMsg && (
            <div
              className={`flex items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-medium ${
                statusMsg.type === 'ok'
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                  : 'border-red-200 bg-red-50 text-red-700'
              }`}
            >
              {statusMsg.type === 'ok' ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              <span>{statusMsg.text}</span>
            </div>
          )}

          {/* OVERVIEW */}
          {tab === 'overview' && (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl border border-[#E5DDD0] bg-white p-5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#8E7F75]">Total Revenue</p>
                  <p className="mt-2 font-serif-editorial text-3xl font-semibold text-[#1F1815]">
                    Rs. {totalRevenue.toLocaleString()}
                  </p>
                  <p className="mt-1 text-xs text-[#6B5D54]">{orders.length} order(s) recorded</p>
                </div>
                <div className="rounded-2xl border border-[#E5DDD0] bg-white p-5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#8E7F75]">Products</p>
                  <p className="mt-2 font-serif-editorial text-3xl font-semibold text-[#1F1815]">{products.length}</p>
                  <p className="mt-1 text-xs text-[#6B5D54]">Live in storefront</p>
                </div>
                <div className="rounded-2xl border border-[#E5DDD0] bg-white p-5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#8E7F75]">Active Coupons</p>
                  <p className="mt-2 font-serif-editorial text-3xl font-semibold text-[#1F1815]">
                    {coupons.filter((c) => c.active).length}
                  </p>
                  <p className="mt-1 text-xs text-[#6B5D54]">{coupons.length} total coupon codes</p>
                </div>
                <div className="rounded-2xl border border-[#E5DDD0] bg-white p-5">
                  <p className="text-xs font-semibold uppercase tracking-wider text-[#8E7F75]">Email List</p>
                  <p className="mt-2 font-serif-editorial text-3xl font-semibold text-[#1F1815]">
                    {subscribers.length}
                  </p>
                  <p className="mt-1 text-xs text-[#6B5D54]">{adminEmails.length} authorized admins</p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-[#E5DDD0] bg-white p-6">
                  <h3 className="font-serif-editorial text-2xl font-semibold">Quick Actions</h3>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <button
                      onClick={() => setTab('home')}
                      className="rounded-xl border border-[#E5DDD0] bg-[#FAF7F2] p-3.5 text-left text-xs font-semibold hover:border-[#8E4A34]"
                    >
                      Edit Home Page Hero & Banners
                    </button>
                    <button
                      onClick={() => setTab('coupons')}
                      className="rounded-xl border border-[#E5DDD0] bg-[#FAF7F2] p-3.5 text-left text-xs font-semibold hover:border-[#8E4A34]"
                    >
                      Create Coupon Code
                    </button>
                    <button
                      onClick={() => setTab('emails')}
                      className="rounded-xl border border-[#E5DDD0] bg-[#FAF7F2] p-3.5 text-left text-xs font-semibold hover:border-[#8E4A34]"
                    >
                      Add Emails & Admins
                    </button>
                    <button
                      onClick={() => setTab('firebase')}
                      className="rounded-xl border border-[#E5DDD0] bg-[#FAF7F2] p-3.5 text-left text-xs font-semibold hover:border-[#8E4A34]"
                    >
                      Connect Firebase Login
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl border border-[#E5DDD0] bg-white p-6">
                  <h3 className="font-serif-editorial text-2xl font-semibold">Current Brand Info</h3>
                  <dl className="mt-3 space-y-2 text-sm">
                    <div className="flex justify-between">
                      <dt className="text-[#6B5D54]">Brand Name</dt>
                      <dd className="font-semibold">{contactForm.brandName}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-[#6B5D54]">Email</dt>
                      <dd className="font-semibold">{contactForm.email}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-[#6B5D54]">Phone / WhatsApp</dt>
                      <dd className="font-semibold">{contactForm.phone}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-[#6B5D54]">Free Shipping Over</dt>
                      <dd className="font-semibold">Rs. {homeForm.freeShippingThreshold.toLocaleString()}</dd>
                    </div>
                  </dl>
                </div>
              </div>
            </div>
          )}

          {/* HOME PAGE EDITOR */}
          {tab === 'home' && (
            <form onSubmit={handleSaveHome} className="space-y-6 rounded-2xl border border-[#E5DDD0] bg-white p-6">
              <div className="flex items-center justify-between border-b border-[#F0E9DD] pb-4">
                <div>
                  <h2 className="font-serif-editorial text-2xl font-semibold">Edit Home Page</h2>
                  <p className="text-xs text-[#6B5D54]">Changes update your live storefront immediately.</p>
                </div>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-full bg-[#1F1815] px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-white hover:bg-[#8E4A34]"
                >
                  <Save className="h-3.5 w-3.5" /> Save & Publish
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <div className="md:col-span-2">
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[#5C4E45]">
                    Top Announcement Bar Text
                  </label>
                  <input
                    type="text"
                    value={homeForm.announcementText}
                    onChange={(e) => setHomeForm({ ...homeForm, announcementText: e.target.value })}
                    className="w-full rounded-xl border border-[#DDD3C4] px-3.5 py-2.5 text-sm outline-none focus:border-[#8E4A34]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[#5C4E45]">
                    Free Shipping Threshold (PKR)
                  </label>
                  <input
                    type="number"
                    value={homeForm.freeShippingThreshold}
                    onChange={(e) => setHomeForm({ ...homeForm, freeShippingThreshold: Number(e.target.value) })}
                    className="w-full rounded-xl border border-[#DDD3C4] px-3.5 py-2.5 text-sm outline-none focus:border-[#8E4A34]"
                  />
                </div>
              </div>

              <div className="border-t border-[#F0E9DD] pt-4">
                <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-[#8E4A34]">Hero Section</h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-[#5C4E45]">Eyebrow Label</label>
                    <input
                      type="text"
                      value={homeForm.heroEyebrow}
                      onChange={(e) => setHomeForm({ ...homeForm, heroEyebrow: e.target.value })}
                      className="w-full rounded-xl border border-[#DDD3C4] px-3.5 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-[#5C4E45]">Hero Headline</label>
                    <input
                      type="text"
                      value={homeForm.heroTitle}
                      onChange={(e) => setHomeForm({ ...homeForm, heroTitle: e.target.value })}
                      className="w-full rounded-xl border border-[#DDD3C4] px-3.5 py-2 text-sm"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-xs font-semibold text-[#5C4E45]">Hero Subtitle</label>
                    <textarea
                      rows={2}
                      value={homeForm.heroSubtitle}
                      onChange={(e) => setHomeForm({ ...homeForm, heroSubtitle: e.target.value })}
                      className="w-full rounded-xl border border-[#DDD3C4] px-3.5 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-[#5C4E45]">Primary CTA Button</label>
                    <input
                      type="text"
                      value={homeForm.heroPrimaryCta}
                      onChange={(e) => setHomeForm({ ...homeForm, heroPrimaryCta: e.target.value })}
                      className="w-full rounded-xl border border-[#DDD3C4] px-3.5 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-[#5C4E45]">Secondary CTA Button</label>
                    <input
                      type="text"
                      value={homeForm.heroSecondaryCta}
                      onChange={(e) => setHomeForm({ ...homeForm, heroSecondaryCta: e.target.value })}
                      className="w-full rounded-xl border border-[#DDD3C4] px-3.5 py-2 text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-[#F0E9DD] pt-4">
                <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-[#8E4A34]">
                  Editorial Story Banner
                </h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-[#5C4E45]">Banner Headline</label>
                    <input
                      type="text"
                      value={homeForm.bannerTitle}
                      onChange={(e) => setHomeForm({ ...homeForm, bannerTitle: e.target.value })}
                      className="w-full rounded-xl border border-[#DDD3C4] px-3.5 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-[#5C4E45]">Banner CTA</label>
                    <input
                      type="text"
                      value={homeForm.bannerCta}
                      onChange={(e) => setHomeForm({ ...homeForm, bannerCta: e.target.value })}
                      className="w-full rounded-xl border border-[#DDD3C4] px-3.5 py-2 text-sm"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="mb-1 block text-xs font-semibold text-[#5C4E45]">Banner Description</label>
                    <textarea
                      rows={2}
                      value={homeForm.bannerSubtitle}
                      onChange={(e) => setHomeForm({ ...homeForm, bannerSubtitle: e.target.value })}
                      className="w-full rounded-xl border border-[#DDD3C4] px-3.5 py-2 text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-[#F0E9DD] pt-4">
                <h3 className="mb-3 text-sm font-bold uppercase tracking-wider text-[#8E4A34]">
                  Featured Serum Spotlight
                </h3>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-[#5C4E45]">Spotlight Title</label>
                    <input
                      type="text"
                      value={homeForm.spotlightTitle}
                      onChange={(e) => setHomeForm({ ...homeForm, spotlightTitle: e.target.value })}
                      className="w-full rounded-xl border border-[#DDD3C4] px-3.5 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-[#5C4E45]">Spotlight Subtitle</label>
                    <input
                      type="text"
                      value={homeForm.spotlightSubtitle}
                      onChange={(e) => setHomeForm({ ...homeForm, spotlightSubtitle: e.target.value })}
                      className="w-full rounded-xl border border-[#DDD3C4] px-3.5 py-2 text-sm"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-[#F0E9DD] pt-4">
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-[#8E4A34]">FAQs</h3>
                  <button
                    type="button"
                    onClick={() =>
                      setHomeForm({
                        ...homeForm,
                        faqs: [
                          ...homeForm.faqs,
                          { id: `faq-${Date.now()}`, question: 'New Question', answer: 'Answer here...' },
                        ],
                      })
                    }
                    className="inline-flex items-center gap-1 rounded-full bg-[#F3ECE1] px-3 py-1 text-xs font-semibold text-[#1F1815]"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add FAQ
                  </button>
                </div>
                <div className="space-y-3">
                  {homeForm.faqs.map((faq, idx) => (
                    <div key={faq.id} className="rounded-xl border border-[#E5DDD0] bg-[#FAF7F2] p-3.5">
                      <div className="flex items-center gap-2">
                        <input
                          type="text"
                          value={faq.question}
                          onChange={(e) => {
                            const updated = [...homeForm.faqs];
                            updated[idx] = { ...faq, question: e.target.value };
                            setHomeForm({ ...homeForm, faqs: updated });
                          }}
                          className="flex-1 rounded-lg border border-[#DDD3C4] bg-white px-3 py-1.5 text-sm font-medium"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setHomeForm({
                              ...homeForm,
                              faqs: homeForm.faqs.filter((f) => f.id !== faq.id),
                            })
                          }
                          className="rounded-lg p-1.5 text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <textarea
                        rows={2}
                        value={faq.answer}
                        onChange={(e) => {
                          const updated = [...homeForm.faqs];
                          updated[idx] = { ...faq, answer: e.target.value };
                          setHomeForm({ ...homeForm, faqs: updated });
                        }}
                        className="mt-2 w-full rounded-lg border border-[#DDD3C4] bg-white px-3 py-1.5 text-xs text-[#4F433B]"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </form>
          )}

          {/* CONTACT DETAILS EDITOR */}
          {tab === 'contact' && (
            <form onSubmit={handleSaveContact} className="space-y-5 rounded-2xl border border-[#E5DDD0] bg-white p-6">
              <div className="flex items-center justify-between border-b border-[#F0E9DD] pb-4">
                <div>
                  <h2 className="font-serif-editorial text-2xl font-semibold">Edit Brand & Contact Details</h2>
                  <p className="text-xs text-[#6B5D54]">Updates header, footer, WhatsApp button & order support.</p>
                </div>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-full bg-[#1F1815] px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-white hover:bg-[#8E4A34]"
                >
                  <Save className="h-3.5 w-3.5" /> Save Contact
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[#5C4E45]">
                    Brand Name
                  </label>
                  <input
                    type="text"
                    value={contactForm.brandName}
                    onChange={(e) => setContactForm({ ...contactForm, brandName: e.target.value })}
                    className="w-full rounded-xl border border-[#DDD3C4] px-3.5 py-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[#5C4E45]">
                    Tagline
                  </label>
                  <input
                    type="text"
                    value={contactForm.tagline}
                    onChange={(e) => setContactForm({ ...contactForm, tagline: e.target.value })}
                    className="w-full rounded-xl border border-[#DDD3C4] px-3.5 py-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[#5C4E45]">
                    Support Email
                  </label>
                  <input
                    type="email"
                    value={contactForm.email}
                    onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                    className="w-full rounded-xl border border-[#DDD3C4] px-3.5 py-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[#5C4E45]">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    value={contactForm.phone}
                    onChange={(e) => setContactForm({ ...contactForm, phone: e.target.value })}
                    className="w-full rounded-xl border border-[#DDD3C4] px-3.5 py-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[#5C4E45]">
                    WhatsApp Number
                  </label>
                  <input
                    type="text"
                    value={contactForm.whatsapp}
                    onChange={(e) => setContactForm({ ...contactForm, whatsapp: e.target.value })}
                    className="w-full rounded-xl border border-[#DDD3C4] px-3.5 py-2.5 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[#5C4E45]">
                    Instagram Handle
                  </label>
                  <input
                    type="text"
                    value={contactForm.instagram}
                    onChange={(e) => setContactForm({ ...contactForm, instagram: e.target.value })}
                    className="w-full rounded-xl border border-[#DDD3C4] px-3.5 py-2.5 text-sm"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[#5C4E45]">
                    Business Location / Address
                  </label>
                  <input
                    type="text"
                    value={contactForm.address}
                    onChange={(e) => setContactForm({ ...contactForm, address: e.target.value })}
                    className="w-full rounded-xl border border-[#DDD3C4] px-3.5 py-2.5 text-sm"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[#5C4E45]">
                    Shipping Policy
                  </label>
                  <textarea
                    rows={2}
                    value={contactForm.shippingPolicy}
                    onChange={(e) => setContactForm({ ...contactForm, shippingPolicy: e.target.value })}
                    className="w-full rounded-xl border border-[#DDD3C4] px-3.5 py-2 text-sm"
                  />
                </div>
              </div>
            </form>
          )}

          {/* EMAILS & ADMINS */}
          {tab === 'emails' && (
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Newsletter / Customer Emails */}
              <div className="rounded-2xl border border-[#E5DDD0] bg-white p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-serif-editorial text-2xl font-semibold">Subscriber Emails</h2>
                    <p className="text-xs text-[#6B5D54]">Add customer or marketing emails manually.</p>
                  </div>
                  <button
                    onClick={handleExportCsv}
                    className="inline-flex items-center gap-1.5 rounded-full border border-[#DDD3C4] px-3 py-1.5 text-xs font-semibold hover:bg-[#F3ECE1]"
                  >
                    <Download className="h-3.5 w-3.5" /> CSV
                  </button>
                </div>

                <form onSubmit={handleAddSubscriber} className="mt-4 space-y-2.5">
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="email"
                      required
                      placeholder="customer@email.com"
                      value={newSubEmail}
                      onChange={(e) => setNewSubEmail(e.target.value)}
                      className="rounded-xl border border-[#DDD3C4] px-3 py-2 text-sm"
                    />
                    <input
                      type="text"
                      placeholder="Name (optional)"
                      value={newSubName}
                      onChange={(e) => setNewSubName(e.target.value)}
                      className="rounded-xl border border-[#DDD3C4] px-3 py-2 text-sm"
                    />
                  </div>
                  <button
                    type="submit"
                    className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#1F1815] py-2.5 text-xs font-semibold uppercase tracking-wider text-white hover:bg-[#8E4A34]"
                  >
                    <Plus className="h-3.5 w-3.5" /> Add Email to List
                  </button>
                </form>

                <div className="mt-5 max-h-80 space-y-2 overflow-y-auto">
                  {subscribers.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between rounded-xl border border-[#F0E9DD] bg-[#FAF7F2] px-3.5 py-2.5 text-sm"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-[#1F1815]">{s.email}</p>
                        <p className="text-xs text-[#8E7F75]">
                          {s.name || 'Subscriber'} • {s.source}
                        </p>
                      </div>
                      <button
                        onClick={async () => {
                          const res = await api.deleteSubscriber(s.id, adminEmail);
                          setSubscribers(res.subscribers);
                        }}
                        className="rounded-lg p-1.5 text-[#8E7F75] hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Authorized Admin Emails */}
              <div className="rounded-2xl border border-[#E5DDD0] bg-white p-6">
                <h2 className="font-serif-editorial text-2xl font-semibold">Authorized Admin Emails</h2>
                <p className="text-xs text-[#6B5D54]">
                  Emails listed here get Admin Panel access after logging in with Firebase.
                </p>

                <form onSubmit={handleAddAdminEmail} className="mt-4 space-y-2.5">
                  <div className="grid grid-cols-[1fr_120px] gap-2">
                    <input
                      type="email"
                      required
                      placeholder="admin@email.com"
                      value={newAdminEmail}
                      onChange={(e) => setNewAdminEmail(e.target.value)}
                      className="rounded-xl border border-[#DDD3C4] px-3 py-2 text-sm"
                    />
                    <select
                      value={newAdminRole}
                      onChange={(e) => setNewAdminRole(e.target.value)}
                      className="rounded-xl border border-[#DDD3C4] px-2.5 py-2 text-sm"
                    >
                      <option value="Owner">Owner</option>
                      <option value="Manager">Manager</option>
                      <option value="Editor">Editor</option>
                    </select>
                  </div>
                  <button
                    type="submit"
                    className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-[#8E4A34] py-2.5 text-xs font-semibold uppercase tracking-wider text-white hover:bg-[#753B28]"
                  >
                    <Plus className="h-3.5 w-3.5" /> Authorize Admin Email
                  </button>
                </form>

                <div className="mt-5 space-y-2">
                  {adminEmails.map((a) => (
                    <div
                      key={a.id}
                      className="flex items-center justify-between rounded-xl border border-[#F0E9DD] bg-[#FAF7F2] px-3.5 py-2.5 text-sm"
                    >
                      <div>
                        <p className="font-semibold text-[#1F1815]">{a.email}</p>
                        <p className="text-xs text-[#8E4A34]">{a.role}</p>
                      </div>
                      <button
                        onClick={async () => {
                          try {
                            const res = await api.deleteAdminEmail(a.id, adminEmail);
                            setAdminEmails(res.adminEmails);
                          } catch (err: unknown) {
                            flash('err', err instanceof Error ? err.message : 'Cannot remove admin');
                          }
                        }}
                        className="rounded-lg p-1.5 text-[#8E7F75] hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* COUPON CODES */}
          {tab === 'coupons' && (
            <div className="space-y-6">
              <form onSubmit={handleCreateCoupon} className="rounded-2xl border border-[#E5DDD0] bg-white p-6">
                <h2 className="font-serif-editorial text-2xl font-semibold">Create New Coupon Code</h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-[#5C4E45]">Code *</label>
                    <input
                      type="text"
                      required
                      placeholder="EID20"
                      value={newCoupon.code}
                      onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase() })}
                      className="w-full rounded-xl border border-[#DDD3C4] px-3 py-2 text-sm uppercase"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-[#5C4E45]">Discount Type</label>
                    <select
                      value={newCoupon.type}
                      onChange={(e) => setNewCoupon({ ...newCoupon, type: e.target.value as 'percent' | 'fixed' })}
                      className="w-full rounded-xl border border-[#DDD3C4] px-3 py-2 text-sm"
                    >
                      <option value="percent">Percentage (%)</option>
                      <option value="fixed">Fixed Amount (PKR)</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-[#5C4E45]">
                      Value ({newCoupon.type === 'percent' ? '%' : 'PKR'}) *
                    </label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={newCoupon.value}
                      onChange={(e) => setNewCoupon({ ...newCoupon, value: Number(e.target.value) })}
                      className="w-full rounded-xl border border-[#DDD3C4] px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-[#5C4E45]">Min Order (PKR)</label>
                    <input
                      type="number"
                      min={0}
                      value={newCoupon.min_order}
                      onChange={(e) => setNewCoupon({ ...newCoupon, min_order: Number(e.target.value) })}
                      className="w-full rounded-xl border border-[#DDD3C4] px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-[#5C4E45]">Max Uses</label>
                    <input
                      type="number"
                      min={1}
                      value={newCoupon.max_uses}
                      onChange={(e) => setNewCoupon({ ...newCoupon, max_uses: Number(e.target.value) })}
                      className="w-full rounded-xl border border-[#DDD3C4] px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-[#5C4E45]">Expires On</label>
                    <input
                      type="date"
                      value={newCoupon.expires_at}
                      onChange={(e) => setNewCoupon({ ...newCoupon, expires_at: e.target.value })}
                      className="w-full rounded-xl border border-[#DDD3C4] px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs font-semibold text-[#5C4E45]">Description</label>
                    <input
                      type="text"
                      placeholder="Festive skincare discount"
                      value={newCoupon.description}
                      onChange={(e) => setNewCoupon({ ...newCoupon, description: e.target.value })}
                      className="w-full rounded-xl border border-[#DDD3C4] px-3 py-2 text-sm"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#1F1815] px-6 py-2.5 text-xs font-semibold uppercase tracking-wider text-white hover:bg-[#8E4A34]"
                >
                  <Plus className="h-3.5 w-3.5" /> Create Coupon
                </button>
              </form>

              <div className="rounded-2xl border border-[#E5DDD0] bg-white p-6">
                <h3 className="font-serif-editorial text-2xl font-semibold">All Coupon Codes</h3>
                <div className="mt-4 space-y-3">
                  {coupons.map((c) => (
                    <div
                      key={c.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#F0E9DD] bg-[#FAF7F2] p-4"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="rounded-lg bg-[#1F1815] px-2.5 py-1 text-xs font-bold tracking-wider text-white">
                            {c.code}
                          </span>
                          <span className="text-sm font-semibold text-[#8E4A34]">
                            {c.type === 'percent' ? `${c.value}% OFF` : `Rs. ${c.value} OFF`}
                          </span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                              c.active ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-200 text-gray-600'
                            }`}
                          >
                            {c.active ? 'Active' : 'Paused'}
                          </span>
                        </div>
                        <p className="mt-1 text-xs text-[#6B5D54]">
                          {c.description || 'Storewide promo'} • Min order Rs. {c.min_order.toLocaleString()} • Used{' '}
                          {c.used_count}
                          {c.max_uses ? `/${c.max_uses}` : ''} times
                          {c.expires_at ? ` • Expires ${c.expires_at}` : ''}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleToggleCoupon(c)}
                          className="rounded-lg p-1.5 text-[#5C4E45] hover:bg-white"
                          title="Toggle Active"
                        >
                          {c.active ? (
                            <ToggleRight className="h-6 w-6 text-emerald-600" />
                          ) : (
                            <ToggleLeft className="h-6 w-6 text-gray-400" />
                          )}
                        </button>
                        <button
                          onClick={async () => {
                            const res = await api.deleteCoupon(c.id, adminEmail);
                            setCoupons(res.coupons);
                            await onRefreshStore();
                          }}
                          className="rounded-lg p-1.5 text-red-600 hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* PRODUCTS */}
          {tab === 'products' && (
            <div className="space-y-6">
              <form onSubmit={handleCreateProduct} className="rounded-2xl border border-[#E5DDD0] bg-white p-6">
                <h2 className="font-serif-editorial text-2xl font-semibold">Add New Product</h2>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-[#5C4E45]">Product Name *</label>
                    <input
                      type="text"
                      required
                      value={newProduct.name}
                      onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                      placeholder="Hydra Glow Hyaluronic Serum"
                      className="w-full rounded-xl border border-[#DDD3C4] px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-[#5C4E45]">Category</label>
                    <select
                      value={newProduct.category}
                      onChange={(e) => setNewProduct({ ...newProduct, category: e.target.value })}
                      className="w-full rounded-xl border border-[#DDD3C4] px-3 py-2 text-sm"
                    >
                      {['Face Care', 'Body Care', 'Makeup', 'Hair Care', 'Bundles'].map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-[#5C4E45]">Skin Concern</label>
                    <select
                      value={newProduct.concern}
                      onChange={(e) => setNewProduct({ ...newProduct, concern: e.target.value })}
                      className="w-full rounded-xl border border-[#DDD3C4] px-3 py-2 text-sm"
                    >
                      {['Glow', 'Brightening', 'Acne Care', 'Hydration', 'Anti-Aging'].map((c) => (
                        <option key={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-[#5C4E45]">Sale Price (PKR) *</label>
                    <input
                      type="number"
                      required
                      value={newProduct.price}
                      onChange={(e) => setNewProduct({ ...newProduct, price: Number(e.target.value) })}
                      className="w-full rounded-xl border border-[#DDD3C4] px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-[#5C4E45]">Original Price (PKR)</label>
                    <input
                      type="number"
                      value={newProduct.compare_at_price}
                      onChange={(e) => setNewProduct({ ...newProduct, compare_at_price: Number(e.target.value) })}
                      className="w-full rounded-xl border border-[#DDD3C4] px-3 py-2 text-sm"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-semibold text-[#5C4E45]">Product Image</label>
                    <select
                      value={newProduct.image}
                      onChange={(e) => setNewProduct({ ...newProduct, image: e.target.value })}
                      className="w-full rounded-xl border border-[#DDD3C4] px-3 py-2 text-sm"
                    >
                      {IMAGE_PRESETS.map((img) => (
                        <option key={img.url} value={img.url}>
                          {img.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="sm:col-span-2 lg:col-span-3">
                    <label className="mb-1 block text-xs font-semibold text-[#5C4E45]">Description</label>
                    <textarea
                      rows={2}
                      value={newProduct.description}
                      onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                      className="w-full rounded-xl border border-[#DDD3C4] px-3 py-2 text-sm"
                    />
                  </div>
                </div>
                <button
                  type="submit"
                  className="mt-4 inline-flex items-center gap-2 rounded-full bg-[#1F1815] px-6 py-2.5 text-xs font-semibold uppercase tracking-wider text-white hover:bg-[#8E4A34]"
                >
                  <Plus className="h-3.5 w-3.5" /> Add Product
                </button>
              </form>

              <div className="rounded-2xl border border-[#E5DDD0] bg-white p-6">
                <h3 className="font-serif-editorial text-2xl font-semibold">Catalog ({products.length})</h3>
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {products.map((p) => (
                    <div
                      key={p.id}
                      className="flex items-center gap-3 rounded-2xl border border-[#F0E9DD] bg-[#FAF7F2] p-3"
                    >
                      <img src={p.image} alt={p.name} className="h-16 w-16 rounded-xl object-cover" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold text-[#1F1815]">{p.name}</p>
                        <p className="text-xs text-[#6B5D54]">
                          {p.category} • Rs. {p.price.toLocaleString()}
                        </p>
                      </div>
                      <button
                        onClick={async () => {
                          await api.deleteProduct(p.id, adminEmail);
                          await onRefreshStore();
                        }}
                        className="rounded-lg p-1.5 text-red-600 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ORDERS */}
          {tab === 'orders' && (
            <div className="rounded-2xl border border-[#E5DDD0] bg-white p-6">
              <h2 className="font-serif-editorial text-2xl font-semibold">Customer Orders ({orders.length})</h2>
              {orders.length === 0 ? (
                <p className="mt-4 text-sm text-[#6B5D54]">No customer orders yet. Place a test order from the cart!</p>
              ) : (
                <div className="mt-4 space-y-3">
                  {orders.map((o) => (
                    <div
                      key={o.id}
                      className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#F0E9DD] bg-[#FAF7F2] p-4"
                    >
                      <div>
                        <p className="text-sm font-bold text-[#1F1815]">
                          #{o.order_number} — {o.customer_name}
                        </p>
                        <p className="text-xs text-[#6B5D54]">
                          {o.customer_email} • {o.customer_phone} • {o.city}
                        </p>
                        <p className="mt-1 text-xs font-medium text-[#8E4A34]">
                          Total: Rs. {o.total.toLocaleString()}{' '}
                          {o.coupon_code ? `(Coupon: ${o.coupon_code}, -Rs. ${o.discount_amount})` : ''}
                        </p>
                      </div>
                      <select
                        value={o.status}
                        onChange={async (e) => {
                          const res = await api.updateOrderStatus(o.id, e.target.value, adminEmail);
                          setOrders(res.orders);
                        }}
                        className="rounded-xl border border-[#DDD3C4] bg-white px-3 py-2 text-xs font-semibold"
                      >
                        {['Pending', 'Confirmed', 'Shipped', 'Delivered', 'Cancelled'].map((s) => (
                          <option key={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* FIREBASE SETUP */}
          {tab === 'firebase' && (
            <form onSubmit={handleSaveFirebase} className="space-y-5 rounded-2xl border border-[#E5DDD0] bg-white p-6">
              <div className="flex items-center justify-between border-b border-[#F0E9DD] pb-4">
                <div>
                  <h2 className="font-serif-editorial text-2xl font-semibold">Firebase Authentication Setup</h2>
                  <p className="text-xs text-[#6B5D54]">
                    Paste your Firebase Web App config below (or send it to me in chat) to activate live Firebase login.
                  </p>
                </div>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-full bg-[#1F1815] px-5 py-2.5 text-xs font-semibold uppercase tracking-wider text-white hover:bg-[#8E4A34]"
                >
                  <Save className="h-3.5 w-3.5" /> Save & Connect Firebase
                </button>
              </div>

              <div className="rounded-xl border border-[#E5DDD0] bg-[#FAF7F2] p-4">
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#5C4E45]">
                  Quick Paste: Firebase Config Snippet
                </label>
                <textarea
                  rows={4}
                  value={fbSnippet}
                  onChange={(e) => setFbSnippet(e.target.value)}
                  placeholder={`const firebaseConfig = {\n  apiKey: "...",\n  authDomain: "...",\n  projectId: "..."\n};`}
                  className="w-full rounded-xl border border-[#DDD3C4] bg-white p-3 font-mono text-xs"
                />
                <button
                  type="button"
                  onClick={parseFirebaseSnippet}
                  className="mt-2 rounded-full bg-[#F3ECE1] px-4 py-1.5 text-xs font-semibold text-[#1F1815] hover:bg-[#E7DAC7]"
                >
                  Auto-Fill Fields From Snippet
                </button>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                {(['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId', 'measurementId'] as const).map(
                  (field) => (
                    <div key={field}>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[#5C4E45]">
                        {field}
                      </label>
                      <input
                        type="text"
                        value={fbForm[field] || ''}
                        onChange={(e) => setFbForm({ ...fbForm, [field]: e.target.value })}
                        placeholder={`Enter ${field}`}
                        className="w-full rounded-xl border border-[#DDD3C4] px-3.5 py-2 text-sm font-mono"
                      />
                    </div>
                  )
                )}
              </div>
            </form>
          )}
        </main>
      </div>
    </div>
  );
};
