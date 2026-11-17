/**
 * Home screen install helpers.
 *
 * Chrome on Android fires `beforeinstallprompt` once, early, often before the
 * Welcome or Profile page has mounted. This module is imported from main.tsx
 * so the listener is in place from the start; the event is kept until the
 * "Install now" button uses it.
 */

type InstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

let deferred: InstallPromptEvent | null = null;
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((fn) => fn());

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault(); // we show our own button instead of Chrome's mini bar
    deferred = e as InstallPromptEvent;
    notify();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    notify();
  });
}

export const hasInstallPrompt = () => deferred !== null;

export const subscribeInstallPrompt = (fn: () => void) => {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
};

/** Show Chrome's install dialog. The event can only be used once. */
export const promptInstall = async (): Promise<boolean> => {
  const e = deferred;
  if (!e) return false;
  deferred = null;
  notify();
  await e.prompt();
  const { outcome } = await e.userChoice;
  return outcome === "accepted";
};

/** True when Power Club is already running from the home screen. */
export const isStandalone = (): boolean => {
  if (typeof window === "undefined") return false;
  return window.matchMedia?.("(display-mode: standalone)").matches
    || (navigator as Navigator & { standalone?: boolean }).standalone === true;
};

export type Platform = "iphone" | "android";

/** iPhone for iOS and iPadOS, Android for Android, otherwise iPhone. */
export const defaultPlatform = (): Platform => (isAndroid() ? "android" : "iphone");

const isAndroid = () => typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent);
const isIOS = () =>
  typeof navigator !== "undefined"
  && (/iPhone|iPad|iPod/i.test(navigator.userAgent)
    // iPadOS reports itself as a Mac; touch points give it away.
    || (/Macintosh/i.test(navigator.userAgent) && navigator.maxTouchPoints > 1));

/** Not on a phone or tablet: show "Do this on your phone". */
export const isDesktop = () => !isAndroid() && !isIOS();
