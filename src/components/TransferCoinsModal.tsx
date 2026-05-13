"use client";

import { useState, useRef, useEffect } from "react";
import { Send, X, AlertCircle, ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import TumbaCoinIcon from "./TumbaCoinIcon";

interface UserData {
  id: string;
  name: string;
  avatar: string | null;
}

export default function TransferCoinsModal({ users }: { users: UserData[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [amount, setAmount] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const numAmount = parseInt(amount);
    if (!selectedUserId || isNaN(numAmount) || numAmount <= 0) {
      setError("Please select a user and enter a valid amount.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/coins/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientId: selectedUserId, amount: numAmount }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Transfer failed");
      }

      setIsOpen(false);
      setAmount("");
      setSelectedUserId("");
      window.location.reload(); 
    } catch (err) {
      // המרה בטוחה במקום any
      const errorMessage = err instanceof Error ? err.message : String(err);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  const selectedUser = users.find(u => u.id === selectedUserId);

  return (
    <>
      {/* הכפתור תוקן להיות זהה לחלוטין לכפתור ה-Report 
        כולל האנימציות, עובי האייקון, והפונט!
      */}
      <motion.button
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setIsOpen(true)}
        className="w-full py-3 bg-tumba-500/10 hover:bg-tumba-500/20 border border-tumba-500/20 rounded-xl flex items-center justify-center gap-2 text-sm font-extrabold text-tumba-300 transition-colors relative z-10"
      >
        <Send size={18} strokeWidth={2.5} />
        Transfer Coins
      </motion.button>

      {/* החלון הקופץ */}
      <AnimatePresence>
        {isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-[var(--bg-card)] border border-[var(--border)] rounded-2xl shadow-2xl p-5 overflow-visible"
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-lg font-extrabold gradient-text flex items-center gap-2">
                  <Send size={20} className="text-tumba-400" /> Transfer
                </h2>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 rounded-full hover:bg-[var(--bg-primary)] text-[var(--text-secondary)] transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleTransfer} className="space-y-5">
                
                {/* בחירת משתמש */}
                <div className="space-y-1.5" ref={dropdownRef}>
                  <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
                    Send to
                  </label>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                      className="w-full flex items-center justify-between bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-tumba-500/50 transition-colors"
                    >
                      {selectedUser ? (
                        <span className="flex items-center gap-2 font-bold">
                          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-tumba-400 to-neon-pink flex items-center justify-center text-[10px] font-extrabold text-white">
                            {selectedUser.name[0].toUpperCase()}
                          </div>
                          {selectedUser.name}
                        </span>
                      ) : (
                        <span className="text-[var(--text-secondary)] font-medium">Select a Tumba...</span>
                      )}
                      <ChevronDown size={16} className={`text-[var(--text-secondary)] transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
                    </button>

                    <AnimatePresence>
                      {isDropdownOpen && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="absolute z-50 w-full mt-2 bg-[var(--bg-card)] border border-[var(--border)] rounded-xl shadow-xl max-h-48 overflow-y-auto"
                        >
                          {users.map((u) => (
                            <button
                              key={u.id}
                              type="button"
                              onClick={() => {
                                setSelectedUserId(u.id);
                                setIsDropdownOpen(false);
                              }}
                              className="w-full text-left px-4 py-3 text-white hover:bg-tumba-500/10 transition-colors flex items-center gap-3 border-b border-[var(--border)] last:border-0 font-bold"
                            >
                              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-tumba-400 to-neon-pink flex items-center justify-center text-[11px] font-extrabold text-white shrink-0">
                                {u.name[0].toUpperCase()}
                              </div>
                              {u.name}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>

                {/* סכום */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
                    Amount
                  </label>
                  <div className="relative">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 opacity-70">
                      <TumbaCoinIcon size={22} />
                    </div>
                    <input
                      type="number"
                      min="1"
                      placeholder="0"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full bg-[var(--bg-primary)] border border-[var(--border)] rounded-xl pl-12 pr-4 py-3 text-white text-xl font-extrabold placeholder:font-normal focus:outline-none focus:border-tumba-500/50 transition-colors"
                      required
                    />
                  </div>
                </div>

                {/* שגיאות */}
                {error && (
                  <div className="flex items-start gap-2 text-red-400 text-sm bg-red-400/10 p-3 rounded-lg border border-red-400/20 font-medium">
                    <AlertCircle size={16} className="shrink-0 mt-0.5" />
                    <p>{error}</p>
                  </div>
                )}

                {/* כפתור שליחה */}
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full mt-6 py-3.5 bg-gradient-to-r from-tumba-600 to-tumba-400 hover:from-tumba-500 hover:to-tumba-400 text-white rounded-xl font-extrabold shadow-lg shadow-tumba-500/20 transition-all disabled:opacity-70 flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
                      className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full"
                    />
                  ) : (
                    "Send Coins"
                  )}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}