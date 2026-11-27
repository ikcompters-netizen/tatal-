import express from 'express';
import cors from 'cors';
import { getBootstrapData, getStore, saveStore } from './db.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '2mb' }));

function isAdminEmail(email) {
  if (!email) return false;
  const clean = String(email).trim().toLowerCase();
  const store = getStore();
  return store.admin_emails.some((a) => a.email.toLowerCase() === clean);
}

function requireAdmin(req, res, next) {
  const adminEmail = req.headers['x-admin-email'];
  if (!isAdminEmail(adminEmail)) {
    return res.status(403).json({
      error: 'Admin access denied. Sign in with an authorized admin email.',
    });
  }
  next();
}

app.get('/api/bootstrap', (_req, res) => {
  res.json(getBootstrapData());
});

app.get('/api/auth/check-admin', (req, res) => {
  const email = String(req.query.email || '').trim().toLowerCase();
  const store = getStore();
  const row = store.admin_emails.find((a) => a.email.toLowerCase() === email);
  res.json({ isAdmin: Boolean(row), role: row?.role || null });
});

app.post('/api/coupons/validate', (req, res) => {
  const code = String(req.body?.code || '').trim().toUpperCase();
  const subtotal = Number(req.body?.subtotal || 0);

  if (!code) {
    return res.status(400).json({ valid: false, message: 'Please enter a coupon code.' });
  }

  const store = getStore();
  const coupon = store.coupons.find((c) => c.code.toUpperCase() === code);
  if (!coupon) {
    return res.status(404).json({ valid: false, message: 'Invalid coupon code.' });
  }
  if (!coupon.active) {
    return res.status(400).json({ valid: false, message: 'This coupon code is currently inactive.' });
  }
  if (coupon.expires_at && new Date(coupon.expires_at) < new Date(new Date().toDateString())) {
    return res.status(400).json({ valid: false, message: 'This coupon code has expired.' });
  }
  if (coupon.max_uses && coupon.used_count >= coupon.max_uses) {
    return res.status(400).json({ valid: false, message: 'This coupon has reached its maximum usage limit.' });
  }
  if (subtotal < coupon.min_order) {
    return res.status(400).json({
      valid: false,
      message: `Minimum order of Rs. ${coupon.min_order.toLocaleString()} required for ${coupon.code}.`,
    });
  }

  const discountAmount =
    coupon.type === 'percent' ? Math.round((subtotal * coupon.value) / 100) : Math.min(subtotal, coupon.value);

  return res.json({
    valid: true,
    discountAmount,
    coupon: {
      code: coupon.code,
      type: coupon.type,
      value: coupon.value,
      description: coupon.description,
    },
    message:
      coupon.type === 'percent'
        ? `${coupon.code} applied! You saved ${coupon.value}% (Rs. ${discountAmount.toLocaleString()}).`
        : `${coupon.code} applied! You saved Rs. ${discountAmount.toLocaleString()}.`,
  });
});

app.post('/api/subscribers', (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const name = String(req.body?.name || '').trim();
  const source = String(req.body?.source || 'footer').trim();

  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }

  const store = getStore();
  const existing = store.subscribers.find((s) => s.email.toLowerCase() === email);
  if (existing) {
    if (name) existing.name = name;
  } else {
    store.subscribers.unshift({
      id: store.nextId.subscribers++,
      email,
      name,
      source,
      created_at: new Date().toISOString(),
    });
  }
  saveStore();
  res.json({ ok: true, message: 'Thank you for joining GlowandGrow!' });
});

app.post('/api/orders', (req, res) => {
  const {
    customer_name,
    customer_email,
    customer_phone,
    city,
    address,
    items,
    coupon_code,
    payment_method = 'COD',
    order_note = '',
    subscribe = true,
  } = req.body || {};

  if (!customer_name || !customer_email || !customer_phone || !city || !address || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Please complete all required shipping details.' });
  }

  const store = getStore();
  const subtotal = items.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0);
  const homeSettings = store.settings.homePage;

  let discountAmount = 0;
  let appliedCode = '';

  if (coupon_code) {
    const cleanCode = String(coupon_code).trim().toUpperCase();
    const coupon = store.coupons.find((c) => c.code.toUpperCase() === cleanCode && c.active === 1);
    if (coupon && subtotal >= coupon.min_order && (!coupon.max_uses || coupon.used_count < coupon.max_uses)) {
      discountAmount =
        coupon.type === 'percent' ? Math.round((subtotal * coupon.value) / 100) : Math.min(subtotal, coupon.value);
      appliedCode = coupon.code;
      coupon.used_count += 1;
    }
  }

  const afterDiscount = Math.max(0, subtotal - discountAmount);
  const shippingFee = afterDiscount >= (homeSettings.freeShippingThreshold || 4000) ? 0 : (homeSettings.shippingFee || 250);
  const total = afterDiscount + shippingFee;
  const orderNumber = `GG-${Date.now().toString().slice(-6)}`;

  const order = {
    id: store.nextId.orders++,
    order_number: orderNumber,
    customer_name,
    customer_email: customer_email.trim().toLowerCase(),
    customer_phone,
    city,
    address,
    items_json: JSON.stringify(items),
    subtotal,
    discount_amount: discountAmount,
    coupon_code: appliedCode,
    shipping_fee: shippingFee,
    total,
    payment_method,
    order_note,
    status: 'Pending',
    created_at: new Date().toISOString(),
  };

  store.orders.unshift(order);

  if (subscribe && customer_email.includes('@')) {
    const cleanEmail = customer_email.trim().toLowerCase();
    if (!store.subscribers.some((s) => s.email.toLowerCase() === cleanEmail)) {
      store.subscribers.unshift({
        id: store.nextId.subscribers++,
        email: cleanEmail,
        name: customer_name,
        source: 'checkout',
        created_at: new Date().toISOString(),
      });
    }
  }

  saveStore();
  res.json({
    ok: true,
    order: {
      id: order.id,
      order_number: orderNumber,
      subtotal,
      discount_amount: discountAmount,
      shipping_fee: shippingFee,
      total,
      coupon_code: appliedCode,
    },
  });
});

// ================= ADMIN ENDPOINTS =================

app.put('/api/admin/home', requireAdmin, (req, res) => {
  const store = getStore();
  store.settings.homePage = { ...store.settings.homePage, ...req.body };
  saveStore();
  res.json({ ok: true, homePage: store.settings.homePage });
});

app.put('/api/admin/contact', requireAdmin, (req, res) => {
  const store = getStore();
  store.settings.contact = { ...store.settings.contact, ...req.body };
  saveStore();
  res.json({ ok: true, contact: store.settings.contact });
});

app.put('/api/admin/firebase', requireAdmin, (req, res) => {
  const {
    apiKey = '',
    authDomain = '',
    projectId = '',
    storageBucket = '',
    messagingSenderId = '',
    appId = '',
    measurementId = '',
  } = req.body || {};
  const store = getStore();
  store.settings.firebaseConfig = {
    apiKey: apiKey.trim(),
    authDomain: authDomain.trim(),
    projectId: projectId.trim(),
    storageBucket: storageBucket.trim(),
    messagingSenderId: messagingSenderId.trim(),
    appId: appId.trim(),
    measurementId: measurementId.trim(),
  };
  saveStore();
  res.json({ ok: true, firebaseConfig: store.settings.firebaseConfig });
});

app.get('/api/admin/emails', requireAdmin, (_req, res) => {
  const store = getStore();
  res.json({ subscribers: store.subscribers, adminEmails: store.admin_emails });
});

app.post('/api/admin/subscribers', requireAdmin, (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const name = String(req.body?.name || '').trim();
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email is required.' });
  }
  const store = getStore();
  const existing = store.subscribers.find((s) => s.email.toLowerCase() === email);
  if (existing) {
    existing.name = name;
  } else {
    store.subscribers.unshift({
      id: store.nextId.subscribers++,
      email,
      name,
      source: 'admin',
      created_at: new Date().toISOString(),
    });
  }
  saveStore();
  res.json({ ok: true, subscribers: store.subscribers });
});

app.delete('/api/admin/subscribers/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const store = getStore();
  store.subscribers = store.subscribers.filter((s) => s.id !== id);
  saveStore();
  res.json({ ok: true, subscribers: store.subscribers });
});

app.post('/api/admin/admin-emails', requireAdmin, (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const role = String(req.body?.role || 'Admin').trim();
  const addedBy = String(req.headers['x-admin-email'] || 'admin');
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email is required.' });
  }
  const store = getStore();
  const existing = store.admin_emails.find((a) => a.email.toLowerCase() === email);
  if (existing) {
    existing.role = role;
  } else {
    store.admin_emails.push({
      id: store.nextId.admin_emails++,
      email,
      role,
      added_by: addedBy,
      created_at: new Date().toISOString(),
    });
  }
  saveStore();
  res.json({ ok: true, adminEmails: store.admin_emails });
});

app.delete('/api/admin/admin-emails/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const store = getStore();
  if (store.admin_emails.length <= 1) {
    return res.status(400).json({ error: 'Cannot remove the last admin email.' });
  }
  const target = store.admin_emails.find((a) => a.id === id);
  if (target && target.email.toLowerCase() === String(req.headers['x-admin-email'] || '').toLowerCase()) {
    return res.status(400).json({ error: 'You cannot remove your own currently signed-in admin email.' });
  }
  store.admin_emails = store.admin_emails.filter((a) => a.id !== id);
  saveStore();
  res.json({ ok: true, adminEmails: store.admin_emails });
});

app.get('/api/admin/coupons', requireAdmin, (_req, res) => {
  const store = getStore();
  res.json({ coupons: store.coupons });
});

app.post('/api/admin/coupons', requireAdmin, (req, res) => {
  const {
    code,
    type = 'percent',
    value,
    min_order = 0,
    max_uses = null,
    expires_at = null,
    active = 1,
    description = '',
  } = req.body || {};
  const cleanCode = String(code || '').trim().toUpperCase();
  if (!cleanCode || !value || Number(value) <= 0) {
    return res.status(400).json({ error: 'Coupon code and positive discount value are required.' });
  }
  const store = getStore();
  if (store.coupons.some((c) => c.code.toUpperCase() === cleanCode)) {
    return res.status(400).json({ error: 'Coupon code already exists.' });
  }
  store.coupons.unshift({
    id: store.nextId.coupons++,
    code: cleanCode,
    type,
    value: Number(value),
    min_order: Number(min_order || 0),
    max_uses: max_uses ? Number(max_uses) : null,
    used_count: 0,
    expires_at: expires_at || null,
    active: active ? 1 : 0,
    description,
  });
  saveStore();
  res.json({ ok: true, coupons: store.coupons });
});

app.put('/api/admin/coupons/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const store = getStore();
  const idx = store.coupons.findIndex((c) => c.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Coupon not found.' });

  const existing = store.coupons[idx];
  const updated = { ...existing, ...req.body };
  updated.code = String(updated.code).trim().toUpperCase();
  updated.value = Number(updated.value);
  updated.min_order = Number(updated.min_order || 0);
  updated.max_uses = updated.max_uses ? Number(updated.max_uses) : null;
  updated.active = updated.active ? 1 : 0;
  store.coupons[idx] = updated;
  saveStore();
  res.json({ ok: true, coupons: store.coupons });
});

app.delete('/api/admin/coupons/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const store = getStore();
  store.coupons = store.coupons.filter((c) => c.id !== id);
  saveStore();
  res.json({ ok: true, coupons: store.coupons });
});

app.post('/api/admin/products', requireAdmin, (req, res) => {
  const {
    name,
    category = 'Face Care',
    concern = 'Glow',
    price,
    compare_at_price,
    size = '30 ML',
    badge = '',
    is_bestseller = 0,
    is_bundle = 0,
    image = '/images/brightening-serum.jpg',
    description = '',
    ingredients = '',
    how_to_use = '',
  } = req.body || {};

  if (!name || !price) {
    return res.status(400).json({ error: 'Product name and price are required.' });
  }
  const store = getStore();
  const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}-${Date.now().toString().slice(-4)}`;
  store.products.push({
    id: store.nextId.products++,
    slug,
    name,
    category,
    concern,
    price: Number(price),
    compare_at_price: Number(compare_at_price || price),
    size,
    badge,
    is_bestseller: is_bestseller ? 1 : 0,
    is_bundle: is_bundle ? 1 : 0,
    rating: 4.9,
    reviews_count: 1,
    image,
    description,
    ingredients,
    how_to_use,
    in_stock: 1,
  });
  saveStore();
  res.json({ ok: true, products: store.products });
});

app.put('/api/admin/products/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const store = getStore();
  const idx = store.products.findIndex((p) => p.id === id);
  if (idx === -1) return res.status(404).json({ error: 'Product not found.' });
  store.products[idx] = { ...store.products[idx], ...req.body };
  saveStore();
  res.json({ ok: true, products: store.products });
});

app.delete('/api/admin/products/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const store = getStore();
  store.products = store.products.filter((p) => p.id !== id);
  saveStore();
  res.json({ ok: true, products: store.products });
});

app.get('/api/admin/orders', requireAdmin, (_req, res) => {
  const store = getStore();
  res.json({ orders: store.orders });
});

app.patch('/api/admin/orders/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const status = String(req.body?.status || 'Pending');
  const store = getStore();
  const order = store.orders.find((o) => o.id === id);
  if (order) {
    order.status = status;
    saveStore();
  }
  res.json({ ok: true, orders: store.orders });
});

export default app;
