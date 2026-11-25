import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ChevronUp, RefreshCw, Scale, Sparkles, Utensils } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { suggestMeal, getSubstitutes, type SuggestedFood } from "@/lib/meal-suggestion-engine";
import type { FoodItem, Meal } from "@/lib/mock-data";
import { useAppDispatch, useAppSelector } from "@/store";
import { addFood } from "@/store/nutritionSlice";
import { computeTargets } from "@/store/profileSlice";
import { useCalorieAdjustment } from "@/lib/calorie-adjustment";
import { nutritionApi } from "@/lib/api";

function MacroPill({ label, value, unit, color }: { label: string; value: number; unit: string; color: string }) {
  return (
    <div className={`flex flex-col items-center rounded-xl px-2.5 py-1.5 ${color}`}>
      <span className="text-[10px] font-bold tabular-nums">{value}{unit}</span>
      <span className="text-[9px] opacity-70">{label}</span>
    </div>
  );
}

function SubstituteRow({
  substitute,
  original,
  onSwap,
}: {
  substitute: FoodItem;
  original: SuggestedFood;
  onSwap: (food: FoodItem) => void;
}) {
  return (
    <button
      onClick={() => onSwap(substitute)}
      className="flex w-full items-center justify-between gap-2 rounded-xl bg-elevated px-3 py-2 text-left transition-colors hover:bg-muted"
    >
      <span className="text-xs font-medium">{substitute.name}</span>
      <span className="shrink-0 text-[10px] text-muted-foreground">
        {substitute.protein}g P · {substitute.calories} kcal / {substitute.serving}
      </span>
    </button>
  );
}

function SuggestedFoodRow({
  item,
  onSwapWith,
}: {
  item: SuggestedFood;
  onSwapWith: (original: SuggestedFood, replacement: FoodItem) => void;
}) {
  const [showSubs, setShowSubs] = useState(false);
  const substitutes = useMemo(() => getSubstitutes(item.food, 3), [item.food.id]);

  return (
    <div className="rounded-2xl bg-elevated overflow-hidden">
      <div className="flex items-center justify-between gap-3 p-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold truncate">{item.food.name}</p>
          <p className="text-xs text-muted-foreground">
            {item.isGrams ? `${item.grams} g` : `${item.grams} serving`}
          </p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <MacroPill label="cal"  value={item.scaled.calories} unit=""   color="bg-orange-500/10 text-orange-500" />
          <MacroPill label="prot" value={Math.round(item.scaled.protein)} unit="g" color="bg-violet-500/10 text-violet-500" />
        </div>
        {substitutes.length > 0 && (
          <button
            onClick={() => setShowSubs((v) => !v)}
            className="ml-1 flex items-center gap-1 rounded-xl bg-muted px-2 py-1.5 text-[10px] font-semibold text-muted-foreground hover:text-foreground transition-colors shrink-0"
          >
            Swap {showSubs ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
          </button>
        )}
      </div>

      <AnimatePresence>
        {showSubs && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-border/50 overflow-hidden"
          >
            <div className="space-y-1 p-2">
              <p className="px-1 text-[10px] font-bold uppercase tracking-wide text-muted-foreground mb-1.5">
                Swap with
              </p>
              {substitutes.map((sub) => (
                <SubstituteRow
                  key={sub.id}
                  substitute={sub}
                  original={item}
                  onSwap={(food) => { onSwapWith(item, food); setShowSubs(false); }}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DataGateCard({ weightCount, hasFoodLog }: { weightCount: number; hasFoodLog: boolean }) {
  const steps = [
    {
      done: weightCount >= 7,
      icon: Scale,
      label: "7 days of weight logs",
      detail: weightCount > 0 ? `${weightCount}/7 entries logged` : "Start logging your weight daily",
    },
    {
      done: hasFoodLog,
      icon: Utensils,
      label: "At least 1 food log this week",
      detail: hasFoodLog ? "Done" : "Log a meal today to get started",
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="surface-card rounded-3xl p-5"
    >
      <div className="flex items-center gap-2.5 mb-4">
        <span className="grid size-9 shrink-0 place-items-center rounded-2xl gradient-primary text-primary-foreground">
          <Sparkles className="size-4" />
        </span>
        <div>
          <p className="text-sm font-bold">Personalised meal suggestions</p>
          <p className="text-[11px] text-muted-foreground">Complete these steps to unlock</p>
        </div>
      </div>

      <div className="space-y-3">
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <div key={step.label} className="flex items-center gap-3">
              <span className={`grid size-8 shrink-0 place-items-center rounded-xl ${
                step.done ? "bg-emerald-500/15 text-emerald-500" : "bg-muted text-muted-foreground"
              }`}>
                {step.done
                  ? <Sparkles className="size-3.5" />
                  : <Icon className="size-3.5" />}
              </span>
              <div className="min-w-0 flex-1">
                <p className={`text-xs font-semibold ${step.done ? "text-emerald-500 line-through" : ""}`}>
                  {step.label}
                </p>
                <p className="text-[10px] text-muted-foreground">{step.detail}</p>
              </div>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                step.done
                  ? "bg-emerald-500/15 text-emerald-500"
                  : "bg-muted text-muted-foreground"
              }`}>
                {step.done ? "Done" : "Pending"}
              </span>
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-[11px] text-muted-foreground leading-relaxed">
        LiftSmart needs your weight trend to know if you're on track for your goal before it can suggest the right foods and quantities.
      </p>
    </motion.div>
  );
}

export function MealSuggestionCard() {
  const dispatch = useAppDispatch();
  const nutrition = useAppSelector((s) => s.nutrition);
  const profile   = useAppSelector((s) => s.profile);
  const weightEntries = useAppSelector((s) => s.weight.entries);
  const latestWeight  = weightEntries[weightEntries.length - 1];
  const adj = useCalorieAdjustment();

  // Gate checks — computed before any early return
  const weightCount = weightEntries.length;
  const totalItemsToday = nutrition.meals.reduce((n, m) => n + m.items.length, 0);
  const hasFoodLog = totalItemsToday > 0;
  const hasEnoughData = weightCount >= 7 && hasFoodLog;

  const targets = {
    ...computeTargets(latestWeight ? { ...profile, weightKg: latestWeight.kg } : profile),
    calories: adj.adjustedTarget,
  };

  const remaining = {
    calories: Math.max(0, targets.calories  - Math.round(nutrition.consumed.calories)),
    protein:  Math.max(0, targets.protein   - Math.round(nutrition.consumed.protein)),
    carbs:    Math.max(0, targets.carbs     - Math.round(nutrition.consumed.carbs)),
    fat:      Math.max(0, targets.fat       - Math.round(nutrition.consumed.fat)),
  };

  const loggedNames = useMemo(() =>
    nutrition.meals.flatMap((m) => m.items.map((i) => i.name.toLowerCase())),
    [nutrition.meals]
  );

  const [seed, setSeed] = useState(0);

  const suggestion = useMemo(
    () => suggestMeal(remaining, profile.goal, loggedNames),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [seed, remaining.calories, remaining.protein, profile.goal]
  );

  const [items, setItems] = useState<SuggestedFood[]>([]);

  // Sync items when suggestion changes — useEffect avoids calling setState during render
  useMemo(() => {
    if (suggestion) setItems(suggestion.items);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suggestion]);

  // Gate: render after all hooks
  if (!hasEnoughData) {
    return <DataGateCard weightCount={weightCount} hasFoodLog={hasFoodLog} />;
  }

  function handleSwap(original: SuggestedFood, replacement: FoodItem) {
    // Re-scale replacement to roughly the same calorie contribution
    const calTarget = original.scaled.calories;
    const base = replacement.serving.match(/^(\d+(?:\.\d+)?)\s*g\b/);
    const baseG = base ? parseFloat(base[1]!) : null;
    let newItem: SuggestedFood;
    if (baseG) {
      const factor = calTarget / replacement.calories;
      const targetG = Math.max(50, Math.min(Math.round((baseG * factor) / 25) * 25, 400));
      const f = targetG / baseG;
      newItem = {
        food: replacement,
        grams: targetG,
        isGrams: true,
        scaled: {
          calories: Math.round(replacement.calories * f),
          protein:  Math.round(replacement.protein  * f * 10) / 10,
          carbs:    Math.round(replacement.carbs    * f * 10) / 10,
          fat:      Math.round(replacement.fat      * f * 10) / 10,
        },
      };
    } else {
      newItem = {
        food: replacement,
        grams: 1,
        isGrams: false,
        scaled: {
          calories: replacement.calories,
          protein:  replacement.protein,
          carbs:    replacement.carbs,
          fat:      replacement.fat,
        },
      };
    }
    setItems((prev) => prev.map((i) => (i.food.id === original.food.id ? newItem : i)));
  }

  async function logAll() {
    const slot: Meal["slot"] = (() => {
      const h = new Date().getHours();
      if (h < 10) return "Breakfast";
      if (h < 14) return "Lunch";
      if (h < 18) return "Snack";
      return "Dinner";
    })();

    for (const item of items) {
      const foodItem: FoodItem = {
        ...item.food,
        id: `${item.food.id}-sug-${Date.now()}-${Math.random()}`,
        serving: item.isGrams ? `${item.grams} g` : item.food.serving,
        calories: item.scaled.calories,
        protein:  item.scaled.protein,
        carbs:    item.scaled.carbs,
        fat:      item.scaled.fat,
      };
      dispatch(addFood({ slot, item: foodItem }));
      try {
        await nutritionApi.addFood(slot, foodItem);
      } catch {
        // local state already updated — sync failure is non-critical
      }
    }
    toast.success(`${items.length} items logged to ${slot}`);
  }

  if (remaining.calories < 50) return null;

  if (!suggestion || items.length === 0) return null;

  const totalCal = items.reduce((s, i) => s + i.scaled.calories, 0);
  const totalPro = items.reduce((s, i) => s + i.scaled.protein, 0);
  const totalCarb = items.reduce((s, i) => s + i.scaled.carbs, 0);
  const totalFat  = items.reduce((s, i) => s + i.scaled.fat, 0);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="surface-card rounded-3xl overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-5 pt-5 pb-3">
        <div className="flex items-center gap-2.5">
          <span className="grid size-9 shrink-0 place-items-center rounded-2xl gradient-primary text-primary-foreground">
            <Utensils className="size-4" />
          </span>
          <div>
            <p className="text-sm font-bold">What to eat next</p>
            <p className="text-[11px] text-muted-foreground">
              {remaining.calories >= 850
                ? `${remaining.calories.toLocaleString()} kcal remaining · showing a single meal`
                : `${remaining.calories.toLocaleString()} kcal · ${remaining.protein}g protein remaining`}
            </p>
          </div>
        </div>
        <button
          onClick={() => setSeed((s) => s + 1)}
          className="flex items-center gap-1.5 rounded-2xl bg-elevated px-3 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
          aria-label="Regenerate suggestion"
        >
          <RefreshCw className="size-3.5" />
          Refresh
        </button>
      </div>

      {/* Food rows */}
      <div className="space-y-2 px-4 pb-4">
        {items.map((item) => (
          <SuggestedFoodRow
            key={item.food.id}
            item={item}
            onSwapWith={handleSwap}
          />
        ))}
      </div>

      {/* Totals + Log button */}
      <div className="flex items-center justify-between gap-3 border-t border-border bg-elevated/60 px-5 py-3">
        <div className="flex gap-2">
          <MacroPill label="cal"   value={totalCal}               unit=""   color="bg-orange-500/10 text-orange-500" />
          <MacroPill label="prot"  value={Math.round(totalPro)}   unit="g"  color="bg-violet-500/10 text-violet-500" />
          <MacroPill label="carbs" value={Math.round(totalCarb)}  unit="g"  color="bg-amber-500/10 text-amber-500" />
          <MacroPill label="fat"   value={Math.round(totalFat)}   unit="g"  color="bg-emerald-500/10 text-emerald-500" />
        </div>
        <button
          onClick={logAll}
          className="flex items-center gap-1.5 rounded-2xl gradient-primary px-4 py-2 text-xs font-bold text-primary-foreground transition-opacity hover:opacity-90"
        >
          <Sparkles className="size-3.5" />
          Log this meal
        </button>
      </div>
    </motion.div>
  );
}
