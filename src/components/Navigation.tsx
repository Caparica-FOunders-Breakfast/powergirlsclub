import { Trophy, Dumbbell, Menu, Globe, MoreHorizontal, Heart, User, UtensilsCrossed } from "lucide-react";
import { useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { NavLink } from "@/components/NavLink";
import { useAuth } from "@/contexts/AuthContext";
import { useProfile } from "@/hooks/useProfile";
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
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";

type NavItem = { path: string; icon: typeof Trophy; label: string; emoji: string };

const adminSidebarTabs: NavItem[] = [
  { path: "/week", icon: Dumbbell, label: "Exercises", emoji: "💪" },
  { path: "/", icon: Trophy, label: "Scorecard", emoji: "🏆" },
  { path: "/learn", icon: Globe, label: "Language", emoji: "🌍" },
  { path: "/meals", icon: UtensilsCrossed, label: "Meals", emoji: "🥗" },
  { path: "/teams", icon: Heart, label: "Challenge", emoji: "💜" },
  { path: "/profile", icon: User, label: "Profile", emoji: "👤" },
];

const memberSidebarTabs: NavItem[] = [
  { path: "/week", icon: Dumbbell, label: "Exercises", emoji: "💪" },
  { path: "/profile", icon: User, label: "Profile", emoji: "👤" },
];

const adminMobileTabs: NavItem[] = [
  { path: "/week", icon: Dumbbell, label: "Exercises", emoji: "💪" },
  { path: "/", icon: Trophy, label: "Scorecard", emoji: "🏆" },
  { path: "/meals", icon: UtensilsCrossed, label: "Meals", emoji: "🥗" },
  { path: "/learn", icon: Globe, label: "Language", emoji: "🌍" },
  { path: "/more", icon: MoreHorizontal, label: "More", emoji: "⋯" },
];

const memberMobileTabs: NavItem[] = [
  { path: "/week", icon: Dumbbell, label: "Exercises", emoji: "💪" },
  { path: "/profile", icon: User, label: "Profile", emoji: "👤" },
];

export function AppSidebar() {
  const { user, isAdmin } = useAuth();
  const { data: profile } = useProfile();
  const tabs = isAdmin ? adminSidebarTabs : memberSidebarTabs;
  const displayName = profile?.display_name || user?.email?.split("@")[0] || "Power Girl";
  const avatarColor = profile?.avatar_color || "#FF2D87";
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <>
      {/* Mobile/tablet: offcanvas sidebar (Sheet on mobile, hidden-by-default on tablet) */}
      <div className="contents lg:hidden">
        <Sidebar collapsible="offcanvas" className="border-r-2 border-primary/20">
          <SidebarContent className="bg-card pt-4">
            <div className="px-4 pb-4 border-b border-border">
              <h2 className="text-2xl font-display text-primary tracking-wider">Power Club</h2>
              <p className="text-xs font-bold text-muted-foreground">💜 Stronger Together</p>
            </div>

            <SidebarGroup>
              <SidebarGroupLabel className="font-bold text-xs uppercase tracking-wider text-muted-foreground">
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
                          className="flex items-center gap-3 px-3 py-2.5 rounded-xl font-bold text-foreground hover:bg-primary/10 transition-colors"
                          activeClassName="bg-primary/10 text-primary"
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
          </SidebarContent>
        </Sidebar>
      </div>

      {/* Desktop (lg+): permanent dark sidebar with pink uppercase logo + avatar footer */}
      <aside className="hidden lg:flex lg:flex-col lg:w-60 lg:shrink-0 lg:sticky lg:top-0 lg:h-screen bg-[#1a0a2e] text-white border-r border-white/10">
        <div className="px-6 py-7 border-b border-white/10">
          <h2 className="text-3xl font-display uppercase tracking-widest text-[#FF2D87] leading-none">
            Power Club
          </h2>
          <p className="text-xs font-bold text-white/60 mt-2 uppercase tracking-wider">💜 Stronger Together</p>
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
                className="flex items-center gap-3.5 px-5 py-3.5 rounded-xl font-bold text-base text-white/80 hover:bg-white/5 hover:text-white transition-colors"
                activeClassName="bg-[#FF2D87]/15 text-[#FF2D87]"
              >
                <item.icon className="h-5 w-5 shrink-0" />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
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
      </aside>
    </>
  );
}

export function BottomNav() {
  const location = useLocation();
  const { isAdmin } = useAuth();
  const tabs = isAdmin ? adminMobileTabs : memberMobileTabs;

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-t-2 border-primary/30 md:hidden pb-[env(safe-area-inset-bottom)]">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-1">
        {tabs.map(({ path, icon: Icon, label }) => {
          const isActive = path === "/more"
            ? ["/more", "/teams", "/profile"].includes(location.pathname)
            : location.pathname === path;
          return (
            <NavLink
              key={path}
              to={path}
              end
              className={cn(
                "flex flex-col items-center gap-0.5 min-w-[56px] min-h-[44px] justify-center px-2 py-1 rounded-xl transition-all duration-200",
                "text-muted-foreground hover:text-foreground active:scale-95"
              )}
              activeClassName="text-primary scale-110"
            >
              <Icon className={cn("w-6 h-6", isActive && "drop-shadow-[0_0_8px_hsl(var(--neon-pink)/0.6)]")} strokeWidth={isActive ? 2.5 : 2} />
              <span className={cn("text-[10px] font-bold uppercase tracking-wider", isActive && "font-extrabold")}>{label}</span>
              {isActive && <div className="w-1.5 h-1.5 rounded-full bg-primary mt-0.5" />}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}

export function AppHeader() {
  return (
    <header className="sticky top-0 z-40 h-14 flex items-center gap-3 px-4 bg-card/95 backdrop-blur-lg border-b-2 border-primary/20 lg:hidden">
      <SidebarTrigger className="text-foreground hover:text-primary" />
      <h1 className="text-xl font-display text-primary tracking-wider">Power Club</h1>
    </header>
  );
}

export { SidebarProvider };
