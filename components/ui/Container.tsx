import type { ReactNode } from "react";

type Props = { children: ReactNode; className?: string };

/** Page-width container. Its padding matches the background grid. */
export function Container({ children, className = "" }: Props) {
  return <div className={`mx-auto w-full max-w-page px-4 md:px-8 ${className}`}>{children}</div>;
}
