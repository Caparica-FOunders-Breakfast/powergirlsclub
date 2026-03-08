import { Trophy, Dumbbell, Gift, User } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

const tabs = [
  { path: "/", icon: Trophy, label: "Board" },
  { path: "/week", icon: Dumbbell, label: "Week" },
  { path: "/rewards", icon: Gift, label: "Powers" },
  { path: "/profile", icon: User, label: "Profile" },
];

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card/95 backdrop-blur-lg border-t-2 border-primary/30 safe-area-pb">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {tabs.map(({ path, icon: Icon, label }) => {
          const isActive = location.pathname === path;
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all duration-200",
                isActive
                  ? "text-primary scale-110"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className={cn("w-6 h-6", isActive && "drop-shadow-[0_0_8px_hsl(var(--neon-pink)/0.6)]")} strokeWidth={isActive ? 2.5 : 2} />
              <span className={cn("text-[10px] font-bold uppercase tracking-wider", isActive && "font-extrabold")}>{label}</span>
              {isActive && (
                <div className="w-1.5 h-1.5 rounded-full bg-primary mt-0.5" />
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
