import { weeklyPlan } from "@/data/workoutPlan";
import { FREQUENCY_DEFAULT_DAYS } from "@/hooks/useUserPreferences";

const DAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"];

/**
 * Preview of Klarita's split for a given days/week. There are no separate
 * 3/4-day definitions — the split is the 5-day `weeklyPlan` filtered to the
 * training days for that frequency (the same subset the app trains on).
 */
export function KlaritaSplitPreview({ daysPerWeek }: { daysPerWeek: number }) {
  const indices = FREQUENCY_DEFAULT_DAYS[daysPerWeek] ?? [];

  return (
    <div className="rounded-2xl border-2 border-border bg-background p-4">
      <p className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
        Your {daysPerWeek}-day week
      </p>
      <div className="mt-3 grid grid-cols-7 gap-1.5">
        {DAY_LETTERS.map((letter, idx) => {
          const training = indices.includes(idx);
          const day = weeklyPlan[idx];
          return (
            <div
              key={idx}
              className={
                training
                  ? "flex flex-col items-center gap-1 rounded-xl border-2 border-primary/40 bg-primary/5 py-2"
                  : "flex flex-col items-center gap-1 rounded-xl border-2 border-border bg-card py-2 opacity-60"
              }
            >
              <span className="text-[10px] font-bold text-muted-foreground">{letter}</span>
              <span className="text-lg leading-none">{training ? day?.emoji ?? "💪" : "🧘"}</span>
            </div>
          );
        })}
      </div>
      <ul className="mt-3 space-y-1">
        {indices.map((idx) => {
          const day = weeklyPlan[idx];
          if (!day) return null;
          return (
            <li key={idx} className="flex items-center gap-2 text-sm">
              <span className="shrink-0">{day.emoji}</span>
              <span className="font-bold text-foreground">{day.day}</span>
              <span className="truncate text-muted-foreground">· {day.label}</span>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-[11px] font-semibold text-muted-foreground">
        You can move training days anytime after starting.
      </p>
    </div>
  );
}
