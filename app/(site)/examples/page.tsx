import { StubPage, stubMetadata } from "@/components/sections/StubPage";

export const metadata = stubMetadata("/examples");

export default function Page() {
  return <StubPage route="/examples" />;
}
