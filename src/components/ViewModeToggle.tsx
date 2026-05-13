import { Eye, ShieldCheck } from "lucide-react";
import { useAdminView } from "@/contexts/AdminContext";
import { cn } from "@/lib/utils";

const BRAND_PINK = "#FF4D9E";

/**
 * Admin/User view switcher rendered in the header. Hidden for non-admins.
 * Switching to "user" hides admin nav and admin-only UI throughout the app.
 *
 * Styling:
 *  - Admin button (active): solid pink fill with white text.
 *  - User button (active): outlined with a pink border, pink text.
 */
const ViewModeToggle = () => {
  const { isRealAdmin, viewMode, setViewMode } = useAdminView();
  if (!isRealAdmin) return null;

  const adminActive = viewMode === "admin";
  const userActive = viewMode === "user";

  return (
    <div
      className="inline-flex items-center gap-1 p-0.5 rounded-full border-2 bg-card shadow-sm"
      style={{ borderColor: `${BRAND_PINK}33` }}
    >
      <button
        type="button"
        onClick={() => setViewMode("admin")}
        aria-pressed={adminActive}
        style={
          adminActive
            ? { backgroundColor: BRAND_PINK, color: "#ffffff" }
            : { color: BRAND_PINK }
        }
        className={cn(
          "flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider transition-colors",
          !adminActive && "hover:bg-[#FF4D9E]/10",
        )}
      >
        <ShieldCheck className="w-3.5 h-3.5" />
        Admin
      </button>
      <button
        type="button"
        onClick={() => setViewMode("user")}
        aria-pressed={userActive}
        style={
          userActive
            ? {
                backgroundColor: "transparent",
                color: BRAND_PINK,
                boxShadow: `inset 0 0 0 2px ${BRAND_PINK}`,
              }
            : { color: BRAND_PINK }
        }
        className={cn(
          "flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-extrabold uppercase tracking-wider transition-colors",
          !userActive && "hover:bg-[#FF4D9E]/10",
        )}
      >
        <Eye className="w-3.5 h-3.5" />
        User
      </button>
    </div>
  );
};

export default ViewModeToggle;
