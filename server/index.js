import express from 'express';
import cors from 'cors';
import { db, initDatabase, getBootstrapData, setSetting } from './db.js';

initDatabase();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '2mb' }));

// Helper to verify admin email against whitelist
function isAdminEmail(email) {
  if (!email) return false;
  const clean = String(email).trim().toLowerCase();
  const row = db.prepare('SELECT id FROM admin_emails WHERE lower(email) = ?').get(clean);
  return Boolean(row);
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

// Public bootstrap
app.get('/api/bootstrap', (req, res) => {
  res.json(getBootstrapData());
});

// Check if email is an authorized admin
app.get('/api/auth/check-admin', (req, res) => {
  const email = String(req.query.email || '').trim().toLowerCase();
  const row = db.prepare('SELECT email, role FROM admin_emails WHERE lower(email) = ?').get(email);
  res.json({ isAdmin: Boolean(row), role: row?.role || null });
});

// Validate coupon code
app.post('/api/coupons/validate', (req, res) => {
  const code = String(req.body?.code || '').trim().toUpperCase();
  const subtotal = Number(req.body?.subtotal || 0);

  if (!code) {
    return res.status(400).json({ valid: false, message: 'Please enter a coupon code.' });
  }

  const coupon = db.prepare('SELECT * FROM coupons WHERE upper(code) = ?').get(code);
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

  let discountAmount = 0;
  if (coupon.type === 'percent') {
    discountAmount = Math.round((subtotal * coupon.value) / 100);
  } else {
    discountAmount = Math.min(subtotal, coupon.value);
  }

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

// Public newsletter signup
app.post('/api/subscribers', (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const name = String(req.body?.name || '').trim();
  const source = String(req.body?.source || 'footer').trim();

  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Please enter a valid email address.' });
  }

  try {
    db.prepare(`
      INSERT INTO subscribers (email, name, source) VALUES (?, ?, ?)
      ON CONFLICT(email) DO UPDATE SET name = COALESCE(NULLIF(excluded.name, ''), subscribers.name)
    `).run(email, name, source);
    res.json({ ok: true, message: 'Thank you for joining GlowandGrow!' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create order
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

  const subtotal = items.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0);
  const homeRow = db.prepare("SELECT value FROM settings WHERE key = 'homePage'").get();
  const homeSettings = homeRow ? JSON.parse(homeRow.value) : { freeShippingThreshold: 4000, shippingFee: 250 };

  let discountAmount = 0;
  let appliedCode = '';

  if (coupon_code) {
    const cleanCode = String(coupon_code).trim().toUpperCase();
    const coupon = db.prepare('SELECT * FROM coupons WHERE upper(code) = ? AND active = 1').get(cleanCode);
    if (coupon && subtotal >= coupon.min_order && (!coupon.max_uses || coupon.used_count < coupon.max_uses)) {
      discountAmount =
        coupon.type === 'percent' ? Math.round((subtotal * coupon.value) / 100) : Math.min(subtotal, coupon.value);
      appliedCode = coupon.code;
      db.prepare('UPDATE coupons SET used_count = used_count + 1 WHERE id = ?').run(coupon.id);
    }
  }

  const afterDiscount = Math.max(0, subtotal - discountAmount);
  const shippingFee = afterDiscount >= (homeSettings.freeShippingThreshold || 4000) ? 0 : (homeSettings.shippingFee || 250);
  const total = afterDiscount + shippingFee;
  const orderNumber = `GG-${Date.now().toString().slice(-6)}`;

  const result = db.prepare(`
    INSERT INTO orders (
      order_number, customer_name, customer_email, customer_phone, city, address,
      items_json, subtotal, discount_amount, coupon_code, shipping_fee, total,
      payment_method, order_note, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending')
  `).run(
    orderNumber,
    customer_name,
    customer_email.trim().toLowerCase(),
    customer_phone,
    city,
    address,
    JSON.stringify(items),
    subtotal,
    discountAmount,
    appliedCode,
    shippingFee,
    total,
    payment_method,
    order_note
  );

  if (subscribe && customer_email.includes('@')) {
    db.prepare(`
      INSERT INTO subscribers (email, name, source) VALUES (?, ?, 'checkout')
      ON CONFLICT(email) DO NOTHING
    `).run(customer_email.trim().toLowerCase(), customer_name);
  }

  res.json({
    ok: true,
    order: {
      id: result.lastInsertRowid,
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
  const currentRow = db.prepare("SELECT value FROM settings WHERE key = 'homePage'").get();
  const current = currentRow ? JSON.parse(currentRow.value) : {};
  const updated = { ...current, ...req.body };
  setSetting('homePage', updated);
  res.json({ ok: true, homePage: updated });
});

app.put('/api/admin/contact', requireAdmin, (req, res) => {
  const currentRow = db.prepare("SELECT value FROM settings WHERE key = 'contact'").get();
  const current = currentRow ? JSON.parse(currentRow.value) : {};
  const updated = { ...current, ...req.body };
  setSetting('contact', updated);
  res.json({ ok: true, contact: updated });
});

// Allow saving Firebase config (available to admin or during initial Firebase setup)
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
  const updated = {
    apiKey: apiKey.trim(),
    authDomain: authDomain.trim(),
    projectId: projectId.trim(),
    storageBucket: storageBucket.trim(),
    messagingSenderId: messagingSenderId.trim(),
    appId: appId.trim(),
    measurementId: measurementId.trim(),
  };
  setSetting('firebaseConfig', updated);
  res.json({ ok: true, firebaseConfig: updated });
});

// Emails management (subscribers + admin whitelist)
app.get('/api/admin/emails', requireAdmin, (req, res) => {
  const subscribers = db.prepare('SELECT * FROM subscribers ORDER BY id DESC').all();
  const adminEmails = db.prepare('SELECT * FROM admin_emails ORDER BY id ASC').all();
  res.json({ subscribers, adminEmails });
});

app.post('/api/admin/subscribers', requireAdmin, (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const name = String(req.body?.name || '').trim();
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email is required.' });
  }
  db.prepare(`
    INSERT INTO subscribers (email, name, source) VALUES (?, ?, 'admin')
    ON CONFLICT(email) DO UPDATE SET name = excluded.name
  `).run(email, name);
  const subscribers = db.prepare('SELECT * FROM subscribers ORDER BY id DESC').all();
  res.json({ ok: true, subscribers });
});

app.delete('/api/admin/subscribers/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM subscribers WHERE id = ?').run(Number(req.params.id));
  const subscribers = db.prepare('SELECT * FROM subscribers ORDER BY id DESC').all();
  res.json({ ok: true, subscribers });
});

app.post('/api/admin/admin-emails', requireAdmin, (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  const role = String(req.body?.role || 'Admin').trim();
  const addedBy = String(req.headers['x-admin-email'] || 'admin');
  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid email is required.' });
  }
  db.prepare(`
    INSERT INTO admin_emails (email, role, added_by) VALUES (?, ?, ?)
    ON CONFLICT(email) DO UPDATE SET role = excluded.role
  `).run(email, role, addedBy);
  const adminEmails = db.prepare('SELECT * FROM admin_emails ORDER BY id ASC').all();
  res.json({ ok: true, adminEmails });
});

app.delete('/api/admin/admin-emails/:id', requireAdmin, (req, res) => {
  const target = db.prepare('SELECT * FROM admin_emails WHERE id = ?').get(Number(req.params.id));
  const totalAdmins = db.prepare('SELECT COUNT(*) as count FROM admin_emails').get().count;
  if (totalAdmins <= 1) {
    return res.status(400).json({ error: 'Cannot remove the last admin email.' });
  }
  if (target && target.email.toLowerCase() === String(req.headers['x-admin-email'] || '').toLowerCase()) {
    return res.status(400).json({ error: 'You cannot remove your own currently signed-in admin email.' });
  }
  db.prepare('DELETE FROM admin_emails WHERE id = ?').run(Number(req.params.id));
  const adminEmails = db.prepare('SELECT * FROM admin_emails ORDER BY id ASC').all();
  res.json({ ok: true, adminEmails });
});

// Coupons CRUD
app.get('/api/admin/coupons', requireAdmin, (req, res) => {
  const coupons = db.prepare('SELECT * FROM coupons ORDER BY id DESC').all();
  res.json({ coupons });
});

app.post('/api/admin/coupons', requireAdmin, (req, res) => {
  const { code, type = 'percent', value, min_order = 0, max_uses = null, expires_at = null, active = 1, description = '' } = req.body || {};
  const cleanCode = String(code || '').trim().toUpperCase();
  if (!cleanCode || !value || Number(value) <= 0) {
    return res.status(400).json({ error: 'Coupon code and positive discount value are required.' });
  }
  try {
    db.prepare(`
      INSERT INTO coupons (code, type, value, min_order, max_uses, expires_at, active, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(cleanCode, type, Number(value), Number(min_order || 0), max_uses ? Number(max_uses) : null, expires_at || null, active ? 1 : 0, description);
    const coupons = db.prepare('SELECT * FROM coupons ORDER BY id DESC').all();
    res.json({ ok: true, coupons });
  } catch (err) {
    res.status(400).json({ error: err.message.includes('UNIQUE') ? 'Coupon code already exists.' : err.message });
  }
});

app.put('/api/admin/coupons/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM coupons WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Coupon not found.' });

  const {
    code = existing.code,
    type = existing.type,
    value = existing.value,
    min_order = existing.min_order,
    max_uses = existing.max_uses,
    expires_at = existing.expires_at,
    active = existing.active,
    description = existing.description,
  } = req.body || {};

  db.prepare(`
    UPDATE coupons
    SET code = ?, type = ?, value = ?, min_order = ?, max_uses = ?, expires_at = ?, active = ?, description = ?
    WHERE id = ?
  `).run(
    String(code).trim().toUpperCase(),
    type,
    Number(value),
    Number(min_order || 0),
    max_uses ? Number(max_uses) : null,
    expires_at || null,
    active ? 1 : 0,
    description,
    id
  );
  const coupons = db.prepare('SELECT * FROM coupons ORDER BY id DESC').all();
  res.json({ ok: true, coupons });
});

app.delete('/api/admin/coupons/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM coupons WHERE id = ?').run(Number(req.params.id));
  const coupons = db.prepare('SELECT * FROM coupons ORDER BY id DESC').all();
  res.json({ ok: true, coupons });
});

// Products CRUD
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
  const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}-${Date.now().toString().slice(-4)}`;
  db.prepare(`
    INSERT INTO products (
      slug, name, category, concern, price, compare_at_price, size, badge,
      is_bestseller, is_bundle, image, description, ingredients, how_to_use
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    slug,
    name,
    category,
    concern,
    Number(price),
    Number(compare_at_price || price),
    size,
    badge,
    is_bestseller ? 1 : 0,
    is_bundle ? 1 : 0,
    image,
    description,
    ingredients,
    how_to_use
  );

  const products = db.prepare('SELECT * FROM products ORDER BY is_bestseller DESC, id ASC').all();
  res.json({ ok: true, products });
});

app.put('/api/admin/products/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const existing = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Product not found.' });

  const updated = { ...existing, ...req.body };
  db.prepare(`
    UPDATE products
    SET name = ?, category = ?, concern = ?, price = ?, compare_at_price = ?, size = ?,
        badge = ?, is_bestseller = ?, is_bundle = ?, image = ?, description = ?,
        ingredients = ?, how_to_use = ?, in_stock = ?
    WHERE id = ?
  `).run(
    updated.name,
    updated.category,
    updated.concern,
    Number(updated.price),
    Number(updated.compare_at_price),
    updated.size,
    updated.badge || '',
    updated.is_bestseller ? 1 : 0,
    updated.is_bundle ? 1 : 0,
    updated.image,
    updated.description,
    updated.ingredients,
    updated.how_to_use,
    updated.in_stock ? 1 : 0,
    id
  );
  const products = db.prepare('SELECT * FROM products ORDER BY is_bestseller DESC, id ASC').all();
  res.json({ ok: true, products });
});

app.delete('/api/admin/products/:id', requireAdmin, (req, res) => {
  db.prepare('DELETE FROM products WHERE id = ?').run(Number(req.params.id));
  const products = db.prepare('SELECT * FROM products ORDER BY is_bestseller DESC, id ASC').all();
  res.json({ ok: true, products });
});

// Orders management
app.get('/api/admin/orders', requireAdmin, (req, res) => {
  const orders = db.prepare('SELECT * FROM orders ORDER BY id DESC').all();
  res.json({ orders });
});

app.patch('/api/admin/orders/:id', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const status = String(req.body?.status || 'Pending');
  db.prepare('UPDATE orders SET status = ? WHERE id = ?').run(status, id);
  const orders = db.prepare('SELECT * FROM orders ORDER BY id DESC').all();
  res.json({ ok: true, orders });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`GlowandGrow API server running on http://0.0.0.0:${PORT}`);
});
