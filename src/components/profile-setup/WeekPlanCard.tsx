import { Calendar } from "lucide-react";
import { cn } from "@/lib/utils";
import type { WorkoutDay } from "@/data/workoutPlan";

const DAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"];

/**
 * Read-only "Your week" plan display for the completed Profile — mirrors the
 * Klarita split preview from the setup wizard. It is driven by the *same*
 * `plan` array the weekly view uses (defaults + custom overrides, masked to
 * the user's chosen training days), so the two screens can never disagree. A
 * day is "training" when it isn't a rest day. Changes are made via the
 * "Set up again" wizard.
 */
export function WeekPlanCard({ plan }: { plan: WorkoutDay[] }) {
  const week = plan.slice(0, 7);
  const training = week
    .map((day, idx) => ({ day, idx }))
    .filter(({ day }) => !day.isRest);

  return (
    <section className="rounded-2xl border-2 border-border bg-card p-5 lg:p-6">
      <div className="mb-5 flex items-center gap-3">
        <Calendar className="w-5 h-5 text-primary shrink-0" />
        <h3 className="font-display text-xl text-foreground lg:text-2xl">
          Your training week
        </h3>
      </div>

      <p className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
        Your {training.length}-day week
      </p>
      <div className="mt-3 grid grid-cols-7 gap-1.5">
        {week.map((day, idx) => {
          const isTraining = !day.isRest;
          return (
            <div
              key={idx}
              className={cn(
                "flex flex-col items-center gap-1 rounded-xl border-2 py-2",
                isTraining
                  ? "border-primary/40 bg-primary/5"
                  : "border-border bg-background opacity-60",
              )}
            >
              <span className="text-[10px] font-bold text-muted-foreground">
                {DAY_LETTERS[idx]}
              </span>
              <span className="text-lg leading-none">
                {isTraining ? day.emoji : "🧘"}
              </span>
            </div>
          );
        })}
      </div>

      <ul className="mt-4 space-y-1.5">
        {training.map(({ day, idx }) => (
          <li key={idx} className="flex items-center gap-2 text-sm">
            <span className="shrink-0">{day.emoji}</span>
            <span className="font-bold text-foreground">{day.day}</span>
            <span className="truncate text-muted-foreground">· {day.label}</span>
          </li>
        ))}
      </ul>

      <p className="mt-3 text-[11px] font-semibold text-muted-foreground">
        You can move training days anytime — tap “Set up again” to change your plan.
      </p>
    </section>
  );
}
