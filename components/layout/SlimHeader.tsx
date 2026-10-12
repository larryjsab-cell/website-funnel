import { Container } from "@/components/ui/Container";
import { Wordmark } from "@/components/ui/Wordmark";

/** Logo only. The demo flow has no exit links. */
export function SlimHeader() {
  return (
    <header className="sticky top-0 z-header border-b-2 border-ink bg-canvas">
      <Container className="flex h-16 items-center">
        <Wordmark />
      </Container>
    </header>
  );
}
