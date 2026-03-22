import { motion } from "framer-motion";
import { Heart, User, ChevronRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useUserRole } from "@/hooks/useProfile";
import AdminDefaultPlanEditor from "@/components/AdminDefaultPlanEditor";

const items = [
  { path: "/teams", icon: Heart, label: "Challenge", emoji: "💜", description: "Team challenges & competitions" },
  { path: "/profile", icon: User, label: "Profile", emoji: "👤", description: "Your account & settings" },
];

const More = () => {
  const navigate = useNavigate();
  const { data: role } = useUserRole();

  return (
    <div className="pb-24 px-4 pt-6 max-w-lg mx-auto">
      <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="mb-6">
        <h1 className="text-4xl font-display text-foreground">More</h1>
      </motion.div>

      <div className="flex flex-col gap-3">
        {items.map((item, i) => (
          <motion.button
            key={item.path}
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: i * 0.08 }}
            onClick={() => navigate(item.path)}
            className="flex items-center gap-4 bg-card rounded-2xl border-2 border-border p-4 text-left hover:border-primary/30 transition-colors active:scale-[0.98]"
          >
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-2xl">
              {item.emoji}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-foreground text-lg">{item.label}</p>
              <p className="text-sm text-muted-foreground">{item.description}</p>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </motion.button>
        ))}
      </div>

      {role === "admin" && (
        <div className="mt-6">
          <AdminDefaultPlanEditor />
        </div>
      )}
    </div>
  );
};

export default More;
