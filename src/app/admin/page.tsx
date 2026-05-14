"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, X, Award, Activity, Calendar, Car, Home, Users } from "lucide-react";
import Image from "next/image";

// --- Types ---
interface PendingRequest {
  id: string;
  type: "DRIVE" | "HOST";
  subType: string;
  participantCount: number;
  note: string | null;
  calculatedCoins: number;
  createdAt: string;
  user: {
    name: string;
    avatar: string | null;
  };
}

export default function AdminDashboard() {
  const { data: session } = useSession();
  const [activeTab, setActiveTab] = useState<"REQUESTS" | "ACHIEVEMENTS">("REQUESTS");
  
  // Requests State
  const [requests, setRequests] = useState<PendingRequest[]>([]);
  const [isLoadingRequests, setIsLoadingRequests] = useState(true);
  
  // Achievements State
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [isRunningAchievements, setIsRunningAchievements] = useState(false);

  // --- Fetch Requests ---
  const fetchRequests = useCallback(async () => {
    setIsLoadingRequests(true);
    try {
      const res = await fetch("/api/admin/requests");
      if (res.ok) {
        const data = await res.json();
        setRequests(data);
      }
    } catch (error) {
      console.error("Failed to fetch requests", error);
    } finally {
      setIsLoadingRequests(false);
    }
  }, []);

  useEffect(() => {
    if (session) fetchRequests();
  }, [session, fetchRequests]);

  // --- Handle Approve / Reject ---
  const handleAction = async (requestId: string, action: "APPROVE" | "REJECT") => {
    // אופטימיזציה של ה-UI: מעלימים את הבקשה מיד כדי שהאדמין לא יחכה
    setRequests(prev => prev.filter(r => r.id !== requestId));
    
    try {
      const res = await fetch("/api/admin/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, action })
      });
      
      if (!res.ok) throw new Error("Failed action");
      
    } catch (error) {
      console.error(error);
      alert("Failed to process request. Please try again.");
      fetchRequests(); // במקרה של שגיאה, מחזירים את הרשימה האמיתית
    }
  };

  // --- Run Achievements ---
  const handleRunAchievements = async () => {
    if (!confirm(`Are you sure you want to run achievements for ${month}/${year}?`)) return;
    
    setIsRunningAchievements(true);
    try {
      const res = await fetch("/api/admin/achievements/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month, year })
      });
      
      if (!res.ok) throw new Error("Failed to run achievements");
      
      const data = await res.json();
      alert(`Success! Distributed ${data.rewardsGiven || 0} rewards.`);
    } catch (error) {
      console.error(error);
      alert("Failed to run achievements.");
    } finally {
      setIsRunningAchievements(false);
    }
  };

  // חסימת גישה אם המשתמש הוא לא אדמין (נבדק קודם כל לפי הפרופיל שלו)
  const isAdmin = (session?.user as { isAdmin?: boolean })?.isAdmin;
  
  if (!session) return null;
  
  if (!isAdmin) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-mesh px-4">
        <div className="text-center">
          <div className="text-4xl mb-4">⛔</div>
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-[var(--text-secondary)]">This area is for Tumba Admins only.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 min-h-[calc(100vh-4rem)] bg-mesh">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold gradient-text">Command Center</h1>
        <p className="text-sm text-[var(--text-secondary)] mt-1">Manage TumbaNet economy and events.</p>
      </div>

      {/* --- TABS --- */}
      <div className="flex p-1 mb-6 bg-[var(--bg-primary)] rounded-xl border border-[var(--border)]">
        <button
          onClick={() => setActiveTab("REQUESTS")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${
            activeTab === "REQUESTS"
              ? "bg-[var(--bg-card)] text-tumba-400 shadow-sm border border-tumba-500/20"
              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          }`}
        >
          <Activity size={18} /> Approvals
          {requests.length > 0 && (
            <span className="bg-neon-pink text-white text-[10px] px-2 py-0.5 rounded-full ml-1 animate-pulse">
              {requests.length}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("ACHIEVEMENTS")}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${
            activeTab === "ACHIEVEMENTS"
              ? "bg-[var(--bg-card)] text-amber-400 shadow-sm border border-amber-500/20"
              : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          }`}
        >
          <Award size={18} /> Achievements
        </button>
      </div>

      {/* --- CONTENT --- */}
      <AnimatePresence mode="wait">
        
        {/* TAB 1: REQUESTS */}
        {activeTab === "REQUESTS" && (
          <motion.div
            key="requests"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {isLoadingRequests ? (
              <div className="text-center py-10 text-[var(--text-secondary)] animate-pulse">
                Loading requests...
              </div>
            ) : requests.length === 0 ? (
              <div className="card-premium p-8 text-center flex flex-col items-center">
                <Check size={40} className="text-tumba-500/50 mb-3" />
                <p className="font-bold">All Caught Up!</p>
                <p className="text-sm text-[var(--text-secondary)] mt-1">There are no pending activity reports.</p>
              </div>
            ) : (
              requests.map((req) => (
                <div key={req.id} className="card-premium p-4 flex flex-col sm:flex-row sm:items-center gap-4">
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-12 h-12 rounded-full bg-tumba-500/20 overflow-hidden relative shrink-0 border border-tumba-500/30">
                      {req.user.avatar ? (
                        <Image src={req.user.avatar} alt={req.user.name} fill className="object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center font-bold text-tumba-300">
                          {req.user.name[0].toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="font-bold text-sm leading-tight">{req.user.name}</p>
                      <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)] mt-1 font-medium">
                        {req.type === "DRIVE" ? <Car size={12} className="text-tumba-400" /> : <Home size={12} className="text-amber-400" />}
                        <span className="capitalize">{req.subType.toLowerCase()} {req.type.toLowerCase()}</span>
                        <span>•</span>
                        <Users size={12} /> {req.participantCount}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-4 border-t border-[var(--border)] sm:border-0 pt-3 sm:pt-0 mt-2 sm:mt-0">
                    <div className="text-center px-3 border-r border-[var(--border)]">
                      <p className="text-xs text-[var(--text-muted)] font-mono uppercase">Reward</p>
                      <p className="font-extrabold text-tumba-300 text-lg">+{req.calculatedCoins}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAction(req.id, "REJECT")}
                        className="w-10 h-10 rounded-full bg-red-500/10 hover:bg-red-500/20 text-red-500 flex items-center justify-center transition-colors border border-red-500/20"
                      >
                        <X size={20} />
                      </button>
                      <button
                        onClick={() => handleAction(req.id, "APPROVE")}
                        className="w-10 h-10 rounded-full bg-green-500/10 hover:bg-green-500/20 text-green-500 flex items-center justify-center transition-colors border border-green-500/20"
                      >
                        <Check size={20} strokeWidth={3} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </motion.div>
        )}

        {/* TAB 2: ACHIEVEMENTS */}
        {activeTab === "ACHIEVEMENTS" && (
          <motion.div
            key="achievements"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <div className="card-premium p-6">
              <div className="flex items-start gap-4 mb-6">
                <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                  <Award size={24} className="text-amber-400" />
                </div>
                <div>
                  <h3 className="font-extrabold text-lg">Distribute Achievements</h3>
                  <p className="text-sm text-[var(--text-secondary)] mt-1">
                    Run the algorithm to calculate monthly top host, top driver, and other group achievements. Safe to run multiple times (duplicates are ignored).
                  </p>
                </div>
              </div>

              <div className="flex gap-4 mb-6">
                <div className="flex-1">
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-2">Month (1-12)</label>
                  <input
                    type="number"
                    min="1" max="12"
                    value={month}
                    onChange={(e) => setMonth(Number(e.target.value))}
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500/50"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-bold text-[var(--text-secondary)] uppercase mb-2">Year</label>
                  <input
                    type="number"
                    min="2024"
                    value={year}
                    onChange={(e) => setYear(Number(e.target.value))}
                    className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-amber-500/50"
                  />
                </div>
              </div>

              <button
                onClick={handleRunAchievements}
                disabled={isRunningAchievements}
                className="w-full py-3.5 bg-gradient-to-r from-amber-600 to-amber-400 hover:from-amber-500 hover:to-amber-400 text-white rounded-xl font-extrabold shadow-lg shadow-amber-500/20 transition-all disabled:opacity-70 flex items-center justify-center gap-2"
              >
                {isRunningAchievements ? (
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                    className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                  />
                ) : (
                  <>
                    <Calendar size={18} /> Run End of Month
                  </>
                )}
              </button>
            </div>
          </motion.div>
        )}

      </AnimatePresence>
    </div>
  );
}