import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, ChevronLeft, ChevronRight, Check, Link2, X, Pencil, RotateCcw, Plus, Trash2 } from "lucide-react";
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from "@/components/ui/collapsible";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  WEEKLY_PLAN,
  useLanguageTasks,
  useToggleTask,
  getCompletedDays,
  useDayLinks,
  useUpsertDayLink,
  useRemoveDayLink,
  useCustomPlans,
  useUpsertCustomPlan,
  useResetCustomPlan,
  getEffectivePlan,
} from "@/hooks/useLanguageLearning";
import { cn } from "@/lib/utils";
import { startOfWeek, addWeeks, addDays, format } from "date-fns";
import { VocabSection } from "@/components/language/VocabSection";
import { useToast } from "@/hooks/use-toast";

interface WeeklyPlanProps {
  language: { code: string; name: string; flag: string };
}

const getWeekStart = (date: Date) => format(startOfWeek(date, { weekStartsOn: 1 }), "yyyy-MM-dd");

export function WeeklyPlan({ language }: WeeklyPlanProps) {
  const now = new Date();
  const currentWeekDate = startOfWeek(now, { weekStartsOn: 1 });
  const [weekOffset, setWeekOffset] = useState(0);
  const [editingLink, setEditingLink] = useState<number | null>(null);
  const [linkInput, setLinkInput] = useState("");
  const [editingDay, setEditingDay] = useState<number | null>(null);
  const { toast } = useToast();

  const selectedWeekDate = addWeeks(currentWeekDate, weekOffset);
  const weekStart = getWeekStart(selectedWeekDate);
  const isCurrentWeek = weekOffset === 0;

  const { data: tasks = [], isLoading } = useLanguageTasks(language.code, weekStart);
  const { data: dayLinks = [] } = useDayLinks(language.code);
  const { data: customPlans = [] } = useCustomPlans(language.code);
  const toggleTask = useToggleTask(weekStart);
  const upsertLink = useUpsertDayLink();
  const removeLink = useRemoveDayLink();
  const upsertCustomPlan = useUpsertCustomPlan();
  const resetCustomPlan = useResetCustomPlan();

  const completedDays = getCompletedDays(tasks);

  const weekRange = `${format(selectedWeekDate, "MMM d")} – ${format(addDays(selectedWeekDate, 6), "MMM d")}`;

  const isTaskCompleted = (dayIndex: number, taskIndex: number) =>
    tasks.some((t) => t.day_index === dayIndex && t.task_index === taskIndex && t.completed);

  const isDayCompleted = (dayIndex: number) => {
    const plan = getEffectivePlan(dayIndex, customPlans);
    const dayTasks = plan?.tasks.length ?? 3;
    let count = 0;
    for (let t = 0; t < dayTasks; t++) {
      if (isTaskCompleted(dayIndex, t)) count++;
    }
    return count === dayTasks;
  };

  const dayTaskCount = (dayIndex: number) => {
    const plan = getEffectivePlan(dayIndex, customPlans);
    const dayTasks = plan?.tasks.length ?? 3;
    let count = 0;
    for (let t = 0; t < dayTasks; t++) {
      if (isTaskCompleted(dayIndex, t)) count++;
    }
    return count;
  };

  const handleToggle = (dayIndex: number, taskIndex: number) => {
    const current = isTaskCompleted(dayIndex, taskIndex);
    toggleTask.mutate({ languageCode: language.code, dayIndex, taskIndex, completed: !current });
  };

  const getDayLink = (dayIndex: number) => dayLinks.find((l) => l.day_index === dayIndex);

  const handleSaveLink = (dayIndex: number) => {
    const url = linkInput.trim();
    if (url) {
      const finalUrl = url.startsWith("http") ? url : `https://${url}`;
      upsertLink.mutate({ languageCode: language.code, dayIndex, url: finalUrl });
    } else {
      removeLink.mutate({ languageCode: language.code, dayIndex });
    }
    setEditingLink(null);
    setLinkInput("");
  };

  const startEditLink = (dayIndex: number) => {
    const existing = getDayLink(dayIndex);
    setLinkInput(existing?.url ?? "");
    setEditingLink(dayIndex);
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
          <Button variant="ghost" size="icon" onClick={() => setWeekOffset((o) => o - 1)} className="h-8 w-8">
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <span className="text-sm font-bold text-muted-foreground min-w-[140px]">{weekRange}</span>
          <Button variant="ghost" size="icon" onClick={() => setWeekOffset((o) => o + 1)} className="h-8 w-8">
            <ChevronRight className="w-5 h-5" />
          </Button>
        </div>
        {!isCurrentWeek && (
          <button onClick={() => setWeekOffset(0)} className="text-[10px] font-bold text-primary uppercase tracking-wider hover:underline">
            Back to this week
          </button>
        )}
      </motion.div>

      {/* Progress header */}
      <motion.div initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="rounded-2xl border-2 border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">{language.flag}</span>
            <div>
              <h3 className="font-display text-lg text-foreground">{language.name}</h3>
              <p className="text-xs font-bold text-muted-foreground">
                {isCurrentWeek ? "This Week" : weekOffset === -1 ? "Last Week" : weekOffset === 1 ? "Next Week" : format(selectedWeekDate, "MMM d, yyyy")}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-display text-foreground">{completedDays}<span className="text-sm font-bold text-muted-foreground">/5</span></p>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Days</p>
          </div>
        </div>
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
      {WEEKLY_PLAN.map((defaultDay, dayIdx) => {
        const plan = getEffectivePlan(dayIdx, customPlans)!;
        const done = isDayCompleted(dayIdx);
        const count = dayTaskCount(dayIdx);
        const isWeekend = dayIdx === 5;
        const link = getDayLink(dayIdx);
        const isEditing = editingDay === dayIdx;

        return (
          <Collapsible key={defaultDay.day} defaultOpen={isCurrentWeek && !done && dayIdx === getDayOfWeekIndex()}>
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
              <div className="flex items-center gap-2 px-4 py-3">
                <CollapsibleTrigger className="flex-1 flex items-center gap-3 group min-w-0">
                  <span className="text-xl">{plan.emoji}</span>
                  <div className="flex-1 text-left min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-extrabold text-foreground">{plan.day ?? defaultDay.day}</p>
                      <span className="text-xs font-bold text-muted-foreground">— {plan.focus}</span>
                      {isWeekend && (
                        <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground">Optional</span>
                      )}
                      {plan.isCustom && (
                        <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full bg-primary/10 text-primary">Custom</span>
                      )}
                      {done && <Check className="w-4 h-4 text-primary" />}
                    </div>
                    <p className="text-[10px] font-bold text-primary/70 italic">"{plan.title}"</p>
                    <p className="text-[10px] font-bold text-muted-foreground mt-0.5">{plan.description}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[10px] font-bold text-muted-foreground">{count}/{plan.tasks.length}</span>
                    <ChevronDown className="w-4 h-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
                  </div>
                </CollapsibleTrigger>
                <button
                  onClick={(e) => { e.stopPropagation(); setEditingDay(dayIdx); }}
                  className="h-7 w-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
              </div>

              <CollapsibleContent>
                <div className="px-4 pb-4 space-y-3">
                  {isEditing ? (
                    <DayEditor
                      dayIndex={dayIdx}
                      languageCode={language.code}
                      initial={plan}
                      onSave={(updated) => {
                        upsertCustomPlan.mutate({
                          languageCode: language.code,
                          dayIndex: dayIdx,
                          focus: updated.focus,
                          emoji: updated.emoji,
                          title: updated.title,
                          description: updated.description,
                          tasks: updated.tasks,
                        });
                        setEditingDay(null);
                        toast({ description: "Day plan saved!" });
                      }}
                      onCancel={() => setEditingDay(null)}
                      onReset={() => {
                        resetCustomPlan.mutate({ languageCode: language.code, dayIndex: dayIdx });
                        setEditingDay(null);
                        toast({ description: "Reset to default plan" });
                      }}
                      isCustom={plan.isCustom}
                    />
                  ) : (
                    <>
                      {plan.tasks.map((task, taskIdx) => {
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


                      {/* Day link */}
                      <div className="pt-1">
                        {editingLink === dayIdx ? (
                          <div className="flex items-center gap-2">
                            <Input
                              autoFocus
                              value={linkInput}
                              onChange={(e) => setLinkInput(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleSaveLink(dayIdx);
                                if (e.key === "Escape") { setEditingLink(null); setLinkInput(""); }
                              }}
                              placeholder="Paste a link…"
                              className="h-8 text-xs rounded-xl"
                            />
                            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => handleSaveLink(dayIdx)}>
                              <Check className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => { setEditingLink(null); setLinkInput(""); }}>
                              <X className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        ) : link ? (
                          <div className="flex items-center gap-2 group/link">
                            <Link2 className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                            <a
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs font-bold text-primary/80 hover:text-primary truncate transition-colors"
                            >
                              {link.url.replace(/^https?:\/\/(www\.)?/, "").split("/")[0]}
                            </a>
                            <button
                              onClick={(e) => { e.preventDefault(); startEditLink(dayIdx); }}
                              className="text-[10px] font-bold text-muted-foreground hover:text-foreground opacity-0 group-hover/link:opacity-100 transition-opacity"
                            >
                              edit
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEditLink(dayIdx)}
                            className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Link2 className="w-3 h-3" />
                            Add link
                          </button>
                        )}
                      </div>

                      {/* Vocabulary */}
                      <VocabSection
                        languageCode={language.code}
                        languageName={language.name}
                        dayIndex={dayIdx}
                        weekStart={weekStart}
                      />
                    </>
                  )}
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

/* ── Inline day editor ── */
interface DayEditorProps {
  dayIndex: number;
  languageCode: string;
  initial: { focus: string; emoji: string; title: string; description: string; tasks: string[] };
  onSave: (plan: { focus: string; emoji: string; title: string; description: string; tasks: string[] }) => void;
  onCancel: () => void;
  onReset: () => void;
  isCustom: boolean;
}

function DayEditor({ initial, onSave, onCancel, onReset, isCustom }: DayEditorProps) {
  const [focus, setFocus] = useState(initial.focus);
  const [emoji, setEmoji] = useState(initial.emoji);
  const [title, setTitle] = useState(initial.title);
  const [description, setDescription] = useState(initial.description);
  const [tasks, setTasks] = useState<string[]>([...initial.tasks]);

  const updateTask = (idx: number, value: string) => {
    const copy = [...tasks];
    copy[idx] = value;
    setTasks(copy);
  };

  const removeTask = (idx: number) => {
    setTasks(tasks.filter((_, i) => i !== idx));
  };

  const addTask = () => {
    setTasks([...tasks, ""]);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-3"
    >
      <div className="grid grid-cols-[auto_1fr] gap-2">
        <Input
          value={emoji}
          onChange={(e) => setEmoji(e.target.value)}
          className="h-8 w-12 text-center text-lg rounded-xl px-1"
          maxLength={4}
        />
        <Input
          value={focus}
          onChange={(e) => setFocus(e.target.value)}
          placeholder="Focus (e.g. Listening)"
          className="h-8 text-xs font-bold rounded-xl"
        />
      </div>
      <Input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Title (e.g. Tuning In)"
        className="h-8 text-xs rounded-xl"
      />
      <Input
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Description"
        className="h-8 text-xs rounded-xl"
      />

      <div className="space-y-2">
        <p className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider">Tasks</p>
        {tasks.map((task, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <Input
              value={task}
              onChange={(e) => updateTask(idx, e.target.value)}
              placeholder={`Task ${idx + 1}`}
              className="h-8 text-xs rounded-xl flex-1"
            />
            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive" onClick={() => removeTask(idx)}>
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        ))}
        <button onClick={addTask} className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground hover:text-foreground transition-colors">
          <Plus className="w-3 h-3" />
          Add task
        </button>
      </div>

      <div className="flex items-center gap-2 pt-1">
        <Button size="sm" className="h-8 text-xs font-bold rounded-xl" onClick={() => onSave({ focus, emoji, title, description, tasks: tasks.filter((t) => t.trim()) })}>
          Save
        </Button>
        <Button variant="outline" size="sm" className="h-8 text-xs font-bold rounded-xl" onClick={onCancel}>
          Cancel
        </Button>
        {isCustom && (
          <Button variant="ghost" size="sm" className="h-8 text-xs font-bold rounded-xl text-muted-foreground ml-auto" onClick={onReset}>
            <RotateCcw className="w-3 h-3 mr-1" />
            Reset
          </Button>
        )}
      </div>
    </motion.div>
  );
}
