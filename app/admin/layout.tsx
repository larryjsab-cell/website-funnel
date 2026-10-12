import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/AdminShell";

export const metadata: Metadata = {
  title: "Pipeline",
  description: "Ryzon Automation’s private dashboard for demo requests, payments and launches.",
  robots: { index: false, follow: false },
};

/** Owner-only dashboard. No sales header or footer; the shell handles sign-in. */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative z-content min-h-screen bg-canvas">
      <AdminShell>{children}</AdminShell>
    </div>
  );
}
