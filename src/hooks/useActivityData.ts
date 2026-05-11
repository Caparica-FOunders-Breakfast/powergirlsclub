import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface ActivityLogEntry {
  /** YYYY-MM-DD in local time. */
  date: string;
}

const toLocalDateKey = (iso: string): string => {
  const d = new Date(iso);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

/**
 * Lightweight feed of completed exercise log dates for the current user.
 * Used by the Profile page to compute workouts-completed and best-streak.
 */
export const useActivityData = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["activity-data", user?.id],
    queryFn: async (): Promise<ActivityLogEntry[]> => {
      const { data, error } = await supabase
        .from("exercise_logs")
        .select("completed_at")
        .eq("user_id", user!.id)
        .eq("completed", true)
        .not("completed_at", "is", null)
        .order("completed_at", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((log: any) => ({ date: toLocalDateKey(log.completed_at) }));
    },
    enabled: !!user,
  });
};
