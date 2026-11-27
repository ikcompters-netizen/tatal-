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

async function request<T>(url: string, options: RequestInit = {}, adminEmail?: string): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };
  if (adminEmail) {
    headers['X-Admin-Email'] = adminEmail;
  }

  const res = await fetch(url, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || data.message || `Request failed (${res.status})`);
  }
  return data as T;
}

export const api = {
  bootstrap: () => request<BootstrapResponse>('/api/bootstrap'),

  checkAdmin: (email: string) =>
    request<{ isAdmin: boolean; role: string | null }>(`/api/auth/check-admin?email=${encodeURIComponent(email)}`),

  validateCoupon: (code: string, subtotal: number) =>
    request<{
      valid: boolean;
      discountAmount: number;
      coupon: { code: string; type: 'percent' | 'fixed'; value: number; description: string };
      message: string;
    }>('/api/coupons/validate', {
      method: 'POST',
      body: JSON.stringify({ code, subtotal }),
    }),

  subscribe: (email: string, name = '', source = 'footer') =>
    request<{ ok: boolean; message: string }>('/api/subscribers', {
      method: 'POST',
      body: JSON.stringify({ email, name, source }),
    }),

  createOrder: (payload: Record<string, unknown>) =>
    request<{
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
    }),

  // Admin endpoints
  updateHomePage: (data: Partial<HomePageSettings>, adminEmail: string) =>
    request<{ ok: boolean; homePage: HomePageSettings }>(
      '/api/admin/home',
      { method: 'PUT', body: JSON.stringify(data) },
      adminEmail
    ),

  updateContact: (data: Partial<ContactSettings>, adminEmail: string) =>
    request<{ ok: boolean; contact: ContactSettings }>(
      '/api/admin/contact',
      { method: 'PUT', body: JSON.stringify(data) },
      adminEmail
    ),

  updateFirebaseConfig: (data: FirebaseConfig, adminEmail: string) =>
    request<{ ok: boolean; firebaseConfig: FirebaseConfig }>(
      '/api/admin/firebase',
      { method: 'PUT', body: JSON.stringify(data) },
      adminEmail
    ),

  getEmails: (adminEmail: string) =>
    request<{ subscribers: Subscriber[]; adminEmails: AdminEmail[] }>('/api/admin/emails', {}, adminEmail),

  addSubscriber: (email: string, name: string, adminEmail: string) =>
    request<{ ok: boolean; subscribers: Subscriber[] }>(
      '/api/admin/subscribers',
      { method: 'POST', body: JSON.stringify({ email, name }) },
      adminEmail
    ),

  deleteSubscriber: (id: number, adminEmail: string) =>
    request<{ ok: boolean; subscribers: Subscriber[] }>(
      `/api/admin/subscribers/${id}`,
      { method: 'DELETE' },
      adminEmail
    ),

  addAdminEmail: (email: string, role: string, adminEmail: string) =>
    request<{ ok: boolean; adminEmails: AdminEmail[] }>(
      '/api/admin/admin-emails',
      { method: 'POST', body: JSON.stringify({ email, role }) },
      adminEmail
    ),

  deleteAdminEmail: (id: number, adminEmail: string) =>
    request<{ ok: boolean; adminEmails: AdminEmail[] }>(
      `/api/admin/admin-emails/${id}`,
      { method: 'DELETE' },
      adminEmail
    ),

  getCoupons: (adminEmail: string) => request<{ coupons: Coupon[] }>('/api/admin/coupons', {}, adminEmail),

  createCoupon: (coupon: Partial<Coupon>, adminEmail: string) =>
    request<{ ok: boolean; coupons: Coupon[] }>(
      '/api/admin/coupons',
      { method: 'POST', body: JSON.stringify(coupon) },
      adminEmail
    ),

  updateCoupon: (id: number, coupon: Partial<Coupon>, adminEmail: string) =>
    request<{ ok: boolean; coupons: Coupon[] }>(
      `/api/admin/coupons/${id}`,
      { method: 'PUT', body: JSON.stringify(coupon) },
      adminEmail
    ),

  deleteCoupon: (id: number, adminEmail: string) =>
    request<{ ok: boolean; coupons: Coupon[] }>(
      `/api/admin/coupons/${id}`,
      { method: 'DELETE' },
      adminEmail
    ),

  createProduct: (product: Partial<Product>, adminEmail: string) =>
    request<{ ok: boolean; products: Product[] }>(
      '/api/admin/products',
      { method: 'POST', body: JSON.stringify(product) },
      adminEmail
    ),

  updateProduct: (id: number, product: Partial<Product>, adminEmail: string) =>
    request<{ ok: boolean; products: Product[] }>(
      `/api/admin/products/${id}`,
      { method: 'PUT', body: JSON.stringify(product) },
      adminEmail
    ),

  deleteProduct: (id: number, adminEmail: string) =>
    request<{ ok: boolean; products: Product[] }>(
      `/api/admin/products/${id}`,
      { method: 'DELETE' },
      adminEmail
    ),

  getOrders: (adminEmail: string) => request<{ orders: Order[] }>('/api/admin/orders', {}, adminEmail),

  updateOrderStatus: (id: number, status: string, adminEmail: string) =>
    request<{ ok: boolean; orders: Order[] }>(
      `/api/admin/orders/${id}`,
      { method: 'PATCH', body: JSON.stringify({ status }) },
      adminEmail
    ),
};
