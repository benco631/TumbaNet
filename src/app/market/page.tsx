"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useCallback } from "react";
import { MarketIcon } from "@/lib/icons";
import { CoinBadge, CoinAmountSm, CoinDelta } from "@/components/TumbaCoin";

interface Wager {
  id: string;
  amount: number;
  payout: number | null;
  userId: string;
  user: { id: string; name: string };
}

interface BetOption {
  id: string;
  text: string;
  wagers: Wager[];
}

interface Bet {
  id: string;
  title: string;
  description: string;
  closingDate: string;
  status: string;
  resolvedOptionId: string | null;
  createdAt: string;
  user: { id: string; name: string };
  options: BetOption[];
}

export default function MarketPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [bets, setBets] = useState<Bet[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<"all" | "open" | "resolved">("all");

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [closingDate, setClosingDate] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [submitting, setSubmitting] = useState(false);

  // Wager state
  const [wagerAmounts, setWagerAmounts] = useState<Record<string, string>>({});
  const [userCoins, setUserCoins] = useState(0);

  const userId = (session?.user as { id?: string })?.id;
  const isAdmin = (session?.user as { isAdmin?: boolean })?.isAdmin;

  const fetchBets = useCallback(async () => {
    const res = await fetch("/api/market");
    if (res.ok) {
      const data = await res.json();
      setBets(data);
    }
    setLoading(false);
  }, []);

  const fetchCoins = useCallback(async () => {
    const res = await fetch("/api/users");
    if (res.ok) {
      const users = await res.json();
      const me = users.find((u: { id: string }) => u.id === userId);
      if (me) setUserCoins(me.tumbaCoins);
    }
  }, [userId]);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/login");
    if (status === "authenticated") {
      fetchBets();
      fetchCoins();
    }
  }, [status, router, fetchBets, fetchCoins]);

  async function createBet(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const validOptions = options.filter((o) => o.trim());
    if (validOptions.length < 2) return;

    const res = await fetch("/api/market", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, description, closingDate, options: validOptions }),
    });

    if (res.ok) {
      setTitle("");
      setDescription("");
      setClosingDate("");
      setOptions(["", ""]);
      setShowForm(false);
      fetchBets();
    }
    setSubmitting(false);
  }

  async function placeWager(betOptionId: string) {
    const amount = parseInt(wagerAmounts[betOptionId] || "0");
    if (!amount || amount <= 0) return;

    const res = await fetch("/api/market/wager", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ betOptionId, amount }),
    });

    if (res.ok) {
      setWagerAmounts((prev) => ({ ...prev, [betOptionId]: "" }));
      fetchBets();
      fetchCoins();
    } else {
      const data = await res.json();
      alert(data.error || "Failed to place wager");
    }
  }

  async function resolveBet(betId: string, winningOptionId: string) {
    if (!confirm("Are you sure you want to resolve this bet?")) return;
    const res = await fetch("/api/market/resolve", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ betId, winningOptionId }),
    });

    if (res.ok) {
      fetchBets();
      fetchCoins();
    }
  }

  async function deleteBet(id: string) {
    if (!confirm("Delete this bet? All wagers will be refunded.")) return;
    const res = await fetch(`/api/market?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      fetchBets();
      fetchCoins();
    }
  }

  if (status === "loading" || loading) {
    return (
      <div className="flex items-center justify-center min-h-[calc(100vh-4rem)]">
        <div className="text-tumba-400 animate-pulse text-xl">Loading...</div>
      </div>
    );
  }

  const filteredBets = bets.filter((b) => {
    if (filter === "open") return b.status === "OPEN";
    if (filter === "resolved") return b.status === "RESOLVED";
    return true;
  });

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <MarketIcon size={32} strokeWidth={1.75} className="text-tumba-400 shrink-0" />
            <span className="bg-gradient-to-r from-tumba-300 to-tumba-500 bg-clip-text text-transparent">
              TumbaMarket
            </span>
          </h1>
          <p className="text-[var(--text-secondary)] mt-1">
            Bet TumbaCoins on anything. May the odds be in your favor.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <CoinBadge amount={userCoins} />
          <button
            onClick={() => setShowForm(!showForm)}
            className="px-5 py-2.5 rounded-xl bg-tumba-500 text-white font-semibold hover:bg-tumba-400 transition-all shadow-lg shadow-tumba-500/20 whitespace-nowrap"
          >
            {showForm ? "Cancel" : "+ New Bet"}
          </button>
        </div>
      </div>

      {/* Create Bet Form */}
      {showForm && (
        <form onSubmit={createBet} className="mb-8 p-5 rounded-2xl border border-tumba-500/20 bg-tumba-500/5 space-y-4">
          <h2 className="text-lg font-semibold">Create a New Bet</h2>
          <div>
            <label className="block text-sm text-[var(--text-secondary)] mb-1">Question / Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-tumba-500"
              placeholder='e.g. "Will Dan get a girlfriend before summer?"'
            />
          </div>
          <div>
            <label className="block text-sm text-[var(--text-secondary)] mb-1">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              required
              rows={2}
              className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-tumba-500 resize-none"
              placeholder="More context about the bet..."
            />
          </div>
          <div>
            <label className="block text-sm text-[var(--text-secondary)] mb-1">Closing Date</label>
            <input
              type="datetime-local"
              value={closingDate}
              onChange={(e) => setClosingDate(e.target.value)}
              required
              className="w-full px-4 py-2.5 rounded-xl bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-tumba-500"
            />
          </div>
          <div>
            <label className="block text-sm text-[var(--text-secondary)] mb-1">Answer Options</label>
            {options.map((opt, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={opt}
                  onChange={(e) => {
                    const next = [...options];
                    next[i] = e.target.value;
                    setOptions(next);
                  }}
                  className="flex-1 px-4 py-2 rounded-lg bg-[var(--bg-card)] border border-[var(--border)] text-[var(--text-primary)] text-sm focus:outline-none focus:border-tumba-500"
                  placeholder={`Option ${i + 1}`}
                />
                {options.length > 2 && (
                  <button type="button" onClick={() => setOptions(options.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-300 px-2">
                    x
                  </button>
                )}
              </div>
            ))}
            <button type="button" onClick={() => setOptions([...options, ""])} className="text-xs text-tumba-400 hover:text-tumba-300">
              + Add Option
            </button>
          </div>
          <button
            type="submit"
            disabled={submitting || !title.trim() || !description.trim() || !closingDate || options.filter((o) => o.trim()).length < 2}
            className="w-full py-2.5 rounded-xl bg-tumba-500 text-white font-semibold hover:bg-tumba-400 transition-all disabled:opacity-50"
          >
            {submitting ? "Creating..." : "Create Bet"}
          </button>
        </form>
      )}

      {/* Filters */}
      <div className="flex gap-2 mb-6">
        {(["all", "open", "resolved"] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              filter === f
                ? "bg-tumba-500 text-white shadow-lg shadow-tumba-500/25"
                : "bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border)]"
            }`}
          >
            {f === "all" ? "All Bets" : f === "open" ? "Open" : "Resolved"}
          </button>
        ))}
      </div>

      {/* Bets List */}
      <div className="space-y-4">
        {filteredBets.length === 0 ? (
          <div className="text-center py-16 text-[var(--text-secondary)]">
            <MarketIcon size={48} strokeWidth={1.25} className="mb-4 text-[var(--text-secondary)]" />
            <p className="text-lg">No bets yet</p>
            <p className="text-sm mt-1">Create the first bet and get the action going!</p>
          </div>
        ) : (
          filteredBets.map((bet) => {
            const totalPool = bet.options.reduce(
              (sum, opt) => sum + opt.wagers.reduce((s, w) => s + w.amount, 0), 0
            );
            const isExpired = new Date() > new Date(bet.closingDate);
            const canResolve = (bet.user.id === userId || isAdmin) && bet.status === "OPEN";
            const canDelete = (bet.user.id === userId || isAdmin) && bet.status !== "RESOLVED";
            const userWager = bet.options.flatMap((o) => o.wagers).find((w) => w.userId === userId);

            return (
              <div
                key={bet.id}
                className={`p-5 rounded-2xl border transition-all ${
                  bet.status === "RESOLVED"
                    ? "border-green-500/20 bg-green-500/5"
                    : isExpired
                      ? "border-red-500/20 bg-red-500/5"
                      : "border-[var(--border)] bg-[var(--bg-card)] hover:bg-[var(--bg-card-hover)]"
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-lg font-semibold">{bet.title}</h3>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        bet.status === "OPEN" && !isExpired
                          ? "bg-green-500/20 text-green-400"
                          : bet.status === "RESOLVED"
                            ? "bg-blue-500/20 text-blue-400"
                            : "bg-red-500/20 text-red-400"
                      }`}>
                        {bet.status === "RESOLVED" ? "Resolved" : isExpired ? "Expired" : "Open"}
                      </span>
                    </div>
                    <p className="text-sm text-[var(--text-secondary)] mt-1">{bet.description}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-[var(--text-secondary)]">
                      <span>by {bet.user.name}</span>
                      <span>Closes: {new Date(bet.closingDate).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}</span>
                      <span className="flex items-center gap-1">
                        Pool: <CoinAmountSm amount={totalPool} />
                      </span>
                    </div>
                  </div>
                  {canDelete && (
                    <button onClick={() => deleteBet(bet.id)} className="text-xs text-red-400/60 hover:text-red-400 px-2 py-1 rounded hover:bg-red-500/10 shrink-0">
                      Delete
                    </button>
                  )}
                </div>

                {/* Options */}
                <div className="space-y-2 mt-4">
                  {bet.options.map((option) => {
                    const optionPool = option.wagers.reduce((s, w) => s + w.amount, 0);
                    const percentage = totalPool > 0 ? Math.round((optionPool / totalPool) * 100) : 0;
                    const myWager = option.wagers.find((w) => w.userId === userId);
                    const isWinner = bet.resolvedOptionId === option.id;

                    return (
                      <div key={option.id} className={`relative p-3 rounded-xl border transition-all overflow-hidden ${
                        isWinner
                          ? "border-green-500/40 bg-green-500/10"
                          : myWager
                            ? "border-tumba-500/40 bg-tumba-500/5"
                            : "border-[var(--border)]"
                      }`}>
                        {/* Progress bar */}
                        {totalPool > 0 && (
                          <div
                            className={`absolute inset-y-0 left-0 ${isWinner ? "bg-green-500/10" : "bg-tumba-500/5"}`}
                            style={{ width: `${percentage}%` }}
                          />
                        )}

                        <div className="relative flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {isWinner && <span className="text-green-400">&#x2713;</span>}
                            <span className="text-sm font-medium">{option.text}</span>
                            {myWager && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-tumba-500/20 text-tumba-400">
                                You: {myWager.amount}
                                {myWager.payout !== null && myWager.payout !== undefined && (
                                  myWager.payout > 0
                                    ? <>{" "}<CoinDelta amount={myWager.payout} /></>
                                    : <span className="text-red-400/80"> Lost</span>
                                )}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs text-[var(--text-secondary)]">{optionPool} TC ({percentage}%)</span>
                            {/* Wager input - only if open and not expired and user hasn't wagered on this option */}
                            {bet.status === "OPEN" && !isExpired && !userWager && (
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  min="1"
                                  value={wagerAmounts[option.id] || ""}
                                  onChange={(e) => setWagerAmounts((prev) => ({ ...prev, [option.id]: e.target.value }))}
                                  className="w-16 px-2 py-1 text-xs rounded-lg bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-primary)] focus:outline-none focus:border-tumba-500 text-right"
                                  placeholder="TC"
                                />
                                <button
                                  onClick={() => placeWager(option.id)}
                                  className="text-xs px-2 py-1 rounded-lg bg-tumba-500 text-white font-medium hover:bg-tumba-400 transition-colors"
                                >
                                  Bet
                                </button>
                              </div>
                            )}
                            {/* Resolve button */}
                            {canResolve && isExpired && (
                              <button
                                onClick={() => resolveBet(bet.id, option.id)}
                                className="text-xs px-2 py-1 rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors"
                              >
                                Winner
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Bettors */}
                        {option.wagers.length > 0 && (
                          <div className="relative mt-1.5 text-[11px] text-[var(--text-secondary)]">
                            {option.wagers.map((w) => w.user.name).join(", ")}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
