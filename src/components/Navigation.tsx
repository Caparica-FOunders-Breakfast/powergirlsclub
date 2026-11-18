import {
  BarChart3,
  Dumbbell,
  Globe,
  LayoutDashboard,
  MoreHorizontal,
  User,
  Users,
} from "lucide-react";
import type { ComponentType } from "react";
import { Link, useLocation } from "react-router-dom";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import { useIsAdmin } from "@/contexts/AdminContext";
import { useProfile, useMemberName } from "@/hooks/useProfile";

/** Avatar placeholder when we don't know the member's name yet. */
const PersonIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: "inline-block" }}><circle cx="12" cy="8" r="4" /><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6" /></svg>
);
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

type NavIcon = ComponentType<{ className?: string; strokeWidth?: number | string }>;
type NavItem = { path: string; icon: NavIcon; label: string; emoji: string };

/** Club tab icon (power-club-club-feed brief): two people, same stroke style as the other tabs. */
const ClubIcon: NavIcon = ({ className, strokeWidth = 2.2 }) => (
  <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M8 3a2.2 2.2 0 1 1 0 4.4a2.2 2.2 0 1 1 0-4.4M16 3a2.2 2.2 0 1 1 0 4.4a2.2 2.2 0 1 1 0-4.4M3.5 13c.6-2.4 2.3-3.6 4.5-3.6M20.5 13c-.6-2.4-2.3-3.6-4.5-3.6M7 16v6M17 16v6M4.5 17.5v3M19.5 17.5v3M7 19h10" />
  </svg>
);

const CLUB: NavItem = { path: "/club", icon: ClubIcon, label: "Club", emoji: "" };
/** Club covers /club and /club/challenges; other tabs match exactly. */
const isTabActive = (tabPath: string, pathname: string) =>
  tabPath === "/club" ? pathname === "/club" || pathname.startsWith("/club/") : pathname === tabPath;

// Meals is intentionally omitted until the feature is ready, it can be
// re-added here once meals_enabled is flipped on for real. Admins can still
// reach /meals directly by URL.
const adminSidebarTabs: NavItem[] = [
  { path: "/week", icon: Dumbbell, label: "This week", emoji: "💪" },
  CLUB,
  { path: "/", icon: BarChart3, label: "Scorecard", emoji: "🏆" },
  { path: "/learn", icon: Globe, label: "Language", emoji: "🌍" },
  { path: "/profile", icon: User, label: "Profile", emoji: "👤" },
];

const adminOnlySidebarTabs: NavItem[] = [
  { path: "/dashboard", icon: LayoutDashboard, label: "Dashboard", emoji: "📊" },
  { path: "/users", icon: Users, label: "Users", emoji: "👥" },
];

// Members: This week, Club, Scorecard, Profile (Challenge lives inside Club).
const memberSidebarTabs: NavItem[] = [
  { path: "/week", icon: Dumbbell, label: "This week", emoji: "💪" },
  CLUB,
  { path: "/", icon: BarChart3, label: "Scorecard", emoji: "🏆" },
  { path: "/profile", icon: User, label: "Profile", emoji: "👤" },
];

// Admins: Language moved into More to make room for Club.
const adminMobileTabs: NavItem[] = [
  { path: "/week", icon: Dumbbell, label: "This week", emoji: "💪" },
  CLUB,
  { path: "/", icon: BarChart3, label: "Scorecard", emoji: "🏆" },
  { path: "/dashboard", icon: LayoutDashboard, label: "Admin", emoji: "📊" },
  { path: "/more", icon: MoreHorizontal, label: "More", emoji: "⋯" },
];

const memberMobileTabs: NavItem[] = [
  { path: "/week", icon: Dumbbell, label: "This week", emoji: "💪" },
  CLUB,
  { path: "/", icon: BarChart3, label: "Scorecard", emoji: "🏆" },
  { path: "/profile", icon: User, label: "Profile", emoji: "👤" },
];

export function AppSidebar() {
  const { user } = useAuth();
  const isAdmin = useIsAdmin();
  const { data: profile } = useProfile();
  const tabs = isAdmin ? adminSidebarTabs : memberSidebarTabs;
  const { firstName: displayName, initial } = useMemberName();
  const avatarColor = profile?.avatar_color || "#FF2D87";
  const initials = initial || <PersonIcon />;

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
                          end={item.path !== "/club"}
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
                end={item.path !== "/club"}
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
            ? ["/more", "/learn", "/profile"].includes(location.pathname)
            : isTabActive(path, location.pathname);
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
  const { firstName: displayName, initial } = useMemberName();
  const avatarColor = profile?.avatar_color || "#E8308C";
  const initials = initial || <PersonIcon />;

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
      {/* Desktop (lg+) has no header bar: the sidebar carries branding and the
          "Viewing as" toggle sits on each page's title row (PageViewToggle),
          as in the mockups. */}
    </>
  );
}

export { SidebarProvider };
