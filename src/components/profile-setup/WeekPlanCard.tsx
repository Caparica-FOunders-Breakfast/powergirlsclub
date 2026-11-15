import { useEffect, useRef, useState } from "react";
import { Reorder } from "framer-motion";
import type { WorkoutDay } from "@/data/workoutPlan";

const DAY_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const C = { ink: "#2B1736", body: "#5E4E66", sub: "#77677E", pink: "#C21C70", magenta: "#E8308C", purple: "#6B2FB3", tile: "#F6F1F7", lilac: "#F1E9FE" };

interface Tile {
  uid: number;
  day: WorkoutDay;
}

const planSig = (plan: WorkoutDay[]) =>
  plan.map((d) => `${d.label}|${d.emoji}|${d.isRest ? "r" : "t"}`).join(",");

/**
 * "Your training week" card for the Profile. A 7-column grid of the week; when
 * `onReorder` is provided the workout tiles can be dragged to a different day
 * (the others make room). Same `plan` array the weekly view uses, so the two
 * screens never disagree.
 */
export function WeekPlanCard({
  plan,
  onReorder,
  travelMode = false,
  onSetUpAgain,
}: {
  plan: WorkoutDay[];
  onReorder?: (next: WorkoutDay[], changed: number[]) => Promise<void>;
  travelMode?: boolean;
  onSetUpAgain?: () => void;
}) {
  const draggable = !!onReorder;

  const [order, setOrder] = useState<Tile[]>(() => plan.slice(0, 7).map((day, i) => ({ uid: i, day })));
  const preDrag = useRef<Tile[]>(order);
  const orderRef = useRef<Tile[]>(order);
  orderRef.current = order;
  const sig = planSig(plan);
  useEffect(() => {
    setOrder((prev) => plan.slice(0, 7).map((day, i) => ({ uid: prev[i]?.uid ?? i, day })));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);

  const trainingCount = order.filter((t) => !t.day.isRest).length;

  const handleDrop = async () => {
    if (!onReorder) return;
    const before = preDrag.current;
    const current = orderRef.current;
    const changed = current.map((t, i) => (before[i]?.uid !== t.uid ? i : -1)).filter((i) => i >= 0);
    if (changed.length === 0) return;
    try {
      await onReorder(current.map((t) => t.day), changed);
    } catch {
      setOrder(before);
    }
  };

  return (
    <section style={{ background: "#FFFFFF", border: `2px solid ${C.ink}`, borderRadius: 22, padding: 24 }}>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", gap: 12 }}>
        <div>
          <h2 style={{ margin: 0, fontFamily: "Bangers, cursive", fontWeight: 400, fontSize: 32, letterSpacing: 1, color: C.ink }}>Your training week</h2>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: C.body }}>
            {trainingCount} training {trainingCount === 1 ? "day" : "days"}{travelMode ? " · ✈️ travel mode" : ""}
          </p>
        </div>
        {onSetUpAgain && (
          <button type="button" onClick={onSetUpAgain} style={{ minHeight: 44, padding: "0 16px", border: `2px solid ${C.ink}`, borderRadius: 12, background: "#FFFFFF", color: C.ink, fontWeight: 800, fontSize: 14, cursor: "pointer" }}>Set up again</button>
        )}
      </div>

      <Reorder.Group as="div" axis="x" values={order} onReorder={setOrder} style={{ marginTop: 18, display: "flex", gap: 8, overflowX: "auto" }}>
        {order.map((tile, col) => {
          const rest = tile.day.isRest;
          const type = rest ? (tile.day.isRecovery ? "Recovery" : "Rest") : tile.day.label;
          const bg = rest ? C.tile : travelMode ? C.lilac : "#FFF5FA";
          const fg = rest ? C.sub : C.ink;
          const border = rest ? C.tile : travelMode ? C.purple : C.magenta;
          return (
            <Reorder.Item
              as="div"
              key={tile.uid}
              value={tile}
              drag={draggable && !rest ? "x" : false}
              onDragStart={() => { preDrag.current = order; }}
              onDragEnd={handleDrop}
              whileDrag={{ scale: 1.08, zIndex: 50, cursor: "grabbing" }}
              style={{ minWidth: 76, minHeight: 96, flex: 1, padding: 10, borderRadius: 14, background: bg, color: fg, border: `2px solid ${border}`, boxSizing: "border-box", display: "flex", flexDirection: "column", justifyContent: "space-between", cursor: draggable && !rest ? "grab" : "default", touchAction: "none" }}
            >
              <span style={{ fontWeight: 800, fontSize: 14 }}>{DAY_SHORT[col]}</span>
              <span style={{ fontWeight: 800, fontSize: 13, lineHeight: 1.2 }}>{type}</span>
            </Reorder.Item>
          );
        })}
      </Reorder.Group>

      <p style={{ margin: "14px 0 0", fontSize: 14, color: C.body }}>
        {travelMode
          ? "Travel mode is on, these days show bodyweight workouts. Switch it off to get your normal plan back."
          : draggable
            ? "Drag a workout onto another day to move it. Bigger changes? Tap “Set up again”."
            : "Tap “Set up again” to change your plan."}
      </p>
    </section>
  );
}
