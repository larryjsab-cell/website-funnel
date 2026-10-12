import styles from "@/content/styles.json";

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
  try {
    localStorage.setItem(STYLE_STORAGE_KEY, id);
  } catch {}
  const url = new URL(window.location.href);
  if (id === styles.defaultId) url.searchParams.delete(STYLE_PARAM);
  else url.searchParams.set(STYLE_PARAM, id);
  window.history.replaceState(window.history.state, "", url);
  window.dispatchEvent(new CustomEvent(STYLE_EVENT, { detail: id }));
}

export function currentStyle(): string {
  if (typeof document === "undefined") return styles.defaultId;
  return document.documentElement.getAttribute("data-theme") ?? styles.defaultId;
}

/**
 * Inline <head> script: applies ?style= or the saved style before first paint,
 * so a returning visitor never sees the default flash.
 */
export const themeBootScript = `(function(){try{var ids=${JSON.stringify(styleIds)};var q=new URLSearchParams(location.search).get("${STYLE_PARAM}");var s=q&&ids.indexOf(q)>-1?q:localStorage.getItem("${STYLE_STORAGE_KEY}");if(s&&ids.indexOf(s)>-1)document.documentElement.setAttribute("data-theme",s);}catch(e){}})();`;
