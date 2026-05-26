"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useGroup } from "@/components/GroupProvider";
import Link from "next/link";

export default function JoinByLinkPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const { refreshGroups } = useGroup();
  const code = params.code as string;

  const [status, setStatus] = useState<"loading" | "joined" | "requested" | "pending" | "error">("loading");
  const [groupName, setGroupName] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!session) return;
    if (!code) return;

    const joinGroup = async () => {
      try {
        const res = await fetch("/api/groups/join", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ inviteCode: code }),
        });
        const data = await res.json();

        if (!res.ok) {
          setStatus("error");
          setError(data.error || "Invalid invite link");
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

    joinGroup();
  }, [session, code, refreshGroups, router]);

  if (!session) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center px-4 bg-mesh">
        <div className="card-premium p-8 max-w-sm text-center space-y-4">
          <h2 className="text-xl font-bold">Join a Group</h2>
          <p className="text-sm text-[var(--text-secondary)]">
            You need to log in or create an account first.
          </p>
          <div className="flex gap-3 justify-center">
            <Link href="/login" className="btn-primary px-6 py-2.5">Login</Link>
            <Link href="/register" className="btn-secondary px-6 py-2.5">Register</Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center px-4 bg-mesh">
      <div className="card-premium p-8 max-w-sm text-center space-y-4">
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
            <h2 className="text-xl font-bold">Welcome!</h2>
            <p className="text-sm text-[var(--text-secondary)]">
              You&apos;ve joined <span className="font-semibold text-[var(--text-primary)]">{groupName}</span>. Redirecting...
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
            <Link href="/" className="btn-secondary px-6 py-2.5 inline-block mt-2">Go Home</Link>
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
            <Link href="/" className="btn-secondary px-6 py-2.5 inline-block mt-2">Go Home</Link>
          </>
        )}

        {status === "error" && (
          <>
            <div className="h-14 w-14 mx-auto rounded-full bg-red-500/15 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-red-400"><circle cx="12" cy="12" r="10"/><line x1="15" x2="9" y1="9" y2="15"/><line x1="9" x2="15" y1="9" y2="15"/></svg>
            </div>
            <h2 className="text-xl font-bold">Invalid Link</h2>
            <p className="text-sm text-[var(--text-secondary)]">{error}</p>
            <Link href="/" className="btn-secondary px-6 py-2.5 inline-block mt-2">Go Home</Link>
          </>
        )}
      </div>
    </div>
  );
}
