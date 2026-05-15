"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Car, Home, Trash2, ArrowLeft, Zap, Clock, Activity } from "lucide-react";
import { MotionPage } from "@/components/motion";

interface ActivityLog {
  id: string;
  type: "CAR" | "HOST";
  userId: string;
  user: {
    id: string;
    name: string;
    avatar: string | null;
  };
  distanceKm: number | null;
  passengerCount: number | null;
  attendeeCount: number | null;
  shortNotice: boolean;
  createdAt: string;
}

// Helper to format "Time Ago"
function timeAgo(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}

export default function FeedPage() {
  const { data: session, status } = useSession();
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Custom Elegant Confirmation States
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const isAdmin = (session?.user as { isAdmin?: boolean })?.isAdmin;

  useEffect(() => {
    fetch("/api/activity")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setLogs(data);
        }
      })
      .catch((err) => console.error("Failed to fetch logs", err))
      .finally(() => setIsLoading(false));
  }, []);

  const executeDelete = async () => {
    if (!confirmDeleteId) return;
    
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/activity?id=${confirmDeleteId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setLogs((prev) => prev.filter((log) => log.id !== confirmDeleteId));
        setConfirmDeleteId(null);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsDeleting(false);
    }
  };

  if (status === "loading" || isLoading) {
    return (
      <MotionPage className="max-w-2xl mx-auto px-4 py-6 bg-mesh min-h-[calc(100vh-4rem)]">
        <div className="animate-pulse space-y-4 mt-12">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-[var(--bg-card)] rounded-2xl border border-[var(--border)] opacity-50" />
          ))}
        </div>
      </MotionPage>
    );
  }

  return (
    <MotionPage className="max-w-2xl mx-auto px-4 py-6 bg-mesh min-h-[calc(100vh-4rem)] pb-24 relative">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Link href="/" className="p-2 rounded-full hover:bg-[var(--bg-card)] border border-transparent hover:border-[var(--border)] transition-all">
          <ArrowLeft size={20} className="text-[var(--text-secondary)]" />
        </Link>
        <div>
          <h1 className="text-xl font-extrabold gradient-text">Activity Feed</h1>
          <p className="text-xs text-[var(--text-secondary)]">Group contributions and reports</p>
        </div>
      </div>

      {/* Feed List */}
      <div className="space-y-3">
        <AnimatePresence>
          {logs.length === 0 ? (
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              className="text-center py-12 card-premium"
            >
              <Activity size={32} className="mx-auto text-[var(--text-secondary)] opacity-30 mb-3" />
              <p className="text-sm font-bold text-[var(--text-primary)]">No activity yet</p>
              <p className="text-xs text-[var(--text-secondary)] mt-1">Be the first to report a drive or hosting</p>
            </motion.div>
          ) : (
            logs.map((log, i) => {
              const isCar = log.type === "CAR";
              const Icon = isCar ? Car : Home;
              
              return (
                <motion.div
                  key={log.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.2 } }}
                  transition={{ delay: i * 0.05 }}
                  className="flex gap-4 p-4 rounded-2xl bg-[var(--bg-card)] border border-[var(--border)] hover:border-tumba-500/30 transition-all shadow-sm"
                >
                  {/* Left Avatar */}
                  <div className="shrink-0 relative">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-white shadow-inner ${
                      isCar ? "bg-gradient-to-br from-blue-500 to-blue-700" : "bg-gradient-to-br from-tumba-400 to-neon-pink"
                    }`}>
                      {log.user.name[0].toUpperCase()}
                    </div>
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-[var(--bg-card)] border border-[var(--border)] flex items-center justify-center shadow-sm">
                      <Icon size={12} className={isCar ? "text-blue-400" : "text-tumba-400"} />
                    </div>
                  </div>

                  {/* Main Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-sm font-extrabold text-[var(--text-primary)] truncate mt-0.5">
                        {log.user.name}
                      </p>
                      
                      {/* Top Right Controls (Time + Delete) */}
                      <div className="flex items-center gap-3 shrink-0">
                        <div className="flex items-center gap-1 text-[10px] font-medium text-[var(--text-secondary)] mt-1">
                          <Clock size={10} />
                          {timeAgo(log.createdAt)}
                        </div>
                        {isAdmin && (
                          <button
                            onClick={() => setConfirmDeleteId(log.id)}
                            className="p-1.5 rounded-md bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-secondary)] hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/10 transition-all"
                            title="Delete Report"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="mt-1">
                      {isCar ? (
                        <p className="text-sm text-[var(--text-secondary)] leading-snug">
                          Drove <span className="font-bold text-[var(--text-primary)]">{log.distanceKm}km</span>
                          {log.passengerCount && log.passengerCount > 0 ? (
                            <> with <span className="font-bold text-[var(--text-primary)]">{log.passengerCount}</span> passengers</>
                          ) : (
                            " alone"
                          )}
                        </p>
                      ) : (
                        <div className="space-y-1.5">
                          <p className="text-sm text-[var(--text-secondary)] leading-snug">
                            Hosted <span className="font-bold text-[var(--text-primary)]">{log.attendeeCount}</span> people
                          </p>
                          {log.shortNotice && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded bg-yellow-400/10 text-yellow-500 border border-yellow-400/20 w-fit">
                              <Zap size={10} /> Invested
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </AnimatePresence>
      </div>

      {/* Elegant Custom Confirmation Modal */}
      <AnimatePresence>
        {confirmDeleteId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isDeleting && setConfirmDeleteId(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative w-full max-w-sm bg-[var(--bg-card)] border border-red-500/20 rounded-2xl shadow-2xl p-6 text-center overflow-hidden"
            >
              {/* Background red glow */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-red-500/10 blur-3xl pointer-events-none rounded-full" />
              
              <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4 border border-red-500/20 text-red-400 relative z-10">
                <Trash2 size={22} strokeWidth={2.5} />
              </div>
              
              <h3 className="text-lg font-extrabold mb-2 relative z-10">Delete Report</h3>
              <p className="text-sm text-[var(--text-secondary)] mb-6 relative z-10">
                Are you sure you want to remove this activity? It will no longer count towards the monthly achievements.
              </p>
              
              <div className="flex gap-3 relative z-10">
                <button
                  onClick={() => setConfirmDeleteId(null)}
                  disabled={isDeleting}
                  className="flex-1 py-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] hover:bg-[var(--bg-card)] text-[var(--text-primary)] font-bold transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={executeDelete}
                  disabled={isDeleting}
                  className="flex-1 py-3 rounded-xl bg-red-500/15 hover:bg-red-500/25 border border-red-500/30 text-red-400 font-bold transition-colors flex items-center justify-center gap-2"
                >
                  {isDeleting ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                      className="w-4 h-4 border-2 border-red-400/30 border-t-red-400 rounded-full"
                    />
                  ) : (
                    "Delete"
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </MotionPage>
  );
}