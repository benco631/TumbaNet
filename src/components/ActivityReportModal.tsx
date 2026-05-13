"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Car, Home, Users, MapPin, Zap, X, Plus, Minus } from "lucide-react";

export default function ActivityReportModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [type, setType] = useState<"CAR" | "HOST">("CAR");
  
  // Car States
  const [distance, setDistance] = useState<"SHORT" | "MEDIUM" | "LONG">("SHORT");
  const [passengers, setPassengers] = useState(1);
  
  // Host States
  const [attendees, setAttendees] = useState(2);
  const [shortNotice, setShortNotice] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    
    try {
      const response = await fetch('/api/activity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type,
          distance,
          passengers,
          attendees,
          shortNotice,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to submit');
      }

      // במקרה של הצלחה: סוגרים את המודל ומאפסים את הטופס
      setIsOpen(false);
      setDistance("SHORT");
      setPassengers(1);
      setAttendees(2);
      setShortNotice(false);
      
      // אופציונלי: אפשר לעשות פה רענון לעמוד כדי שהסטטיסטיקות למעלה יתעדכנו מיד
      // window.location.reload(); 
      
    } catch (error) {
      console.error(error);
      alert('Something went wrong. Tumbas are confused.');
    } finally {
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
      {/* Modal */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Modal Content */}
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
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-full hover:bg-[var(--bg-primary)] text-[var(--text-secondary)] transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-5">
                {/* Tabs */}
                <div className="flex p-1 mb-6 bg-[var(--bg-primary)] rounded-xl border border-[var(--border)]">
                  <button
                    onClick={() => setType("CAR")}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-bold transition-all ${
                      type === "CAR"
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

                {/* Car Content */}
                {type === "CAR" && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-5"
                  >
                    {/* Distance */}
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

                    {/* Passengers */}
                    <div>
                      <label className="flex items-center gap-1.5 text-sm font-semibold mb-3 text-[var(--text-secondary)]">
                        <Users size={16} /> Passengers (excluding you)
                      </label>
                      <div className="flex items-center justify-between bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl p-2">
                        <button
                          onClick={() => setPassengers(Math.max(1, passengers - 1))}
                          className="p-2 rounded-lg bg-[var(--bg-card)] hover:bg-tumba-500/10 text-[var(--text-primary)] transition-colors"
                        >
                          <Minus size={18} />
                        </button>
                        <span className="text-xl font-extrabold">{passengers}</span>
                        <button
                          onClick={() => setPassengers(passengers + 1)}
                          className="p-2 rounded-lg bg-[var(--bg-card)] hover:bg-tumba-500/10 text-[var(--text-primary)] transition-colors"
                        >
                          <Plus size={18} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Host Content */}
                {type === "HOST" && (
                  <motion.div
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className="space-y-5"
                  >
                    {/* Attendees */}
                    <div>
                      <label className="flex items-center gap-1.5 text-sm font-semibold mb-3 text-[var(--text-secondary)]">
                        <Users size={16} /> Attendees
                      </label>
                      <div className="flex items-center justify-between bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl p-2">
                        <button
                          onClick={() => setAttendees(Math.max(1, attendees - 1))}
                          className="p-2 rounded-lg bg-[var(--bg-card)] hover:bg-tumba-500/10 text-[var(--text-primary)] transition-colors"
                        >
                          <Minus size={18} />
                        </button>
                        <span className="text-xl font-extrabold">{attendees}</span>
                        <button
                          onClick={() => setAttendees(attendees + 1)}
                          className="p-2 rounded-lg bg-[var(--bg-card)] hover:bg-tumba-500/10 text-[var(--text-primary)] transition-colors"
                        >
                          <Plus size={18} />
                        </button>
                      </div>
                    </div>

                    {/* Short Notice */}
                    <button
                      onClick={() => setShortNotice(!shortNotice)}
                      className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all ${
                        shortNotice
                          ? "bg-tumba-500/10 border-tumba-500/40 text-tumba-300"
                          : "bg-[var(--bg-primary)] border-[var(--border)] text-[var(--text-secondary)] hover:border-tumba-500/20"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <Zap size={18} className={shortNotice ? "text-yellow-400" : ""} />
                        <span className="font-bold text-sm">Short Notice</span>
                      </div>
                      <div className={`w-10 h-6 rounded-full p-1 transition-colors ${shortNotice ? "bg-tumba-500" : "bg-[var(--bg-card)] border border-[var(--border)]"}`}>
                        <div className={`w-4 h-4 rounded-full bg-white transition-transform ${shortNotice ? "translate-x-4" : "translate-x-0"}`} />
                      </div>
                    </button>
                  </motion.div>
                )}

                {/* Submit Button */}
                <button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="w-full mt-6 py-3.5 bg-gradient-to-r from-tumba-600 to-tumba-400 hover:from-tumba-500 hover:to-tumba-400 text-white rounded-xl font-extrabold shadow-lg shadow-tumba-500/20 transition-all disabled:opacity-70 flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                      className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                    />
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