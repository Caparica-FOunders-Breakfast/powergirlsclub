import { useMemo } from "react";
import { startOfWeek, startOfMonth, addDays, addWeeks, format } from "date-fns";
import { useActivityData } from "./useActivityData";

// The "Show Up Guarantee": log a workout on >= 3 distinct days each week for 4
// weeks in a row and the next month is free. A "session" here = one distinct
// calendar day with >= 1 completed exercise (capped at 3/week toward the goal).
const WEEKLY_TARGET = 3;
const WEEKS = 4;

export interface GuaranteeWeek {
  label: string; // "Week 1"
  count: number; // distinct active days, capped at WEEKLY_TARGET
  rawCount: number; // uncapped
  target: number; // WEEKLY_TARGET
  isCurrent: boolean;
  isFuture: boolean;
  status: string;
}

export interface ShowUpGuarantee {
  monthLabel: string;
  weeks: GuaranteeWeek[];
  sessions: number; // sum of capped weekly counts (0..monthTarget)
  monthTarget: number; // WEEKS * WEEKLY_TARGET
  thisWeekCount: number; // distinct active days this week (uncapped)
  weeklyTarget: number;
  remainingThisWeek: number;
}

/**
 * Computes Show Up Guarantee progress for the current month from completed
 * exercise logs. The 4-week window is anchored to the Monday-week containing
 * the 1st of the current month.
 */
export const useShowUpGuarantee = (): ShowUpGuarantee => {
  const { data: entries } = useActivityData();

  return useMemo(() => {
    const now = new Date();
    const monthLabel = format(now, "MMMM");
    const firstMonday = startOfWeek(startOfMonth(now), { weekStartsOn: 1 });
    const todayMonday = startOfWeek(now, { weekStartsOn: 1 });
    const todayMondayKey = format(todayMonday, "yyyy-MM-dd");
    const dateSet = new Set((entries ?? []).map((e) => e.date));

    const countWeek = (weekStart: Date): number => {
      let c = 0;
      for (let d = 0; d < 7; d++) {
        if (dateSet.has(format(addDays(weekStart, d), "yyyy-MM-dd"))) c++;
      }
      return c;
    };

    const weeks: GuaranteeWeek[] = [];
    let sessions = 0;
    let currentInWindow = false;
    let thisWeekCount = 0;

    for (let i = 0; i < WEEKS; i++) {
      const ws = addWeeks(firstMonday, i);
      const wsKey = format(ws, "yyyy-MM-dd");
      const raw = countWeek(ws);
      const capped = Math.min(raw, WEEKLY_TARGET);
      sessions += capped;
      const isCurrent = wsKey === todayMondayKey;
      const isFuture = ws > todayMonday;
      if (isCurrent) {
        currentInWindow = true;
        thisWeekCount = raw;
      }
      const status = isFuture
        ? "Coming up"
        : capped >= WEEKLY_TARGET
          ? "Done"
          : isCurrent
            ? `${raw} of ${WEEKLY_TARGET}, this week`
            : `${raw} of ${WEEKLY_TARGET}`;
      weeks.push({ label: `Week ${i + 1}`, count: capped, rawCount: raw, target: WEEKLY_TARGET, isCurrent, isFuture, status });
    }

    // If today falls outside the 4-week window (a 5th week), still report the
    // real current-week count for the "N of 3 this week" callouts.
    if (!currentInWindow) thisWeekCount = countWeek(todayMonday);

    return {
      monthLabel,
      weeks,
      sessions,
      monthTarget: WEEKS * WEEKLY_TARGET,
      thisWeekCount,
      weeklyTarget: WEEKLY_TARGET,
      remainingThisWeek: Math.max(0, WEEKLY_TARGET - thisWeekCount),
    };
  }, [entries]);
};
