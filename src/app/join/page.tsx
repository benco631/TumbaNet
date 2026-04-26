import { Suspense } from "react";
import JoinClient from "./JoinClient";

function JoinFallback() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex flex-col items-center justify-center px-4 bg-mesh">
      <div className="card-premium p-8 max-w-sm w-full text-center space-y-4">
        <div className="h-12 w-12 mx-auto rounded-full border-2 border-tumba-500 border-t-transparent animate-spin" />
        <p className="text-sm text-[var(--text-secondary)]">Loading...</p>
      </div>
    </div>
  );
}

export default function JoinPage() {
  return (
    <Suspense fallback={<JoinFallback />}>
      <JoinClient />
    </Suspense>
  );
}
