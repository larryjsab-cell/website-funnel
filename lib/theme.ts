import styles from "@/content/styles.json";
import canvas from "@/content/theme-canvas.json";

export const STYLE_STORAGE_KEY = "ryzon-style";
export const STYLE_PARAM = "style";
export const styleIds = styles.options.map((o) => o.id);
export const STYLE_EVENT = "ryzon:style";

export function styleName(id: string | undefined) {
  return styles.options.find((o) => o.id === id)?.name ?? "";
}

/** Apply a style to the whole page, remember it, and make the URL shareable. */
export function applyStyle(id: string) {
  if (!styleIds.includes(id)) return;
  document.documentElement.setAttribute("data-theme", id);
  setToolbarColor(id);
  try {
    localStorage.setItem(STYLE_STORAGE_KEY, id);
  } catch {}
  const url = new URL(window.location.href);
  if (id === styles.defaultId) url.searchParams.delete(STYLE_PARAM);
  else url.searchParams.set(STYLE_PARAM, id);
  window.history.replaceState(window.history.state, "", url);
  window.dispatchEvent(new CustomEvent(STYLE_EVENT, { detail: id }));
}

/** Phone browsers tint their toolbar with theme-color; keep it matched to the style's background. */
function setToolbarColor(id: string) {
  const color = (canvas as Record<string, string>)[id];
  if (color) document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((m) => (m.content = color));
}

export function currentStyle(): string {
  if (typeof document === "undefined") return styles.defaultId;
  return document.documentElement.getAttribute("data-theme") ?? styles.defaultId;
}

/**
 * Inline <head> script: applies ?style= or the saved style before first paint,
 * so a returning visitor never sees the default flash. It also adds the one
 * theme-color tag (the phone toolbar tint) in that style's background color;
 * React never renders that tag, so hydration can't add a second, stale copy.
 */
export const themeBootScript = `(function(){var bg=${JSON.stringify(canvas)};var m=document.createElement("meta");m.name="theme-color";m.content=bg["${styles.defaultId}"];document.head.appendChild(m);try{var ids=${JSON.stringify(styleIds)};var q=new URLSearchParams(location.search).get("${STYLE_PARAM}");var s=q&&ids.indexOf(q)>-1?q:localStorage.getItem("${STYLE_STORAGE_KEY}");if(s&&ids.indexOf(s)>-1){document.documentElement.setAttribute("data-theme",s);m.content=bg[s]}}catch(e){}})();`;
