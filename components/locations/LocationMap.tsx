type Props = {
  /** What the map shows: "lat,lng" for a city, a name for a state. */
  query: string;
  zoom: number;
  title: string;
};

/**
 * Google Maps embed (no API key). Lazy, so it never slows the first screen; the
 * Content-Security-Policy allows frames from Google Maps only.
 */
export function LocationMap({ query, zoom, title }: Props) {
  const src = `https://www.google.com/maps?q=${encodeURIComponent(query)}&z=${zoom}&output=embed`;
  return (
    <div className="overflow-hidden rounded-card border-2 border-ink bg-surface shadow-hard">
      <iframe
        src={src}
        title={title}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        className="block aspect-[4/3] w-full"
      />
    </div>
  );
}
