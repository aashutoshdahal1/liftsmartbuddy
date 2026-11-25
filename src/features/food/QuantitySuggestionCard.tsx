import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, CheckCircle2, RefreshCw, Scale, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useCalorieAdjustment } from "@/lib/calorie-adjustment";
import { analyzeQuantities, type QuantitySuggestion } from "@/lib/quantity-suggestion-engine";
import { nutritionApi } from "@/lib/api";
import { useAppSelector } from "@/store";
import type { FoodItem } from "@/lib/mock-data";

function SkeletonRow() {
  return (
    <div className="rounded-2xl bg-elevated p-4 space-y-2 animate-pulse">
      <div className="h-4 w-1/2 rounded bg-muted" />
      <div className="h-3 w-3/4 rounded bg-muted" />
    </div>
  );
}

function SuggestionRow({ s, onDismiss }: { s: QuantitySuggestion; onDismiss: () => void }) {
  const isReduce = s.deltaGrams < 0;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="rounded-2xl bg-elevated overflow-hidden"
    >
      <div className="flex items-start gap-3 p-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-sm font-semibold capitalize">{s.foodName}</span>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              isReduce ? "bg-amber-500/15 text-amber-500" : "bg-blue-500/15 text-blue-500"
            }`}>
              {isReduce ? "Reduce" : "Increase"}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm mb-2">
            <span className="font-semibold tabular-nums text-muted-foreground">{s.currentAvgGrams}g</span>
            <ArrowRight className="size-3.5 shrink-0 text-muted-foreground" />
            <span className="font-bold tabular-nums text-primary">{s.suggestedGrams}g</span>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            {isReduce
              ? `Saves ~${Math.abs(s.deltaCalories)} kcal/day · try for ${s.applyDays} days`
              : `Adds ~${Math.abs(s.deltaCalories)} kcal/day · try for ${s.applyDays} days`}
          </p>
          <p className="mt-1 text-[10px] text-muted-foreground/70 leading-relaxed">{s.reason}</p>
        </div>
        <button
          onClick={onDismiss}
          className="shrink-0 mt-0.5 grid size-6 place-items-center rounded-lg text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Dismiss suggestion"
        >
          <X className="size-3.5" />
        </button>
      </div>
    </motion.div>
  );
}

export function QuantitySuggestionCard() {
  const profile = useAppSelector((s) => s.profile);
  const adj = useCalorieAdjustment();

  const [loading, setLoading] = useState(true);
  const [suggestions, setSuggestions] = useState<QuantitySuggestion[]>([]);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [onTrack, setOnTrack] = useState(false);

  async function load() {
    setLoading(true);
    setDismissed(new Set());
    try {
      const today = new Date();
      const dailyLogs: FoodItem[][] = [];

      for (let i = 6; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        const date = d.toISOString().slice(0, 10);
        try {
          const { log } = await nutritionApi.get(date);
          const items = log?.meals?.flatMap((m: { items: FoodItem[] }) => m.items) ?? [];
          dailyLogs.push(items);
        } catch {
          dailyLogs.push([]);
        }
      }

      const result = analyzeQuantities(
        dailyLogs,
        profile.goal,
        adj.weeklyRateKg,
        adj.adjustedTarget,
      );

      setSuggestions(result);
      setOnTrack(result.length === 0);
    } catch {
      setSuggestions([]);
      setOnTrack(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  const visible = suggestions.filter((s) => !dismissed.has(s.foodName));

  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-2xl bg-muted text-muted-foreground">
            <Scale className="size-4" />
          </span>
          <div>
            <p className="text-sm font-bold">Weekly quantity analysis</p>
            <p className="text-[10px] text-muted-foreground">Based on your last 7 days</p>
          </div>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-2xl bg-elevated px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
          aria-label="Refresh quantity analysis"
        >
          <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      <div className="surface-card rounded-3xl p-4 space-y-2">
        {loading && (
          <>
            <SkeletonRow />
            <SkeletonRow />
          </>
        )}

        {!loading && (onTrack || visible.length === 0) && (
          <div className="flex items-center gap-2.5 py-2">
            <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
            <p className="text-sm text-emerald-500 font-medium">You're on track — no quantity changes needed.</p>
          </div>
        )}

        {!loading && visible.length > 0 && (
          <AnimatePresence>
            {visible.map((s) => (
              <SuggestionRow
                key={s.foodName}
                s={s}
                onDismiss={() => setDismissed((prev) => new Set([...prev, s.foodName]))}
              />
            ))}
          </AnimatePresence>
        )}
      </div>
    </section>
  );
}
