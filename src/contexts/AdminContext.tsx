import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useAuth } from "@/contexts/AuthContext";

export type ViewMode = "admin" | "user";

interface AdminContextValue {
  /** What the real admin is currently viewing the app as. */
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  toggleViewMode: () => void;
  /** True when the user has the admin role AND is not impersonating a user. */
  isAdmin: boolean;
  /** True when the user is a real admin regardless of the view toggle.
   *  Use this only for the toggle itself — most UI should check `isAdmin`. */
  isRealAdmin: boolean;
}

const STORAGE_KEY = "powerclub:adminViewMode";

const AdminContext = createContext<AdminContextValue | null>(null);

const readStored = (): ViewMode => {
  if (typeof window === "undefined") return "admin";
  const v = window.localStorage.getItem(STORAGE_KEY);
  return v === "user" ? "user" : "admin";
};

export const AdminProvider = ({ children }: { children: ReactNode }) => {
  const { isAdmin: isRealAdmin } = useAuth();
  const [viewMode, setViewModeState] = useState<ViewMode>(() => readStored());

  // Force non-admins back to user view so a stale localStorage flag can't
  // grant elevated UI.
  useEffect(() => {
    if (!isRealAdmin && viewMode !== "user") {
      setViewModeState("user");
    }
  }, [isRealAdmin, viewMode]);

  const setViewMode = useCallback((mode: ViewMode) => {
    setViewModeState(mode);
    try {
      window.localStorage.setItem(STORAGE_KEY, mode);
    } catch {
      // localStorage may be unavailable in private mode — ignore.
    }
  }, []);

  const toggleViewMode = useCallback(() => {
    setViewMode(viewMode === "admin" ? "user" : "admin");
  }, [viewMode, setViewMode]);

  const value = useMemo<AdminContextValue>(
    () => ({
      viewMode,
      setViewMode,
      toggleViewMode,
      isAdmin: isRealAdmin && viewMode === "admin",
      isRealAdmin,
    }),
    [viewMode, setViewMode, toggleViewMode, isRealAdmin],
  );

  return <AdminContext.Provider value={value}>{children}</AdminContext.Provider>;
};

export const useAdminView = (): AdminContextValue => {
  const ctx = useContext(AdminContext);
  if (!ctx) {
    throw new Error("useAdminView must be used within an AdminProvider");
  }
  return ctx;
};

/** Shorthand for components that only care about the effective admin status. */
export const useIsAdmin = () => useAdminView().isAdmin;
