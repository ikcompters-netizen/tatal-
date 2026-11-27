import React, { useEffect, useMemo, useState } from 'react';
import {
  Search,
  ShoppingBag,
  User,
  ShieldCheck,
  Truck,
  Sparkles,
  RotateCcw,
  Star,
  ChevronDown,
  Instagram,
  Phone,
  Mail,
  MapPin,
  SlidersHorizontal,
  X,
  Check,
} from 'lucide-react';
import { api, type BootstrapResponse } from './lib/api';
import {
  firebaseLogout,
  getEnvFirebaseConfig,
  initFirebaseAuth,
  isValidFirebaseConfig,
  subscribeFirebaseAuth,
} from './lib/firebase';
import type { AuthUser, CartItem, Product } from './types';
import { AuthDrawer } from './components/AuthDrawer';
import { CartDrawer } from './components/CartDrawer';
import { ProductModal } from './components/ProductModal';
import { AdminPanel } from './components/AdminPanel';
import { BrandLogo } from './components/BrandLogo';

const REVIEWS = [
  {
    name: 'Aqeedat Butt',
    title: 'Brightening serum vitamin c',
    quote:
      'I really like your Vitamin C serum and this is my second bottle. My skin looks brighter and more even-toned every morning.',
    productName: 'Brightening Face Serum',
    image: '/images/brightening-serum.jpg',
  },
  {
    name: 'Hira Malik',
    title: 'Best for acne-prone skin',
    quote:
      'I have sensitive acne-prone skin and this really helped calm my breakouts. Zero irritation, skin feels clean and balanced.',
    productName: 'Acne Fighting Clarifying Serum',
    image: '/images/cleanser-toner.jpg',
  },
  {
    name: 'Sana Ahmed',
    title: 'The glow is real',
    quote:
      'After using the Peach Sunrise Body Butter my skin literally glows. The whipped texture melts right in without feeling greasy.',
    productName: 'Peach Sunrise Whipped Body Butter',
    image: '/images/body-butter.jpg',
  },
  {
    name: 'Mahnoor Siddiqui',
    title: 'Super hydrating overnight',
    quote:
      'Waking up after using the Night Repair Serum feels like a spa facial. Packaging is gorgeous and delivery was super fast.',
    productName: 'Multi-Action Night Repair Face Serum',
    image: '/images/night-repair-serum.jpg',
  },
];

const CATEGORIES = [
  'All',
  'Face Care',
  'Body Care',
  'Makeup',
  'Hair Care',
  'Bundles',
  'Glow',
  'Brightening',
  'Acne Care',
  'Hydration',
];

export function App() {
  const [data, setData] = useState<BootstrapResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const [view, setView] = useState<'store' | 'admin'>(() =>
    window.location.hash === '#admin' ? 'admin' : 'store'
  );
  const [authOpen, setAuthOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const saved = localStorage.getItem('gg_user');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });
  const [firebaseConnected, setFirebaseConnected] = useState(false);

  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const saved = localStorage.getItem('gg_cart');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [activeFilter, setActiveFilter] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'featured' | 'price-asc' | 'price-desc'>('featured');
  const [openFaqId, setOpenFaqId] = useState<string | null>('faq-1');

  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterStatus, setNewsletterStatus] = useState('');
  const [toast, setToast] = useState('');

  const loadStore = async () => {
    try {
      const res = await api.bootstrap();
      setData(res);

      const envCfg = getEnvFirebaseConfig();
      const valid = isValidFirebaseConfig(envCfg) || isValidFirebaseConfig(res.firebaseConfig);
      setFirebaseConnected(valid);
      if (valid) {
        await initFirebaseAuth(res.firebaseConfig);
      }
    } catch (err) {
      console.error('Bootstrap error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStore();
  }, []);

  useEffect(() => {
    if (data?.contact?.brandName) {
      document.title = `${data.contact.brandName} — Luxury Skincare & Cosmetics`;
    }
  }, [data?.contact?.brandName]);

  useEffect(() => {
    if (!firebaseConnected) return;
    const unsub = subscribeFirebaseAuth(async (fbUser) => {
      if (fbUser && fbUser.email) {
        const adminCheck = await api.checkAdmin(fbUser.email).catch(() => ({ isAdmin: false, role: null }));
        const authUser: AuthUser = {
          email: fbUser.email,
          displayName: fbUser.displayName || fbUser.email.split('@')[0],
          uid: fbUser.uid,
          provider: 'firebase',
          isAdmin: adminCheck.isAdmin,
          role: adminCheck.role,
        };
        setUser(authUser);
        localStorage.setItem('gg_user', JSON.stringify(authUser));
      }
    });
    return () => unsub();
  }, [firebaseConnected]);

  useEffect(() => {
    localStorage.setItem('gg_cart', JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    const onHashChange = () => {
      setView(window.location.hash === '#admin' ? 'admin' : 'store');
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2600);
  };

  const handleAddToCart = (product: Product, qty = 1) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        return prev.map((i) => (i.product.id === product.id ? { ...i, quantity: i.quantity + qty } : i));
      }
      return [...prev, { product, quantity: qty }];
    });
    showToast(`Added ${product.name} to cart`);
  };

  const handleUpdateQty = (productId: number, qty: number) => {
    if (qty <= 0) {
      setCart((prev) => prev.filter((i) => i.product.id !== productId));
    } else {
      setCart((prev) => prev.map((i) => (i.product.id === productId ? { ...i, quantity: qty } : i)));
    }
  };

  const handleLoginSuccess = (loggedInUser: AuthUser) => {
    setUser(loggedInUser);
    localStorage.setItem('gg_user', JSON.stringify(loggedInUser));
    showToast(`Welcome, ${loggedInUser.displayName}!`);
  };

  const handleLogout = async () => {
    await firebaseLogout().catch(() => {});
    setUser(null);
    localStorage.removeItem('gg_user');
    showToast('Signed out');
  };

  const filteredProducts = useMemo(() => {
    if (!data) return [];
    let list = [...data.products];
    if (activeFilter !== 'All') {
      list = list.filter((p) => p.category === activeFilter || p.concern === activeFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.concern.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q)
      );
    }
    if (sortBy === 'price-asc') list.sort((a, b) => a.price - b.price);
    if (sortBy === 'price-desc') list.sort((a, b) => b.price - a.price);
    return list;
  }, [data, activeFilter, searchQuery, sortBy]);

  if (loading || !data) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#FAF7F2] text-[#1F1815]">
        <div className="h-10 w-10 animate-spin rounded-full border-2 border-[#8E4A34] border-t-transparent" />
        <p className="mt-4 font-serif-editorial text-2xl">Loading GlowandGrow...</p>
      </div>
    );
  }

  const { homePage, contact, products, firebaseConfig, activeCoupons } = data;
  const bestsellers = products.filter((p) => p.is_bestseller === 1).slice(0, 8);
  const bundles = products.filter((p) => p.is_bundle === 1 || p.category === 'Bundles');
  const cartCount = cart.reduce((sum, i) => sum + i.quantity, 0);

  const openAdminView = () => {
    window.location.hash = 'admin';
    setView('admin');
  };

  const exitAdminView = () => {
    window.location.hash = '';
    setView('store');
  };

  const handleNewsletterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.subscribe(newsletterEmail, '', 'footer');
      setNewsletterStatus(res.message);
      setNewsletterEmail('');
    } catch (err: unknown) {
      setNewsletterStatus(err instanceof Error ? err.message : 'Subscription failed');
    }
  };

  const renderProductCard = (product: Product) => {
    const discountPct =
      product.compare_at_price > product.price
        ? Math.round(((product.compare_at_price - product.price) / product.compare_at_price) * 100)
        : 0;

    return (
      <div
        key={product.id}
        className="group flex flex-col overflow-hidden rounded-2xl border border-[#E7DFD2] bg-white transition duration-300 hover:-translate-y-1 hover:shadow-lg"
      >
        <div
          onClick={() => setSelectedProduct(product)}
          className="relative aspect-[4/4.3] cursor-pointer overflow-hidden bg-[#F3ECE1]"
        >
          <img
            src={product.image}
            alt={product.name}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
          {product.badge && (
            <span className="absolute left-3 top-3 rounded-full bg-[#1F1815] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
              {product.badge}
            </span>
          )}
          {discountPct > 0 && (
            <span className="absolute right-3 top-3 rounded-full bg-[#8E4A34] px-2.5 py-1 text-[10px] font-bold text-white">
              -{discountPct}%
            </span>
          )}
        </div>

        <div className="flex flex-1 flex-col justify-between p-4">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#8E4A34]">
              {product.category} • {product.size}
            </p>
            <h3
              onClick={() => setSelectedProduct(product)}
              className="mt-1 cursor-pointer text-base font-semibold leading-snug text-[#1F1815] hover:text-[#8E4A34]"
            >
              {product.name}
            </h3>
            <div className="mt-1.5 flex items-center gap-1 text-xs text-[#6B5D54]">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              <span className="font-semibold text-[#1F1815]">{product.rating.toFixed(1)}</span>
              <span>({product.reviews_count})</span>
            </div>
          </div>

          <div className="mt-4">
            <div className="flex items-baseline gap-2">
              <span className="text-base font-bold text-[#1F1815]">Rs.{product.price.toLocaleString()}</span>
              {product.compare_at_price > product.price && (
                <span className="text-xs text-[#8E7F75] line-through">
                  Rs.{product.compare_at_price.toLocaleString()}
                </span>
              )}
            </div>
            <button
              onClick={() => handleAddToCart(product)}
              className="mt-3 w-full rounded-full border border-[#1F1815] bg-[#1F1815] py-2.5 text-xs font-semibold uppercase tracking-wider text-white transition hover:bg-[#8E4A34] hover:border-[#8E4A34]"
            >
              Add To Cart
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (view === 'admin') {
    return (
      <>
        <AdminPanel
          user={user}
          homeSettings={homePage}
          contact={contact}
          firebaseConfig={firebaseConfig}
          products={products}
          firebaseConnected={firebaseConnected}
          onExitAdmin={exitAdminView}
          onOpenAuth={() => setAuthOpen(true)}
          onRefreshStore={loadStore}
        />
        <AuthDrawer
          open={authOpen}
          onClose={() => setAuthOpen(false)}
          user={user}
          contact={contact}
          firebaseConnected={firebaseConnected}
          onLoginSuccess={handleLoginSuccess}
          onLogout={handleLogout}
          onOpenAdmin={openAdminView}
        />
      </>
    );
  }

  // Format hero title with italicized accent on last word
  const heroWords = homePage.heroTitle.split(' ');
  const heroLead = heroWords.slice(0, -1).join(' ');
  const heroLast = heroWords[heroWords.length - 1];

  return (
    <div className="min-h-screen bg-[#FAF7F2] text-[#1F1815]">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full bg-[#1F1815] px-5 py-3 text-xs font-semibold text-white shadow-xl">
          <Check className="h-4 w-4 text-emerald-400" />
          <span>{toast}</span>
        </div>
      )}

      {/* Announcement Bar */}
      <div className="bg-[#1F1815] px-4 py-2.5 text-center text-xs font-medium tracking-wide text-[#FAF7F2]">
        {homePage.announcementText}
      </div>

      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-[#E5DDD0] bg-[#FAF7F2]/95 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6">
          <a href="#" className="flex items-center">
            <BrandLogo brandName={contact.brandName} subtitle="Botanical Luxury" />
          </a>

          <nav className="hidden items-center gap-6 text-xs font-semibold uppercase tracking-wider text-[#4F433B] lg:flex">
            <a
              href="#catalog"
              onClick={() => setActiveFilter('All')}
              className="transition hover:text-[#8E4A34]"
            >
              Shop All
            </a>
            <a
              href="#catalog"
              onClick={() => setActiveFilter('Face Care')}
              className="transition hover:text-[#8E4A34]"
            >
              Face Care
            </a>
            <a
              href="#catalog"
              onClick={() => setActiveFilter('Body Care')}
              className="transition hover:text-[#8E4A34]"
            >
              Body Care
            </a>
            <a
              href="#catalog"
              onClick={() => setActiveFilter('Hair Care')}
              className="transition hover:text-[#8E4A34]"
            >
              Hair Care
            </a>
            <a
              href="#catalog"
              onClick={() => setActiveFilter('Makeup')}
              className="transition hover:text-[#8E4A34]"
            >
              Makeup
            </a>
            <a href="#bundles" className="text-[#8E4A34] transition hover:opacity-80">
              Bundles & Deals
            </a>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setSearchOpen((s) => !s)}
              className="rounded-full p-2 text-[#4F433B] transition hover:bg-[#EFE7DA] hover:text-[#1F1815]"
              aria-label="Search"
            >
              <Search className="h-5 w-5" />
            </button>

            <button
              onClick={() => setAuthOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#DDD3C4] bg-white px-3.5 py-1.5 text-xs font-semibold text-[#1F1815] transition hover:border-[#8E4A34]"
            >
              <User className="h-4 w-4 text-[#8E4A34]" />
              <span className="hidden sm:inline">{user ? user.displayName : 'Login'}</span>
            </button>

            {user?.isAdmin && (
              <button
                onClick={openAdminView}
                className="inline-flex items-center gap-1.5 rounded-full bg-[#8E4A34] px-3.5 py-1.5 text-xs font-semibold text-white transition hover:bg-[#753B28]"
                title="Open Admin Panel"
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                <span>Admin Panel</span>
              </button>
            )}

            <button
              onClick={() => setCartOpen(true)}
              className="relative inline-flex items-center gap-1.5 rounded-full bg-[#1F1815] px-3.5 py-2 text-xs font-semibold text-white transition hover:bg-[#8E4A34]"
              aria-label="Open shopping cart"
            >
              <ShoppingBag className="h-4 w-4" />
              <span>{cartCount}</span>
            </button>
          </div>
        </div>

        {/* Expandable Search Bar */}
        {searchOpen && (
          <div className="border-t border-[#E5DDD0] bg-white px-4 py-3">
            <div className="mx-auto flex max-w-3xl items-center gap-3">
              <Search className="h-4 w-4 text-[#8E7F75]" />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' });
                }}
                placeholder="Search serums, body butter, hair oil, bundles..."
                className="flex-1 text-sm outline-none"
              />
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSearchOpen(false);
                }}
                className="text-xs font-semibold text-[#6B5D54] hover:text-[#1F1815]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </header>

      {/* HERO SECTION */}
      <section className="relative overflow-hidden bg-[#F5EFE6]">
        <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 py-12 sm:px-6 lg:grid-cols-2 lg:py-16">
          <div className="space-y-6">
            <p className="inline-flex items-center gap-2 rounded-full border border-[#D8CBB8] bg-white/80 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-[#8E4A34]">
              <Sparkles className="h-3.5 w-3.5" />
              {homePage.heroEyebrow}
            </p>
            <h1 className="font-serif-editorial text-5xl font-semibold leading-[1.06] text-[#1F1815] sm:text-6xl">
              {heroLead} <em className="italic font-normal text-[#8E4A34]">{heroLast}</em>
            </h1>
            <p className="max-w-xl text-base leading-relaxed text-[#4F433B] sm:text-lg">
              {homePage.heroSubtitle}
            </p>
            <div className="flex flex-wrap gap-3.5 pt-2">
              <a
                href="#catalog"
                className="rounded-full bg-[#1F1815] px-8 py-4 text-xs font-semibold uppercase tracking-[0.15em] text-white transition hover:bg-[#8E4A34]"
              >
                {homePage.heroPrimaryCta}
              </a>
              <a
                href="#bestsellers"
                className="rounded-full border border-[#1F1815] px-8 py-4 text-xs font-semibold uppercase tracking-[0.15em] text-[#1F1815] transition hover:bg-[#1F1815] hover:text-white"
              >
                {homePage.heroSecondaryCta}
              </a>
            </div>
          </div>

          <div className="relative">
            <div className="overflow-hidden rounded-[2rem] border border-[#E5DDD0] bg-white shadow-xl">
              <img
                src={homePage.heroImage}
                alt="GlowandGrow Luxury Skincare"
                className="aspect-[4/3.6] w-full object-cover"
              />
            </div>
            <div className="absolute -bottom-4 left-6 rounded-2xl border border-[#E5DDD0] bg-white/95 px-5 py-3 shadow-lg backdrop-blur-xs">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-[#8E4A34]">
                Pakistan's Luxury Ritual
              </p>
              <p className="text-sm font-bold text-[#1F1815]">Dermatologist Tested • Cruelty Free</p>
            </div>
          </div>
        </div>
      </section>

      {/* SECONDARY EDITORIAL BANNER */}
      <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="grid items-center gap-8 overflow-hidden rounded-[2rem] border border-[#E5DDD0] bg-white lg:grid-cols-2">
          <div className="p-8 sm:p-12">
            <h2 className="font-serif-editorial text-4xl font-semibold leading-tight text-[#1F1815] sm:text-5xl">
              {homePage.bannerTitle}
            </h2>
            <p className="mt-4 text-base leading-relaxed text-[#5C4E45]">{homePage.bannerSubtitle}</p>
            <div className="mt-7 flex flex-wrap gap-3">
              <a
                href="#catalog"
                className="rounded-full bg-[#8E4A34] px-7 py-3.5 text-xs font-semibold uppercase tracking-[0.15em] text-white transition hover:bg-[#753B28]"
              >
                {homePage.bannerCta}
              </a>
              <a
                href="#bestsellers"
                className="rounded-full border border-[#DDD3C4] px-7 py-3.5 text-xs font-semibold uppercase tracking-[0.15em] text-[#1F1815] transition hover:bg-[#F3ECE1]"
              >
                SHOP BESTSELLERS
              </a>
            </div>
          </div>
          <div className="h-full min-h-[320px] bg-[#F3ECE1]">
            <img
              src={homePage.bannerImage}
              alt="Beauty that speaks your skin"
              className="h-full w-full object-cover"
            />
          </div>
        </div>
      </section>

      {/* TRUST STRIP MARQUEE */}
      <section className="overflow-hidden border-y border-[#E5DDD0] bg-[#1F1815] py-5 text-[#FAF7F2]">
        <div className="animate-marquee items-center gap-12">
          {[0, 1].map((dup) => (
            <div key={dup} className="flex items-center gap-12 pr-12">
              <div className="flex items-center gap-3">
                <ShieldCheck className="h-5 w-5 text-[#D89B7E]" />
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest">Premium Quality</p>
                  <p className="text-[11px] text-[#CBBBA6]">Dermatologist tested</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Truck className="h-5 w-5 text-[#D89B7E]" />
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest">Fast Delivery</p>
                  <p className="text-[11px] text-[#CBBBA6]">All over Pakistan</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Sparkles className="h-5 w-5 text-[#D89B7E]" />
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest">Cruelty Free</p>
                  <p className="text-[11px] text-[#CBBBA6]">100% ethical beauty</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <RotateCcw className="h-5 w-5 text-[#D89B7E]" />
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest">Easy Returns</p>
                  <p className="text-[11px] text-[#CBBBA6]">7-day return policy</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SHOP BY CATEGORY */}
      <section className="mx-auto max-w-7xl px-4 pt-14 sm:px-6">
        <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8E4A34]">Curated Rituals</p>
            <h2 className="mt-1 font-serif-editorial text-4xl font-semibold">
              <em className="italic font-normal">Shop by</em> Category
            </h2>
          </div>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                onClick={() => {
                  setActiveFilter(cat);
                  document.getElementById('catalog')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
                  activeFilter === cat
                    ? 'bg-[#1F1815] text-white'
                    : 'border border-[#DDD3C4] bg-white text-[#4F433B] hover:border-[#8E4A34]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* BEST SELLERS */}
      <section id="bestsellers" className="mx-auto max-w-7xl px-4 py-14 sm:px-6">
        <div className="mb-8 flex items-end justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8E4A34]">Customer Favorites</p>
            <h2 className="mt-1 font-serif-editorial text-4xl font-semibold">
              <em className="italic font-normal">Best</em> Sellers
            </h2>
          </div>
          <a
            href="#catalog"
            onClick={() => setActiveFilter('All')}
            className="text-xs font-bold uppercase tracking-widest text-[#8E4A34] underline underline-offset-4"
          >
            View All
          </a>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {bestsellers.map(renderProductCard)}
        </div>
      </section>

      {/* FEATURED SERUM SPOTLIGHT */}
      <section className="bg-[#EFE7DA]/65 py-16">
        <div className="mx-auto grid max-w-7xl items-center gap-10 px-4 sm:px-6 lg:grid-cols-2">
          <div className="overflow-hidden rounded-[2rem] border border-[#E5DDD0] bg-white shadow-md">
            <img
              src={homePage.spotlightImage}
              alt={homePage.spotlightTitle}
              className="aspect-square w-full object-cover"
            />
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8E4A34]">
              {homePage.spotlightEyebrow}
            </p>
            <h2 className="mt-2 font-serif-editorial text-4xl font-semibold sm:text-5xl">
              {homePage.spotlightTitle}
            </h2>
            <p className="mt-2 text-lg text-[#4F433B]">{homePage.spotlightSubtitle}</p>

            <div className="mt-7 space-y-4">
              {homePage.spotlightBenefits.map((b, idx) => (
                <div key={idx} className="rounded-2xl border border-[#E5DDD0] bg-white p-4">
                  <h3 className="text-sm font-bold text-[#1F1815]">{b.title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-[#5C4E45]">{b.description}</p>
                </div>
              ))}
            </div>

            <button
              onClick={() => {
                const serum = products.find((p) => p.slug === 'brightening-face-serum') || products[0];
                if (serum) setSelectedProduct(serum);
              }}
              className="mt-7 rounded-full bg-[#1F1815] px-8 py-4 text-xs font-semibold uppercase tracking-[0.15em] text-white transition hover:bg-[#8E4A34]"
            >
              {homePage.spotlightCta}
            </button>
          </div>
        </div>
      </section>

      {/* EXPLORE ALL PRODUCTS */}
      <section id="catalog" className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="mb-8 flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <h2 className="font-serif-editorial text-4xl font-semibold">
              <em className="italic font-normal">Explore</em> All Products
            </h2>
            <p className="mt-1 text-sm text-[#5C4E45]">
              Discover skincare crafted to nourish, restore, and elevate your everyday routine.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter by keyword..."
              className="rounded-full border border-[#DDD3C4] bg-white px-4 py-2 text-xs outline-none focus:border-[#8E4A34]"
            />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'featured' | 'price-asc' | 'price-desc')}
              className="rounded-full border border-[#DDD3C4] bg-white px-4 py-2 text-xs font-semibold outline-none"
            >
              <option value="featured">Sort: Featured</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
            </select>
          </div>
        </div>

        {filteredProducts.length === 0 ? (
          <div className="rounded-3xl border border-[#E5DDD0] bg-white p-12 text-center">
            <p className="font-serif-editorial text-2xl">No matching products found</p>
            <button
              onClick={() => {
                setActiveFilter('All');
                setSearchQuery('');
              }}
              className="mt-4 rounded-full bg-[#1F1815] px-6 py-2.5 text-xs font-semibold uppercase tracking-wider text-white"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {filteredProducts.map(renderProductCard)}
          </div>
        )}
      </section>

      {/* PERFECT BUNDLES */}
      <section id="bundles" className="bg-[#1F1815] py-16 text-[#FAF7F2]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6">
          <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#D89B7E]">
                Curated Sets • Save Up to 55%
              </p>
              <h2 className="mt-1 font-serif-editorial text-4xl font-semibold">
                <em className="italic font-normal">Perfect</em> Bundles
              </h2>
            </div>
            <p className="text-xs text-[#CBBBA6]">
              Use code <strong className="text-white">GLOW10</strong> in cart for an extra 10% off!
            </p>
          </div>

          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 text-[#1F1815]">
            {bundles.map(renderProductCard)}
          </div>
        </div>
      </section>

      {/* CUSTOMER REVIEWS */}
      <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8E4A34]">Verified Reviews</p>
          <h2 className="mt-1 font-serif-editorial text-4xl font-semibold">
            <em className="italic font-normal">Hear From Our</em> Happy Customers
          </h2>
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {REVIEWS.map((r, idx) => (
            <div key={idx} className="flex flex-col justify-between rounded-2xl border border-[#E5DDD0] bg-white p-5">
              <div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-[#1F1815]">{r.name}</p>
                    <p className="text-[11px] font-semibold text-emerald-700">Verified Buyer</p>
                  </div>
                  <div className="flex gap-0.5 text-amber-400">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star key={i} className="h-3.5 w-3.5 fill-current" />
                    ))}
                  </div>
                </div>
                <h3 className="mt-4 text-sm font-bold text-[#1F1815]">{r.title}</h3>
                <p className="mt-2 text-xs leading-relaxed text-[#5C4E45]">{r.quote}</p>
              </div>

              <div className="mt-5 flex items-center gap-3 border-t border-[#F0E9DD] pt-3">
                <img src={r.image} alt={r.productName} className="h-10 w-10 rounded-lg object-cover" />
                <p className="text-xs font-semibold text-[#8E4A34]">{r.productName}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ SECTION */}
      <section className="mx-auto max-w-4xl px-4 pb-16 sm:px-6">
        <div className="text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8E4A34]">Need Help?</p>
          <h2 className="mt-1 font-serif-editorial text-4xl font-semibold">
            <em className="italic font-normal">Frequently Asked</em> Questions
          </h2>
        </div>

        <div className="mt-8 space-y-3">
          {homePage.faqs.map((faq) => {
            const isOpen = openFaqId === faq.id;
            return (
              <div key={faq.id} className="overflow-hidden rounded-2xl border border-[#E5DDD0] bg-white">
                <button
                  onClick={() => setOpenFaqId(isOpen ? null : faq.id)}
                  className="flex w-full items-center justify-between px-6 py-4 text-left text-sm font-semibold text-[#1F1815]"
                >
                  <span>{faq.question}</span>
                  <ChevronDown
                    className={`h-4 w-4 shrink-0 text-[#8E4A34] transition-transform ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                {isOpen && (
                  <div className="border-t border-[#F0E9DD] px-6 py-4 text-sm leading-relaxed text-[#5C4E45]">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* NEWSLETTER */}
      <section className="border-t border-[#E5DDD0] bg-[#EFE7DA]/70 py-14">
        <div className="mx-auto max-w-2xl px-4 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#8E4A34]">
            Join {contact.brandName} VIP
          </p>
          <h2 className="mt-1 font-serif-editorial text-4xl font-semibold">
            Unlock Exclusive Drops & Coupon Codes
          </h2>
          <p className="mt-2 text-sm text-[#5C4E45]">
            Get early access to new formulas, skincare guides, and subscriber-only discounts.
          </p>
          <form onSubmit={handleNewsletterSubmit} className="mt-6 flex flex-col gap-3 sm:flex-row">
            <input
              type="email"
              required
              value={newsletterEmail}
              onChange={(e) => setNewsletterEmail(e.target.value)}
              placeholder="Enter your email address..."
              className="flex-1 rounded-full border border-[#D8CBB8] bg-white px-5 py-3.5 text-sm outline-none focus:border-[#8E4A34]"
            />
            <button
              type="submit"
              className="rounded-full bg-[#1F1815] px-8 py-3.5 text-xs font-semibold uppercase tracking-widest text-white transition hover:bg-[#8E4A34]"
            >
              Subscribe
            </button>
          </form>
          {newsletterStatus && <p className="mt-3 text-xs font-semibold text-emerald-700">{newsletterStatus}</p>}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="bg-[#1F1815] px-4 py-14 text-[#FAF7F2] sm:px-6">
        <div className="mx-auto grid max-w-7xl gap-10 md:grid-cols-4">
          <div>
            <BrandLogo brandName={contact.brandName} dark subtitle="Botanical Luxury" />
            <p className="mt-3 text-xs leading-relaxed text-[#CBBBA6]">{contact.tagline}</p>
            <p className="mt-3 text-xs text-[#CBBBA6]">{contact.shippingPolicy}</p>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-[#D89B7E]">Shop</h4>
            <ul className="mt-3 space-y-2 text-xs text-[#CBBBA6]">
              {['Face Care', 'Body Care', 'Hair Care', 'Makeup', 'Bundles'].map((c) => (
                <li key={c}>
                  <a
                    href="#catalog"
                    onClick={() => setActiveFilter(c)}
                    className="transition hover:text-white"
                  >
                    {c}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-[#D89B7E]">Contact Details</h4>
            <ul className="mt-3 space-y-2.5 text-xs text-[#CBBBA6]">
              <li className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-[#D89B7E]" />
                <a href={`mailto:${contact.email}`} className="hover:text-white">
                  {contact.email}
                </a>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 text-[#D89B7E]" />
                <a href={`tel:${contact.phone}`} className="hover:text-white">
                  {contact.phone}
                </a>
              </li>
              <li className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-[#D89B7E]" />
                <span>{contact.address}</span>
              </li>
              <li className="flex items-center gap-2">
                <Instagram className="h-3.5 w-3.5 text-[#D89B7E]" />
                <span>{contact.instagram}</span>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-[#D89B7E]">Customer Care</h4>
            <ul className="mt-3 space-y-2 text-xs text-[#CBBBA6]">
              <li>Dermatologist Tested Formulas</li>
              <li>100% Cruelty-Free & Ethical</li>
              <li>{contact.returnPolicy}</li>
              <li>Cash on Delivery Nationwide</li>
            </ul>
          </div>
        </div>

        <div className="mx-auto mt-10 flex max-w-7xl flex-col items-center justify-between gap-2 border-t border-white/10 pt-6 text-xs text-[#9B8C82] sm:flex-row">
          <p>
            © {new Date().getFullYear()} {contact.brandName}. All rights reserved.
          </p>
          <p>{contact.returnPolicy}</p>
        </div>
      </footer>

      {/* Floating WhatsApp Button */}
      <a
        href={`https://wa.me/92${contact.whatsapp.replace(/^0/, '').replace(/[^0-9]/g, '')}`}
        target="_blank"
        rel="noreferrer"
        aria-label={`Chat on WhatsApp ${contact.phone}`}
        className="group fixed bottom-5 right-5 z-30 flex items-center gap-2.5 rounded-full bg-[#25D366] p-3.5 text-white shadow-xl transition-all duration-200 hover:scale-105 hover:bg-[#20BD5A] sm:px-4 sm:py-3"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 32 32"
          className="h-6 w-6 fill-current"
          aria-hidden="true"
        >
          <path d="M16.004 2.667C8.64 2.667 2.667 8.64 2.667 16c0 2.353.615 4.651 1.784 6.676L2.667 29.333l6.835-1.751A13.28 13.28 0 0 0 16.004 29.333c7.363 0 13.33-5.972 13.33-13.333 0-7.362-5.967-13.333-13.33-13.333Zm7.775 18.818c-.325.915-1.899 1.75-2.62 1.845-.664.088-1.504.125-2.429-.168-.561-.178-1.281-.416-2.199-.814-3.868-1.671-6.392-5.576-6.585-5.833-.192-.257-1.572-2.092-1.572-3.99 0-1.898.994-2.831 1.347-3.217.353-.385.77-.482 1.027-.482.257 0 .513.002.738.014.236.012.553-.09.865.661.321.771 1.091 2.669 1.187 2.862.096.193.16.418.032.675-.128.257-.193.418-.385.643-.193.225-.405.502-.578.674-.193.193-.394.402-.169.788.225.385 1.001 1.653 2.15 2.677 1.477 1.317 2.723 1.725 3.108 1.918.385.193.61.161.835-.096.225-.257.963-1.124 1.22-1.51.257-.385.513-.321.866-.193.353.129 2.248 1.06 2.633 1.253.385.193.642.289.738.45.096.16.096.93-.229 1.845Z" />
        </svg>
        <span className="hidden text-xs font-semibold tracking-wide sm:inline">WhatsApp</span>
      </a>

      {/* Modals & Drawers */}
      <ProductModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={handleAddToCart}
      />

      <CartDrawer
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        items={cart}
        homeSettings={homePage}
        contact={contact}
        activeCouponsHint={activeCoupons}
        onUpdateQty={handleUpdateQty}
        onRemoveItem={(id) => setCart((prev) => prev.filter((i) => i.product.id !== id))}
        onClearCart={() => setCart([])}
        defaultEmail={user?.email || ''}
      />

      <AuthDrawer
        open={authOpen}
        onClose={() => setAuthOpen(false)}
        user={user}
        contact={contact}
        firebaseConnected={firebaseConnected}
        onLoginSuccess={handleLoginSuccess}
        onLogout={handleLogout}
        onOpenAdmin={openAdminView}
      />
    </div>
  );
}

export default App;
