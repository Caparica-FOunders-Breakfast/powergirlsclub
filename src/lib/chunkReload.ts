/**
 * Recovery from stale code-split chunks after a deploy.
 *
 * Pages are lazy-loaded. When a new version is deployed, a browser that still
 * runs the old index.js asks for old chunk files that no longer exist, so the
 * dynamic import fails and the page stays blank. We reload once to pick up the
 * new version. A session flag with a timestamp makes sure we never loop: if a
 * reload already happened in the last minute and the chunk still fails, the
 * caller shows "This page didn't load" with a manual Reload button instead.
 */

const FLAG = "pc-chunk-reload-at";
const WINDOW_MS = 60_000;

let reloading = false;

/** True for the errors browsers throw when a lazy chunk can't be loaded. */
export const isChunkLoadError = (err: unknown): boolean => {
  if (!err) return false;
  const e = err as { name?: string; message?: string };
  const text = `${e.name ?? ""} ${e.message ?? String(err)}`;
  return /ChunkLoadError|Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|Expected a JavaScript.*module script|MIME type|Unable to preload CSS|Failed to load module script/i.test(text);
};

const readFlag = (): number => {
  try {
    return Number(sessionStorage.getItem(FLAG) ?? 0) || 0;
  } catch {
    return 0;
  }
};

/**
 * Reload the page to fetch the latest version, unless we already did so in the
 * last minute. Returns true when a reload is (or already was) under way, so the
 * caller keeps showing "Getting the latest version"; false means give up and
 * show the manual Reload screen.
 */
export const reloadOnceForNewVersion = (): boolean => {
  if (reloading) return true;
  if (Date.now() - readFlag() < WINDOW_MS) return false;
  try {
    sessionStorage.setItem(FLAG, String(Date.now()));
  } catch {
    // Without storage we can't guard against loops, so don't auto-reload.
    return false;
  }
  reloading = true;
  window.location.reload();
  return true;
};

/** Manual reload from the "This page didn't load" screen. */
export const manualReload = () => {
  try {
    sessionStorage.removeItem(FLAG);
  } catch {
    /* ignore */
  }
  window.location.reload();
};
