"use client";

export const dynamic = "force-dynamic";

import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { LockIcon } from "@/lib/icons";

export default function StagingBlockedPage() {
  const { data: session, status } = useSession();
  const email = session?.user?.email ?? null;
  const isLoading = status === "loading";

  return (
    <main className="min-h-[100dvh] flex items-center justify-center bg-mesh px-4">
      <div className="max-w-md w-full p-8 rounded-2xl border border-tumba-500/22 bg-[var(--bg-card)] shadow-[0_4px_20px_rgba(0,0,0,0.3)] text-center space-y-5">
        <div className="mx-auto h-14 w-14 rounded-2xl bg-tumba-500/10 border border-tumba-500/25 flex items-center justify-center">
          <LockIcon size={26} strokeWidth={1.75} className="text-tumba-400" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-extrabold gradient-text">
            Staging access only
          </h1>
          <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
            This is the TumbaNet staging environment. It&apos;s reserved for the
            team while we test new features. The public app lives on the
            production deployment.
          </p>
        </div>

        {!isLoading && email && (
          <p className="text-xs text-[var(--text-secondary)]">
            Signed in as <span className="text-tumba-400">{email}</span> — this
            account is not on the team allowlist.
          </p>
        )}

        <div className="flex flex-col gap-2 pt-2">
          {email ? (
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="btn-primary w-full"
            >
              Sign out
            </button>
          ) : (
            <Link href="/login" className="btn-primary w-full">
              Sign in
            </Link>
          )}
        </div>
      </div>
    </main>
  );
}
