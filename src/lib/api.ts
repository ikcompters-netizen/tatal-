import {
  DEFAULT_ADMIN_EMAILS,
  DEFAULT_CONTACT_SETTINGS,
  DEFAULT_COUPONS,
  DEFAULT_FIREBASE_CONFIG,
  DEFAULT_HOME_SETTINGS,
  DEFAULT_PRODUCTS,
  DEFAULT_SUBSCRIBERS,
} from '../data/defaults';
import type {
  AdminEmail,
  ContactSettings,
  Coupon,
  FirebaseConfig,
  HomePageSettings,
  Order,
  Product,
  Subscriber,
} from '../types';

export interface BootstrapResponse {
  homePage: HomePageSettings;
  contact: ContactSettings;
  firebaseConfig: FirebaseConfig;
  products: Product[];
  activeCoupons: Pick<Coupon, 'code' | 'type' | 'value' | 'min_order' | 'description'>[];
}

const LOCAL_STORE_KEY = 'glowandgrow_local_store_v1';

interface LocalStore {
  homePage: HomePageSettings;
  contact: ContactSettings;
  firebaseConfig: FirebaseConfig;
  products: Product[];
  coupons: Coupon[];
  subscribers: Subscriber[];
  adminEmails: AdminEmail[];
  orders: Order[];
}

function getLocalStore(): LocalStore {
  try {
    const raw = localStorage.getItem(LOCAL_STORE_KEY);
    if (raw) return JSON.parse(raw) as LocalStore;
  } catch {
    // ignore
  }
  const initial: LocalStore = {
    homePage: DEFAULT_HOME_SETTINGS,
    contact: DEFAULT_CONTACT_SETTINGS,
    firebaseConfig: DEFAULT_FIREBASE_CONFIG,
    products: DEFAULT_PRODUCTS,
    coupons: DEFAULT_COUPONS,
    subscribers: DEFAULT_SUBSCRIBERS,
    adminEmails: DEFAULT_ADMIN_EMAILS,
    orders: [],
  };
  saveLocalStore(initial);
  return initial;
}

function saveLocalStore(store: LocalStore) {
  try {
    localStorage.setItem(LOCAL_STORE_KEY, JSON.stringify(store));
  } catch {
    // ignore
  }
}

async function request<T>(url: string, options: RequestInit = {}, adminEmail?: string): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };
  if (adminEmail) {
    headers['X-Admin-Email'] = adminEmail;
  }

  const res = await fetch(url, { ...options, headers });
  const contentType = res.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    throw new Error(`Non-JSON response (${res.status})`);
  }
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || data.message || `Request failed (${res.status})`);
  }
  return data as T;
}

function isApiHttpError(err: unknown) {
  const msg = err instanceof Error ? err.message : '';
  return (
    msg.includes('Non-JSON response') ||
    msg.includes('Failed to fetch') ||
    msg.includes('NetworkError') ||
    msg.includes('404')
  );
}

export const api = {
  bootstrap: async (): Promise<BootstrapResponse> => {
    try {
      const serverData = await request<BootstrapResponse>('/api/bootstrap');
      return serverData;
    } catch {
      const local = getLocalStore();
      return {
        homePage: local.homePage,
        contact: local.contact,
        firebaseConfig: local.firebaseConfig,
        products: local.products,
        activeCoupons: local.coupons
          .filter((c) => c.active === 1)
          .map(({ code, type, value, min_order, description }) => ({
            code,
            type,
            value,
            min_order,
            description,
          })),
      };
    }
  },

  checkAdmin: async (email: string) => {
    try {
      return await request<{ isAdmin: boolean; role: string | null }>(
        `/api/auth/check-admin?email=${encodeURIComponent(email)}`
      );
    } catch {
      const local = getLocalStore();
      const found = local.adminEmails.find((a) => a.email.toLowerCase() === email.trim().toLowerCase());
      return { isAdmin: Boolean(found), role: found?.role || null };
    }
  },

  validateCoupon: async (code: string, subtotal: number) => {
    try {
      return await request<{
        valid: boolean;
        discountAmount: number;
        coupon: { code: string; type: 'percent' | 'fixed'; value: number; description: string };
        message: string;
      }>('/api/coupons/validate', {
        method: 'POST',
        body: JSON.stringify({ code, subtotal }),
      });
    } catch (err) {
      if (!isApiHttpError(err)) throw err;
      const local = getLocalStore();
      const clean = code.trim().toUpperCase();
      const coupon = local.coupons.find((c) => c.code.toUpperCase() === clean);
      if (!coupon) throw new Error('Invalid coupon code.');
      if (!coupon.active) throw new Error('This coupon code is currently inactive.');
      if (subtotal < coupon.min_order) {
        throw new Error(`Minimum order of Rs. ${coupon.min_order.toLocaleString()} required for ${coupon.code}.`);
      }
      const discountAmount =
        coupon.type === 'percent' ? Math.round((subtotal * coupon.value) / 100) : Math.min(subtotal, coupon.value);
      return {
        valid: true,
        discountAmount,
        coupon: { code: coupon.code, type: coupon.type, value: coupon.value, description: coupon.description },
        message: `${coupon.code} applied! You saved Rs. ${discountAmount.toLocaleString()}.`,
      };
    }
  },

  subscribe: async (email: string, name = '', source = 'footer') => {
    try {
      return await request<{ ok: boolean; message: string }>('/api/subscribers', {
        method: 'POST',
        body: JSON.stringify({ email, name, source }),
      });
    } catch (err) {
      if (!isApiHttpError(err)) throw err;
      const local = getLocalStore();
      const clean = email.trim().toLowerCase();
      if (!local.subscribers.some((s) => s.email.toLowerCase() === clean)) {
        local.subscribers.unshift({
          id: Date.now(),
          email: clean,
          name,
          source,
          created_at: new Date().toISOString(),
        });
        saveLocalStore(local);
      }
      return { ok: true, message: 'Thank you for joining GlowandGrow!' };
    }
  },

  createOrder: async (payload: Record<string, unknown>) => {
    try {
      return await request<{
        ok: boolean;
        order: {
          id: number;
          order_number: string;
          subtotal: number;
          discount_amount: number;
          shipping_fee: number;
          total: number;
          coupon_code: string;
        };
      }>('/api/orders', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
    } catch (err) {
      if (!isApiHttpError(err)) throw err;
      const local = getLocalStore();
      const items = (payload.items as { price: number; quantity: number }[]) || [];
      const subtotal = items.reduce((s, i) => s + i.price * i.quantity, 0);
      const orderNumber = `GG-${Date.now().toString().slice(-6)}`;
      const shippingFee = subtotal >= local.homePage.freeShippingThreshold ? 0 : local.homePage.shippingFee;
      const order: Order = {
        id: Date.now(),
        order_number: orderNumber,
        customer_name: String(payload.customer_name || ''),
        customer_email: String(payload.customer_email || ''),
        customer_phone: String(payload.customer_phone || ''),
        city: String(payload.city || ''),
        address: String(payload.address || ''),
        items_json: JSON.stringify(items),
        subtotal,
        discount_amount: 0,
        coupon_code: String(payload.coupon_code || ''),
        shipping_fee: shippingFee,
        total: subtotal + shippingFee,
        payment_method: String(payload.payment_method || 'COD'),
        order_note: String(payload.order_note || ''),
        status: 'Pending',
        created_at: new Date().toISOString(),
      };
      local.orders.unshift(order);
      saveLocalStore(local);
      return {
        ok: true,
        order: {
          id: order.id,
          order_number: orderNumber,
          subtotal,
          discount_amount: 0,
          shipping_fee: shippingFee,
          total: order.total,
          coupon_code: order.coupon_code,
        },
      };
    }
  },

  updateHomePage: async (data: Partial<HomePageSettings>, adminEmail: string) => {
    try {
      return await request<{ ok: boolean; homePage: HomePageSettings }>(
        '/api/admin/home',
        { method: 'PUT', body: JSON.stringify(data) },
        adminEmail
      );
    } catch (err) {
      if (!isApiHttpError(err)) throw err;
      const local = getLocalStore();
      local.homePage = { ...local.homePage, ...data };
      saveLocalStore(local);
      return { ok: true, homePage: local.homePage };
    }
  },

  updateContact: async (data: Partial<ContactSettings>, adminEmail: string) => {
    try {
      return await request<{ ok: boolean; contact: ContactSettings }>(
        '/api/admin/contact',
        { method: 'PUT', body: JSON.stringify(data) },
        adminEmail
      );
    } catch (err) {
      if (!isApiHttpError(err)) throw err;
      const local = getLocalStore();
      local.contact = { ...local.contact, ...data };
      saveLocalStore(local);
      return { ok: true, contact: local.contact };
    }
  },

  updateFirebaseConfig: async (data: FirebaseConfig, adminEmail: string) => {
    try {
      return await request<{ ok: boolean; firebaseConfig: FirebaseConfig }>(
        '/api/admin/firebase',
        { method: 'PUT', body: JSON.stringify(data) },
        adminEmail
      );
    } catch (err) {
      if (!isApiHttpError(err)) throw err;
      const local = getLocalStore();
      local.firebaseConfig = data;
      saveLocalStore(local);
      return { ok: true, firebaseConfig: data };
    }
  },

  getEmails: async (adminEmail: string) => {
    try {
      return await request<{ subscribers: Subscriber[]; adminEmails: AdminEmail[] }>(
        '/api/admin/emails',
        {},
        adminEmail
      );
    } catch {
      const local = getLocalStore();
      return { subscribers: local.subscribers, adminEmails: local.adminEmails };
    }
  },

  addSubscriber: async (email: string, name: string, adminEmail: string) => {
    try {
      return await request<{ ok: boolean; subscribers: Subscriber[] }>(
        '/api/admin/subscribers',
        { method: 'POST', body: JSON.stringify({ email, name }) },
        adminEmail
      );
    } catch (err) {
      if (!isApiHttpError(err)) throw err;
      const local = getLocalStore();
      local.subscribers.unshift({
        id: Date.now(),
        email: email.trim().toLowerCase(),
        name,
        source: 'admin',
        created_at: new Date().toISOString(),
      });
      saveLocalStore(local);
      return { ok: true, subscribers: local.subscribers };
    }
  },

  deleteSubscriber: async (id: number, adminEmail: string) => {
    try {
      return await request<{ ok: boolean; subscribers: Subscriber[] }>(
        `/api/admin/subscribers/${id}`,
        { method: 'DELETE' },
        adminEmail
      );
    } catch (err) {
      if (!isApiHttpError(err)) throw err;
      const local = getLocalStore();
      local.subscribers = local.subscribers.filter((s) => s.id !== id);
      saveLocalStore(local);
      return { ok: true, subscribers: local.subscribers };
    }
  },

  addAdminEmail: async (email: string, role: string, adminEmail: string) => {
    try {
      return await request<{ ok: boolean; adminEmails: AdminEmail[] }>(
        '/api/admin/admin-emails',
        { method: 'POST', body: JSON.stringify({ email, role }) },
        adminEmail
      );
    } catch (err) {
      if (!isApiHttpError(err)) throw err;
      const local = getLocalStore();
      local.adminEmails.push({
        id: Date.now(),
        email: email.trim().toLowerCase(),
        role,
        added_by: adminEmail,
        created_at: new Date().toISOString(),
      });
      saveLocalStore(local);
      return { ok: true, adminEmails: local.adminEmails };
    }
  },

  deleteAdminEmail: async (id: number, adminEmail: string) => {
    try {
      return await request<{ ok: boolean; adminEmails: AdminEmail[] }>(
        `/api/admin/admin-emails/${id}`,
        { method: 'DELETE' },
        adminEmail
      );
    } catch (err) {
      if (!isApiHttpError(err)) throw err;
      const local = getLocalStore();
      local.adminEmails = local.adminEmails.filter((a) => a.id !== id);
      saveLocalStore(local);
      return { ok: true, adminEmails: local.adminEmails };
    }
  },

  getCoupons: async (adminEmail: string) => {
    try {
      return await request<{ coupons: Coupon[] }>('/api/admin/coupons', {}, adminEmail);
    } catch {
      const local = getLocalStore();
      return { coupons: local.coupons };
    }
  },

  createCoupon: async (coupon: Partial<Coupon>, adminEmail: string) => {
    try {
      return await request<{ ok: boolean; coupons: Coupon[] }>(
        '/api/admin/coupons',
        { method: 'POST', body: JSON.stringify(coupon) },
        adminEmail
      );
    } catch (err) {
      if (!isApiHttpError(err)) throw err;
      const local = getLocalStore();
      local.coupons.unshift({
        id: Date.now(),
        code: String(coupon.code || '').toUpperCase(),
        type: coupon.type || 'percent',
        value: Number(coupon.value || 10),
        min_order: Number(coupon.min_order || 0),
        max_uses: coupon.max_uses || null,
        used_count: 0,
        expires_at: coupon.expires_at || null,
        active: 1,
        description: coupon.description || '',
      });
      saveLocalStore(local);
      return { ok: true, coupons: local.coupons };
    }
  },

  updateCoupon: async (id: number, coupon: Partial<Coupon>, adminEmail: string) => {
    try {
      return await request<{ ok: boolean; coupons: Coupon[] }>(
        `/api/admin/coupons/${id}`,
        { method: 'PUT', body: JSON.stringify(coupon) },
        adminEmail
      );
    } catch (err) {
      if (!isApiHttpError(err)) throw err;
      const local = getLocalStore();
      local.coupons = local.coupons.map((c) => (c.id === id ? { ...c, ...coupon } : c));
      saveLocalStore(local);
      return { ok: true, coupons: local.coupons };
    }
  },

  deleteCoupon: async (id: number, adminEmail: string) => {
    try {
      return await request<{ ok: boolean; coupons: Coupon[] }>(
        `/api/admin/coupons/${id}`,
        { method: 'DELETE' },
        adminEmail
      );
    } catch (err) {
      if (!isApiHttpError(err)) throw err;
      const local = getLocalStore();
      local.coupons = local.coupons.filter((c) => c.id !== id);
      saveLocalStore(local);
      return { ok: true, coupons: local.coupons };
    }
  },

  createProduct: async (product: Partial<Product>, adminEmail: string) => {
    try {
      return await request<{ ok: boolean; products: Product[] }>(
        '/api/admin/products',
        { method: 'POST', body: JSON.stringify(product) },
        adminEmail
      );
    } catch (err) {
      if (!isApiHttpError(err)) throw err;
      const local = getLocalStore();
      local.products.push({
        id: Date.now(),
        slug: `product-${Date.now()}`,
        name: product.name || 'New Product',
        category: product.category || 'Face Care',
        concern: product.concern || 'Glow',
        price: Number(product.price || 1500),
        compare_at_price: Number(product.compare_at_price || product.price || 1500),
        size: product.size || '30 ML',
        badge: product.badge || '',
        is_bestseller: product.is_bestseller || 0,
        is_bundle: product.is_bundle || 0,
        rating: 4.9,
        reviews_count: 1,
        image: product.image || '/images/brightening-serum.jpg',
        description: product.description || '',
        ingredients: product.ingredients || '',
        how_to_use: product.how_to_use || '',
        in_stock: 1,
      });
      saveLocalStore(local);
      return { ok: true, products: local.products };
    }
  },

  updateProduct: async (id: number, product: Partial<Product>, adminEmail: string) => {
    try {
      return await request<{ ok: boolean; products: Product[] }>(
        `/api/admin/products/${id}`,
        { method: 'PUT', body: JSON.stringify(product) },
        adminEmail
      );
    } catch (err) {
      if (!isApiHttpError(err)) throw err;
      const local = getLocalStore();
      local.products = local.products.map((p) => (p.id === id ? { ...p, ...product } : p));
      saveLocalStore(local);
      return { ok: true, products: local.products };
    }
  },

  deleteProduct: async (id: number, adminEmail: string) => {
    try {
      return await request<{ ok: boolean; products: Product[] }>(
        `/api/admin/products/${id}`,
        { method: 'DELETE' },
        adminEmail
      );
    } catch (err) {
      if (!isApiHttpError(err)) throw err;
      const local = getLocalStore();
      local.products = local.products.filter((p) => p.id !== id);
      saveLocalStore(local);
      return { ok: true, products: local.products };
    }
  },

  getOrders: async (adminEmail: string) => {
    try {
      return await request<{ orders: Order[] }>('/api/admin/orders', {}, adminEmail);
    } catch {
      const local = getLocalStore();
      return { orders: local.orders };
    }
  },

  updateOrderStatus: async (id: number, status: string, adminEmail: string) => {
    try {
      return await request<{ ok: boolean; orders: Order[] }>(
        `/api/admin/orders/${id}`,
        { method: 'PATCH', body: JSON.stringify({ status }) },
        adminEmail
      );
    } catch (err) {
      if (!isApiHttpError(err)) throw err;
      const local = getLocalStore();
      local.orders = local.orders.map((o) => (o.id === id ? { ...o, status } : o));
      saveLocalStore(local);
      return { ok: true, orders: local.orders };
    }
  },
};
