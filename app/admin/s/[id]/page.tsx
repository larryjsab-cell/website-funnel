import type { Metadata } from "next";
import { SubmissionDetail } from "@/components/admin/SubmissionDetail";

export const metadata: Metadata = {
  title: "Customer details",
  description: "One customer in the Ryzon pipeline: their demo, status, payments, emails, calls and history.",
};

export default async function SubmissionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SubmissionDetail id={id} />;
}
