import { LegalPage, legalMetadata } from "@/components/sections/LegalPage";

export const metadata = legalMetadata("privacy");

export default function Page() {
  return <LegalPage doc="privacy" />;
}
