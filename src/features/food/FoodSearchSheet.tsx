import { AnimatePresence, motion } from "framer-motion";
import {
  Check, ChevronLeft, Heart, Plus, Search, Sparkles, Trash2, X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { FOOD_DB } from "@/lib/food-database";
import { type FoodItem, type Meal } from "@/lib/mock-data";
import { useAppDispatch, useAppSelector } from "@/store";
import { addFood } from "@/store/nutritionSlice";
import { saveCustomFood, addFavorite, removeFavorite, removeCustomFood } from "@/store/foodLibrarySlice";
import { nutritionApi, aiApi } from "@/lib/api";

const MEAL_SLOTS: { slot: Meal["slot"]; emoji: string; time: string }[] = [
  { slot: "Breakfast", emoji: "🌅", time: "7–10 AM" },
  { slot: "Lunch",     emoji: "🥗", time: "12–2 PM" },
  { slot: "Dinner",    emoji: "🍽️", time: "6–9 PM"  },
  { slot: "Snack",     emoji: "🥤", time: "Any time" },
];

type Category = "All" | "Protein" | "Carbs" | "Fats" | "Dairy" | "Veggies" | "Meals";
const CATEGORIES: Category[] = ["All", "Protein", "Carbs", "Fats", "Dairy", "Veggies", "Meals"];

function categorise(item: FoodItem): Category[] {
  const n = item.name.toLowerCase();
  const cats: Category[] = [];
  if (item.protein >= 15) cats.push("Protein");
  if (item.carbs >= 20) cats.push("Carbs");
  if (item.fat >= 8) cats.push("Fats");
  if (/milk|yogurt|cheese|paneer|curd|whey|dairy/.test(n)) cats.push("Dairy");
  if (/salad|broccoli|spinach|carrot|vegetable|veggie|greens|lettuce|kale|cucumber|tomato|zucchini/.test(n)) cats.push("Veggies");
  if (/rice|pasta|pizza|burger|wrap|sandwich|biryani|curry|meal|bowl/.test(n)) cats.push("Meals");
  return cats.length ? cats : ["Carbs"];
}

interface Props {
  open: boolean;
  slot: Meal["slot"] | null;
  onClose: () => void;
}

// ── Healthify-style food card ─────────────────────────────────────────────────
function FoodCard({
  item,
  isFav,
  onToggleFav,
  onSelect,
}: {
  item: FoodItem;
  isFav?: boolean;
  onToggleFav?: () => void;
  onSelect: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-elevated px-4 py-3">
      <button onClick={onSelect} className="min-w-0 flex-1 text-left">
        <p className="truncate text-sm font-semibold leading-snug">{item.name}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{item.serving}</p>
        {/* Macro pills */}
        <div className="mt-2 flex flex-wrap gap-1.5">
          <span className="rounded-full bg-orange-500/12 px-2 py-0.5 text-[10px] font-bold text-orange-500 tabular-nums">
            {item.calories} kcal
          </span>
          <span className="rounded-full bg-blue-500/12 px-2 py-0.5 text-[10px] font-bold text-blue-400 tabular-nums">
            P {item.protein}g
          </span>
          <span className="rounded-full bg-amber-500/12 px-2 py-0.5 text-[10px] font-bold text-amber-400 tabular-nums">
            C {item.carbs}g
          </span>
          <span className="rounded-full bg-emerald-500/12 px-2 py-0.5 text-[10px] font-bold text-emerald-400 tabular-nums">
            F {item.fat}g
          </span>
        </div>
      </button>

      <div className="flex shrink-0 items-center gap-2">
        {onToggleFav && (
          <button
            onClick={(e) => { e.stopPropagation(); onToggleFav(); }}
            className={`grid size-8 place-items-center rounded-xl transition-colors ${
              isFav ? "text-rose-400 bg-rose-400/10" : "text-muted-foreground hover:text-rose-400"
            }`}
            aria-label={isFav ? "Remove favourite" : "Add to favourites"}
          >
            <Heart className={`size-3.5 ${isFav ? "fill-current" : ""}`} />
          </button>
        )}
        <button
          onClick={onSelect}
          className="grid size-9 place-items-center rounded-xl bg-emerald-500 text-white shadow-sm hover:bg-emerald-600 active:scale-95 transition-all"
          aria-label={`Add ${item.name}`}
        >
          <Plus className="size-4" />
        </button>
      </div>
    </div>
  );
}

// ── Detail bottom sheet (Healthify-style) ─────────────────────────────────────
function DetailSheet({
  item,
  isFav,
  onToggleFav,
  onAdd,
  onClose,
}: {
  item: FoodItem;
  isFav?: boolean;
  onToggleFav?: () => void;
  onAdd: (scaled: FoodItem) => void;
  onClose: () => void;
}) {
  const isGrams = /\d+\s*g\b/.test(item.serving);
  const baseGrams = isGrams ? parseFloat(item.serving) || 100 : null;
  const [qty, setQty] = useState(baseGrams ?? 1);
  const [isCheat, setIsCheat] = useState(false);
  const [cheatName, setCheatName] = useState("");

  const factor = baseGrams !== null ? qty / baseGrams : qty;
  const scaled: FoodItem = {
    ...item,
    id: `${item.id}-${Date.now()}`,
    serving: baseGrams !== null ? `${qty} g` : `${qty} serving${qty !== 1 ? "s" : ""}`,
    calories: Math.round(item.calories * factor),
    protein:  Math.round(item.protein  * factor * 10) / 10,
    carbs:    Math.round(item.carbs    * factor * 10) / 10,
    fat:      Math.round(item.fat      * factor * 10) / 10,
    ...(isCheat ? { isCheatMeal: true as const } : {}),
    ...(isCheat && cheatName.trim() ? { cheatMealName: cheatName.trim() } : {}),
  };

  // Macro bar widths (relative to max macro)
  const macroMax = Math.max(scaled.protein, scaled.carbs, scaled.fat, 1);
  const macros = [
    { label: "Protein", val: scaled.protein, color: "bg-blue-400",    unit: "g" },
    { label: "Carbs",   val: scaled.carbs,   color: "bg-amber-400",   unit: "g" },
    { label: "Fat",     val: scaled.fat,     color: "bg-emerald-400", unit: "g" },
  ];

  return (
    <>
      {/* Backdrop — dismiss detail sheet */}
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[70] bg-black/40"
        onClick={onClose}
      />
      <motion.div
        initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
        transition={{ type: "spring", stiffness: 320, damping: 34 }}
        className="fixed bottom-0 left-0 right-0 z-[71] rounded-t-3xl bg-card px-5 pb-safe-bottom"
      >
        <div className="mx-auto mt-3 mb-4 h-1 w-10 rounded-full bg-muted" />

        {/* Food name + fav */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="min-w-0">
            <h3 className="font-display text-lg font-bold leading-tight">{item.name}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">per {item.serving}</p>
          </div>
          {onToggleFav && (
            <button
              onClick={onToggleFav}
              className={`mt-0.5 grid size-9 place-items-center rounded-xl transition-colors ${
                isFav ? "text-rose-400 bg-rose-400/10" : "text-muted-foreground hover:text-rose-400"
              }`}
            >
              <Heart className={`size-4 ${isFav ? "fill-current" : ""}`} />
            </button>
          )}
        </div>

        {/* Calorie highlight */}
        <div className="mb-4 flex items-baseline gap-2">
          <span className="font-display text-4xl font-bold tabular-nums">{scaled.calories}</span>
          <span className="text-base text-muted-foreground">kcal</span>
        </div>

        {/* Macro bars */}
        <div className="mb-5 space-y-2.5">
          {macros.map((m) => (
            <div key={m.label} className="flex items-center gap-3">
              <span className="w-14 text-xs text-muted-foreground">{m.label}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${(m.val / macroMax) * 100}%` }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                  className={`h-full rounded-full ${m.color}`}
                />
              </div>
              <span className="w-10 text-right text-xs font-semibold tabular-nums">
                {m.val}{m.unit}
              </span>
            </div>
          ))}
        </div>

        {/* Weight input */}
        <div className="mb-4">
          <p className="mb-2 text-xs font-semibold text-muted-foreground">
            {baseGrams !== null ? "Amount (g)" : `Servings (1 serving = ${item.serving})`}
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setQty((q) => Math.max(baseGrams !== null ? 10 : 1, q - (baseGrams !== null ? 25 : 1)))}
              className="grid size-11 shrink-0 place-items-center rounded-2xl bg-muted text-lg font-bold text-muted-foreground hover:text-foreground transition-colors"
            >
              −
            </button>
            <input
              type="number"
              inputMode="decimal"
              value={qty}
              onChange={(e) => {
                const v = parseFloat(e.target.value);
                if (!isNaN(v) && v > 0) setQty(v);
                else if (e.target.value === "") setQty(0);
              }}
              onBlur={(e) => {
                const v = parseFloat(e.target.value);
                setQty(Math.max(1, isNaN(v) ? (baseGrams ?? 1) : v));
              }}
              className="h-11 flex-1 rounded-2xl bg-muted text-center text-lg font-bold tabular-nums text-foreground border-0 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
            />
            <button
              onClick={() => setQty((q) => q + (baseGrams !== null ? 25 : 1))}
              className="grid size-11 shrink-0 place-items-center rounded-2xl bg-muted text-lg font-bold text-muted-foreground hover:text-foreground transition-colors"
            >
              +
            </button>
          </div>
          {/* Quick amounts */}
          <div className="mt-2 flex gap-2">
            {(baseGrams !== null ? [50, 100, 150, 200, 250] : [1, 2, 3, 4, 5]).map((w) => (
              <button
                key={w}
                onClick={() => setQty(w)}
                className={`flex-1 rounded-xl py-1.5 text-xs font-semibold transition-colors ${
                  qty === w ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {w}
              </button>
            ))}
          </div>
        </div>

        {/* Cheat meal toggle */}
        <div className="mb-5 space-y-2">
          <div className="flex items-center justify-between gap-3">
            <span className="text-xs font-semibold text-muted-foreground">🍕 Cheat meal?</span>
            <Switch checked={isCheat} onCheckedChange={setIsCheat} aria-label="Mark as cheat meal" />
          </div>
          {isCheat && (
            <Input
              value={cheatName}
              onChange={(e) => setCheatName(e.target.value)}
              placeholder="e.g. Domino's pizza (optional)"
              className="h-9 rounded-xl bg-muted text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
            />
          )}
        </div>

        {/* Add button */}
        <button
          onClick={() => onAdd(scaled)}
          className={`mb-4 flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold transition-opacity hover:opacity-90 ${
            isCheat ? "bg-orange-500 text-white" : "bg-emerald-500 text-white"
          }`}
        >
          <Check className="size-4" />
          {isCheat ? "🍕 Add cheat meal" : `Add ${scaled.calories} kcal`}
        </button>
      </motion.div>
    </>
  );
}

// ── Main sheet ─────────────────────────────────────────────────────────────────
export function FoodSearchSheet({ open, slot: initialSlot, onClose }: Props) {
  const dispatch = useAppDispatch();
  const { customFoods, favoriteIds, favoriteFoods } = useAppSelector((s) => s.foodLibrary);

  const [selectedSlot, setSelectedSlot] = useState<Meal["slot"] | null>(initialSlot);
  const [isCheatFlow, setIsCheatFlow] = useState(false);
  const [tab, setTab] = useState<"search" | "favourites" | "create">("search");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Category>("All");
  const [selectedItem, setSelectedItem] = useState<FoodItem | null>(null);

  // Create-tab form state
  const [customName, setCustomName] = useState("");
  const [customWeight, setCustomWeight] = useState("");
  const [per100Cal, setPer100Cal] = useState("");
  const [per100Protein, setPer100Protein] = useState("");
  const [per100Carbs, setPer100Carbs] = useState("");
  const [per100Fat, setPer100Fat] = useState("");
  const [customIsCheat, setCustomIsCheat] = useState(false);
  const [customCheatName, setCustomCheatName] = useState("");
  const [estimating, setEstimating] = useState(false);
  const [estimateError, setEstimateError] = useState("");
  const [savedCustomId, setSavedCustomId] = useState<string | null>(null);

  const slot = selectedSlot ?? initialSlot;

  const weightNum = parseFloat(customWeight) || 0;
  const scaledMacros = weightNum > 0 && per100Cal
    ? {
        calories: Math.round((parseFloat(per100Cal) || 0) * weightNum / 100),
        protein:  Math.round((parseFloat(per100Protein) || 0) * weightNum / 100 * 10) / 10,
        carbs:    Math.round((parseFloat(per100Carbs) || 0) * weightNum / 100 * 10) / 10,
        fat:      Math.round((parseFloat(per100Fat) || 0) * weightNum / 100 * 10) / 10,
      }
    : null;

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = q
      ? FOOD_DB.filter((f) => f.name.toLowerCase().includes(q) || f.serving.toLowerCase().includes(q))
      : FOOD_DB.slice(0, 60);
    if (category !== "All") {
      list = list.filter((f) => categorise(f).includes(category));
    }
    return list.slice(0, 40);
  }, [query, category]);

  const allFavourites = useMemo(() => {
    const dbFavs = FOOD_DB.filter((f) => favoriteIds.includes(f.id));
    const customFavs = favoriteFoods.filter((f) => !dbFavs.some((d) => d.id === f.id));
    return [...dbFavs, ...customFavs];
  }, [favoriteIds, favoriteFoods]);

  // Reset on open/close
  useMemo(() => {
    setSelectedSlot(initialSlot);
    setIsCheatFlow(false);
    setQuery("");
    setCategory("All");
    setTab("search");
    setSelectedItem(null);
    setCustomName(""); setCustomWeight("");
    setPer100Cal(""); setPer100Protein(""); setPer100Carbs(""); setPer100Fat("");
    setCustomIsCheat(false); setCustomCheatName("");
    setSavedCustomId(null); setEstimateError("");
  }, [initialSlot, open]);

  async function estimateMacros() {
    if (!customName.trim()) return;
    setEstimating(true);
    setEstimateError("");
    try {
      const { reply } = await aiApi.chat([{
        role: "user",
        content: `Estimate the nutritional values per 100g for "${customName.trim()}".
Reply ONLY with valid JSON, no markdown, no explanation:
{"calories": number, "protein": number, "carbs": number, "fat": number}`,
      }]);
      const match = reply.match(/\{[\s\S]*?\}/);
      if (!match) throw new Error("No JSON in response");
      const macros = JSON.parse(match[0]) as { calories: number; protein: number; carbs: number; fat: number };
      if (typeof macros.calories !== "number") throw new Error("Invalid response");
      setPer100Cal(String(Math.round(macros.calories)));
      setPer100Protein(String(Math.round(macros.protein * 10) / 10));
      setPer100Carbs(String(Math.round(macros.carbs * 10) / 10));
      setPer100Fat(String(Math.round(macros.fat * 10) / 10));
    } catch {
      setEstimateError("Couldn't estimate — check your AI key in Settings or try again.");
    } finally {
      setEstimating(false);
    }
  }

  function saveToLibrary(): string {
    const id = savedCustomId ?? `custom-${customName.trim().toLowerCase().replace(/\s+/g, "-")}-${Date.now()}`;
    setSavedCustomId(id);
    dispatch(saveCustomFood({
      id,
      name: customName.trim(),
      per100g: {
        calories: parseFloat(per100Cal) || 0,
        protein:  parseFloat(per100Protein) || 0,
        carbs:    parseFloat(per100Carbs) || 0,
        fat:      parseFloat(per100Fat) || 0,
      },
      createdAt: new Date().toISOString(),
    }));
    return id;
  }

  function doAdd(item: FoodItem) {
    const targetSlot: Meal["slot"] = isCheatFlow ? "Snack" : (slot ?? "Snack");
    dispatch(addFood({ slot: targetSlot, item }));
    onClose();
    nutritionApi.addFood(targetSlot, item).catch(() => {});
  }

  function addCustom(toFav = false) {
    if (!customName.trim() || !per100Cal || !customWeight) return;
    const id = saveToLibrary();
    const item: FoodItem = {
      id: `${id}-log-${Date.now()}`,
      name: customName.trim(),
      serving: `${customWeight} g`,
      calories: scaledMacros?.calories ?? 0,
      protein:  scaledMacros?.protein  ?? 0,
      carbs:    scaledMacros?.carbs    ?? 0,
      fat:      scaledMacros?.fat      ?? 0,
      ...(customIsCheat ? { isCheatMeal: true as const } : {}),
      ...(customIsCheat && customCheatName.trim() ? { cheatMealName: customCheatName.trim() } : {}),
    };
    if (toFav) {
      dispatch(addFavorite({
        ...item,
        id,
        serving: "100 g",
        calories: parseFloat(per100Cal) || 0,
        protein:  parseFloat(per100Protein) || 0,
        carbs:    parseFloat(per100Carbs) || 0,
        fat:      parseFloat(per100Fat) || 0,
      }));
    }
    doAdd(item);
  }

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Sheet backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Main sheet */}
          <motion.div
            initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 32 }}
            className="fixed bottom-0 left-0 right-0 z-[61] flex h-[92dvh] flex-col rounded-t-3xl bg-card"
          >
            <div className="mx-auto mt-3 h-1 w-10 shrink-0 rounded-full bg-muted" />

            {/* ── Step 1: Slot picker ── */}
            {!selectedSlot && !isCheatFlow ? (
              <>
                {/* Header */}
                <div className="flex shrink-0 items-center justify-between border-b border-border/60 px-5 py-4">
                  <div>
                    <p className="font-display text-base font-bold">Add Meal</p>
                    <p className="text-xs text-muted-foreground">Which meal are you logging?</p>
                  </div>
                  <button onClick={onClose} className="grid size-8 place-items-center rounded-2xl bg-elevated text-muted-foreground">
                    <X className="size-4" />
                  </button>
                </div>
                <div className="p-5 space-y-3 overflow-y-auto">
                  {MEAL_SLOTS.map((m) => (
                    <button
                      key={m.slot}
                      onClick={() => setSelectedSlot(m.slot)}
                      className="flex w-full items-center gap-4 rounded-3xl border border-border bg-elevated px-5 py-4 text-left transition-colors hover:border-emerald-500/40 hover:bg-emerald-500/5"
                    >
                      <span className="text-2xl">{m.emoji}</span>
                      <div>
                        <p className="font-semibold text-sm">{m.slot}</p>
                        <p className="text-xs text-muted-foreground">{m.time}</p>
                      </div>
                      <Plus className="ml-auto size-4 text-muted-foreground" />
                    </button>
                  ))}
                  <button
                    onClick={() => { setIsCheatFlow(true); setCustomIsCheat(true); }}
                    className="flex w-full items-center gap-4 rounded-3xl border border-orange-500/40 bg-orange-500/8 px-5 py-4 text-left transition-colors hover:border-orange-500/70"
                  >
                    <span className="text-2xl">🍕</span>
                    <div>
                      <p className="font-semibold text-sm text-orange-500">Cheat Meal</p>
                      <p className="text-xs text-muted-foreground">Won't affect your weekly trend</p>
                    </div>
                    <Plus className="ml-auto size-4 text-orange-400" />
                  </button>
                </div>
              </>
            ) : isCheatFlow ? (
              /* ── Cheat meal form ── */
              <>
                <div className="flex shrink-0 items-center gap-3 border-b border-border/60 px-5 py-4">
                  <button
                    onClick={() => { setIsCheatFlow(false); setCustomIsCheat(false); setSelectedSlot(null); }}
                    className="grid size-8 place-items-center rounded-2xl bg-elevated text-muted-foreground"
                  >
                    <ChevronLeft className="size-4" />
                  </button>
                  <div className="flex-1">
                    <p className="font-display text-base font-bold">🍕 Log Cheat Meal</p>
                    <p className="text-xs text-muted-foreground">Won't affect your weekly trend</p>
                  </div>
                  <button onClick={onClose} className="grid size-8 place-items-center rounded-2xl bg-elevated text-muted-foreground">
                    <X className="size-4" />
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto px-5 py-5 space-y-4">
                  <div className="rounded-2xl border border-orange-500/30 bg-orange-500/8 px-4 py-3">
                    <p className="text-xs font-semibold text-orange-500">Cheat meal — excluded from weekly trend analysis</p>
                  </div>
                  <div>
                    <Label htmlFor="cheat-name">What did you eat? <span className="text-destructive">*</span></Label>
                    <Input
                      id="cheat-name" value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      placeholder="e.g. Domino's Pepperoni Pizza"
                      className="mt-1.5 h-11 rounded-2xl bg-elevated focus-visible:ring-0 focus-visible:ring-offset-0"
                      autoFocus
                    />
                  </div>
                  <div>
                    <Label htmlFor="cheat-weight">Weight (g) <span className="text-destructive">*</span></Label>
                    <div className="mt-1.5 flex items-center gap-2">
                      <input
                        id="cheat-weight" type="number" inputMode="decimal"
                        value={customWeight} onChange={(e) => setCustomWeight(e.target.value)}
                        placeholder="e.g. 300"
                        className="h-12 flex-1 rounded-2xl bg-elevated text-center text-lg font-bold tabular-nums text-foreground border-0 focus:outline-none focus:ring-2 focus:ring-orange-500/40"
                      />
                      <span className="text-sm font-semibold text-muted-foreground shrink-0">g</span>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label>Macros per 100g</Label>
                      <button
                        type="button" onClick={estimateMacros}
                        disabled={!customName.trim() || estimating}
                        className="flex items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/8 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/15 disabled:opacity-40"
                      >
                        <Sparkles className={`size-3.5 ${estimating ? "animate-pulse" : ""}`} />
                        {estimating ? "Estimating…" : "Fill with AI"}
                      </button>
                    </div>
                    {estimateError && <p className="text-[11px] text-destructive mb-2">{estimateError}</p>}
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { id: "cheat-cal", label: "Calories (kcal)", val: per100Cal,     set: setPer100Cal },
                        { id: "cheat-p",   label: "Protein (g)",     val: per100Protein, set: setPer100Protein },
                        { id: "cheat-c",   label: "Carbs (g)",       val: per100Carbs,   set: setPer100Carbs },
                        { id: "cheat-f",   label: "Fat (g)",         val: per100Fat,     set: setPer100Fat },
                      ].map((f) => (
                        <div key={f.id}>
                          <Label htmlFor={f.id} className="text-xs">{f.label}</Label>
                          <Input
                            id={f.id} type="number" inputMode="decimal"
                            value={f.val} onChange={(e) => f.set(e.target.value)}
                            placeholder="0"
                            className="mt-1 h-11 rounded-2xl bg-elevated text-center focus-visible:ring-0 focus-visible:ring-offset-0"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                  {scaledMacros && (
                    <div className="rounded-2xl bg-orange-500/8 border border-orange-500/20 px-4 py-3">
                      <p className="text-[10px] font-semibold text-orange-400 mb-2">For {customWeight}g</p>
                      <div className="grid grid-cols-4 gap-2 text-center">
                        {[
                          { label: "kcal", val: scaledMacros.calories },
                          { label: "P",    val: `${scaledMacros.protein}g` },
                          { label: "C",    val: `${scaledMacros.carbs}g` },
                          { label: "F",    val: `${scaledMacros.fat}g` },
                        ].map((m) => (
                          <div key={m.label}>
                            <p className="font-bold text-sm tabular-nums">{m.val}</p>
                            <p className="text-[10px] text-muted-foreground">{m.label}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <button
                    onClick={() => {
                      if (!customName.trim() || !customWeight) return;
                      doAdd({
                        id: `cheat-${Date.now()}`,
                        name: customName.trim(),
                        serving: `${customWeight} g`,
                        calories: scaledMacros ? scaledMacros.calories : (parseFloat(per100Cal) || 0),
                        protein:  scaledMacros ? scaledMacros.protein  : (parseFloat(per100Protein) || 0),
                        carbs:    scaledMacros ? scaledMacros.carbs    : (parseFloat(per100Carbs) || 0),
                        fat:      scaledMacros ? scaledMacros.fat      : (parseFloat(per100Fat) || 0),
                        isCheatMeal: true,
                        cheatMealName: customName.trim(),
                      });
                    }}
                    disabled={!customName.trim() || !customWeight}
                    className="flex w-full items-center justify-center gap-2 rounded-2xl bg-orange-500 py-3 text-sm font-semibold text-white disabled:opacity-40 hover:opacity-90 transition-opacity"
                  >
                    <Check className="size-4" />
                    Log Cheat Meal
                  </button>
                </div>
              </>
            ) : (
              /* ── Step 2: Healthify-style food picker ── */
              <div className="flex flex-1 flex-col overflow-hidden">
                {/* Header */}
                <div className="flex shrink-0 items-center gap-3 px-5 pt-4 pb-3">
                  {!initialSlot && (
                    <button
                      onClick={() => setSelectedSlot(null)}
                      className="grid size-8 place-items-center rounded-2xl bg-elevated text-muted-foreground"
                    >
                      <ChevronLeft className="size-4" />
                    </button>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-display text-base font-bold">Add to {slot}</p>
                  </div>
                  <button onClick={onClose} className="grid size-8 place-items-center rounded-2xl bg-elevated text-muted-foreground">
                    <X className="size-4" />
                  </button>
                </div>

                {/* Sticky search bar */}
                <div className="shrink-0 px-5 pb-3">
                  <div className="relative">
                    <Search className="absolute left-4 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      autoFocus={tab === "search"}
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Search 500+ foods…"
                      className="h-11 w-full rounded-2xl bg-elevated pl-11 pr-4 text-sm text-foreground placeholder:text-muted-foreground border-0 focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
                    />
                    {query && (
                      <button
                        onClick={() => setQuery("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 grid size-5 place-items-center rounded-full bg-muted text-muted-foreground"
                      >
                        <X className="size-3" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Pill tabs */}
                <div className="shrink-0 flex gap-1.5 px-5 pb-3">
                  {(["search", "favourites", "create"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTab(t)}
                      className={`rounded-full px-4 py-1.5 text-xs font-semibold capitalize transition-colors ${
                        tab === t
                          ? "bg-emerald-500 text-white"
                          : "bg-elevated text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {t === "favourites" ? "Favourites" : t === "create" ? "Create" : "Search"}
                    </button>
                  ))}
                </div>

                {/* Category chips — search tab only */}
                {tab === "search" && (
                  <div className="shrink-0 flex gap-2 overflow-x-auto no-scrollbar px-5 pb-3">
                    {CATEGORIES.map((c) => (
                      <button
                        key={c}
                        onClick={() => setCategory(c)}
                        className={`shrink-0 rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                          category === c
                            ? "bg-foreground text-background"
                            : "bg-elevated text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                )}

                {/* Scrollable content */}
                <div className="flex-1 overflow-y-auto px-5 pb-8 space-y-2">
                  {/* Search tab */}
                  {tab === "search" && (
                    <>
                      {!query && (
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-3 mt-1">
                          {category === "All" ? "Popular foods" : category}
                        </p>
                      )}
                      {results.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                          No matches — try a different search or use Create tab.
                        </div>
                      ) : (
                        results.map((item) => (
                          <FoodCard
                            key={item.id}
                            item={item}
                            isFav={favoriteIds.includes(item.id)}
                            onToggleFav={() =>
                              favoriteIds.includes(item.id)
                                ? dispatch(removeFavorite(item.id))
                                : dispatch(addFavorite(item))
                            }
                            onSelect={() => setSelectedItem(item)}
                          />
                        ))
                      )}
                    </>
                  )}

                  {/* Favourites tab */}
                  {tab === "favourites" && (
                    <>
                      {allFavourites.length === 0 ? (
                        <div className="rounded-2xl border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
                          No favourites yet — add foods from Search or Create.
                        </div>
                      ) : (
                        allFavourites.map((item) => (
                          <FoodCard
                            key={item.id}
                            item={item}
                            isFav={favoriteIds.includes(item.id)}
                            onToggleFav={() => dispatch(removeFavorite(item.id))}
                            onSelect={() => setSelectedItem(item)}
                          />
                        ))
                      )}
                      {customFoods.length > 0 && (
                        <div className="pt-2">
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">My foods</p>
                          <div className="space-y-2">
                            {customFoods.map((cf) => (
                              <div key={cf.id} className="flex items-center gap-3 rounded-2xl bg-elevated px-4 py-3">
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium truncate">{cf.name}</p>
                                  <p className="text-xs text-muted-foreground">per 100g · {cf.per100g.calories} kcal · P {cf.per100g.protein}g</p>
                                </div>
                                <button
                                  onClick={() => dispatch(removeCustomFood(cf.id))}
                                  className="grid size-8 place-items-center rounded-xl text-muted-foreground hover:text-destructive transition-colors"
                                >
                                  <Trash2 className="size-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* Create tab */}
                  {tab === "create" && (
                    <div className="space-y-4 pt-1">
                      <p className="text-xs text-muted-foreground">Enter per-100g values — macros auto-calculate from weight. Saved to your library.</p>

                      {/* Saved foods quick-pick */}
                      {customFoods.length > 0 && (
                        <div>
                          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Saved foods — tap to prefill</p>
                          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1">
                            {customFoods.map((cf) => (
                              <button
                                key={cf.id} type="button"
                                onClick={() => {
                                  setCustomName(cf.name);
                                  setPer100Cal(String(cf.per100g.calories));
                                  setPer100Protein(String(cf.per100g.protein));
                                  setPer100Carbs(String(cf.per100g.carbs));
                                  setPer100Fat(String(cf.per100g.fat));
                                  setSavedCustomId(cf.id);
                                }}
                                className="shrink-0 rounded-2xl border border-border bg-elevated px-3 py-2 text-xs font-semibold text-left hover:border-emerald-500/40 transition-colors"
                              >
                                <p className="font-semibold">{cf.name}</p>
                                <p className="text-muted-foreground">{cf.per100g.calories} kcal/100g</p>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      <div>
                        <Label htmlFor="cf-name">Food name <span className="text-destructive">*</span></Label>
                        <Input
                          id="cf-name" value={customName}
                          onChange={(e) => setCustomName(e.target.value)}
                          placeholder="e.g. White rice"
                          className="mt-1.5 h-11 rounded-2xl bg-elevated focus-visible:ring-0 focus-visible:ring-offset-0"
                        />
                      </div>

                      <div>
                        <Label htmlFor="cf-weight">Weight (g) <span className="text-destructive">*</span></Label>
                        <div className="mt-1.5 flex items-center gap-2">
                          <input
                            id="cf-weight" type="number" inputMode="decimal"
                            value={customWeight} onChange={(e) => setCustomWeight(e.target.value)}
                            placeholder="e.g. 150"
                            className="h-12 flex-1 rounded-2xl bg-elevated text-center text-lg font-bold tabular-nums text-foreground border-0 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                          />
                          <span className="text-sm font-semibold text-muted-foreground shrink-0">g</span>
                        </div>
                        <div className="mt-2 flex gap-2">
                          {[50, 100, 150, 200, 250].map((w) => (
                            <button key={w} type="button"
                              onClick={() => setCustomWeight(String(w))}
                              className={`flex-1 rounded-xl py-1.5 text-xs font-semibold transition-colors ${
                                customWeight === String(w) ? "bg-emerald-500 text-white" : "bg-muted text-muted-foreground hover:text-foreground"
                              }`}
                            >{w}</button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <Label>Macros per 100g <span className="text-destructive">*</span></Label>
                          <button
                            type="button" onClick={estimateMacros}
                            disabled={!customName.trim() || estimating}
                            className="flex items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/8 px-3 py-1.5 text-xs font-semibold text-primary hover:bg-primary/15 disabled:opacity-40"
                          >
                            <Sparkles className={`size-3.5 ${estimating ? "animate-pulse" : ""}`} />
                            {estimating ? "Estimating…" : "Fill with AI"}
                          </button>
                        </div>
                        {estimateError && <p className="text-[11px] text-destructive mb-2">{estimateError}</p>}
                        <div className="grid grid-cols-2 gap-3">
                          {[
                            { id: "cf-cal",     label: "Calories (kcal)", val: per100Cal,     set: setPer100Cal },
                            { id: "cf-protein", label: "Protein (g)",     val: per100Protein, set: setPer100Protein },
                            { id: "cf-carbs",   label: "Carbs (g)",       val: per100Carbs,   set: setPer100Carbs },
                            { id: "cf-fat",     label: "Fat (g)",         val: per100Fat,     set: setPer100Fat },
                          ].map((f) => (
                            <div key={f.id}>
                              <Label htmlFor={f.id} className="text-xs">{f.label}</Label>
                              <Input
                                id={f.id} type="number" inputMode="decimal"
                                value={f.val} onChange={(e) => f.set(e.target.value)}
                                placeholder="0"
                                className="mt-1 h-11 rounded-2xl bg-elevated text-center focus-visible:ring-0 focus-visible:ring-offset-0"
                              />
                            </div>
                          ))}
                        </div>
                      </div>

                      {scaledMacros && (
                        <div className="rounded-2xl bg-emerald-500/8 border border-emerald-500/20 px-4 py-3">
                          <p className="text-[10px] font-semibold text-emerald-400 mb-2">For {customWeight}g</p>
                          <div className="grid grid-cols-4 gap-2 text-center">
                            {[
                              { label: "kcal", val: scaledMacros.calories },
                              { label: "P",    val: `${scaledMacros.protein}g` },
                              { label: "C",    val: `${scaledMacros.carbs}g` },
                              { label: "F",    val: `${scaledMacros.fat}g` },
                            ].map((m) => (
                              <div key={m.label}>
                                <p className="font-bold text-sm tabular-nums">{m.val}</p>
                                <p className="text-[10px] text-muted-foreground">{m.label}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="space-y-2">
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-xs font-semibold text-muted-foreground">🍕 Cheat meal?</span>
                          <Switch checked={customIsCheat} onCheckedChange={setCustomIsCheat} aria-label="Mark as cheat meal" />
                        </div>
                        {customIsCheat && (
                          <Input
                            value={customCheatName}
                            onChange={(e) => setCustomCheatName(e.target.value)}
                            placeholder="e.g. Domino's pizza (optional)"
                            className="h-9 rounded-xl bg-muted text-sm focus-visible:ring-0 focus-visible:ring-offset-0"
                          />
                        )}
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <button
                          onClick={() => addCustom(false)}
                          disabled={!customName.trim() || !per100Cal || !customWeight}
                          className={`flex items-center justify-center gap-2 rounded-2xl py-3 text-sm font-semibold disabled:opacity-40 hover:opacity-90 transition-opacity ${
                            customIsCheat ? "bg-orange-500 text-white" : "bg-emerald-500 text-white"
                          }`}
                        >
                          <Plus className="size-4" />
                          {customIsCheat ? "🍕 Add" : "Add"}
                        </button>
                        <button
                          onClick={() => addCustom(true)}
                          disabled={!customName.trim() || !per100Cal || !customWeight}
                          className="flex items-center justify-center gap-2 rounded-2xl border border-rose-400/40 bg-rose-400/8 py-3 text-sm font-semibold text-rose-400 disabled:opacity-40 hover:bg-rose-400/15 transition-colors"
                        >
                          <Heart className="size-4" />
                          Add &amp; Save
                        </button>
                      </div>
                      <p className="text-[10px] text-center text-muted-foreground">
                        "Add &amp; Save" logs the food and saves it to your library for quick reuse.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </motion.div>

          {/* Detail sheet (shown over main sheet) */}
          <AnimatePresence>
            {selectedItem && (
              <DetailSheet
                item={selectedItem}
                isFav={favoriteIds.includes(selectedItem.id)}
                onToggleFav={() =>
                  favoriteIds.includes(selectedItem.id)
                    ? dispatch(removeFavorite(selectedItem.id))
                    : dispatch(addFavorite(selectedItem))
                }
                onAdd={(scaled) => { doAdd(scaled); setSelectedItem(null); }}
                onClose={() => setSelectedItem(null)}
              />
            )}
          </AnimatePresence>
        </>
      )}
    </AnimatePresence>
  );
}
