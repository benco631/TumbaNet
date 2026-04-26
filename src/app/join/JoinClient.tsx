"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useGroup } from "@/components/GroupProvider";
import Link from "next/link";

type JoinStatus = "idle" | "loading" | "joined" | "requested" | "pending" | "error";

export default function JoinClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { data: session, status: sessionStatus } = useSession();
  const { refreshGroups } = useGroup();

  const codeFromUrl = (searchParams.get("code") || "").toUpperCase();
  const [code, setCode] = useState(codeFromUrl);
  const [status, setStatus] = useState<JoinStatus>("idle");
  const [groupName, setGroupName] = useState("");
  const [error, setError] = useState("");

  // Keep input in sync with URL changes (e.g. browser back/forward)
  useEffect(() => {
    setCode(codeFromUrl);
  }, [codeFromUrl]);

  const submit = async (rawCode: string) => {
    const trimmed = rawCode.trim().toUpperCase();
    if (!trimmed) return;

    setStatus("loading");
    setError("");

    try {
      const res = await fetch("/api/groups/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode: trimmed }),
      });
      const data = await res.json();

      if (!res.ok) {
        setStatus("error");
        setError(data.error || "Invalid invite code");
        return;
      }

      setGroupName(data.group?.name || "the group");

      if (data.status === "joined" || data.status === "already_member") {
        setStatus("joined");
        await refreshGroups();
        setTimeout(() => router.push("/"), 1500);
      } else if (data.status === "requested") {
        setStatus("requested");
      } else if (data.status === "pending") {
        setStatus("pending");
      }
    } catch {
      setStatus("error");
      setError("Something went wrong");
    }
  };

  // Auto-submit if code came from URL and the user is signed in
  useEffect(() => {
    if (sessionStatus !== "authenticated") return;
    if (!codeFromUrl) return;
    if (status !== "idle") return;
    submit(codeFromUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionStatus, codeFromUrl]);

  if (sessionStatus === "loading") {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center px-4 bg-mesh">
        <div className="card-premium p-8 max-w-sm w-full text-center space-y-4">
          <div className="h-12 w-12 mx-auto rounded-full border-2 border-tumba-500 border-t-transparent animate-spin" />
        </div>
      </div>
    );
  }

  if (!session) {
    const next = codeFromUrl ? `/join?code=${codeFromUrl}` : "/join";
    return (
      <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center px-4 bg-mesh">
        <div className="card-premium p-8 max-w-sm w-full text-center space-y-4">
          <h2 className="text-xl font-bold">Join a Group</h2>
          <p className="text-sm text-[var(--text-secondary)]">
            You need to log in or create an account first.
          </p>
          <div className="flex gap-3 justify-center">
            <Link href={`/login?next=${encodeURIComponent(next)}`} className="btn-primary px-6 py-2.5">Login</Link>
            <Link href={`/register?next=${encodeURIComponent(next)}`} className="btn-secondary px-6 py-2.5">Register</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center px-4 bg-mesh">
      <div className="card-premium p-8 max-w-sm w-full text-center space-y-5">
        {(status === "idle" || status === "error") && (
          <>
            <h2 className="text-2xl font-extrabold">Join a Group</h2>
            <p className="text-sm text-[var(--text-secondary)]">
              Enter the invite code your friend gave you.
            </p>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                submit(code);
              }}
              className="space-y-4"
            >
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                placeholder="ABCD1234"
                maxLength={12}
                className="w-full px-4 py-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-primary)] placeholder-[var(--text-secondary)]/40 focus:outline-none focus:border-tumba-500/50 font-mono text-center text-2xl tracking-[0.3em]"
                autoFocus
              />
              <button
                type="submit"
                disabled={!code.trim()}
                className="w-full btn-primary py-3 text-base disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Join Group
              </button>
            </form>
            {status === "error" && error && (
              <p className="text-red-400 text-sm">{error}</p>
            )}
          </>
        )}

        {status === "loading" && (
          <>
            <div className="h-12 w-12 mx-auto rounded-full border-2 border-tumba-500 border-t-transparent animate-spin" />
            <p className="text-sm text-[var(--text-secondary)]">Joining group...</p>
          </>
        )}

        {status === "joined" && (
          <>
            <div className="h-14 w-14 mx-auto rounded-full bg-green-500/15 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-green-400"><polyline points="20 6 9 17 4 12"/></svg>
            </div>
            <h2 className="text-xl font-bold">Joined group successfully</h2>
            <p className="text-sm text-[var(--text-secondary)]">
              Welcome to <span className="font-semibold text-[var(--text-primary)]">{groupName}</span>. Redirecting...
            </p>
          </>
        )}

        {status === "requested" && (
          <>
            <div className="h-14 w-14 mx-auto rounded-full bg-yellow-500/15 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-yellow-400"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            </div>
            <h2 className="text-xl font-bold">Request Sent</h2>
            <p className="text-sm text-[var(--text-secondary)]">
              Your request to join <span className="font-semibold text-[var(--text-primary)]">{groupName}</span> is pending admin approval.
            </p>
            <Link href="/" className="btn-secondary px-6 py-2.5 inline-block">Go Home</Link>
          </>
        )}

        {status === "pending" && (
          <>
            <div className="h-14 w-14 mx-auto rounded-full bg-blue-500/15 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-400"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
            </div>
            <h2 className="text-xl font-bold">Already Pending</h2>
            <p className="text-sm text-[var(--text-secondary)]">
              You already have a pending request for this group.
            </p>
            <Link href="/" className="btn-secondary px-6 py-2.5 inline-block">Go Home</Link>
          </>
        )}
      </div>
    </div>
  );
}
