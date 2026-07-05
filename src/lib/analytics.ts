// Thin analytics wrapper.
//
// PostHog is not wired up in this app yet, so this is a safe no-op unless a
// global `posthog` instance is present on window. Call sites use the real
// event names now; when PostHog is initialised later they start flowing with
// no further changes. Analytics must never throw into app code.

type TrackProps = Record<string, string | number | boolean | null | undefined>;

interface PosthogLike {
  capture: (event: string, props?: TrackProps) => void;
}

function getPosthog(): PosthogLike | undefined {
  if (typeof window === "undefined") return undefined;
  const ph = (window as { posthog?: PosthogLike }).posthog;
  return ph && typeof ph.capture === "function" ? ph : undefined;
}

export function track(event: string, props?: TrackProps): void {
  try {
    getPosthog()?.capture(event, props);
  } catch {
    // swallow — analytics failures must never break the UI
  }
}
