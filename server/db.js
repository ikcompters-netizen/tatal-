import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
import path from 'node:path';

const dataDir = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'glowandgrow.db');
export const db = new DatabaseSync(dbPath);

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      concern TEXT NOT NULL,
      price INTEGER NOT NULL,
      compare_at_price INTEGER NOT NULL,
      size TEXT NOT NULL DEFAULT '30 ML',
      badge TEXT DEFAULT '',
      is_bestseller INTEGER NOT NULL DEFAULT 0,
      is_bundle INTEGER NOT NULL DEFAULT 0,
      rating REAL NOT NULL DEFAULT 4.9,
      reviews_count INTEGER NOT NULL DEFAULT 42,
      image TEXT NOT NULL,
      description TEXT NOT NULL,
      ingredients TEXT NOT NULL,
      how_to_use TEXT NOT NULL,
      in_stock INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS coupons (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('percent', 'fixed')),
      value INTEGER NOT NULL,
      min_order INTEGER NOT NULL DEFAULT 0,
      max_uses INTEGER,
      used_count INTEGER NOT NULL DEFAULT 0,
      expires_at TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      description TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS subscribers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      name TEXT DEFAULT '',
      source TEXT DEFAULT 'website',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS admin_emails (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      role TEXT NOT NULL DEFAULT 'Admin',
      added_by TEXT DEFAULT 'system',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_number TEXT UNIQUE NOT NULL,
      customer_name TEXT NOT NULL,
      customer_email TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      city TEXT NOT NULL,
      address TEXT NOT NULL,
      items_json TEXT NOT NULL,
      subtotal INTEGER NOT NULL,
      discount_amount INTEGER NOT NULL DEFAULT 0,
      coupon_code TEXT DEFAULT '',
      shipping_fee INTEGER NOT NULL DEFAULT 0,
      total INTEGER NOT NULL,
      payment_method TEXT NOT NULL DEFAULT 'COD',
      order_note TEXT DEFAULT '',
      status TEXT NOT NULL DEFAULT 'Pending',
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );
  `);

  seedDefaults();
}

function getSetting(key) {
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key);
  return row ? JSON.parse(row.value) : null;
}

export function setSetting(key, value) {
  db.prepare(`
    INSERT INTO settings (key, value) VALUES (?, ?)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value
  `).run(key, JSON.stringify(value));
}

function seedDefaults() {
  if (!getSetting('homePage')) {
    setSetting('homePage', {
      announcementText: 'Free Shipping on Orders Over PKR 4,000 • Use Code GLOW10 for 10% OFF',
      freeShippingThreshold: 4000,
      shippingFee: 250,
      heroEyebrow: 'GLOWANDGROW SKINCARE PAKISTAN',
      heroTitle: 'Skincare, Reimagined as Indulgence',
      heroSubtitle:
        'Gourmet-inspired skincare crafted to transform your daily routine into a luxurious sensory ritual where high-performance formulas meet irresistible textures.',
      heroPrimaryCta: 'VIEW PRODUCTS',
      heroSecondaryCta: 'SHOP BESTSELLERS',
      heroImage: '/images/hero-skincare.jpg',
      bannerTitle: 'Beauty That Speaks Your Skin',
      bannerSubtitle:
        'Crafted for the modern Pakistani skincare ritual — luxurious formulas that celebrate every shade, every texture, every mood. Discover cosmetics that are as bold as you are.',
      bannerCta: 'SHOP COLLECTION',
      bannerImage: '/images/secondary-beauty.jpg',
      spotlightEyebrow: 'Radiance Boosting Face Serum',
      spotlightTitle: 'Brightening Face Serum',
      spotlightSubtitle: 'Glow-Enhancing Formula for Brighter, Even-Toned Skin',
      spotlightCta: 'REVEAL YOUR RADIANCE',
      spotlightImage: '/images/brightening-serum.jpg',
      spotlightBenefits: [
        {
          title: 'Brightens & Evens Tone',
          description: 'Reduces dullness and visibly improves skin clarity and luminosity.',
        },
        {
          title: 'Hydrating & Plumping',
          description: 'Infuses multi-layer moisture for soft, supple, bouncy skin all day.',
        },
        {
          title: 'Lightweight & Fast Absorbing',
          description: 'Non-greasy botanical texture perfect for daily AM & PM layering.',
        },
      ],
      faqs: [
        {
          id: 'faq-1',
          question: 'Are your products suitable for all skin types?',
          answer:
            'Yes, our GlowandGrow formulations are dermatologist-tested and designed to be gentle and effective for all skin types, including sensitive and acne-prone skin.',
        },
        {
          id: 'faq-2',
          question: 'Are your products made with safe ingredients?',
          answer:
            'We carefully select high-grade botanical actives, Niacinamide, Vitamin C, and Hyaluronic Acid while avoiding harsh parabens, sulfates, and mercury.',
        },
        {
          id: 'faq-3',
          question: 'How long does it take to see visible results?',
          answer:
            'Most customers notice brighter, calmer, and more hydrated skin within 2–3 weeks of consistent daily use.',
        },
        {
          id: 'faq-4',
          question: 'Can I use multiple GlowandGrow products together?',
          answer:
            'Absolutely. Our serums, cleansers, creams, and masks are formulated to layer effortlessly together as a complete morning and night routine.',
        },
        {
          id: 'faq-5',
          question: 'Do you offer nationwide delivery across Pakistan?',
          answer:
            'Yes! We offer fast Cash on Delivery across Pakistan — Lahore, Karachi, Islamabad, Faisalabad, Multan, Peshawar, and beyond — with free shipping over Rs. 4,000.',
        },
        {
          id: 'faq-6',
          question: 'What is your return & support policy?',
          answer:
            'We offer a 7-day easy return policy on unopened products. Reach out anytime at g8537167@gmail.com or 03396199199 for personalized skincare guidance.',
        },
      ],
    });
  }

  if (!getSetting('contact')) {
    setSetting('contact', {
      brandName: 'GlowandGrow',
      tagline: 'Skincare, Reimagined as Indulgence',
      email: 'g8537167@gmail.com',
      phone: '03396199199',
      whatsapp: '03396199199',
      address: 'Lahore, Punjab, Pakistan',
      instagram: '@glowandgrow.pk',
      shippingPolicy: 'Free Shipping across Pakistan on orders over PKR 4,000. Standard delivery 2–4 working days.',
      returnPolicy: '7-Day Easy Returns & Exchanges',
    });
  }

  const existingFb = getSetting('firebaseConfig');
  if (!existingFb || !existingFb.apiKey) {
    setSetting('firebaseConfig', {
      apiKey: 'AIzaSyAkihoICrF7KyF-D0cH8JmhGgoe1rs0yuY',
      authDomain: 'tatal-8a14e.firebaseapp.com',
      projectId: 'tatal-8a14e',
      storageBucket: 'tatal-8a14e.firebasestorage.app',
      messagingSenderId: '703077657524',
      appId: '1:703077657524:web:07ba36aade3a4b2292e0e1',
      measurementId: 'G-Z4YWK2JGDJ',
    });
  }

  const productCount = db.prepare('SELECT COUNT(*) as count FROM products').get().count;
  if (productCount === 0) {
    const insertProduct = db.prepare(`
      INSERT INTO products (
        slug, name, category, concern, price, compare_at_price, size, badge,
        is_bestseller, is_bundle, rating, reviews_count, image, description, ingredients, how_to_use
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const seedProducts = [
      [
        'day-night-combo-bundle',
        'Day & Night Combo Bundle',
        'Bundles',
        'Brightening',
        2999,
        3598,
        '2 x 30 ML',
        '50% OFF',
        1,
        1,
        4.9,
        184,
        '/images/combo-bundle.jpg',
        'Our signature AM/PM power duo combining the Brightening Vitamin C Serum for daytime radiance and Multi-Action Night Repair Serum for overnight cellular renewal.',
        'Vitamin C (15%), Alpha Arbutin, Niacinamide, Hyaluronic Acid, Peptides, Licorice Root Extract.',
        'Apply 3–4 drops of Brightening Serum every morning before sunscreen, and 3–4 drops of Night Repair Serum on clean skin before bed.',
      ],
      [
        'brightening-face-serum',
        'Brightening Face Serum',
        'Face Care',
        'Brightening',
        1799,
        3550,
        '30 ML',
        'BEST SELLER',
        1,
        0,
        4.9,
        312,
        '/images/brightening-serum.jpg',
        'A radiance-boosting Vitamin C & Niacinamide concentrate formulated to fade dark spots, neutralize dullness, and leave skin visibly luminous.',
        'L-Ascorbic Acid, Niacinamide 5%, Ferulic Acid, Hyaluronic Acid, Rosehip Extract.',
        'Pat 3–4 drops onto damp face and neck every morning after cleansing. Follow with moisturizer and SPF.',
      ],
      [
        'multi-action-night-repair-serum',
        'Multi-Action Night Repair Face Serum',
        'Face Care',
        'Anti-Aging',
        1799,
        3550,
        '30 ML',
        'BEST SELLER',
        1,
        0,
        4.9,
        245,
        '/images/night-repair-serum.jpg',
        'Deeply restorative overnight elixir with bio-peptides and gentle pro-retinol botanicals to smooth fine lines and wake up to plump, glass-like skin.',
        'Collagen Peptides, Bakuchiol, Panthenol (B5), Squalane, Chamomile Distillate.',
        'Smooth 3–4 drops onto cleansed skin every evening before your night cream.',
      ],
      [
        'daily-skin-care-bundle',
        'Daily Skin Care Bundle',
        'Bundles',
        'Glow',
        4000,
        8500,
        '4-Piece Set',
        'VALUE PACK',
        1,
        1,
        5.0,
        129,
        '/images/combo-bundle.jpg',
        'Everything your skin needs in one complete GlowandGrow ritual: Soothing Cleanser, pH 5.5 Toner, Brightening Serum, and Clear Skin Complexion Cream.',
        'Niacinamide, Rice Ferment, Vitamin C, Centella Asiatica, Ceramides.',
        'Cleanse, tone, treat with serum, and seal with complexion cream morning and night.',
      ],
      [
        'rice-water-glow-serum',
        'Rice Water Glow Serum',
        'Face Care',
        'Glow',
        1899,
        4000,
        '30 ML',
        'NEW',
        1,
        0,
        4.8,
        96,
        '/images/brightening-serum.jpg',
        'Silky fermented rice extract and niacinamide elixir inspired by timeless Asian beauty rituals for a translucent, glass-skin finish.',
        'Oryza Sativa (Rice) Ferment Filtrate, Niacinamide 10%, Glycerin, Sodium Hyaluronate.',
        'Apply morning and evening after toning for instant hydration and lasting luminosity.',
      ],
      [
        'peach-sunrise-body-butter',
        'Peach Sunrise Whipped Body Butter',
        'Body Care',
        'Hydration',
        1475,
        2950,
        '135 GM',
        '50% OFF',
        1,
        0,
        4.9,
        167,
        '/images/body-butter.jpg',
        'Gourmet whipped shea & peach kernel body butter that melts effortlessly on contact, locking in 24-hour velvety hydration with a warm fruity-floral scent.',
        'Unrefined Shea Butter, Peach Kernel Oil, Vitamin E, Sweet Almond Oil, Jojoba Esters.',
        'Massage generously onto damp skin after showering, focusing on elbows, knees, and dry patches.',
      ],
      [
        'age-miracle-creme',
        'Age Miracle Renewal Crème',
        'Face Care',
        'Anti-Aging',
        1375,
        2750,
        '30 ML',
        '50% OFF',
        1,
        0,
        4.8,
        88,
        '/images/night-repair-serum.jpg',
        'Velvety barrier-repairing moisturizer enriched with collagen peptides and ceramides to firm, plump, and protect mature or stressed skin.',
        'Hydrolyzed Collagen, Ceramide NP, Shea Butter, Vitamin B5, Peptide Complex.',
        'Warm a pea-sized amount between fingertips and press gently over face and neck.',
      ],
      [
        'pores-refining-serum',
        'Pores Refining Niacinamide Serum',
        'Face Care',
        'Acne Care',
        1799,
        3550,
        '30 ML',
        'TOP RATED',
        1,
        0,
        4.9,
        204,
        '/images/cleanser-toner.jpg',
        'Targeted 10% Niacinamide + Zinc PCA formula that visibly minimizes enlarged pores, balances excess sebum, and refines uneven texture.',
        'Niacinamide 10%, Zinc PCA 1%, Willow Bark Extract, Allantoin.',
        'Apply 2–3 drops across T-zone and cheeks morning and night prior to moisturizer.',
      ],
      [
        'acne-fighting-serum',
        'Acne Fighting Clarifying Serum',
        'Face Care',
        'Acne Care',
        1699,
        3399,
        '30 ML',
        'DERM TESTED',
        0,
        0,
        4.8,
        142,
        '/images/cleanser-toner.jpg',
        'Calm breakouts without stripping your barrier. Powered by botanical salicylic acid and tea tree hydrosol for clearer, calmer skin.',
        'Salicylic Acid 2%, Tea Tree Leaf Oil, Centella Asiatica, Green Tea Extract.',
        'Apply a thin layer on clean skin in the evening or use as a targeted spot treatment.',
      ],
      [
        'brightening-clay-mask',
        'Brightening Clay Mask Vitamin-C',
        'Face Care',
        'Brightening',
        1499,
        2999,
        '100 GM',
        'SPA RITUAL',
        0,
        0,
        4.9,
        118,
        '/images/clay-mask.jpg',
        'Whipped kaolin & turmeric-infused Vitamin C clay mask that detoxifies congested pores in 10 minutes while leaving skin noticeably brighter and softer.',
        'French Pink & Kaolin Clay, Vitamin C, Licorice Extract, Aloe Vera Juice.',
        'Apply an even layer to clean skin 2x weekly. Rinse with lukewarm water after 10–12 minutes.',
      ],
      [
        'botanical-hair-strengthening-oil',
        'Flora Botanical Hair Strengthening Oil',
        'Hair Care',
        'Hydration',
        1599,
        3200,
        '100 ML',
        'HERBAL',
        0,
        0,
        4.9,
        155,
        '/images/hair-care.jpg',
        'Cold-pressed rosemary, argan, and black seed botanical oil blend that nourishes the scalp, reduces hair fall, and restores mirror-like shine.',
        'Rosemary Essential Oil, Moroccan Argan Oil, Black Seed Oil, Sweet Almond Oil, Vitamin E.',
        'Massage into scalp and lengths 1–2 hours before washing, or leave overnight for deep conditioning.',
      ],
      [
        'rose-berry-lip-cheek-tint',
        'Velvet Rose Lip & Cheek Tint',
        'Makeup',
        'Glow',
        1199,
        2399,
        '15 ML',
        'BEST SELLER',
        0,
        0,
        4.9,
        221,
        '/images/lip-tint.jpg',
        'Buildable, long-wearing botanical blush and lip stain with hyaluronic acid for a natural flushed glow that never feels dry or patchy.',
        'Hyaluronic Acid, Rosewater, Jojoba Oil, Mineral Pigments, Vitamin E.',
        'Dot onto apples of cheeks and lips, then blend immediately with fingertips or brush.',
      ],
      [
        'everyday-cleanser-toner-duo',
        'Soothing Cleanser & pH 5.5 Toner Duo',
        'Face Care',
        'Hydration',
        2150,
        4300,
        '2 x 120 ML',
        '50% OFF',
        0,
        1,
        4.8,
        74,
        '/images/cleanser-toner.jpg',
        'Sulfate-free amino acid daily cleanser paired with our balancing pH 5.5 rose & green tea mist toner to prep skin for maximum serum absorption.',
        'Green Tea Extract, Lemon Hydrosol, Rose Water, Glycerin, Panthenol.',
        'Wash face gently with cleanser, pat dry, and mist toner over face before applying serums.',
      ],
      [
        'skin-protection-hydration-pack',
        'Skin Protection & Hydration Pack',
        'Bundles',
        'Hydration',
        2700,
        6050,
        '3-Piece Set',
        'SAVE 55%',
        0,
        1,
        4.9,
        93,
        '/images/combo-bundle.jpg',
        'Complete barrier-care bundle combining our Vitamin C Glow Serum, Everyday Soothing Cleanser, and SPF Defense Cream for effortless daily protection.',
        'Vitamin C, Ceramides, Hyaluronic Acid, Zinc Oxide, Green Tea.',
        'Use morning and evening as your core cleanse-treat-protect routine.',
      ],
    ];

    for (const p of seedProducts) {
      insertProduct.run(...p);
    }
  }

  const couponCount = db.prepare('SELECT COUNT(*) as count FROM coupons').get().count;
  if (couponCount === 0) {
    const insertCoupon = db.prepare(`
      INSERT INTO coupons (code, type, value, min_order, max_uses, expires_at, active, description)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertCoupon.run('GLOW10', 'percent', 10, 1500, 500, '2027-12-31', 1, '10% off orders above Rs. 1,500');
    insertCoupon.run('WELCOME500', 'fixed', 500, 3000, 200, '2027-12-31', 1, 'Flat Rs. 500 off orders above Rs. 3,000');
    insertCoupon.run('GLOW20', 'percent', 20, 5000, 100, '2027-12-31', 1, '20% VIP discount on orders above Rs. 5,000');
  }

  const subCount = db.prepare('SELECT COUNT(*) as count FROM subscribers').get().count;
  if (subCount === 0) {
    const insertSub = db.prepare('INSERT INTO subscribers (email, name, source) VALUES (?, ?, ?)');
    insertSub.run('g8537167@gmail.com', 'GlowandGrow Owner', 'admin');
    insertSub.run('ayesha.khan@example.com', 'Ayesha Khan', 'footer');
    insertSub.run('hira.malik@example.com', 'Hira Malik', 'checkout');
  }

  const adminCount = db.prepare('SELECT COUNT(*) as count FROM admin_emails').get().count;
  if (adminCount === 0) {
    const insertAdmin = db.prepare('INSERT INTO admin_emails (email, role, added_by) VALUES (?, ?, ?)');
    insertAdmin.run('g8537167@gmail.com', 'Owner', 'system');
  }
}

export function getBootstrapData() {
  const homePage = getSetting('homePage');
  const contact = getSetting('contact');
  const firebaseConfig = getSetting('firebaseConfig');
  const products = db.prepare('SELECT * FROM products ORDER BY is_bestseller DESC, id ASC').all();
  const activeCoupons = db
    .prepare('SELECT code, type, value, min_order, description FROM coupons WHERE active = 1 ORDER BY id ASC')
    .all();

  return {
    homePage,
    contact,
    firebaseConfig,
    products,
    activeCoupons,
  };
}
