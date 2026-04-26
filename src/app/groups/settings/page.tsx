import { Suspense } from "react";
import SettingsClient from "./SettingsClient";

function GroupSettingsFallback() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-48 bg-tumba-500/10 rounded" />
        <div className="h-40 bg-tumba-500/10 rounded-xl" />
        <div className="h-40 bg-tumba-500/10 rounded-xl" />
      </div>
    </div>
  );
}

export default function GroupSettingsPage() {
  return (
    <Suspense fallback={<GroupSettingsFallback />}>
      <SettingsClient />
    </Suspense>
  );
}
