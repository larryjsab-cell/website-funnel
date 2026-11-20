type Props = {
  /** What the map shows: "lat,lng" for a city, a name for a state. */
  query: string;
  zoom: number;
  title: string;
  /** Set when the map sits on the ink band (the hero). */
  onInk?: boolean;
};

/**
 * Google Maps embed (no API key). Lazy-loaded; the Content-Security-Policy allows
 * frames from Google Maps only.
 */
export function LocationMap({ query, zoom, title, onInk = false }: Props) {
  const src = `https://www.google.com/maps?q=${encodeURIComponent(query)}&z=${zoom}&output=embed`;
  return (
    <div className={`overflow-hidden rounded-card border-2 bg-surface ${onInk ? "border-on-band shadow-hard-inverse" : "border-ink shadow-hard"}`}>
      <iframe src={src} title={title} loading="lazy" referrerPolicy="no-referrer-when-downgrade" className="block aspect-4/3 w-full" />
    </div>
  );
}
