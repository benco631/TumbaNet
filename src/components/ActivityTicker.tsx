"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { Car, Home, ChevronRight, Activity } from "lucide-react";

// The shape of the data returned from our API
interface ActivityLog {
  id: string;
  type: "CAR" | "HOST";
  user: { name: string };
  distanceKm: number | null;
  passengerCount: number | null;
  attendeeCount: number | null;
  createdAt: string;
}

export default function ActivityTicker() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    // Fetch the latest logs when the component mounts
    fetch("/api/activity")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setLogs(data);
        }
      })
      .catch((err) => console.error("Failed to fetch ticker logs", err));
  }, []);

  // Set up the interval to rotate the ticker every 4 seconds
  useEffect(() => {
    if (logs.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % logs.length);
    }, 4000);

    return () => clearInterval(interval);
  }, [logs.length]);

  if (logs.length === 0) {
    return null; // Don't show anything if there's no activity
  }

  const currentLog = logs[currentIndex];

  // Format the text based on the activity type
  const getLogText = (log: ActivityLog) => {
    const firstName = log.user.name.split(" ")[0]; // Get just the first name
    if (log.type === "CAR") {
      const passText = log.passengerCount ? ` with ${log.passengerCount} passengers` : "";
      return `${firstName} drove ${log.distanceKm || "?"}km${passText}`;
    }
    if (log.type === "HOST") {
      return `${firstName} hosted ${log.attendeeCount || "?"} people`;
    }
    return "New activity reported";
  };

  const Icon = currentLog.type === "CAR" ? Car : Home;

  return (
    <Link href="/feed" className="block w-full mb-6 group">
      <div className="flex items-center bg-[var(--bg-card)] border border-[var(--border)] rounded-xl px-3 py-2.5 shadow-sm group-hover:border-tumba-500/30 transition-colors overflow-hidden relative">
        
        {/* Left Icon (Static) */}
        <div className="shrink-0 mr-3 text-tumba-400">
          <Activity size={18} />
        </div>

        {/* Animated Text Area */}
        <div className="flex-1 relative h-5 overflow-hidden">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentLog.id}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={{ duration: 0.4, ease: "anticipate" }}
              className="absolute inset-0 flex items-center gap-2"
            >
              <Icon size={14} className="text-[var(--text-secondary)]" />
              <span className="text-sm font-medium text-[var(--text-primary)] truncate">
                {getLogText(currentLog)}
              </span>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Right Arrow (Static) */}
        <div className="shrink-0 ml-2 text-[var(--text-secondary)] group-hover:text-tumba-400 group-hover:translate-x-0.5 transition-all">
          <ChevronRight size={16} />
        </div>
      </div>
    </Link>
  );
}