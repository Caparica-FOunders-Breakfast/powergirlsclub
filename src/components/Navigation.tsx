import {
  BarChart3,
  Dumbbell,
  Globe,
  Heart,
  LayoutDashboard,
  MoreHorizontal,
  User,
  Users,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import { useIsAdmin } from "@/contexts/AdminContext";
import { useProfile } from "@/hooks/useProfile";
import ViewModeToggle from "@/components/ViewModeToggle";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  useSidebar,
} from "@/components/ui/sidebar";

type NavItem = { path: string; icon: typeof Dumbbell; label: string; emoji: string };

// Meals is intentionally omitted until the feature is ready, it can be
// re-added here once meals_enabled is flipped on for real. Admins can still
// reach /meals directly by URL.
const adminSidebarTabs: NavItem[] = [
  { path: "/week", icon: Dumbbell, label: "This week", emoji: "💪" },
  { path: "/", icon: BarChart3, label: "Scorecard", emoji: "🏆" },
  { path: "/learn", icon: Globe, label: "Language", emoji: "🌍" },
  { path: "/teams", icon: Heart, label: "Challenge", emoji: "💜" },
  { path: "/profile", icon: User, label: "Profile", emoji: "👤" },
];

const adminOnlySidebarTabs: NavItem[] = [
  { path: "/dashboard", icon: LayoutDashboard, label: "Dashboard", emoji: "📊" },
  { path: "/users", icon: Users, label: "Users", emoji: "👥" },
];

const memberSidebarTabs: NavItem[] = [
  { path: "/week", icon: Dumbbell, label: "This week", emoji: "💪" },
  { path: "/", icon: BarChart3, label: "Scorecard", emoji: "🏆" },
  { path: "/teams", icon: Heart, label: "Challenge", emoji: "💜" },
  { path: "/profile", icon: User, label: "Profile", emoji: "👤" },
];

const adminMobileTabs: NavItem[] = [
  { path: "/week", icon: Dumbbell, label: "This week", emoji: "💪" },
  { path: "/", icon: BarChart3, label: "Scorecard", emoji: "🏆" },
  { path: "/dashboard", icon: LayoutDashboard, label: "Admin", emoji: "📊" },
  { path: "/learn", icon: Globe, label: "Language", emoji: "🌍" },
  { path: "/more", icon: MoreHorizontal, label: "More", emoji: "⋯" },
];

const memberMobileTabs: NavItem[] = [
  { path: "/week", icon: Dumbbell, label: "This week", emoji: "💪" },
  { path: "/", icon: BarChart3, label: "Scorecard", emoji: "🏆" },
  { path: "/teams", icon: Heart, label: "Challenge", emoji: "💜" },
  { path: "/profile", icon: User, label: "Profile", emoji: "👤" },
];

export function AppSidebar() {
  const { user } = useAuth();
  const isAdmin = useIsAdmin();
  const { data: profile } = useProfile();
  const tabs = isAdmin ? adminSidebarTabs : memberSidebarTabs;
  const displayName = profile?.display_name || user?.email?.split("@")[0] || "Power Girl";
  const avatarColor = profile?.avatar_color || "#FF2D87";
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <>
      {/* Mobile/tablet: offcanvas sidebar (Sheet on mobile, hidden-by-default on tablet) */}
      <div className="contents lg:hidden">
        <Sidebar collapsible="offcanvas" className="border-r-2 border-[#2B1736]">
          <SidebarContent className="bg-[#2B1736] text-white pt-4">
            <div className="px-5 pb-4 border-b border-white/10">
              <h2 className="text-3xl font-display uppercase tracking-widest text-[#FF8AC4] leading-none">Power Club</h2>
              <p className="text-[11px] font-bold text-white/60 mt-2 uppercase tracking-wider">Stronger Together</p>
            </div>

            <SidebarGroup>
              <SidebarGroupLabel className="font-bold text-[11px] uppercase tracking-widest text-white/40">
                Navigate
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {tabs.map((item) => (
                    <SidebarMenuItem key={item.path}>
                      <SidebarMenuButton asChild>
                        <NavLink
                          to={item.path}
                          end
                          className="flex items-center gap-3 px-3 py-2.5 rounded-2xl font-bold text-white/80 hover:bg-white/5 hover:text-white transition-colors"
                          activeClassName="bg-[#E8308C] text-white"
                        >
                          <item.icon className="h-5 w-5" />
                          <span>{item.label}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            {isAdmin && (
              <SidebarGroup>
                <SidebarGroupLabel className="font-bold text-[11px] uppercase tracking-widest text-white/40">
                  Admin only
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {adminOnlySidebarTabs.map((item) => (
                      <SidebarMenuItem key={item.path}>
                        <SidebarMenuButton asChild>
                          <NavLink
                            to={item.path}
                            end
                            className="flex items-center gap-3 px-3 py-2.5 rounded-2xl font-bold text-white/80 hover:bg-white/5 hover:text-white transition-colors"
                            activeClassName="bg-[#E8308C] text-white"
                          >
                            <item.icon className="h-5 w-5" />
                            <span>{item.label}</span>
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            )}
          </SidebarContent>
        </Sidebar>
      </div>

      {/* Desktop (lg+): permanent dark sidebar with pink uppercase logo + avatar footer.
          The <aside> stretches to the full document height (flex align-stretch) so the
          dark background always runs to the bottom of the page; an inner sticky,
          viewport-tall column keeps the nav pinned while you scroll. */}
      <aside className="hidden lg:flex lg:flex-col lg:w-60 lg:shrink-0 bg-[#2B1736] text-white border-r border-white/10">
       <div className="lg:sticky lg:top-0 lg:h-screen flex flex-col">
        <div className="px-6 py-7 border-b border-white/10">
          <h2 className="text-3xl font-display uppercase tracking-widest text-[#FF8AC4] leading-none">
            Power Club
          </h2>
          <p className="text-xs font-bold text-white/60 mt-2 uppercase tracking-wider">Stronger Together</p>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <p className="px-3 mb-3 font-bold text-[11px] uppercase tracking-widest text-white/40">
            Navigate
          </p>
          <nav className="flex flex-col gap-2">
            {tabs.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end
                className="flex items-center gap-3.5 px-5 py-3.5 rounded-2xl font-bold text-base text-white/80 hover:bg-white/5 hover:text-white transition-colors"
                activeClassName="bg-[#E8308C] text-white"
              >
                <item.icon className="h-5 w-5 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>

          {isAdmin && (
            <>
              <p className="px-3 mt-7 mb-3 font-bold text-[11px] uppercase tracking-widest text-white/40">
                Admin only
              </p>
              <nav className="flex flex-col gap-2">
                {adminOnlySidebarTabs.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end
                    className="flex items-center gap-3.5 px-5 py-3.5 rounded-2xl font-bold text-base text-white/80 hover:bg-white/5 hover:text-white transition-colors"
                    activeClassName="bg-[#E8308C] text-white"
                  >
                    <item.icon className="h-5 w-5 shrink-0" />
                    <span>{item.label}</span>
                  </NavLink>
                ))}
              </nav>
            </>
          )}
        </div>
        <div className="px-4 py-4 border-t border-white/10">
          <NavLink
            to="/profile"
            end
            className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-white/5 transition-colors"
            activeClassName=""
          >
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-extrabold text-white shrink-0"
              style={{ backgroundColor: avatarColor }}
            >
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white truncate">{displayName}</p>
              <p className="text-[11px] font-semibold text-white/50 truncate">
                {isAdmin ? "Admin" : "Member"}
              </p>
            </div>
          </NavLink>
        </div>
       </div>
      </aside>
    </>
  );
}

export function BottomNav() {
  const location = useLocation();
  const isAdmin = useIsAdmin();
  const tabs = isAdmin ? adminMobileTabs : memberMobileTabs;

  // Below lg the app uses this bottom tab bar (phones and tablet); the dark
  // sidebar takes over at lg+. Styled to match the mobile design: a pink pill
  // behind the active icon, no neon glow.
  // The white background fills the iOS home-indicator area (safe-area inset)
  // via padding, while the 72px tab row sits above it, so tabs never collide
  // with the home indicator in standalone (home-screen) mode.
  return (
    <nav aria-label="App navigation" className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t-2 border-[#2B1736] lg:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
      <div className="h-[72px] flex">
        {tabs.map(({ path, icon: Icon, label }) => {
          const isActive = path === "/more"
            ? ["/more", "/teams", "/profile"].includes(location.pathname)
            : location.pathname === path;
          return (
            <Link
              key={path}
              to={path}
              aria-current={isActive ? "page" : undefined}
              className="flex-1 flex flex-col items-center justify-center gap-[2px] no-underline"
              style={{ color: isActive ? "#C21C70" : "#5E4E66", fontSize: 11, fontWeight: 800 }}
            >
              <span
                className="flex items-center justify-center"
                style={{ width: 44, height: 30, borderRadius: 999, background: isActive ? "#FCE4F0" : "transparent" }}
              >
                <Icon className="w-5 h-5" strokeWidth={2.2} />
              </span>
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function AppHeader() {
  const { user } = useAuth();
  const { data: profile } = useProfile();
  const displayName = profile?.display_name || user?.email?.split("@")[0] || "Power Girl";
  const avatarColor = profile?.avatar_color || "#E8308C";
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <>
      {/* Mobile/tablet (below lg): dark bar with the pink logo + avatar, matching
          the mobile design. Navigation lives in the bottom tab bar. The dark
          background fills the iOS status-bar area (safe-area inset) so the logo
          never collides with the clock/battery under a notch. */}
      <header className="sticky top-0 z-40 bg-[#2B1736] lg:hidden" style={{ paddingTop: "env(safe-area-inset-top)" }}>
        <div className="h-[60px] flex items-center justify-between gap-3 px-4">
          <Link to="/" className="font-display text-[28px] tracking-wider text-[#FF8AC4] leading-none">Power Club</Link>
          <div className="flex items-center gap-2">
            {/* Self-hides for non-admins. Not gated on isAdmin: that's false in
                "User" view, which hid the toggle and stranded admins there. */}
            <ViewModeToggle tone="dark" compact />
            <Link
              to="/profile"
              aria-label="Your profile"
              className="w-9 h-9 rounded-full flex items-center justify-center text-[13px] font-extrabold text-white shrink-0"
              style={{ backgroundColor: avatarColor }}
            >
              {initials}
            </Link>
          </div>
        </div>
      </header>
      {/* Desktop header (lg+): just the view toggle (the sidebar carries branding). */}
      <div className="hidden lg:flex sticky top-0 z-40 h-12 items-center justify-end px-6 bg-transparent">
        <ViewModeToggle />
      </div>
    </>
  );
}

export { SidebarProvider };
