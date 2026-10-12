import { Suspense } from "react";
import { Dashboard } from "@/components/admin/Dashboard";

export default function AdminPage() {
  return (
    <Suspense fallback={<p className="text-muted">Loading…</p>}>
      <Dashboard />
    </Suspense>
  );
}
