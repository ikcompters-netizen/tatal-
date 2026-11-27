import React, { useState } from 'react';
import { X, Check, ShoppingBag, Sparkles } from 'lucide-react';
import type { Product } from '../types';

interface BundleBuilderModalProps {
  open: boolean;
  onClose: () => void;
  products: Product[];
  onAddBundleToCart: (selected: Product[]) => void;
}

export const BundleBuilderModal: React.FC<BundleBuilderModalProps> = ({
  open,
  onClose,
  products,
  onAddBundleToCart,
}) => {
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  if (!open) return null;

  const singleProducts = products.filter((p) => !p.is_bundle);
  const selectedProducts = singleProducts.filter((p) => selectedIds.includes(p.id));
  const rawTotal = selectedProducts.reduce((sum, p) => sum + p.price, 0);
  const discountRate = selectedProducts.length >= 4 ? 0.2 : selectedProducts.length >= 3 ? 0.15 : 0;
  const savings = Math.round(rawTotal * discountRate);
  const finalPrice = rawTotal - savings;

  const toggleProduct = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : prev.length < 5 ? [...prev, id] : prev
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-3 backdrop-blur-xs sm:p-4">
      <div className="relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-[#FAF7F2] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#E5DDD0] px-5 py-4 sm:px-7">
          <div>
            <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-[#8E4A34]">
              <Sparkles className="h-3.5 w-3.5" /> Build Your Own Bundle
            </p>
            <h2 className="font-serif-editorial text-2xl font-semibold text-[#1F1815] sm:text-3xl">
              Pick 3+ Products & Save Up to 20%
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-[#5C4E45] hover:bg-[#EFE7DA]"
            aria-label="Close bundle builder"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 sm:p-7">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-[#E5DDD0] bg-[#F3ECE1] px-4 py-3 text-xs">
            <span className="font-medium text-[#3A2E28]">
              Selected: <strong>{selectedProducts.length} / 5</strong> items
            </span>
            <span className="font-semibold text-[#8E4A34]">
              {selectedProducts.length < 3
                ? `Pick ${3 - selectedProducts.length} more to unlock 15% OFF (or 4 for 20% OFF)`
                : discountRate === 0.2
                ? '20% VIP Bundle Discount Unlocked!'
                : '15% Bundle Discount Unlocked! Add 1 more for 20% OFF'}
            </span>
          </div>

          <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {singleProducts.map((p) => {
              const isSelected = selectedIds.includes(p.id);
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => toggleProduct(p.id)}
                  className={`flex items-center gap-3 rounded-2xl border p-3 text-left transition ${
                    isSelected
                      ? 'border-[#8E4A34] bg-[#8E4A34]/10 ring-1 ring-[#8E4A34]'
                      : 'border-[#E5DDD0] bg-white hover:border-[#8E4A34]'
                  }`}
                >
                  <img src={p.image} alt={p.name} className="h-16 w-16 shrink-0 rounded-xl object-cover" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-[#1F1815]">{p.name}</p>
                    <p className="text-xs text-[#6B5D54]">{p.size}</p>
                    <p className="mt-1 text-xs font-bold text-[#8E4A34]">Rs. {p.price.toLocaleString()}</p>
                  </div>
                  <div
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                      isSelected
                        ? 'border-[#8E4A34] bg-[#8E4A34] text-white'
                        : 'border-[#CBBBA6] bg-white'
                    }`}
                  >
                    {isSelected && <Check className="h-3.5 w-3.5" />}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-[#E5DDD0] bg-white px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-7">
          <div>
            <p className="text-xs text-[#6B5D54]">
              {savings > 0 ? (
                <>
                  Bundle Price:{' '}
                  <span className="line-through">Rs. {rawTotal.toLocaleString()}</span>{' '}
                  <strong className="text-emerald-700">(You save Rs. {savings.toLocaleString()})</strong>
                </>
              ) : (
                'Select at least 3 products to build your custom bundle'
              )}
            </p>
            <p className="text-lg font-bold text-[#1F1815]">Total: Rs. {finalPrice.toLocaleString()}</p>
          </div>
          <button
            type="button"
            disabled={selectedProducts.length < 3}
            onClick={() => {
              onAddBundleToCart(selectedProducts);
              setSelectedIds([]);
              onClose();
            }}
            className="inline-flex items-center justify-center gap-2 rounded-full bg-[#1F1815] px-7 py-3.5 text-xs font-semibold uppercase tracking-wider text-white transition hover:bg-[#8E4A34] disabled:cursor-not-allowed disabled:opacity-45"
          >
            <ShoppingBag className="h-4 w-4" />
            Add Custom Bundle
          </button>
        </div>
      </div>
    </div>
  );
};
