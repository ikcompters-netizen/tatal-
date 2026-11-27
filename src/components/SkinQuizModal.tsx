import React, { useMemo, useState } from 'react';
import { X, Sparkles, ShoppingBag, ArrowRight, RotateCcw, Check } from 'lucide-react';
import type { Product } from '../types';

interface SkinQuizModalProps {
  open: boolean;
  onClose: () => void;
  products: Product[];
  onAddMultipleToCart: (products: Product[]) => void;
  onViewProduct: (product: Product) => void;
}

const SKIN_TYPES = [
  { id: 'dry', label: 'Dry & Dehydrated', desc: 'Feels tight, flaky, or dull' },
  { id: 'oily', label: 'Oily & Blemish-Prone', desc: 'Visible pores, shine, or breakouts' },
  { id: 'combo', label: 'Combination', desc: 'Oily T-zone, dry or normal cheeks' },
  { id: 'sensitive', label: 'Sensitive & Reactive', desc: 'Easily irritated or redness-prone' },
];

const SKIN_GOALS = [
  { id: 'Brightening', label: 'Brightening & Dark Spots', desc: 'Fade dullness & uneven tone' },
  { id: 'Acne Care', label: 'Clear Pores & Acne Care', desc: 'Calm breakouts & refine texture' },
  { id: 'Anti-Aging', label: 'Night Repair & Firming', desc: 'Smooth fine lines & boost elasticity' },
  { id: 'Hydration', label: 'Deep Hydration & Glow', desc: 'Dewy, plump glass-skin moisture' },
];

export const SkinQuizModal: React.FC<SkinQuizModalProps> = ({
  open,
  onClose,
  products,
  onAddMultipleToCart,
  onViewProduct,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [skinType, setSkinType] = useState('combo');
  const [goal, setGoal] = useState('Brightening');

  const recommendations = useMemo(() => {
    const matched = products.filter(
      (p) => p.concern.toLowerCase() === goal.toLowerCase() || (skinType === 'oily' && p.concern === 'Acne Care')
    );
    const cleanser = products.find((p) => p.slug.includes('cleanser'));
    const result = [...matched];
    if (cleanser && !result.some((r) => r.id === cleanser.id)) {
      result.push(cleanser);
    }
    return result.slice(0, 3);
  }, [products, goal, skinType]);

  if (!open) return null;

  const totalPrice = recommendations.reduce((sum, p) => sum + p.price, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-3 backdrop-blur-xs sm:p-4">
      <div className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl bg-[#FAF7F2] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#E5DDD0] px-5 py-4 sm:px-7">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-[#8E4A34]" />
            <span className="text-xs font-bold uppercase tracking-[0.18em] text-[#8E4A34]">
              Personalized Skin Quiz
            </span>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-[#5C4E45] hover:bg-[#EFE7DA]"
            aria-label="Close quiz"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 sm:p-7">
          {step === 1 && (
            <div>
              <p className="text-xs font-semibold text-[#8E7F75]">Step 1 of 2</p>
              <h2 className="mt-1 font-serif-editorial text-3xl font-semibold text-[#1F1815]">
                What best describes your skin type?
              </h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {SKIN_TYPES.map((st) => (
                  <button
                    key={st.id}
                    onClick={() => {
                      setSkinType(st.id);
                      setStep(2);
                    }}
                    className={`rounded-2xl border p-4 text-left transition ${
                      skinType === st.id
                        ? 'border-[#8E4A34] bg-[#8E4A34]/10'
                        : 'border-[#DDD3C4] bg-white hover:border-[#8E4A34]'
                    }`}
                  >
                    <p className="text-sm font-bold text-[#1F1815]">{st.label}</p>
                    <p className="mt-1 text-xs text-[#6B5D54]">{st.desc}</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div>
              <p className="text-xs font-semibold text-[#8E7F75]">Step 2 of 2</p>
              <h2 className="mt-1 font-serif-editorial text-3xl font-semibold text-[#1F1815]">
                What is your #1 glow goal?
              </h2>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {SKIN_GOALS.map((g) => (
                  <button
                    key={g.id}
                    onClick={() => {
                      setGoal(g.id);
                      setStep(3);
                    }}
                    className={`rounded-2xl border p-4 text-left transition ${
                      goal === g.id
                        ? 'border-[#8E4A34] bg-[#8E4A34]/10'
                        : 'border-[#DDD3C4] bg-white hover:border-[#8E4A34]'
                    }`}
                  >
                    <p className="text-sm font-bold text-[#1F1815]">{g.label}</p>
                    <p className="mt-1 text-xs text-[#6B5D54]">{g.desc}</p>
                  </button>
                ))}
              </div>
              <button
                onClick={() => setStep(1)}
                className="mt-4 text-xs font-semibold text-[#8E4A34] underline"
              >
                ← Back to skin type
              </button>
            </div>
          )}

          {step === 3 && (
            <div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-3 py-1 text-[11px] font-semibold text-emerald-800">
                    <Check className="h-3 w-3" /> Routine Matched for {goal}
                  </span>
                  <h2 className="mt-2 font-serif-editorial text-3xl font-semibold text-[#1F1815]">
                    Your Custom GlowandGrow Ritual
                  </h2>
                </div>
                <button
                  onClick={() => setStep(1)}
                  className="inline-flex items-center gap-1 rounded-full border border-[#DDD3C4] bg-white px-3 py-1.5 text-xs font-semibold text-[#4F433B]"
                >
                  <RotateCcw className="h-3 w-3" /> Retake
                </button>
              </div>

              <div className="mt-5 space-y-3">
                {recommendations.map((p, idx) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-3.5 rounded-2xl border border-[#E5DDD0] bg-white p-3.5"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#1F1815] text-[11px] font-bold text-white">
                      {idx + 1}
                    </span>
                    <img
                      src={p.image}
                      alt={p.name}
                      onClick={() => {
                        onClose();
                        onViewProduct(p);
                      }}
                      className="h-14 w-14 shrink-0 cursor-pointer rounded-xl object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-[#1F1815]">{p.name}</p>
                      <p className="text-xs text-[#6B5D54]">
                        {p.size} • Rs. {p.price.toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-[#E5DDD0] bg-[#F3ECE1] p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs text-[#5C4E45]">Complete 3-Step Routine Total</p>
                  <p className="text-lg font-bold text-[#1F1815]">Rs. {totalPrice.toLocaleString()}</p>
                  <p className="text-[11px] font-semibold text-[#8E4A34]">
                    Tip: Apply code GLOW10 in cart for 10% OFF!
                  </p>
                </div>
                <button
                  onClick={() => {
                    onAddMultipleToCart(recommendations);
                    onClose();
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-[#1F1815] px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-white transition hover:bg-[#8E4A34]"
                >
                  <ShoppingBag className="h-4 w-4" />
                  Add Routine To Cart
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
