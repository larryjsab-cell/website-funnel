/** One link tile; the look shared by state lists, city lists and nearby towns. */
export const tileClass =
  "group flex min-h-12 items-center justify-between gap-2 rounded-ui border-2 border-ink bg-surface px-3 py-2 font-display md:px-4 text-sm font-bold display-ui transition-button duration-fast hover:bg-ink hover:text-on-ink";

export function TileArrow() {
  return (
    <span aria-hidden="true" className="opacity-0 transition-opacity duration-fast group-hover:opacity-100">
      →
    </span>
  );
}
