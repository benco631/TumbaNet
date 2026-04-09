"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { ShopIcon, PackageIcon } from "@/lib/icons";
import { CoinBadge, CoinAmountMd, CoinAmountSm } from "@/components/TumbaCoin";
import { motion, AnimatePresence } from "framer-motion";
import { MotionPage } from "@/components/motion";
import { staggerContainer, fadeInUp } from "@/lib/animations";
import SuggestionCard from "@/components/shop/SuggestionCard";
import SuggestionForm from "@/components/shop/SuggestionForm";
import type { ShopSuggestionDTO } from "@/lib/shop/types";

interface ShopItem {
  id: string;
  title: string;
  description: string;
  price: number;
  imageUrl: string | null;
  category: string;
  active: boolean;
  createdAt: string;
  source?: string;
  builtInKey?: string | null;
}

type ShopView = "shop" | "voting" | "suggest" | "history";

interface Purchase {
  id: string;
  price: number;
  createdAt: string;
  shopItem: { title: string; imageUrl: string | null };
  user: { name: string };
}

const CATEGORIES = ["general", "reward", "experience", "merch", "prank", "custom"];

export default function ShopPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [items, setItems] = useState<ShopItem[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loading, setLoading] = useState(true);
  const [userCoins, setUserCoins] = useState(0);
  const [buying, setBuying] = useState<string | null>(null);
  const [view, setView] = useState<ShopView>("shop");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Suggestion state
  const [suggestions, setSuggestions] = useState<ShopSuggestionDTO[]>([]);
  const [suggestionBusy, setSuggestionBusy] = useState<string | null>(null);
  const [submittingSuggestion, setSubmittingSuggestion] = useState(false);

  // Admin state
  const isAdmin = (session?.user as { isAdmin?: boolean })?.isAdmin;
  const userId = (session?.user as { id?: string })?.id;
  const [showAdmin, setShowAdmin] = useState(false);
  const [editingItem, setEditingItem] = useState<ShopItem | null>(null);
  const [formData, setFormData] = useState({ title: "", description: "", price: "", imageUrl: "", category: "general" });
  const [submitting, setSubmitting] = useState(false);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchItems = useCallback(async () => {
    const res = await fetch("/api/shop");
    if (res.ok) setItems(await res.json());
  }, []);

  const fetchCoins = useCallback(async () => {
    if (!userId) return;
    const res = await fetch("/api/users");
    if (res.ok) {
      const users = await res.json();
      const me = users.find((u: { id: string }) => u.id === userId);
      if (me) setUserCoins(me.tumbaCoins);
    }
  }, [userId]);

  const fetchPurchases = useCallback(async () => {
    const res = await fetch("/api/shop/purchase");
    if (res.ok) setPurchases(await res.json());
  }, []);

  const fetchSuggestions = useCallback(async () => {
    const res = await fetch("/api/shop/suggestions");
    if (res.ok) {
      const data = await res.json();
      setSuggestions(data.suggestions ?? []);
    }
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated") {
      Promise.all([fetchItems(), fetchCoins(), fetchPurchases(), fetchSuggestions()]).then(() =>
        setLoading(false),
      );
    }
  }, [status, router, fetchItems, fetchCoins, fetchPurchases, fetchSuggestions]);

  async function purchaseItem(item: ShopItem) {
    if (buying) return;
    if (userCoins < item.price) {
      showToast("Not enough TumbaCoins!", "error");
      return;
    }
    if (!confirm(`Buy "${item.title}" for ${item.price} TC?`)) return;

    setBuying(item.id);
    const res = await fetch("/api/shop/purchase", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ shopItemId: item.id }),
    });

    if (res.ok) {
      const data = await res.json();
      setUserCoins(data.newBalance);
      showToast(`Purchased "${item.title}"!`, "success");
      fetchPurchases();
    } else {
      const data = await res.json();
      showToast(data.error || "Purchase failed", "error");
    }
    setBuying(null);
  }

  // ── Suggestion handlers ────────────────────────────────────────────────
  async function submitSuggestion(input: { title: string; description: string; price: number; category: string }) {
    setSubmittingSuggestion(true);
    try {
      const res = await fetch("/api/shop/suggestions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(input),
      });
      if (res.ok) {
        await Promise.all([fetchSuggestions(), fetchItems()]);
        showToast("Suggestion submitted for group vote!", "success");
        setView("voting");
        return true;
      }
      const data = await res.json();
      showToast(data.error || "Failed to submit suggestion", "error");
      return false;
    } finally {
      setSubmittingSuggestion(false);
    }
  }

  async function voteSuggestion(id: string, value: 1 | -1) {
    if (suggestionBusy) return;
    setSuggestionBusy(id);
    const res = await fetch(`/api/shop/suggestions/${id}/vote`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value }),
    });
    if (res.ok) {
      const data = await res.json();
      const updated: ShopSuggestionDTO = data.suggestion;
      setSuggestions((prev) => prev.map((s) => (s.id === id ? updated : s)));
      if (updated.status === "APPROVED") {
        showToast("Suggestion approved — it's in the shop!", "success");
        fetchItems();
        fetchCoins();
      } else if (updated.status === "REJECTED") {
        showToast("Suggestion rejected by community", "error");
      }
    } else {
      const data = await res.json();
      showToast(data.error || "Vote failed", "error");
    }
    setSuggestionBusy(null);
  }

  async function clearVote(id: string) {
    if (suggestionBusy) return;
    setSuggestionBusy(id);
    const res = await fetch(`/api/shop/suggestions/${id}/vote`, { method: "DELETE" });
    if (res.ok) {
      const data = await res.json();
      setSuggestions((prev) => prev.map((s) => (s.id === id ? data.suggestion : s)));
    }
    setSuggestionBusy(null);
  }

  async function adminResolveSuggestion(id: string, action: "APPROVE" | "REJECT") {
    if (suggestionBusy) return;
    setSuggestionBusy(id);
    const res = await fetch(`/api/shop/suggestions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (res.ok) {
      await Promise.all([fetchSuggestions(), fetchItems(), fetchCoins()]);
      showToast(action === "APPROVE" ? "Suggestion approved" : "Suggestion rejected", "success");
    } else {
      const data = await res.json();
      showToast(data.error || "Moderation failed", "error");
    }
    setSuggestionBusy(null);
  }

  // Admin functions
  async function saveItem(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const payload = {
      ...formData,
      price: parseInt(formData.price) || 0,
      imageUrl: formData.imageUrl || null,
    };

    if (editingItem) {
      const res = await fetch("/api/shop", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editingItem.id, ...payload }),
      });
      if (res.ok) {
        showToast("Item updated!", "success");
        resetForm();
        fetchItems();
      }
    } else {
      const res = await fetch("/api/shop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        showToast("Item created!", "success");
        resetForm();
        fetchItems();
      }
    }
    setSubmitting(false);
  }

  async function toggleActive(item: ShopItem) {
    await fetch("/api/shop", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: item.id, active: !item.active }),
    });
    fetchItems();
  }

  async function deleteItem(id: string) {
    if (!confirm("Delete this item?")) return;
    await fetch(`/api/shop?id=${id}`, { method: "DELETE" });
    fetchItems();
  }

  function resetForm() {
    setFormData({ title: "", description: "", price: "", imageUrl: "", category: "general" });
    setEditingItem(null);
  }

  function startEdit(item: ShopItem) {
    setEditingItem(item);
    setFormData({
      title: item.title,
      description: item.description,
      price: String(item.price),
      imageUrl: item.imageUrl || "",
      category: item.category,
    });
    setShowAdmin(true);
  }

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="text-tumba-400 animate-pulse text-xl">Loading...</div>
      </div>
    );
  }

  const activeItems = items.filter((i) => i.active);
  const categories = ["all", ...Array.from(new Set(activeItems.map((i) => i.category)))];
  const filteredItems = selectedCategory === "all" ? activeItems : activeItems.filter((i) => i.category === selectedCategory);
  const pendingSuggestions = suggestions.filter((s) => s.status === "PENDING");
  const resolvedSuggestions = suggestions.filter((s) => s.status !== "PENDING");
  const pendingCount = pendingSuggestions.length;

  return (
    <MotionPage className="max-w-5xl mx-auto px-4 py-6 sm:py-8">
      {/* Toast */}
      {toast && (
        <div className={`fixed top-20 right-4 z-50 px-5 py-3 rounded-xl text-sm font-medium shadow-xl transition-all ${
          toast.type === "success" ? "bg-green-500/90 text-white" : "bg-red-500/90 text-white"
        }`}>
          {toast.message}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-3">
            <ShopIcon size={32} strokeWidth={1.75} className="text-tumba-400 shrink-0" />
            <span className="gradient-text">TumbaShop</span>
          </h1>
          <p className="text-sm sm:text-base text-[var(--text-secondary)] mt-1">
            Spend your TumbaCoins on rewards, experiences, and more
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <CoinBadge amount={userCoins} />
          {isAdmin && (
            <button
              onClick={() => { setShowAdmin(!showAdmin); if (showAdmin) resetForm(); }}
              className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                showAdmin
                  ? "bg-tumba-500 text-white"
                  : "bg-[var(--bg-card)] text-[var(--text-secondary)] border border-[var(--border)] hover:text-[var(--text-primary)]"
              }`}
            >
              {showAdmin ? "Close Admin" : "Manage"}
            </button>
          )}
        </div>
      </div>

      {/* View tabs */}
      <div className="flex items-center gap-1 mb-6 p-1 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] overflow-x-auto">
        {([
          { key: "shop",    label: "Shop"        },
          { key: "voting",  label: `Voting${pendingCount ? ` (${pendingCount})` : ""}` },
          { key: "suggest", label: "Suggest"     },
          { key: "history", label: "My Purchases" },
        ] as { key: ShopView; label: string }[]).map((tab) => (
          <button
            key={tab.key}
            onClick={() => setView(tab.key)}
            className={`relative px-4 py-2 rounded-xl text-sm font-medium transition-colors whitespace-nowrap ${
              view === tab.key
                ? "text-white"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            }`}
          >
            {view === tab.key && (
              <motion.div
                layoutId="shop-tab-indicator"
                className="absolute inset-0 rounded-xl bg-gradient-to-r from-tumba-500 to-neon-pink shadow-lg shadow-tumba-500/25"
                transition={{ type: "spring", stiffness: 350, damping: 30 }}
              />
            )}
            <span className="relative z-10">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Admin Panel */}
      {isAdmin && showAdmin && (
        <div className="mb-8 p-4 sm:p-5 rounded-2xl border border-tumba-500/20 bg-tumba-500/5">
          <h2 className="text-lg font-semibold mb-4">{editingItem ? "Edit Item" : "Add New Item"}</h2>
          <form onSubmit={saveItem} className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                required
                className="px-4 py-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-tumba-500 text-sm"
              />
              <input
                type="number"
                placeholder="Price (TC)"
                value={formData.price}
                onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                required
                min="1"
                className="px-4 py-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-tumba-500 text-sm"
              />
            </div>
            <textarea
              placeholder="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              required
              rows={2}
              className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-tumba-500 resize-none text-sm"
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Image URL (optional)"
                value={formData.imageUrl}
                onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                className="px-4 py-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-tumba-500 text-sm"
              />
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="px-4 py-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-tumba-500 text-sm"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={submitting}
                className="px-5 py-2.5 rounded-xl bg-tumba-500 text-white font-semibold hover:bg-tumba-400 transition-all disabled:opacity-50 text-sm"
              >
                {submitting ? "Saving..." : editingItem ? "Update Item" : "Add Item"}
              </button>
              {editingItem && (
                <button type="button" onClick={resetForm} className="px-4 py-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]">
                  Cancel
                </button>
              )}
            </div>
          </form>

          {/* Admin item list */}
          <div className="mt-6 space-y-2">
            <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-2">All Items ({items.length})</h3>
            {items.map((item) => (
              <div key={item.id} className={`flex items-center justify-between gap-3 p-3 rounded-xl border ${item.active ? "border-[var(--border)]" : "border-red-500/20 opacity-60"} bg-[var(--bg-card)]`}>
                <div className="min-w-0 flex-1">
                  <span className="text-sm font-medium">{item.title}</span>
                  <span className="text-xs text-[var(--text-secondary)] ml-2">{item.price} TC</span>
                  {!item.active && <span className="text-xs text-red-400 ml-2">Inactive</span>}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => startEdit(item)} className="text-xs px-2 py-1 rounded-lg text-tumba-400 hover:bg-tumba-500/10">Edit</button>
                  <button onClick={() => toggleActive(item)} className="text-xs px-2 py-1 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)]">
                    {item.active ? "Deactivate" : "Activate"}
                  </button>
                  <button onClick={() => deleteItem(item.id)} className="text-xs px-2 py-1 rounded-lg text-red-400/60 hover:text-red-400 hover:bg-red-500/10">Delete</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <AnimatePresence mode="wait">
        {view === "history" && (
          <motion.div
            key="history"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="space-y-3"
          >
            {purchases.length === 0 ? (
              <div className="text-center py-16 text-[var(--text-secondary)]">
                <ShopIcon size={48} strokeWidth={1.25} className="mb-4 text-[var(--text-secondary)]" />
                <p className="text-lg">No purchases yet</p>
                <p className="text-sm mt-1">Browse the shop and get something!</p>
              </div>
            ) : (
              purchases.map((p) => (
                <div key={p.id} className="flex items-center gap-3 p-4 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)]">
                  <div className="h-12 w-12 rounded-xl bg-tumba-500/10 flex items-center justify-center text-2xl shrink-0">
                    {p.shopItem.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.shopItem.imageUrl} alt="" className="h-10 w-10 rounded-lg object-cover" />
                    ) : (
                      <PackageIcon size={22} strokeWidth={1.75} className="text-[var(--text-secondary)]" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{p.shopItem.title}</p>
                    <p className="text-xs text-[var(--text-secondary)]">
                      {isAdmin && <span>{p.user.name} &middot; </span>}
                      {new Date(p.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
                    </p>
                  </div>
                  <CoinAmountSm amount={p.price} className="shrink-0" />
                </div>
              ))
            )}
          </motion.div>
        )}

        {view === "voting" && (
          <motion.div
            key="voting"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
          >
            {suggestions.length === 0 ? (
              <div className="text-center py-16 text-[var(--text-secondary)]">
                <ShopIcon size={48} strokeWidth={1.25} className="mb-4 text-[var(--text-secondary)]" />
                <p className="text-lg">No community suggestions yet</p>
                <p className="text-sm mt-1">Be the first — head to the Suggest tab.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {pendingSuggestions.length > 0 && (
                  <div>
                    <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-3">
                      Open for voting · {pendingSuggestions.length}
                    </h2>
                    <motion.div
                      variants={staggerContainer}
                      initial="hidden"
                      animate="visible"
                      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
                    >
                      {pendingSuggestions.map((s) => (
                        <motion.div variants={fadeInUp} key={s.id}>
                          <SuggestionCard
                            suggestion={s}
                            onVote={(v) => voteSuggestion(s.id, v)}
                            onClearVote={() => clearVote(s.id)}
                            onAdminApprove={isAdmin ? () => adminResolveSuggestion(s.id, "APPROVE") : undefined}
                            onAdminReject={isAdmin ? () => adminResolveSuggestion(s.id, "REJECT") : undefined}
                            pending={suggestionBusy === s.id}
                            isAdmin={isAdmin}
                          />
                        </motion.div>
                      ))}
                    </motion.div>
                  </div>
                )}
                {resolvedSuggestions.length > 0 && (
                  <div>
                    <h2 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wide mb-3">
                      Resolved · {resolvedSuggestions.length}
                    </h2>
                    <motion.div
                      variants={staggerContainer}
                      initial="hidden"
                      animate="visible"
                      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
                    >
                      {resolvedSuggestions.map((s) => (
                        <motion.div variants={fadeInUp} key={s.id}>
                          <SuggestionCard
                            suggestion={s}
                            onVote={() => {}}
                            onClearVote={() => {}}
                            pending={false}
                          />
                        </motion.div>
                      ))}
                    </motion.div>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}

        {view === "suggest" && (
          <motion.div
            key="suggest"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="max-w-2xl mx-auto"
          >
            <SuggestionForm onSubmit={submitSuggestion} submitting={submittingSuggestion} />
          </motion.div>
        )}

        {view === "shop" && (
          <motion.div
            key="shop"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
          >
            {/* Category filter */}
            {categories.length > 2 && (
              <div className="flex gap-2 mb-6 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0">
                {categories.map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all whitespace-nowrap ${
                      selectedCategory === cat
                        ? "bg-tumba-500 text-white shadow-lg shadow-tumba-500/25"
                        : "bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)]"
                    }`}
                  >
                    {cat === "all" ? "All" : cat.charAt(0).toUpperCase() + cat.slice(1)}
                  </button>
                ))}
              </div>
            )}

            {/* Shop Grid */}
            {filteredItems.length === 0 ? (
              <div className="text-center py-16 text-[var(--text-secondary)]">
                <ShopIcon size={48} strokeWidth={1.25} className="mb-4 text-[var(--text-secondary)]" />
                <p className="text-lg">No items in the shop yet</p>
                {isAdmin && <p className="text-sm mt-1">Use the Manage button to add items.</p>}
              </div>
            ) : (
              <motion.div variants={staggerContainer} initial="hidden" animate="visible" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredItems.map((item) => (
                  <motion.div
                    variants={fadeInUp}
                    key={item.id}
                    className="p-4 sm:p-5 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)] transition-all flex flex-col"
                  >
                    {/* Image */}
                    {item.imageUrl ? (
                      <div className="h-36 sm:h-40 rounded-xl overflow-hidden mb-3 bg-[var(--bg-primary)]">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={item.imageUrl} alt={item.title} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="h-24 sm:h-28 rounded-xl mb-3 bg-gradient-to-br from-tumba-500/10 to-tumba-700/10 flex items-center justify-center">
                        <PackageIcon size={36} strokeWidth={1.5} className="text-tumba-400/50" />
                      </div>
                    )}

                    {/* Source + category badges */}
                    <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                      {item.source === "COMMUNITY" && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-gradient-to-r from-tumba-500/20 to-neon-pink/20 text-tumba-400 font-semibold">
                          Community
                        </span>
                      )}
                      {item.source === "BUILT_IN" && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-neon-pink/15 text-neon-pink font-semibold">
                          Classic
                        </span>
                      )}
                      {item.category !== "general" && (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-tumba-500/15 text-tumba-400 font-medium capitalize">
                          {item.category}
                        </span>
                      )}
                    </div>

                    <h3 className="font-semibold text-base mb-1">{item.title}</h3>
                    <p className="text-sm text-[var(--text-secondary)] flex-1 mb-3 line-clamp-2">{item.description}</p>

                    {/* Price + Buy */}
                    <div className="flex items-center justify-between gap-2 mt-auto">
                      <CoinAmountMd amount={item.price} />
                      <button
                        onClick={() => purchaseItem(item)}
                        disabled={buying === item.id || userCoins < item.price}
                        className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                          userCoins < item.price
                            ? "bg-[var(--border)] text-[var(--text-secondary)] cursor-not-allowed"
                            : "bg-tumba-500 text-white hover:bg-tumba-400 shadow-lg shadow-tumba-500/20"
                        }`}
                      >
                        {buying === item.id ? "Buying..." : userCoins < item.price ? "Not enough TC" : "Buy"}
                      </button>
                    </div>
                  </motion.div>
                ))}
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </MotionPage>
  );
}
