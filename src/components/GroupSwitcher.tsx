"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGroup } from "./GroupProvider";
import Link from "next/link";

export default function GroupSwitcher() {
  const { activeGroup, groups, switchGroup } = useGroup();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (!activeGroup) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-tumba-500/20 bg-tumba-500/5 hover:bg-tumba-500/10 hover:border-tumba-500/35 transition-all group"
      >
        <div className="h-6 w-6 rounded-md bg-gradient-to-br from-tumba-400 to-neon-pink flex items-center justify-center text-[10px] font-bold text-white shrink-0">
          {activeGroup.name[0]?.toUpperCase()}
        </div>
        <span className="text-sm font-medium text-[var(--text-primary)] max-w-[100px] truncate hidden sm:inline">
          {activeGroup.name}
        </span>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`text-[var(--text-secondary)] transition-transform ${isOpen ? "rotate-180" : ""}`}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full mt-2 right-0 sm:left-0 w-72 rounded-xl border border-[var(--border)] bg-[var(--bg-secondary)] shadow-xl shadow-black/30 overflow-hidden z-50"
          >
            <div className="p-2 border-b border-[var(--border)]">
              <p className="text-[10px] uppercase tracking-wider text-[var(--text-secondary)] font-medium px-2 py-1">
                Your Groups
              </p>
            </div>

            <div className="max-h-64 overflow-y-auto p-1.5 space-y-0.5">
              {groups.map((group) => (
                <button
                  key={group.id}
                  onClick={() => {
                    if (group.id !== activeGroup.id) {
                      switchGroup(group.id);
                    }
                    setIsOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left ${
                    group.isActive
                      ? "bg-tumba-500/15 border border-tumba-500/25"
                      : "hover:bg-[var(--bg-card)] border border-transparent"
                  }`}
                >
                  <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-tumba-400 to-neon-pink flex items-center justify-center text-xs font-bold text-white shrink-0">
                    {group.name[0]?.toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate text-[var(--text-primary)]">
                      {group.name}
                    </p>
                    <p className="text-[10px] text-[var(--text-secondary)]">
                      {group.memberCount} member{group.memberCount !== 1 ? "s" : ""} · {group.myRole}
                    </p>
                  </div>
                  {group.isActive && (
                    <div className="h-2 w-2 rounded-full bg-tumba-400 shrink-0" />
                  )}
                </button>
              ))}
            </div>

            <div className="p-2 border-t border-[var(--border)] space-y-1">
              <Link
                href="/groups"
                onClick={() => setIsOpen(false)}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-[var(--bg-card)] transition-colors text-sm text-[var(--text-secondary)]"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
                </svg>
                Manage Groups
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
