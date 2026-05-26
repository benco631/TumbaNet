"use client";

import { useState, FormEvent } from "react";
import { Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { SUGGESTION_LIMITS } from "@/lib/shop/config";

interface Props {
  onSubmit: (input: {
    title: string;
    description: string;
    price: number;
    category: string;
  }) => Promise<boolean>;
  submitting?: boolean;
}

const CATEGORY_OPTIONS = ["general", "treat", "favor", "exemption", "power", "legendary"];

export default function SuggestionForm({ onSubmit, submitting }: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("general");

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const priceNum = parseInt(price, 10);
    if (Number.isNaN(priceNum)) return;
    const ok = await onSubmit({
      title: title.trim(),
      description: description.trim(),
      price: priceNum,
      category,
    });
    if (ok) {
      setTitle("");
      setDescription("");
      setPrice("");
      setCategory("general");
    }
  }

  const titleValid = title.trim().length >= SUGGESTION_LIMITS.titleMin;
  const descValid = description.trim().length >= SUGGESTION_LIMITS.descriptionMin;
  const priceValid =
    !!price && Number.isInteger(Number(price)) && Number(price) >= SUGGESTION_LIMITS.priceMin && Number(price) <= SUGGESTION_LIMITS.priceMax;
  const canSubmit = titleValid && descValid && priceValid && !submitting;

  return (
    <motion.form
      onSubmit={handleSubmit}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-4 sm:p-5 rounded-2xl border border-tumba-500/25 bg-gradient-to-br from-tumba-500/5 to-neon-pink/5"
    >
      <div className="flex items-center gap-2 mb-4">
        <Sparkles size={18} className="text-tumba-400" strokeWidth={2} />
        <h2 className="text-lg font-semibold">Suggest a new reward</h2>
      </div>
      <p className="text-xs text-[var(--text-secondary)] mb-4">
        The group votes on your suggestion. If it&apos;s approved, it joins the shop and you get a creator bonus.
      </p>

      <div className="space-y-3">
        <div>
          <input
            type="text"
            placeholder="Reward title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={SUGGESTION_LIMITS.titleMax}
            className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-tumba-500 text-sm"
          />
          <div className="flex justify-between text-[11px] text-[var(--text-secondary)] mt-1 px-1">
            <span>{SUGGESTION_LIMITS.titleMin}-{SUGGESTION_LIMITS.titleMax} chars</span>
            <span>{title.length}/{SUGGESTION_LIMITS.titleMax}</span>
          </div>
        </div>

        <div>
          <textarea
            placeholder="What does this reward do? Why is it fun?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            maxLength={SUGGESTION_LIMITS.descriptionMax}
            className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-tumba-500 resize-none text-sm"
          />
          <div className="flex justify-between text-[11px] text-[var(--text-secondary)] mt-1 px-1">
            <span>{SUGGESTION_LIMITS.descriptionMin}-{SUGGESTION_LIMITS.descriptionMax} chars</span>
            <span>{description.length}/{SUGGESTION_LIMITS.descriptionMax}</span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            type="number"
            placeholder={`Price (${SUGGESTION_LIMITS.priceMin}-${SUGGESTION_LIMITS.priceMax} TC)`}
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            min={SUGGESTION_LIMITS.priceMin}
            max={SUGGESTION_LIMITS.priceMax}
            className="px-4 py-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-tumba-500 text-sm"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="px-4 py-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-tumba-500 text-sm"
          >
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {c.charAt(0).toUpperCase() + c.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <button
        type="submit"
        disabled={!canSubmit}
        className={`mt-5 w-full py-2.5 rounded-xl font-semibold text-sm transition-all ${
          canSubmit
            ? "bg-gradient-to-r from-tumba-500 to-neon-pink text-white shadow-lg shadow-tumba-500/25 hover:shadow-tumba-500/40"
            : "bg-[var(--border)] text-[var(--text-secondary)] cursor-not-allowed"
        }`}
      >
        {submitting ? "Submitting..." : "Submit for group vote"}
      </button>
    </motion.form>
  );
}
