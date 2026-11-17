import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { reloadOnceForNewVersion } from "@/lib/chunkReload";
// Catch Android's one-time install prompt before any page mounts.
import "@/lib/installPrompt";

// Vite fires this when a lazy chunk's preload fails (usually a stale deploy).
// Reload once to get the new version; if we already did, let the error reach
// PageErrorBoundary, which shows "This page didn't load".
window.addEventListener("vite:preloadError", (event) => {
  if (reloadOnceForNewVersion()) event.preventDefault();
});

createRoot(document.getElementById("root")!).render(<App />);
