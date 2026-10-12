import { StubPage, stubMetadata } from "@/components/sections/StubPage";

export const metadata = stubMetadata("/pricing");

export default function Page() {
  return <StubPage route="/pricing" />;
}
