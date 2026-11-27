import React, { useState } from 'react';
import { X, Star, ShoppingBag, Check, Sparkles, ShieldCheck } from 'lucide-react';
import type { Product } from '../types';

interface ProductModalProps {
  product: Product | null;
  onClose: () => void;
  onAddToCart: (product: Product, qty: number) => void;
}

export const ProductModal: React.FC<ProductModalProps> = ({ product, onClose, onAddToCart }) => {
  const [qty, setQty] = useState(1);

  if (!product) return null;

  const discountPct =
    product.compare_at_price > product.price
      ? Math.round(((product.compare_at_price - product.price) / product.compare_at_price) * 100)
      : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
      <div className="relative grid max-h-[90vh] w-full max-w-4xl overflow-hidden rounded-3xl bg-[#FAF7F2] shadow-2xl md:grid-cols-2">
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded-full bg-white/90 p-2 text-[#1F1815] shadow-sm transition hover:bg-white"
          aria-label="Close product modal"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Image */}
        <div className="relative aspect-square bg-[#F3ECE1] md:aspect-auto md:h-full">
          <img src={product.image} alt={product.name} className="h-full w-full object-cover" />
          {product.badge && (
            <span className="absolute left-4 top-4 rounded-full bg-[#1F1815] px-3.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-white">
              {product.badge}
            </span>
          )}
        </div>

        {/* Details */}
        <div className="flex flex-col overflow-y-auto p-6 md:p-8">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[#8E4A34]">
            <span>{product.category}</span>
            <span>•</span>
            <span>{product.concern}</span>
            <span>•</span>
            <span>{product.size}</span>
          </div>

          <h2 className="mt-2 font-serif-editorial text-3xl font-semibold text-[#1F1815]">{product.name}</h2>

          <div className="mt-2 flex items-center gap-2 text-sm text-[#5C4E45]">
            <div className="flex items-center gap-0.5 text-amber-500">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="h-4 w-4 fill-current" />
              ))}
            </div>
            <span className="font-semibold text-[#1F1815]">{product.rating.toFixed(1)}</span>
            <span>({product.reviews_count} verified reviews)</span>
          </div>

          <div className="mt-4 flex items-baseline gap-3">
            <span className="text-2xl font-bold text-[#1F1815]">Rs.{product.price.toLocaleString()}</span>
            {product.compare_at_price > product.price && (
              <>
                <span className="text-base text-[#8E7F75] line-through">
                  Rs.{product.compare_at_price.toLocaleString()}
                </span>
                <span className="rounded-full bg-[#8E4A34]/15 px-2.5 py-0.5 text-xs font-bold text-[#8E4A34]">
                  SAVE {discountPct}%
                </span>
              </>
            )}
          </div>

          <p className="mt-4 text-sm leading-relaxed text-[#4F433B]">{product.description}</p>

          <div className="mt-5 space-y-3 rounded-2xl border border-[#E5DDD0] bg-white p-4 text-xs">
            <div>
              <p className="flex items-center gap-1.5 font-semibold uppercase tracking-wider text-[#8E4A34]">
                <Sparkles className="h-3.5 w-3.5" /> Key Ingredients
              </p>
              <p className="mt-1 leading-relaxed text-[#5C4E45]">{product.ingredients}</p>
            </div>
            <div className="border-t border-[#F0E9DD] pt-3">
              <p className="flex items-center gap-1.5 font-semibold uppercase tracking-wider text-[#4D6653]">
                <Check className="h-3.5 w-3.5" /> How To Use
              </p>
              <p className="mt-1 leading-relaxed text-[#5C4E45]">{product.how_to_use}</p>
            </div>
          </div>

          <div className="mt-6 flex items-center gap-3">
            <div className="flex items-center rounded-full border border-[#DDD3C4] bg-white px-2 py-1">
              <button
                onClick={() => setQty((q) => Math.max(1, q - 1))}
                className="h-8 w-8 rounded-full text-base font-semibold text-[#1F1815] hover:bg-[#F3ECE1]"
              >
                -
              </button>
              <span className="w-8 text-center text-sm font-semibold">{qty}</span>
              <button
                onClick={() => setQty((q) => q + 1)}
                className="h-8 w-8 rounded-full text-base font-semibold text-[#1F1815] hover:bg-[#F3ECE1]"
              >
                +
              </button>
            </div>

            <button
              onClick={() => {
                onAddToCart(product, qty);
                onClose();
              }}
              className="flex flex-1 items-center justify-center gap-2 rounded-full bg-[#1F1815] py-3.5 text-sm font-semibold uppercase tracking-wider text-white transition hover:bg-[#8E4A34]"
            >
              <ShoppingBag className="h-4 w-4" />
              Add To Cart
            </button>
          </div>

          <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-[#6B5D54]">
            <ShieldCheck className="h-4 w-4 text-[#4D6653]" />
            Dermatologist Tested • Cruelty-Free • Cash on Delivery Available
          </p>
        </div>
      </div>
    </div>
  );
};
