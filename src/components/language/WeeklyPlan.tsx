import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronLeft, ChevronRight, Check } from "lucide-react";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import {
  WEEKLY_PLAN,
  useLanguageTasks,
  useToggleTask,
  getCompletedDays,
} from "@/hooks/useLanguageLearning";
import { cn } from "@/lib/utils";
import { startOfWeek, addWeeks, addDays, format, isSameWeek } from "date-fns";

interface WeeklyPlanProps {
  language: { code: string; name: string; flag: string };
}

const getWeekStart = (date: Date) => format(startOfWeek(date, { weekStartsOn: 1 }), "yyyy-MM-dd");

export function WeeklyPlan({ language }: WeeklyPlanProps) {
  const now = new Date();
  const currentWeekDate = startOfWeek(now, { weekStartsOn: 1 });
  const [weekOffset, setWeekOffset] = useState(0);

  const selectedWeekDate = addWeeks(currentWeekDate, weekOffset);
  const weekStart = getWeekStart(selectedWeekDate);
  const isCurrentWeek = weekOffset === 0;

  const { data: tasks = [], isLoading } = useLanguageTasks(language.code, weekStart);
  const toggleTask = useToggleTask(weekStart);

  const completedDays = getCompletedDays(tasks);

  const weekLabel = isCurrentWeek
    ? "This Week"
    : weekOffset === -1
    ? "Last Week"
    : weekOffset === 1
    ? "Next Week"
    : format(selectedWeekDate, "MMM d, yyyy");

  const weekRange = `${format(selectedWeekDate, "MMM d")} – ${format(addDays(selectedWeekDate, 6), "MMM d")}`;

  const isTaskCompleted = (dayIndex: number, taskIndex: number) => {
    return tasks.some((t) => t.day_index === dayIndex && t.task_index === taskIndex && t.completed);
  };

  const isDayCompleted = (dayIndex: number) => {
    let count = 0;
    for (let t = 0; t < 3; t++) {
      if (isTaskCompleted(dayIndex, t)) count++;
    }
    return count === 3;
  };

  const dayTaskCount = (dayIndex: number) => {
    let count = 0;
    for (let t = 0; t < 3; t++) {
      if (isTaskCompleted(dayIndex, t)) count++;
    }
    return count;
  };

  const handleToggle = (dayIndex: number, taskIndex: number) => {
    const current = isTaskCompleted(dayIndex, taskIndex);
    toggleTask.mutate({
      languageCode: language.code,
      dayIndex,
      taskIndex,
      completed: !current,
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 bg-muted rounded-2xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Week navigation */}
      <motion.div
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="text-center space-y-1"
      >
        <div className="flex items-center justify-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setWeekOffset((o) => o - 1)}
            className="h-8 w-8"
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <span className="text-sm font-bold text-muted-foreground min-w-[140px]">
            {weekRange}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setWeekOffset((o) => o + 1)}
            className="h-8 w-8"
          >
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
        {!isCurrentWeek && (
          <button
            onClick={() => setWeekOffset(0)}
            className="text-[10px] font-bold text-primary uppercase tracking-wider hover:underline"
          >
            Back to this week
          </button>
        )}
      </motion.div>

      {/* Progress header */}
      <motion.div
        initial={{ y: -10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="rounded-2xl border-2 border-border bg-card p-4"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{language.flag}</span>
            <div>
              <h3 className="font-display text-lg text-foreground">{language.name}</h3>
              <p className="text-xs font-bold text-muted-foreground">{weekLabel}</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-display text-foreground">{completedDays}<span className="text-sm font-bold text-muted-foreground">/5</span></p>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Days</p>
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-3 h-2 w-full bg-muted rounded-full overflow-hidden">
          <motion.div
            key={weekStart}
            initial={{ width: 0 }}
            animate={{ width: `${(completedDays / 5) * 100}%` }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="h-full rounded-full bg-gradient-to-r from-primary/80 to-primary"
          />
        </div>
      </motion.div>

      {/* Day cards */}
      {WEEKLY_PLAN.map((day, dayIdx) => {
        const done = isDayCompleted(dayIdx);
        const count = dayTaskCount(dayIdx);
        const isWeekend = dayIdx === 5;

        return (
          <Collapsible key={day.day} defaultOpen={isCurrentWeek && !done && dayIdx === getDayOfWeekIndex()}>
            <motion.div
              initial={{ x: -16, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: dayIdx * 0.06 }}
              className={cn(
                "rounded-2xl border-2 bg-card overflow-hidden transition-colors",
                done ? "border-primary/30" : "border-border",
                isWeekend && "border-dashed"
              )}
            >
              <CollapsibleTrigger className="w-full flex items-center gap-3 px-4 py-3 group">
                <span className="text-xl">{day.emoji}</span>
                <div className="flex-1 text-left min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-extrabold text-foreground">{day.day}</p>
                    <span className="text-xs font-bold text-muted-foreground">— {day.focus}</span>
                    {isWeekend && (
                      <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">Optional</span>
                    )}
                    {done && <Check className="w-4 h-4 text-primary" />}
                  </div>
                  <p className="text-[10px] font-bold text-primary/70 italic">"{day.title}"</p>
                  <p className="text-[10px] font-bold text-muted-foreground mt-0.5">{day.description}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] font-bold text-muted-foreground">{count}/{day.tasks.length}</span>
                  <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                </div>
              </CollapsibleTrigger>

              <CollapsibleContent>
                <div className="px-4 pb-4 space-y-3">
                  {day.tasks.map((task, taskIdx) => {
                    const checked = isTaskCompleted(dayIdx, taskIdx);
                    return (
                      <motion.label
                        key={taskIdx}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: taskIdx * 0.04 }}
                        className="flex items-center gap-3.5 cursor-pointer group/task py-1"
                      >
                        <Checkbox
                          checked={checked}
                          onCheckedChange={() => handleToggle(dayIdx, taskIdx)}
                          className="h-6 w-6 rounded-full border-2 shrink-0 data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                        />
                        <span className={cn(
                          "text-sm font-bold transition-colors",
                          checked ? "text-muted-foreground line-through" : "text-foreground"
                        )}>
                          {task}
                        </span>
                      </motion.label>
                    );
                  })}
                </div>
              </CollapsibleContent>
            </motion.div>
          </Collapsible>
        );
      })}
    </div>
  );
}

function getDayOfWeekIndex(): number {
  const day = new Date().getDay();
  if (day === 0 || day === 6) return 0;
  return day - 1;
}
