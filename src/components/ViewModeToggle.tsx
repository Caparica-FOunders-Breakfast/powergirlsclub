import { useAdminView } from "@/contexts/AdminContext";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const INK = "#2B1736";

/**
 * Admin/User view switcher (the design's "Viewing as  Admin | User" segmented
 * control). Renders nothing for non-admins, so callers don't need to gate it.
 * Switching to "user" hides admin nav and admin-only UI throughout the app.
 *
 * - tone "light" (default): plum border, active side filled plum. For light
 *   backgrounds (desktop header).
 * - tone "dark": white border, active side filled white. For the plum mobile
 *   header, where a plum control would disappear.
 * - compact: shorter buttons and no "Viewing as" label, for the 60px mobile bar.
 */
const ViewModeToggle = ({ tone = "light", compact = false }: { tone?: "light" | "dark"; compact?: boolean }) => {
  const { isRealAdmin, viewMode, setViewMode } = useAdminView();
  if (!isRealAdmin) return null;

  const dark = tone === "dark";
  const edge = dark ? "#FFFFFF" : INK;

  const segment = (mode: "admin" | "user", label: string) => {
    const active = viewMode === mode;
    return (
      <button
        type="button"
        onClick={() => setViewMode(mode)}
        aria-pressed={active}
        style={{
          minHeight: compact ? 32 : 40,
          padding: compact ? "0 12px" : "0 16px",
          border: 0,
          background: active ? edge : dark ? "transparent" : "#FFFFFF",
          color: active ? (dark ? INK : "#FFFFFF") : edge,
          fontFamily: "Nunito, system-ui, sans-serif",
          fontWeight: 800,
          fontSize: compact ? 13 : 14,
          cursor: active ? "default" : "pointer",
        }}
      >
        {label}
      </button>
    );
  };

  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
      {!compact && (
        <Tooltip>
          <TooltipTrigger asChild>
            <span style={{ fontSize: 13, fontWeight: 800, color: dark ? "rgba(255,255,255,0.75)" : "#77677E", cursor: "help" }}>Viewing as</span>
          </TooltipTrigger>
          <TooltipContent side="bottom" className="max-w-[220px] text-center">
            Switch between the full <strong>Admin</strong> app and the <strong>User</strong> view your members see. It only changes what you see; your admin access stays.
          </TooltipContent>
        </Tooltip>
      )}
      <div role="group" aria-label="Viewing as" style={{ display: "flex", border: `2px solid ${edge}`, borderRadius: compact ? 10 : 12, overflow: "hidden" }}>
        {segment("admin", "Admin")}
        {segment("user", "User")}
      </div>
    </div>
  );
};

/**
 * The toggle as it sits on a page's title row (desktop, lg+), per the mockups.
 * Renders nothing at all for non-admins, so it never leaves an empty row or an
 * extra flex gap. Below lg the toggle lives in the dark mobile header instead.
 *
 * - `row`: a full-width, right-aligned row, for pages whose title sits inside a
 *   hero card (Challenge, Profile) or that have no title row.
 * - default: an inline item that pushes itself to the right of a flex title row.
 */
export const PageViewToggle = ({ row = false }: { row?: boolean }) => {
  const { isRealAdmin } = useAdminView();
  if (!isRealAdmin) return null;
  return (
    <div className="hidden lg:flex" style={{ alignItems: "center", justifyContent: "flex-end", marginLeft: row ? undefined : "auto" }}>
      <ViewModeToggle />
    </div>
  );
};

export default ViewModeToggle;
