import { Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

const DAY_LETTERS = ["M", "T", "W", "T", "F", "S", "S"];
const DAY_NAMES = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export interface DayInfo {
  emoji: string;
  label: string;
}

/**
 * Read-only "Your week" plan display for the completed Profile — mirrors the
 * Klarita split preview from the setup wizard, but populated with the user's
 * *saved* plan (their training days + each day's label/emoji from the merged
 * plan, so it works for Klarita's plan or a custom/imported one). Changes are
 * made via the "Set up again" wizard.
 */
export function WeekPlanCard({
  trainingDays,
  dayInfo,
}: {
  trainingDays: number[];
  dayInfo: (idx: number) => DayInfo | undefined;
}) {
  const sorted = [...trainingDays].sort((a, b) => a - b);

  return (
    <section className="rounded-2xl border-2 border-border bg-card p-5 lg:p-6">
      <div className="mb-5 flex items-center gap-3">
        <Calendar className="w-5 h-5 text-primary shrink-0" />
        <h3 className="font-display text-xl text-foreground lg:text-2xl">
          Your training week
        </h3>
      </div>

      <p className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
        Your {sorted.length}-day week
      </p>
      <div className="mt-3 grid grid-cols-7 gap-1.5">
        {DAY_LETTERS.map((letter, idx) => {
          const training = sorted.includes(idx);
          const info = dayInfo(idx);
          return (
            <div
              key={idx}
              className={cn(
                "flex flex-col items-center gap-1 rounded-xl border-2 py-2",
                training
                  ? "border-primary/40 bg-primary/5"
                  : "border-border bg-background opacity-60",
              )}
            >
              <span className="text-[10px] font-bold text-muted-foreground">{letter}</span>
              <span className="text-lg leading-none">
                {training ? info?.emoji ?? "💪" : "🧘"}
              </span>
            </div>
          );
        })}
      </div>

      <ul className="mt-4 space-y-1.5">
        {sorted.map((idx) => {
          const info = dayInfo(idx);
          if (!info) return null;
          return (
            <li key={idx} className="flex items-center gap-2 text-sm">
              <span className="shrink-0">{info.emoji}</span>
              <span className="font-bold text-foreground">{DAY_NAMES[idx]}</span>
              <span className="truncate text-muted-foreground">· {info.label}</span>
            </li>
          );
        })}
      </ul>

      <p className="mt-3 text-[11px] font-semibold text-muted-foreground">
        You can move training days anytime — tap “Set up again” to change your plan.
      </p>
    </section>
  );
}
