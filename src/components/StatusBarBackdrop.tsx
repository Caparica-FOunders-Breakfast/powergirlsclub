/**
 * The app uses the iOS `black-translucent` status bar (index.html), which draws
 * a WHITE clock/battery on top of the page. Member screens have a dark header
 * behind it; public pages (landing, login, legal) have light tops, so in the
 * home-screen app the clock was white-on-white.
 *
 * This renders a fixed plum band exactly behind the status bar, plus a spacer of
 * the same height so content starts below it. `env(safe-area-inset-top)` is 0 in
 * a normal browser tab, so this is invisible there. Render it as a sibling
 * *before* the page root (not inside a flex-col-reverse container).
 */
export function StatusBarBackdrop() {
  return (
    <>
      <div aria-hidden="true" style={{ position: "fixed", top: 0, left: 0, right: 0, height: "env(safe-area-inset-top)", background: "#2B1736", zIndex: 100 }} />
      <div aria-hidden="true" style={{ height: "env(safe-area-inset-top)" }} />
    </>
  );
}
