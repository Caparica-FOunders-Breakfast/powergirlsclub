import { differenceInCalendarDays, startOfWeek } from "date-fns";
import { useActiveChallenge, useChallengeProgress } from "@/hooks/useChallenge";

/**
 * Where the member's team challenge is: "Week 2 of 4" and days left come from
 * their 4-week challenge when one is running; otherwise the days left this week.
 */
export const useTeamChallengeWeek = (_weekStart: string) => {
  const { data: challenge } = useActiveChallenge();
  const progress = useChallengeProgress(challenge?.start_date ?? null);
  if (progress?.status === "active") {
    return { weekOf: ((progress.week - 1) % 4) + 1, daysLeft: progress.daysLeft ?? 0 };
  }
  const now = new Date();
  const left = 7 - differenceInCalendarDays(now, startOfWeek(now, { weekStartsOn: 1 }));
  return { weekOf: null as number | null, daysLeft: left };
};

export const daysLeftLabel = (n: number) => (n <= 1 ? "Last day" : `${n} days left`);

export const ordinal = (n: number) => {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${s[(v - 20) % 10] || s[v] || s[0]}`;
};
