import { StubPage, stubMetadata } from "@/components/sections/StubPage";

export const metadata = stubMetadata("/demo");

export default function Page() {
  return <StubPage route="/demo" showCta={false} />;
}
