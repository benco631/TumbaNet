"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { useState } from "react";
import { motion } from "framer-motion";
import Logo from "@/components/Logo";
import { MotionPage } from "@/components/motion";
import { buttonMotion } from "@/lib/animations";

export default function RegisterPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    const data = await res.json();

    if (!res.ok) {
      setError(data.error || "Something went wrong");
      setLoading(false);
      return;
    }

    await signIn("credentials", {
      email,
      password,
      callbackUrl: "/sikum",
    });
  }

  return (
    <MotionPage className="flex items-center justify-center min-h-[calc(100vh-4rem)] px-4 bg-mesh">
      <div className="w-full max-w-md">
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="text-center mb-8"
        >
          <div className="flex justify-center mb-4"><Logo size="lg" /></div>
          <h1 className="text-2xl font-bold">Join the Tumbas</h1>
          <p className="text-[var(--text-secondary)] mt-2">
            Create your account
          </p>
        </motion.div>

        <motion.form
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4, ease: "easeOut" }}
          onSubmit={handleSubmit}
          className="p-8 rounded-2xl border border-[var(--border)] bg-[var(--bg-card)] space-y-5"
        >
          {error && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm text-center"
            >
              {error}
            </motion.div>
          )}

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-primary)] placeholder-[var(--text-secondary)]/50 focus:outline-none focus:border-tumba-500 focus:ring-1 focus:ring-tumba-500 transition-colors"
              placeholder="Your Tumba name"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-primary)] placeholder-[var(--text-secondary)]/50 focus:outline-none focus:border-tumba-500 focus:ring-1 focus:ring-tumba-500 transition-colors"
              placeholder="tumba@example.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--text-primary)] placeholder-[var(--text-secondary)]/50 focus:outline-none focus:border-tumba-500 focus:ring-1 focus:ring-tumba-500 transition-colors"
              placeholder="••••••••"
              required
              minLength={6}
            />
          </div>

          <motion.button
            {...buttonMotion}
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-tumba-500 to-neon-blue text-white font-semibold hover:from-tumba-400 hover:to-tumba-500 transition-all shadow-lg shadow-tumba-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Creating account..." : "Join the Tumbas"}
          </motion.button>

          <p className="text-center text-sm text-[var(--text-secondary)]">
            Already a Tumba?{" "}
            <Link
              href="/login"
              className="text-tumba-400 hover:text-tumba-300 font-medium"
            >
              Login
            </Link>
          </p>
        </motion.form>
      </div>
    </MotionPage>
  );
}
