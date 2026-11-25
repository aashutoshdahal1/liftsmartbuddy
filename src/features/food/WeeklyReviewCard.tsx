import { motion } from "framer-motion";
import { ArrowDown, ArrowUp, CalendarDays, CheckCircle2, Minus, RefreshCw, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { aiApi, type WeeklyReviewRes } from "@/lib/api";

const ACTION_COLORS = {
  add:      "text-emerald-500 bg-emerald-500/10",
  remove:   "text-red-400 bg-red-400/10",
  increase: "text-blue-400 bg-blue-400/10",
  decrease: "text-amber-400 bg-amber-400/10",
};

const ACTION_LABELS = {
  add: "+ Add",
  remove: "− Remove",
  increase: "↑ More",
  decrease: "↓ Less",
};

function StatPill({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="flex flex-col items-center rounded-2xl bg-elevated px-3 py-2 min-w-[72px]">
      <span className="text-xs font-bold tabular-nums">{value}</span>
      <span className="text-[9px] text-muted-foreground leading-tight text-center">{label}</span>
      {sub && <span className="text-[9px] text-muted-foreground/60">{sub}</span>}
    </div>
  );
}

export function WeeklyReviewCard() {
  const [data, setData] = useState<WeeklyReviewRes | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await aiApi.weeklyReview();
      setData(res);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Stagger after food/workout suggestion calls to avoid shared TPM rate limit
    const t = setTimeout(load, 3000);
    return () => clearTimeout(t);
  }, []);

  if (loading) {
    return (
      <div className="surface-card rounded-3xl p-5 space-y-3 animate-pulse">
        <div className="flex items-center gap-3">
          <div className="size-8 rounded-2xl bg-muted shrink-0" />
          <div className="space-y-1.5 flex-1">
            <div className="h-3.5 w-32 rounded bg-muted" />
            <div className="h-3 w-48 rounded bg-muted" />
          </div>
        </div>
        <div className="h-3 w-full rounded bg-muted" />
        <div className="h-3 w-4/5 rounded bg-muted" />
        <div className="flex gap-2">
          {[1,2,3,4].map(i => <div key={i} className="h-10 w-16 rounded-2xl bg-muted" />)}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="surface-card rounded-3xl p-5 space-y-2">
        <p className="text-sm text-muted-foreground">Couldn't load weekly review.</p>
        <p className="text-xs text-destructive/80 font-mono break-all">{error}</p>
        <button onClick={load} className="text-xs text-primary underline">Retry</button>
      </div>
    );
  }

  if (!data?.review) {
    return (
      <div className="surface-card rounded-3xl p-5 flex items-start gap-3">
        <span className="grid size-8 place-items-center rounded-2xl bg-muted shrink-0">
          <CalendarDays className="size-4 text-muted-foreground" />
        </span>
        <div>
          <p className="text-sm font-semibold">Weekly review not ready</p>
          <p className="text-xs text-muted-foreground mt-0.5">{data?.message ?? "Log at least 2 days of food to unlock your weekly review."}</p>
        </div>
      </div>
    );
  }

  const { review, stats } = data;
  const adj = review.adjustment;

  const dirIcon = adj.direction === "increase"
    ? <ArrowUp className="size-3.5" />
    : adj.direction === "decrease"
    ? <ArrowDown className="size-3.5" />
    : <Minus className="size-3.5" />;

  const dirColor = adj.direction === "increase"
    ? "text-blue-400 bg-blue-400/12"
    : adj.direction === "decrease"
    ? "text-amber-400 bg-amber-400/12"
    : "text-emerald-400 bg-emerald-400/12";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="surface-card rounded-3xl p-5 space-y-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-2xl gradient-primary text-primary-foreground shrink-0">
            <Sparkles className="size-4" />
          </span>
          <div>
            <p className="text-sm font-bold">Weekly review</p>
            <p className="text-[10px] text-muted-foreground">{stats?.daysLogged ?? 7}/7 days logged · next-week plan</p>
          </div>
        </div>
        <button
          onClick={load}
          className="flex items-center gap-1.5 rounded-2xl bg-elevated px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Refresh weekly review"
        >
          <RefreshCw className="size-3.5" />
          Refresh
        </button>
      </div>

      {/* This week stats */}
      {stats && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          <StatPill label="Avg cal" value={stats.avgCal.toLocaleString()} sub={`/ ${stats.targetCal.toLocaleString()}`} />
          <StatPill label="Avg protein" value={`${stats.avgProtein}g`} />
          <StatPill label="Avg carbs" value={`${stats.avgCarbs}g`} />
          <StatPill label="Avg fat" value={`${stats.avgFat}g`} />
          {stats.weightDeltaKg !== null && stats.weightDeltaKg !== undefined && (
            <StatPill
              label="Weight Δ"
              value={`${stats.weightDeltaKg >= 0 ? "+" : ""}${stats.weightDeltaKg}kg`}
              sub="this week"
            />
          )}
        </div>
      )}

      {/* Summary */}
      <p className="text-xs leading-relaxed text-muted-foreground">{review.weekSummary}</p>

      {/* Calorie adjustment call-out */}
      <div className={`flex items-start gap-3 rounded-2xl px-4 py-3 ${dirColor}`}>
        <span className="mt-0.5 shrink-0">{dirIcon}</span>
        <div>
          <p className="text-sm font-bold">
            {adj.direction === "maintain"
              ? `Keep at ${adj.targetCalories.toLocaleString()} kcal`
              : `${adj.direction === "increase" ? "Increase to" : "Cut to"} ${adj.targetCalories.toLocaleString()} kcal`}
            {adj.deltaCalories !== 0 && (
              <span className="ml-1.5 text-xs font-normal opacity-70">
                ({adj.deltaCalories > 0 ? "+" : ""}{adj.deltaCalories} kcal/day)
              </span>
            )}
          </p>
          <p className="text-xs opacity-80 mt-0.5">{adj.reason}</p>
        </div>
      </div>

      {/* Macro targets for next week */}
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">Next week macros</p>
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Protein", value: review.macroTargets.protein, color: "bg-violet-500" },
            { label: "Carbs",   value: review.macroTargets.carbs,   color: "bg-amber-500" },
            { label: "Fat",     value: review.macroTargets.fat,      color: "bg-emerald-500" },
          ].map((m) => (
            <div key={m.label} className="rounded-2xl bg-elevated px-3 py-2 text-center">
              <div className={`mx-auto mb-1.5 h-1 w-8 rounded-full ${m.color}`} />
              <p className="text-sm font-bold tabular-nums">{m.value}g</p>
              <p className="text-[9px] text-muted-foreground">{m.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Food changes */}
      {review.foodChanges.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground mb-2">Food changes</p>
          <ul className="space-y-2">
            {review.foodChanges.map((fc, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span className={`shrink-0 rounded-lg px-1.5 py-0.5 text-[10px] font-bold ${ACTION_COLORS[fc.action]}`}>
                  {ACTION_LABELS[fc.action]}
                </span>
                <div className="min-w-0">
                  <span className="text-xs font-semibold">{fc.food}</span>
                  <span className="text-xs text-muted-foreground"> — {fc.detail}</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Focus for next 2-3 days */}
      <div className="flex items-start gap-2.5 rounded-2xl bg-primary/8 px-4 py-3">
        <CheckCircle2 className="size-4 shrink-0 text-primary mt-0.5" />
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-primary mb-0.5">Focus next 2-3 days</p>
          <p className="text-xs leading-relaxed">{review.focusNextDays}</p>
        </div>
      </div>
    </motion.div>
  );
}
