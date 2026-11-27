import React, { useState } from 'react';
import {
  X,
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  Tag,
  CheckCircle2,
  Truck,
  ArrowLeft,
  Sparkles,
} from 'lucide-react';
import { api } from '../lib/api';
import type { CartItem, ContactSettings, HomePageSettings, Coupon } from '../types';

interface CartDrawerProps {
  open: boolean;
  onClose: () => void;
  items: CartItem[];
  homeSettings: HomePageSettings;
  contact: ContactSettings;
  activeCouponsHint: Pick<Coupon, 'code' | 'type' | 'value' | 'min_order' | 'description'>[];
  onUpdateQty: (productId: number, qty: number) => void;
  onRemoveItem: (productId: number) => void;
  onClearCart: () => void;
  defaultEmail?: string;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  open,
  onClose,
  items,
  homeSettings,
  contact,
  activeCouponsHint,
  onUpdateQty,
  onRemoveItem,
  onClearCart,
  defaultEmail = '',
}) => {
  const [step, setStep] = useState<'cart' | 'checkout' | 'success'>('cart');
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discountAmount: number;
    message: string;
  } | null>(null);
  const [couponError, setCouponError] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);

  const [orderNote, setOrderNote] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [customerEmail, setCustomerEmail] = useState(defaultEmail);
  const [customerPhone, setCustomerPhone] = useState('');
  const [city, setCity] = useState('Lahore');
  const [address, setAddress] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'COD' | 'Bank Transfer'>('COD');
  const [checkoutError, setCheckoutError] = useState('');
  const [placingOrder, setPlacingOrder] = useState(false);
  const [placedOrderNumber, setPlacedOrderNumber] = useState('');
  const [placedOrderTotal, setPlacedOrderTotal] = useState(0);

  if (!open) return null;

  const subtotal = items.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const discount = appliedCoupon ? Math.min(subtotal, appliedCoupon.discountAmount) : 0;
  const afterDiscount = Math.max(0, subtotal - discount);
  const threshold = homeSettings.freeShippingThreshold || 4000;
  const shippingFee = afterDiscount === 0 ? 0 : afterDiscount >= threshold ? 0 : homeSettings.shippingFee || 250;
  const total = afterDiscount + shippingFee;
  const remainingForFreeShipping = Math.max(0, threshold - afterDiscount);
  const progressPct = Math.min(100, Math.round((afterDiscount / threshold) * 100));

  const handleApplyCoupon = async (codeOverride?: string) => {
    const code = (codeOverride ?? couponInput).trim().toUpperCase();
    if (!code) return;
    setCouponError('');
    setCouponLoading(true);
    try {
      const res = await api.validateCoupon(code, subtotal);
      setAppliedCoupon({
        code: res.coupon.code,
        discountAmount: res.discountAmount,
        message: res.message,
      });
      setCouponInput(res.coupon.code);
    } catch (err: unknown) {
      setAppliedCoupon(null);
      setCouponError(err instanceof Error ? err.message : 'Invalid coupon code');
    } finally {
      setCouponLoading(false);
    }
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setCheckoutError('');
    setPlacingOrder(true);
    try {
      const res = await api.createOrder({
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: customerPhone,
        city,
        address,
        items: items.map((i) => ({
          id: i.product.id,
          name: i.product.name,
          price: i.product.price,
          quantity: i.quantity,
          size: i.product.size,
        })),
        coupon_code: appliedCoupon?.code || '',
        payment_method: paymentMethod,
        order_note: orderNote,
        subscribe: true,
      });
      setPlacedOrderNumber(res.order.order_number);
      setPlacedOrderTotal(res.order.total);
      onClearCart();
      setAppliedCoupon(null);
      setCouponInput('');
      setStep('success');
    } catch (err: unknown) {
      setCheckoutError(err instanceof Error ? err.message : 'Could not place order');
    } finally {
      setPlacingOrder(false);
    }
  };

  const closeAndReset = () => {
    if (step === 'success') setStep('cart');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/45 backdrop-blur-xs">
      <div className="relative flex h-full w-full max-w-md flex-col bg-[#FAF7F2] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#E5DDD0] px-6 py-5">
          <div className="flex items-center gap-2.5">
            {step === 'checkout' && (
              <button
                onClick={() => setStep('cart')}
                className="rounded-full p-1.5 text-[#5C4E45] hover:bg-[#EFE7DA]"
                aria-label="Back to cart"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
            )}
            <div>
              <h2 className="font-serif-editorial text-2xl font-semibold text-[#1F1815]">
                {step === 'cart' ? 'Shopping Cart' : step === 'checkout' ? 'Checkout' : 'Order Confirmed'}
              </h2>
              {step === 'cart' && (
                <p className="text-xs text-[#6B5D54]">
                  {items.reduce((acc, i) => acc + i.quantity, 0)} item(s) in your bag
                </p>
              )}
            </div>
          </div>
          <button
            onClick={closeAndReset}
            className="rounded-full p-2 text-[#5C4E45] transition hover:bg-[#EFE7DA] hover:text-[#1F1815]"
            aria-label="Close cart"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Free Shipping Bar */}
        {step !== 'success' && items.length > 0 && (
          <div className="border-b border-[#E5DDD0] bg-[#F3ECE1]/70 px-6 py-3">
            <div className="flex items-center gap-2 text-xs font-medium text-[#3A2E28]">
              <Truck className="h-4 w-4 text-[#8E4A34]" />
              {remainingForFreeShipping === 0 ? (
                <span>You unlocked <strong>FREE Shipping</strong> across Pakistan!</span>
              ) : (
                <span>
                  Add <strong>Rs. {remainingForFreeShipping.toLocaleString()}</strong> more for FREE shipping
                </span>
              )}
            </div>
            <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[#DFD5C5]">
              <div
                className="h-full rounded-full bg-[#8E4A34] transition-all duration-300"
                style={{ width: `${progressPct}%` }}
              />
            </div>
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {step === 'success' ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
                <CheckCircle2 className="h-9 w-9" />
              </div>
              <h3 className="mt-4 font-serif-editorial text-3xl font-semibold text-[#1F1815]">
                Thank You for Glowing With Us!
              </h3>
              <p className="mt-2 text-sm text-[#5C4E45]">
                Order <strong className="text-[#1F1815]">#{placedOrderNumber}</strong> has been received.
              </p>
              <div className="mt-5 w-full rounded-2xl border border-[#E5DDD0] bg-white p-4 text-left text-sm">
                <div className="flex justify-between py-1">
                  <span className="text-[#6B5D54]">Total Payable</span>
                  <span className="font-bold text-[#1F1815]">Rs. {placedOrderTotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-[#6B5D54]">Payment</span>
                  <span className="font-medium text-[#1F1815]">{paymentMethod}</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-[#6B5D54]">Support</span>
                  <span className="font-medium text-[#8E4A34]">{contact.phone}</span>
                </div>
              </div>
              <button
                onClick={closeAndReset}
                className="mt-6 w-full rounded-full bg-[#1F1815] py-3.5 text-sm font-semibold uppercase tracking-wider text-white hover:bg-[#8E4A34]"
              >
                Continue Shopping
              </button>
            </div>
          ) : items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#F3ECE1] text-[#8E4A34]">
                <ShoppingBag className="h-7 w-7" />
              </div>
              <h3 className="mt-4 font-serif-editorial text-2xl font-semibold text-[#1F1815]">
                Your cart is empty
              </h3>
              <p className="mt-1.5 max-w-xs text-sm text-[#6B5D54]">
                Explore our gourmet-inspired serums, body butters, and skincare bundles to start your ritual.
              </p>
              <button
                onClick={onClose}
                className="mt-6 rounded-full bg-[#1F1815] px-7 py-3 text-xs font-semibold uppercase tracking-wider text-white hover:bg-[#8E4A34]"
              >
                Return To Shop
              </button>
            </div>
          ) : step === 'cart' ? (
            <div className="space-y-4">
              {items.map(({ product, quantity }) => (
                <div
                  key={product.id}
                  className="flex gap-3.5 rounded-2xl border border-[#E5DDD0] bg-white p-3.5 shadow-2xs"
                >
                  <img
                    src={product.image}
                    alt={product.name}
                    className="h-20 w-20 shrink-0 rounded-xl object-cover bg-[#F3ECE1]"
                  />
                  <div className="flex flex-1 flex-col justify-between">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="text-sm font-semibold text-[#1F1815] leading-snug">{product.name}</h4>
                        <p className="text-xs text-[#8E7F75]">{product.size}</p>
                      </div>
                      <button
                        onClick={() => onRemoveItem(product.id)}
                        className="text-[#9B8C82] hover:text-red-600"
                        aria-label="Remove item"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="mt-2 flex items-center justify-between">
                      <div className="flex items-center rounded-full border border-[#E5DDD0] bg-[#FAF7F2]">
                        <button
                          onClick={() => onUpdateQty(product.id, quantity - 1)}
                          className="p-1.5 text-[#5C4E45] hover:text-[#1F1815]"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-7 text-center text-xs font-semibold">{quantity}</span>
                        <button
                          onClick={() => onUpdateQty(product.id, quantity + 1)}
                          className="p-1.5 text-[#5C4E45] hover:text-[#1F1815]"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>
                      <span className="text-sm font-bold text-[#1F1815]">
                        Rs. {(product.price * quantity).toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              ))}

              {/* Coupon Code Box */}
              <div className="rounded-2xl border border-[#E5DDD0] bg-white p-4">
                <label className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[#5C4E45]">
                  <Tag className="h-3.5 w-3.5 text-[#8E4A34]" /> Have a Coupon Code?
                </label>
                <div className="mt-2 flex gap-2">
                  <input
                    type="text"
                    value={couponInput}
                    onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                    placeholder="Enter code (e.g. GLOW10)"
                    className="flex-1 rounded-xl border border-[#DDD3C4] bg-[#FAF7F2] px-3 py-2 text-sm uppercase outline-none focus:border-[#8E4A34]"
                  />
                  <button
                    type="button"
                    onClick={() => handleApplyCoupon()}
                    disabled={couponLoading || !couponInput.trim()}
                    className="rounded-xl bg-[#1F1815] px-4 py-2 text-xs font-semibold uppercase tracking-wider text-white transition hover:bg-[#8E4A34] disabled:opacity-50"
                  >
                    {couponLoading ? '...' : 'Apply'}
                  </button>
                </div>

                {couponError && <p className="mt-2 text-xs text-red-600">{couponError}</p>}

                {appliedCoupon && (
                  <div className="mt-2.5 flex items-center justify-between rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                    <span className="font-medium">{appliedCoupon.message}</span>
                    <button
                      onClick={() => {
                        setAppliedCoupon(null);
                        setCouponInput('');
                      }}
                      className="ml-2 font-semibold underline"
                    >
                      Remove
                    </button>
                  </div>
                )}

                {activeCouponsHint.length > 0 && !appliedCoupon && (
                  <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                    <span className="text-[11px] text-[#8E7F75]">Available:</span>
                    {activeCouponsHint.slice(0, 3).map((c) => (
                      <button
                        key={c.code}
                        type="button"
                        onClick={() => handleApplyCoupon(c.code)}
                        className="inline-flex items-center gap-1 rounded-full bg-[#F3ECE1] px-2.5 py-0.5 text-[11px] font-semibold text-[#8E4A34] hover:bg-[#E7DAC7]"
                      >
                        <Sparkles className="h-2.5 w-2.5" />
                        {c.code}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Order Note */}
              <div className="rounded-2xl border border-[#E5DDD0] bg-white p-4">
                <label className="block text-xs font-semibold uppercase tracking-wider text-[#5C4E45]">
                  Order Note (Optional)
                </label>
                <textarea
                  rows={2}
                  value={orderNote}
                  onChange={(e) => setOrderNote(e.target.value)}
                  placeholder="Gift note, delivery instructions, or skin concern..."
                  className="mt-2 w-full rounded-xl border border-[#DDD3C4] bg-[#FAF7F2] px-3 py-2 text-sm outline-none focus:border-[#8E4A34]"
                />
              </div>
            </div>
          ) : (
            <form id="checkout-form" onSubmit={handlePlaceOrder} className="space-y-3.5">
              {checkoutError && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                  {checkoutError}
                </div>
              )}

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[#5C4E45]">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Ayesha Fatima"
                  className="w-full rounded-xl border border-[#DDD3C4] bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[#8E4A34]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[#5C4E45]">
                    Email *
                  </label>
                  <input
                    type="email"
                    required
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    placeholder="you@email.com"
                    className="w-full rounded-xl border border-[#DDD3C4] bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[#8E4A34]"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[#5C4E45]">
                    Phone / WhatsApp *
                  </label>
                  <input
                    type="tel"
                    required
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="03XX-XXXXXXX"
                    className="w-full rounded-xl border border-[#DDD3C4] bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[#8E4A34]"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[#5C4E45]">
                  City *
                </label>
                <select
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full rounded-xl border border-[#DDD3C4] bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[#8E4A34]"
                >
                  {['Lahore', 'Karachi', 'Islamabad', 'Rawalpindi', 'Faisalabad', 'Multan', 'Peshawar', 'Quetta', 'Sialkot', 'Other Pakistan City'].map(
                    (c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    )
                  )}
                </select>
              </div>

              <div>
                <label className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[#5C4E45]">
                  Complete Delivery Address *
                </label>
                <textarea
                  rows={2}
                  required
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="House #, Street, Sector / Block, Landmark..."
                  className="w-full rounded-xl border border-[#DDD3C4] bg-white px-3.5 py-2.5 text-sm outline-none focus:border-[#8E4A34]"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-[#5C4E45]">
                  Payment Method
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  {(['COD', 'Bank Transfer'] as const).map((pm) => (
                    <button
                      key={pm}
                      type="button"
                      onClick={() => setPaymentMethod(pm)}
                      className={`rounded-xl border px-3 py-2.5 text-xs font-semibold transition ${
                        paymentMethod === pm
                          ? 'border-[#8E4A34] bg-[#8E4A34]/10 text-[#8E4A34]'
                          : 'border-[#DDD3C4] bg-white text-[#5C4E45]'
                      }`}
                    >
                      {pm === 'COD' ? 'Cash on Delivery' : 'Bank Transfer / JazzCash'}
                    </button>
                  ))}
                </div>
              </div>
            </form>
          )}
        </div>

        {/* Footer Totals */}
        {step !== 'success' && items.length > 0 && (
          <div className="border-t border-[#E5DDD0] bg-white px-6 py-5">
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between text-[#6B5D54]">
                <span>Subtotal</span>
                <span>Rs. {subtotal.toLocaleString()}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between font-medium text-emerald-700">
                  <span>Coupon ({appliedCoupon?.code})</span>
                  <span>-Rs. {discount.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between text-[#6B5D54]">
                <span>Shipping</span>
                <span>{shippingFee === 0 ? 'FREE' : `Rs. ${shippingFee.toLocaleString()}`}</span>
              </div>
              <div className="flex justify-between border-t border-[#F0E9DD] pt-2 text-base font-bold text-[#1F1815]">
                <span>Total</span>
                <span>Rs. {total.toLocaleString()} PKR</span>
              </div>
            </div>

            {step === 'cart' ? (
              <button
                onClick={() => setStep('checkout')}
                className="mt-4 w-full rounded-full bg-[#1F1815] py-3.5 text-sm font-semibold uppercase tracking-wider text-white transition hover:bg-[#8E4A34]"
              >
                Proceed to Checkout
              </button>
            ) : (
              <button
                type="submit"
                form="checkout-form"
                disabled={placingOrder}
                className="mt-4 w-full rounded-full bg-[#8E4A34] py-3.5 text-sm font-semibold uppercase tracking-wider text-white transition hover:bg-[#753B28] disabled:opacity-60"
              >
                {placingOrder ? 'Placing Order...' : `Confirm Order • Rs. ${total.toLocaleString()}`}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
