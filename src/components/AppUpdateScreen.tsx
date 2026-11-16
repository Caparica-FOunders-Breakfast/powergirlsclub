import { Component, type ErrorInfo, type ReactNode } from "react";
import { isChunkLoadError, manualReload, reloadOnceForNewVersion } from "@/lib/chunkReload";

const C = { bg: "#FBF9FB", ink: "#2B1736", body: "#5E4E66", pink: "#C21C70", yellow: "#FFE14D" };
const bangers = { fontFamily: "Bangers, cursive", fontWeight: 400 } as const;

/**
 * Full-page "Getting the latest version" / "This page didn't load" screen
 * (design: app-update.dc.html). Plain inline styles only, so it renders even
 * when the rest of the app's code failed to load.
 */
export function AppUpdateScreen({ state }: { state: "loading" | "failed" }) {
  return (
    <div style={{ minHeight: "100vh", background: C.bg, color: C.ink, fontFamily: "Nunito, system-ui, sans-serif", fontSize: 17, lineHeight: 1.5, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 20px", boxSizing: "border-box" }}>
      <style>{"@keyframes pcload{0%{transform:translateX(-100%)}100%{transform:translateX(250%)}}"}</style>
      <div style={{ width: "100%", maxWidth: 460, textAlign: "center" }}>
        <p style={{ margin: 0, ...bangers, fontSize: 40, letterSpacing: 1, color: C.pink, lineHeight: 1 }}>Power Club</p>
        {state === "loading" ? (
          <div role="status">
            <h1 style={{ margin: "28px 0 0", ...bangers, fontSize: 40, letterSpacing: 1, lineHeight: 1.05 }}>Getting the latest version</h1>
            <p style={{ margin: "10px 0 0", color: C.body }}>We just made Power Club better. This takes a second.</p>
            <div style={{ margin: "24px auto 0", maxWidth: 260, height: 10, border: `2px solid ${C.ink}`, borderRadius: 999, overflow: "hidden", background: "#FFFFFF" }}>
              <div style={{ width: "40%", height: "100%", background: "linear-gradient(90deg, #D1207A, #6B2FB3)", animation: "pcload 1.2s ease-in-out infinite" }} />
            </div>
          </div>
        ) : (
          <div role="alert">
            <h1 style={{ margin: "28px 0 0", ...bangers, fontSize: 40, letterSpacing: 1, lineHeight: 1.05 }}>This page didn't load</h1>
            <p style={{ margin: "10px 0 0", color: C.body }}>Your account is safe and your plan is saved. A quick reload usually fixes it.</p>
            <button type="button" onClick={manualReload} style={{ marginTop: 24, width: "100%", minHeight: 56, border: `2px solid ${C.ink}`, borderRadius: 14, background: C.yellow, color: C.ink, boxShadow: `4px 4px 0 ${C.ink}`, fontFamily: "inherit", fontWeight: 800, fontSize: 18, cursor: "pointer" }}>
              Reload
            </button>
            <p style={{ margin: "16px 0 0", fontSize: 15, color: C.body }}>
              Still stuck? <a href="mailto:hello@caparicafoundersbreakfast.com" style={{ fontWeight: 800, color: C.pink }}>Tell us</a> and we'll sort it out.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Route-level error boundary. A failed lazy chunk (stale deploy) reloads once
 * to get the new version; anything else, or a chunk that still fails after
 * that reload, shows "This page didn't load" instead of a blank page.
 */
export class PageErrorBoundary extends Component<{ children: ReactNode }, { state: "ok" | "loading" | "failed" }> {
  state = { state: "ok" as "ok" | "loading" | "failed" };

  static getDerivedStateFromError(error: unknown) {
    // Decide in componentDidCatch (it has side effects); show the spinner first.
    return { state: isChunkLoadError(error) ? "loading" : "failed" } as const;
  }

  componentDidCatch(error: unknown, info: ErrorInfo) {
    console.error("[PageErrorBoundary]", error, info.componentStack);
    if (isChunkLoadError(error) && !reloadOnceForNewVersion()) this.setState({ state: "failed" });
  }

  render() {
    if (this.state.state === "ok") return this.props.children;
    return <AppUpdateScreen state={this.state.state} />;
  }
}
