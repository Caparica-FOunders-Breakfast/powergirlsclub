import { useEffect, useRef, useState } from "react";
import { Calendar } from "lucide-react";
import { AnimatePresence, motion, Reorder } from "framer-motion";
import { cn } from "@/lib/utils";
import type { WorkoutDay } from "@/data/workoutPlan";

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

const SPRING = { type: "spring", stiffness: 500, damping: 34, mass: 0.7 } as const;

/** A tile carries a stable uid so framer-motion can track it as it moves between
 *  columns; `day` is the workout content currently in that column. */
interface Tile {
  uid: number;
  day: WorkoutDay;
}

const planSig = (plan: WorkoutDay[]) =>
  plan.map((d) => `${d.label}|${d.emoji}|${d.isRest ? "r" : "t"}`).join(",");

/**
 * Read-only "Your week" plan display for the completed Profile — mirrors the
 * Klarita split preview from the setup wizard. It is driven by the *same*
 * `plan` array the weekly view uses (defaults + custom overrides, masked to
 * the user's chosen training days), so the two screens can never disagree.
 *
 * When `onReorder` is provided, the workout tiles can be dragged to rearrange
 * which weekday each workout falls on — the other tiles make room as you drag
 * (framer-motion Reorder). Weekday labels (M/T/W…) stay fixed in a header row;
 * only the workout tiles move.
 */
export function WeekPlanCard({
  plan,
  onReorder,
  travelMode = false,
}: {
  plan: WorkoutDay[];
  onReorder?: (next: WorkoutDay[], changed: number[]) => Promise<void>;
  travelMode?: boolean;
}) {
  const draggable = !!onReorder;

  // Tiles are rendered in weekday-column order (index 0 = Monday …). Dragging
  // reorders them live; content is reconciled from the server plan by column,
  // keeping uids in place so a confirmed move never re-animates.
  const [order, setOrder] = useState<Tile[]>(() =>
    plan.slice(0, 7).map((day, i) => ({ uid: i, day })),
  );
  const preDrag = useRef<Tile[]>(order);
  const orderRef = useRef<Tile[]>(order);
  orderRef.current = order;
  const sig = planSig(plan);
  useEffect(() => {
    setOrder((prev) =>
      plan.slice(0, 7).map((day, i) => ({ uid: prev[i]?.uid ?? i, day })),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);

  const trainingCount = order.filter((t) => !t.day.isRest).length;

  const handleDrop = async () => {
    if (!onReorder) return;
    const before = preDrag.current;
    const current = orderRef.current;
    const changed = current
      .map((t, i) => (before[i]?.uid !== t.uid ? i : -1))
      .filter((i) => i >= 0);
    if (changed.length === 0) return;
    try {
      await onReorder(current.map((t) => t.day), changed);
    } catch {
      // Persist failed — slide the tiles back to where they were.
      setOrder(before);
    }
  };

  return (
    <section className="rounded-2xl border-2 border-border bg-card p-5 lg:p-6">
      <div className="mb-5 flex items-center gap-3">
        <Calendar className="w-5 h-5 text-primary shrink-0" />
        <h3 className="font-display text-xl text-foreground lg:text-2xl">
          Your training week
        </h3>
        {travelMode && (
          <span className="ml-auto rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-extrabold uppercase tracking-wider text-primary">
            ✈️ Travel
          </span>
        )}
      </div>

      <p className="text-[11px] font-extrabold uppercase tracking-wider text-muted-foreground">
        Your {trainingCount}-day week
      </p>

      {/* Fixed weekday labels — these never move. */}
      <div className="mt-3 flex gap-1.5">
        {DAY_LETTERS.map((letter, i) => (
          <span
            key={i}
            className="flex-1 text-center text-[10px] font-bold text-muted-foreground"
          >
            {letter}
          </span>
        ))}
      </div>

      {/* Workout tiles — drag to rearrange; the others make room. */}
      <Reorder.Group
        as="div"
        axis="x"
        values={order}
        onReorder={setOrder}
        className="mt-1.5 flex gap-1.5"
      >
        {order.map((tile) => {
          const isTraining = !tile.day.isRest;
          return (
            <Reorder.Item
              as="div"
              key={tile.uid}
              value={tile}
              drag={draggable}
              onDragStart={() => {
                preDrag.current = order;
              }}
              onDragEnd={handleDrop}
              whileHover={draggable ? { y: -2 } : undefined}
              whileDrag={{ scale: 1.12, zIndex: 50, cursor: "grabbing" }}
              transition={SPRING}
              style={{ willChange: "transform" }}
              className={cn(
                "flex min-w-0 flex-1 items-center justify-center rounded-xl border-2 py-3 transition-colors duration-150",
                isTraining
                  ? "border-primary/40 bg-primary/5"
                  : "border-border bg-background opacity-60",
                draggable && "cursor-grab touch-none",
              )}
            >
              <span className="text-lg leading-none">
                {isTraining ? tile.day.emoji : "🧘"}
              </span>
            </Reorder.Item>
          );
        })}
      </Reorder.Group>

      <ul className="mt-4 space-y-1.5">
        <AnimatePresence initial={false} mode="popLayout">
          {order.map((tile, col) =>
            tile.day.isRest ? null : (
              <motion.li
                key={tile.uid}
                layout
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                transition={SPRING}
                className="flex items-center gap-2 text-sm"
              >
                <span className="shrink-0">{tile.day.emoji}</span>
                <span className="font-bold text-foreground">{DAY_NAMES[col]}</span>
                <span className="truncate text-muted-foreground">· {tile.day.label}</span>
              </motion.li>
            ),
          )}
        </AnimatePresence>
      </ul>

      <p className="mt-3 text-[11px] font-semibold text-muted-foreground">
        {travelMode
          ? "Travel mode is on — these days show bodyweight workouts. Switch it off to get your normal plan back."
          : draggable
            ? "Drag a workout onto another day to rearrange your week. Bigger changes? Tap “Set up again”."
            : "You can move training days anytime — tap “Set up again” to change your plan."}
      </p>
    </section>
  );
}
