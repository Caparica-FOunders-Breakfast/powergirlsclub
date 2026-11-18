import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import {
  type Platform,
  defaultPlatform,
  hasInstallPrompt,
  isDesktop,
  isStandalone,
  promptInstall,
  subscribeInstallPrompt,
} from "@/lib/installPrompt";

const C = { ink: "#2B1736", body: "#5E4E66", lilac: "#F4EDFE", green: "#1F8A4C" };
const bangers = { fontFamily: "Bangers, cursive", fontWeight: 400 } as const;

const STEPS: Record<Platform, string[]> = {
  iphone: [
    "Open Power Club in Safari.",
    "Tap the ••• button next to the address bar.",
    "Tap Share, then Add to Home Screen.",
    "Leave \"Open as Web App\" on and tap Add.",
  ],
  android: [
    "Open Power Club in Chrome.",
    "Tap ⋮ at the top right.",
    "Tap Install and create shortcut (or Add to Home screen).",
    "Tap Install.",
  ],
};

const VIDEO: Record<Platform, { src: string; poster: string; label: string }> = {
  iphone: { src: "/home-screen-iphone.mp4", poster: "/home-screen-iphone-poster.jpg", label: "Video: adding Power Club to the home screen on iPhone" },
  android: { src: "/home-screen-android.mp4", poster: "/home-screen-android-poster.jpg", label: "Video: adding Power Club to the home screen on Android" },
};

/** The small POWER / CLUB app icon used on the cards. */
function AppIcon({ size }: { size: number }) {
  return (
    <span aria-hidden="true" style={{ flex: "none", width: size, height: size, borderRadius: Math.round(size * 0.27), background: "linear-gradient(135deg,#D1207A,#6B2FB3)", color: "#FFFFFF", ...bangers, fontSize: Math.round(size * 0.29), lineHeight: 0.85, letterSpacing: 0.5, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
      <span>POWER</span><span>CLUB</span>
    </span>
  );
}

const useInstallPromptReady = () => useSyncExternalStore(subscribeInstallPrompt, hasInstallPrompt, () => false);

/**
 * "Add Power Club to your home screen" (design: add-to-home-screen.dc.html).
 * `welcome`: lilac card plus "Show me how", hidden when already on the home
 * screen. `profile`: "POWER CLUB ON YOUR PHONE" card that shows a green
 * "On your home screen" check once added.
 */
export function AddToHomeScreen({ variant }: { variant: "welcome" | "profile" }) {
  const [open, setOpen] = useState(false);
  const installed = isStandalone();

  if (variant === "welcome") {
    if (installed) return null;
    return (
      <>
        <div style={{ marginTop: 16, padding: 16, border: `2px solid ${C.ink}`, borderRadius: 20, background: C.lilac, display: "flex", gap: 14, alignItems: "center" }}>
          <AppIcon size={56} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ margin: 0, fontWeight: 800 }}>Add Power Club to your home screen</p>
            <p style={{ margin: "2px 0 0", fontSize: 14, color: C.body }}>Open it like an app. One tap and you're training.</p>
          </div>
        </div>
        <button type="button" onClick={() => setOpen(true)} style={{ marginTop: 10, width: "100%", minHeight: 48, border: `2px solid ${C.ink}`, borderRadius: 14, background: "#FFFFFF", color: C.ink, fontWeight: 800, fontSize: 16, cursor: "pointer", fontFamily: "inherit" }}>
          Show me how (20 sec)
        </button>
        {open && <HomeScreenSheet onClose={() => setOpen(false)} />}
      </>
    );
  }

  return (
    <section style={{ padding: 18, background: "#FFFFFF", border: `2px solid ${C.ink}`, borderRadius: 20 }}>
      <p style={{ margin: 0, fontSize: 12, fontWeight: 800, letterSpacing: 1, color: C.body }}>POWER CLUB ON YOUR PHONE</p>
      <div style={{ marginTop: 10, display: "flex", gap: 14, alignItems: "center" }}>
        <AppIcon size={52} />
        <div style={{ flex: 1, minWidth: 0 }}>
          {installed ? (
            <>
              <p style={{ margin: 0, fontWeight: 800, display: "flex", alignItems: "center", gap: 6 }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={C.green} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: "inline-block" }}><path d="M4 12l5 5L20 6" /></svg>
                On your home screen
              </p>
              <p style={{ margin: 0, fontSize: 14, color: C.body }}>You're using the app version.</p>
            </>
          ) : (
            <>
              <p style={{ margin: 0, fontWeight: 800 }}>Add to your home screen</p>
              <p style={{ margin: 0, fontSize: 14, color: C.body }}>Open Power Club like an app.</p>
            </>
          )}
        </div>
      </div>
      {!installed && (
        <button type="button" onClick={() => setOpen(true)} style={{ marginTop: 14, width: "100%", minHeight: 46, border: `2px solid ${C.ink}`, borderRadius: 12, background: "#FFFFFF", color: C.ink, fontWeight: 800, fontSize: 15, cursor: "pointer", fontFamily: "inherit" }}>
          Show me how (20 sec)
        </button>
      )}
      {open && <HomeScreenSheet onClose={() => setOpen(false)} />}
    </section>
  );
}

/** Bottom sheet on phones, centered modal from 700 px. */
function HomeScreenSheet({ onClose }: { onClose: () => void }) {
  const [os, setOs] = useState<Platform>(defaultPlatform);
  const canInstall = useInstallPromptReady();
  const closeRef = useRef<HTMLButtonElement>(null);
  const desktop = isDesktop();
  const wide = typeof window !== "undefined" && window.matchMedia("(min-width: 700px)").matches;

  useEffect(() => {
    const prevFocus = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      prevFocus?.focus?.();
    };
  }, [onClose]);

  const install = async () => {
    if (await promptInstall()) onClose();
  };

  const v = VIDEO[os];
  const showInstall = os === "android" && canInstall;
  const tab = (k: Platform, label: string) => {
    const on = os === k;
    return (
      <button key={k} type="button" aria-pressed={on} onClick={() => setOs(k)} style={{ flex: 1, minHeight: 44, border: 0, background: on ? C.ink : "#FFFFFF", color: on ? "#FFFFFF" : C.ink, fontWeight: 800, fontSize: 15, cursor: "pointer", fontFamily: "inherit" }}>
        {label}
      </button>
    );
  };

  return createPortal(
    <div
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: "fixed", inset: 0, zIndex: 100, background: "rgba(43,23,54,.55)", display: "flex", alignItems: wide ? "center" : "flex-end", justifyContent: "center", padding: wide ? 20 : 0, fontFamily: "Nunito, system-ui, sans-serif", color: C.ink, lineHeight: 1.5 }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="hs-title"
        style={{ width: "100%", maxWidth: 520, maxHeight: wide ? "calc(100dvh - 40px)" : "92dvh", overflowY: "auto", background: "#FFFFFF", border: `2px solid ${C.ink}`, borderBottom: wide ? `2px solid ${C.ink}` : 0, borderRadius: wide ? 28 : "28px 28px 0 0", boxShadow: wide ? "8px 8px 0 #E8308C" : "none", padding: wide ? "24px 24px 28px" : "20px 20px calc(28px + env(safe-area-inset-bottom))", boxSizing: "border-box" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
          <h2 id="hs-title" style={{ margin: 0, ...bangers, fontSize: 32, letterSpacing: 1, lineHeight: 1 }}>Add to your home screen</h2>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Close" style={{ flex: "none", width: 40, height: 40, borderRadius: 12, border: `2px solid ${C.ink}`, background: "#FFFFFF", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.ink} strokeWidth={3} strokeLinecap="round" aria-hidden="true" style={{ display: "inline-block" }}><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>

        <div style={{ marginTop: 14, display: "flex", border: `2px solid ${C.ink}`, borderRadius: 12, overflow: "hidden" }}>
          {tab("iphone", "iPhone")}
          {tab("android", "Android")}
        </div>

        {desktop && (
          <p style={{ margin: "12px 0 0", padding: "10px 14px", borderRadius: 12, background: C.lilac, fontSize: 14, fontWeight: 700 }}>
            Do this on your phone: open powerclub.caparicafoundersbreakfast.com in Safari (iPhone) or Chrome (Android).
          </p>
        )}

        {/* Rendered only while the sheet is open, so nothing downloads before. */}
        <video
          key={os}
          src={v.src}
          poster={v.poster}
          autoPlay
          muted
          loop
          playsInline
          preload="auto"
          aria-label={v.label}
          style={{ display: "block", width: "100%", maxWidth: wide ? 240 : 210, aspectRatio: "9 / 16", margin: "16px auto 0", borderRadius: 22, border: `2px solid ${C.ink}`, background: C.ink, objectFit: "cover" }}
        />

        <ol style={{ margin: "16px 0 0", paddingLeft: 22, display: "flex", flexDirection: "column", gap: 4, fontSize: 15, listStyle: "decimal" }}>
          {STEPS[os].map((s) => <li key={s}>{s}</li>)}
        </ol>

        <button type="button" onClick={showInstall ? install : onClose} style={{ marginTop: 18, width: "100%", minHeight: 52, border: `2px solid ${C.ink}`, borderRadius: 14, background: C.ink, color: "#FFFFFF", fontWeight: 800, fontSize: 16, cursor: "pointer", fontFamily: "inherit" }}>
          {showInstall ? "Install now" : "Done"}
        </button>
      </div>
    </div>,
    document.body,
  );
}
