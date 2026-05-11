import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ActivityLogEntry {
  date: string; // YYYY-MM-DD (local day)
  hour: number; // 0-23
  exerciseName: string;
  weight: number | null;
  failed: boolean;
}

const toLocalDateKey = (iso: string): string => {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export const useActivityData = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["activity-data", user?.id],
    queryFn: async (): Promise<ActivityLogEntry[]> => {
      const { data, error } = await supabase
        .from("exercise_logs")
        .select("exercise_name, weight_used, completed_at")
        .eq("user_id", user!.id)
        .eq("completed", true)
        .not("completed_at", "is", null)
        .order("completed_at", { ascending: true });

      if (error) throw error;

      return (data ?? []).map((log) => {
        const at = log.completed_at as string;
        const d = new Date(at);
        const w = log.weight_used == null ? null : Number(log.weight_used);
        return {
          date: toLocalDateKey(at),
          hour: d.getHours(),
          exerciseName: log.exercise_name,
          weight: w === -1 ? null : w,
          failed: w === -1,
        };
      });
    },
    enabled: !!user,
  });
};
