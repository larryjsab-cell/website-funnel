import { SubmissionDetail } from "@/components/admin/SubmissionDetail";

export default async function SubmissionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SubmissionDetail id={id} />;
}
