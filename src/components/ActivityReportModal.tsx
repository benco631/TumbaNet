"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Car, Home, Users, MapPin, X, Plus, Minus, Coffee, Sparkles, Check } from "lucide-react";

export default function ActivityReportModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [type, setType] = useState<"DRIVE" | "HOST">("DRIVE");
  
  // Drive States
  const [distance, setDistance] = useState<"SHORT" | "MEDIUM" | "LONG">("SHORT");
  const [passengers, setPassengers] = useState(1);
  
  // Host States
  const [hostType, setHostType] = useState<"REGULAR" | "INVESTED">("REGULAR");
  const [attendees, setAttendees] = useState(2);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    try {
      const response = await fetch('/api/activity/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          subType: type === "DRIVE" ? distance : hostType,
          participantCount: type === "DRIVE" ? passengers : attendees,
          note: "", 
        }),
      });

      if (!response.ok) throw new Error('Failed to submit request');

      // במקום alert מכוער - מפעילים מצב הצלחה
      setIsSubmitting(false);
      setShowSuccess(true);

      // מחכים שנייה וחצי כדי שהמשתמש יראה את ההצלחה, ואז סוגרים ומאפסים
      setTimeout(() => {
        setIsOpen(false);
        setShowSuccess(false);
        setDistance("SHORT");
        setPassengers(1);
        setHostType("REGULAR");
        setAttendees(2);
      }, 1500);
      
    } catch (error) {
      console.error(error);
      alert('Something went wrong. Tumbas are confused.');
      setIsSubmitting(false);
    }
  };  

  return (
    <>
      <motion.button
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setIsOpen(true)}
        className="w-full py-3 bg-tumba-500/10 hover:bg-tumba-500/20 border border-tumba-500/20 rounded-xl flex items-center justify-center gap-2 text-sm font-extrabold text-tumba-300 transition-colors relative z-10"
      >
        <Plus size={18} strokeWidth={2.5} />
        Report Activity
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => !isSubmitting && !showSuccess && setIsOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden"
            >
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
                <h2 className="text-lg font-extrabold gradient-text">Report Activity</h2>
                <button
                  onClick={() => !isSubmitting && !showSuccess && setIsOpen(false)}
                  className="p-1.5 rounded-full hover:bg-[var(--bg-primary)] text-[var(--text-secondary)] transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-5">
                {/* Tabs */}
                <div className="flex p-1 mb-6 bg-[var(--bg-primary)] rounded-xl border border-[var(--border)]">
                  <button
                    onClick={() => setType("DRIVE")}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all ${
                      type === "DRIVE"
                        ? "bg-[var(--bg-card)] text-tumba-400 shadow-sm border border-tumba-500/20"
                        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    <Car size={18} />
                    Drove
                  </button>
                  <button
                    onClick={() => setType("HOST")}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all ${
                      type === "HOST"
                        ? "bg-[var(--bg-card)] text-tumba-400 shadow-sm border border-tumba-500/20"
                        : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                    }`}
                  >
                    <Home size={18} />
                    Hosted
                  </button>
                </div>

                {/* Drive Content */}
                {type === "DRIVE" && (
                  <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
                    <div>
                      <label className="flex items-center gap-1.5 text-sm font-semibold mb-3 text-[var(--text-secondary)]">
                        <MapPin size={16} /> Distance
                      </label>
                      <div className="grid grid-cols-3 gap-2">
                        {(["SHORT", "MEDIUM", "LONG"] as const).map((dist) => {
                          const labels = { SHORT: "Short", MEDIUM: "Medium", LONG: "Long" };
                          return (
                            <button
                              key={dist}
                              onClick={() => setDistance(dist)}
                              className={`py-2 px-1 rounded-xl text-xs font-bold transition-all border ${
                                distance === dist
                                  ? "bg-tumba-500/10 border-tumba-500/40 text-tumba-300"
                                  : "bg-[var(--bg-primary)] border-[var(--border)] text-[var(--text-secondary)] hover:border-tumba-500/20"
                              }`}
                            >
                              {labels[dist]}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div>
                      <label className="flex items-center gap-1.5 text-sm font-semibold mb-3 text-[var(--text-secondary)]">
                        <Users size={16} /> Passengers (excluding you)
                      </label>
                      <div className="flex items-center justify-between bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl p-2">
                        <button onClick={() => setPassengers(Math.max(1, passengers - 1))} className="p-2 rounded-lg bg-[var(--bg-card)] hover:bg-tumba-500/10 text-[var(--text-primary)] transition-colors">
                          <Minus size={18} />
                        </button>
                        <span className="text-xl font-extrabold">{passengers}</span>
                        <button onClick={() => setPassengers(passengers + 1)} className="p-2 rounded-lg bg-[var(--bg-card)] hover:bg-tumba-500/10 text-[var(--text-primary)] transition-colors">
                          <Plus size={18} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Host Content */}
                {type === "HOST" && (
                  <motion.div initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} className="space-y-5">
                    <div>
                      <label className="flex items-center gap-1.5 text-sm font-semibold mb-3 text-[var(--text-secondary)]">
                        <Home size={16} /> Hosting Effort
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button onClick={() => setHostType("REGULAR")} className={`flex items-center justify-center gap-2 py-2.5 px-2 rounded-xl text-sm font-bold transition-all border ${hostType === "REGULAR" ? "bg-tumba-500/10 border-tumba-500/40 text-tumba-300" : "bg-[var(--bg-primary)] border-[var(--border)] text-[var(--text-secondary)] hover:border-tumba-500/20"}`}>
                          <Coffee size={16} /> Regular
                        </button>
                        <button onClick={() => setHostType("INVESTED")} className={`flex items-center justify-center gap-2 py-2.5 px-2 rounded-xl text-sm font-bold transition-all border ${hostType === "INVESTED" ? "bg-amber-500/10 border-amber-500/40 text-amber-400" : "bg-[var(--bg-primary)] border-[var(--border)] text-[var(--text-secondary)] hover:border-amber-500/20"}`}>
                          <Sparkles size={16} /> Invested
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="flex items-center gap-1.5 text-sm font-semibold mb-3 text-[var(--text-secondary)]">
                        <Users size={16} /> Attendees
                      </label>
                      <div className="flex items-center justify-between bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl p-2">
                        <button onClick={() => setAttendees(Math.max(1, attendees - 1))} className="p-2 rounded-lg bg-[var(--bg-card)] hover:bg-tumba-500/10 text-[var(--text-primary)] transition-colors">
                          <Minus size={18} />
                        </button>
                        <span className="text-xl font-extrabold">{attendees}</span>
                        <button onClick={() => setAttendees(attendees + 1)} className="p-2 rounded-lg bg-[var(--bg-card)] hover:bg-tumba-500/10 text-[var(--text-primary)] transition-colors">
                          <Plus size={18} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Submit / Success Button */}
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting || showSuccess}
                  className={`w-full mt-6 py-3.5 rounded-xl font-extrabold shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-90 ${
                    showSuccess 
                      ? "bg-green-500 text-white shadow-green-500/20" 
                      : "bg-gradient-to-r from-tumba-600 to-tumba-400 hover:from-tumba-500 hover:to-tumba-400 text-white shadow-tumba-500/20"
                  }`}
                >
                  {isSubmitting ? (
                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }} className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full" />
                  ) : showSuccess ? (
                    <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center gap-2">
                      <Check size={20} strokeWidth={3} /> Sent to Admin
                    </motion.div>
                  ) : (
                    "Submit Report"
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}