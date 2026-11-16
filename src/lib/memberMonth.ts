import { addDays, addMonths, endOfMonth, format, startOfDay, startOfMonth, startOfWeek, subDays } from "date-fns";

/**
 * The Scorecard's month card. A member's first month runs from the day they
 * joined (Nov 16 to Dec 15), in 7-day weeks counted from that day; their first
 * €5 is due at its end. After that it's the calendar month. Days before the
 * member joined never count, so a new member never sees missed weeks.
 */
export interface MonthWeek {
  label: string; // "Week 1"
  dates: string; // "Nov 16 to 22"
  planned: number;
  done: number;
  status: string;
  current: boolean;
}

export interface MemberMonth {
  firstMonth: boolean;
  title: string; // "YOUR FIRST MONTH · NOV 16 TO DEC 15" or "THIS MONTH · DECEMBER"
  weeks: MonthWeek[];
  monthDone: number;
  monthTarget: number;
  leftThisWeek: number;
  hasPlan: boolean;
  perWeek: number;
}

/** First month: join day to the day before the same date next month. */
export const firstMonthRange = (joined: Date) => {
  const start = startOfDay(joined);
  return { start, end: subDays(addMonths(start, 1), 1) };
};

/** "Nov 16 to 22", "Nov 30 to Dec 6", "Dec 14 to 15". */
export const rangeLabel = (a: Date, b: Date) =>
  format(a, "MMM") === format(b, "MMM") ? `${format(a, "MMM d")} to ${format(b, "d")}` : `${format(a, "MMM d")} to ${format(b, "MMM d")}`;

/** Weekday index used by plans: 0 = Monday ... 6 = Sunday. */
const planDayIndex = (d: Date) => (d.getDay() + 6) % 7;

export function computeMemberMonth(opts: {
  now: Date;
  joined: Date | null;
  trainingIdx: number[]; // plan day indexes with a workout
  workoutDates: Set<string>; // yyyy-MM-dd with a logged workout
}): MemberMonth {
  const { now, joined, trainingIdx, workoutDates } = opts;
  const today = startOfDay(now);
  const joinDay = joined ? startOfDay(joined) : null;
  const first = joinDay ? firstMonthRange(joinDay) : null;
  const inFirstMonth = !!first && today <= first.end;

  const isTraining = (d: Date) => trainingIdx.includes(planDayIndex(d));
  const did = (d: Date) => workoutDates.has(format(d, "yyyy-MM-dd"));
  const counts = (d: Date) => !joinDay || d >= joinDay; // never before joining

  // Calendar week (Mon to Sun) left to do: planned days from today on, after joining.
  const calWeek = startOfWeek(today, { weekStartsOn: 1 });
  let leftThisWeek = 0;
  for (let i = 0; i < 7; i++) {
    const d = addDays(calWeek, i);
    if (d >= today && counts(d) && isTraining(d) && !did(d)) leftThisWeek++;
  }

  const weeks: MonthWeek[] = [];
  let monthDone = 0;
  let monthTarget = 0;

  const addBlock = (blockStart: Date, blockEnd: Date, rangeStart: Date, rangeEnd: Date) => {
    let planned = 0, done = 0;
    for (let d = blockStart; d <= blockEnd; d = addDays(d, 1)) {
      if (d < rangeStart || d > rangeEnd || !counts(d)) continue;
      if (isTraining(d)) planned++;
      if (did(d)) done++;
    }
    monthDone += done;
    monthTarget += planned;
    if (planned === 0 && done === 0) return; // sliver with no training days
    const visStart = blockStart < rangeStart ? rangeStart : blockStart;
    const visEnd = blockEnd > rangeEnd ? rangeEnd : blockEnd;
    const current = today >= blockStart && today <= blockEnd;
    const future = blockStart > today;
    const status = future
      ? `${planned} ${planned === 1 ? "workout" : "workouts"}`
      : current ? `${done} of ${planned} · this week` : `${done} of ${planned}`;
    weeks.push({ label: `Week ${weeks.length + 1}`, dates: rangeLabel(visStart, visEnd), planned, done, status, current });
  };

  if (inFirstMonth && first) {
    // 7-day weeks from the join day: Nov 16 to 22, ..., Dec 14 to 15.
    for (let b = first.start; b <= first.end; b = addDays(b, 7)) addBlock(b, addDays(b, 6), first.start, first.end);
  } else {
    const mStart = startOfMonth(today);
    const mEnd = endOfMonth(today);
    for (let wk = startOfWeek(mStart, { weekStartsOn: 1 }); wk <= mEnd; wk = addDays(wk, 7)) addBlock(wk, addDays(wk, 6), mStart, mEnd);
  }

  return {
    firstMonth: inFirstMonth,
    title: inFirstMonth && first
      ? `YOUR FIRST MONTH · ${rangeLabel(first.start, first.end).toUpperCase()}`
      : `THIS MONTH · ${format(today, "MMMM").toUpperCase()}`,
    weeks,
    monthDone,
    monthTarget,
    leftThisWeek,
    hasPlan: trainingIdx.length > 0,
    perWeek: trainingIdx.length,
  };
}
