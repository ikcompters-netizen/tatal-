export interface SpotlightBenefit {
  title: string;
  description: string;
}

export interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

export interface HomePageSettings {
  announcementText: string;
  freeShippingThreshold: number;
  shippingFee: number;
  heroEyebrow: string;
  heroTitle: string;
  heroSubtitle: string;
  heroPrimaryCta: string;
  heroSecondaryCta: string;
  heroImage: string;
  bannerTitle: string;
  bannerSubtitle: string;
  bannerCta: string;
  bannerImage: string;
  spotlightEyebrow: string;
  spotlightTitle: string;
  spotlightSubtitle: string;
  spotlightCta: string;
  spotlightImage: string;
  spotlightBenefits: SpotlightBenefit[];
  faqs: FaqItem[];
}

export interface ContactSettings {
  brandName: string;
  tagline: string;
  email: string;
  phone: string;
  whatsapp: string;
  address: string;
  instagram: string;
  shippingPolicy: string;
  returnPolicy: string;
}

export interface FirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  measurementId?: string;
}

export interface Product {
  id: number;
  slug: string;
  name: string;
  category: string;
  concern: string;
  price: number;
  compare_at_price: number;
  size: string;
  badge: string;
  is_bestseller: number;
  is_bundle: number;
  rating: number;
  reviews_count: number;
  image: string;
  description: string;
  ingredients: string;
  how_to_use: string;
  in_stock: number;
}

export interface Coupon {
  id: number;
  code: string;
  type: 'percent' | 'fixed';
  value: number;
  min_order: number;
  max_uses: number | null;
  used_count: number;
  expires_at: string | null;
  active: number;
  description: string;
}

export interface Subscriber {
  id: number;
  email: string;
  name: string;
  source: string;
  created_at: string;
}

export interface AdminEmail {
  id: number;
  email: string;
  role: string;
  added_by: string;
  created_at: string;
}

export interface Order {
  id: number;
  order_number: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  city: string;
  address: string;
  items_json: string;
  subtotal: number;
  discount_amount: number;
  coupon_code: string;
  shipping_fee: number;
  total: number;
  payment_method: string;
  order_note: string;
  status: string;
  created_at: string;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

export interface AuthUser {
  email: string;
  displayName: string;
  uid: string;
  provider: 'firebase' | 'local';
  isAdmin: boolean;
  role?: string | null;
}
