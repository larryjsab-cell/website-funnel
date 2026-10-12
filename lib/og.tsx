import { ImageResponse } from "next/og";
import { site } from "@/lib/site";

export const ogSize = { width: 1200, height: 630 };

/** 1200×630 link preview in the default (brutalist) style: brand, page title, the offer line. */
export function renderOg({ title, kicker }: { title: string; kicker?: string }) {
  const c = site.colors;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: c.concrete,
          color: c.ink,
          padding: 72,
          fontFamily: "monospace",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20, fontSize: 40, fontWeight: 800 }}>
          <div style={{ width: 64, height: 64, background: c.ink, color: c.concrete, display: "flex", alignItems: "center", justifyContent: "center" }}>
            {site.business.shortName.charAt(0)}
          </div>
          {site.business.name}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {kicker && <div style={{ fontSize: 34, fontWeight: 700, color: c.blueprint, display: "flex" }}>{kicker}</div>}
          <div style={{ fontSize: 76, fontWeight: 800, lineHeight: 1.05, display: "flex" }}>{title}</div>
        </div>
        <div style={{ display: "flex", border: `4px solid ${c.ink}`, fontSize: 36, fontWeight: 700 }}>
          {site.offer.line.map((item, i) => (
            <div
              key={item}
              style={{
                flex: 1,
                padding: "20px 24px",
                background: i === 2 ? c.signal : c.surface,
                borderLeft: i > 0 ? `4px solid ${c.ink}` : "none",
                display: "flex",
              }}
            >
              {item}
            </div>
          ))}
        </div>
      </div>
    ),
    ogSize,
  );
}
