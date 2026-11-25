import type { FoodItem } from "./mock-data";

export interface FoodPattern {
  name: string;
  avgGrams: number;
  daysLogged: number;
  avgCalories: number;
}

export interface QuantitySuggestion {
  foodName: string;
  currentAvgGrams: number;
  suggestedGrams: number;
  deltaGrams: number;
  deltaCalories: number;
  applyDays: number;
  reason: string;
}

export function analyzeQuantities(
  dailyLogs: FoodItem[][],
  goal: string,
  weightTrendKgPerWeek: number,
  calorieTarget: number,
): QuantitySuggestion[] {
  // Determine direction first — if on-track, no changes needed
  const isCut = goal === "cut" || goal === "lose-weight";
  const isBulk = goal === "bulk" || goal === "lean-bulk";

  const tooFast = isBulk
    ? weightTrendKgPerWeek > (goal === "bulk" ? 0.5 : 0.3)
    : isCut
    ? weightTrendKgPerWeek > -0.05  // not losing fast enough for cut
    : false;

  const tooSlow = isBulk && weightTrendKgPerWeek < 0.1;

  const shouldReduce = isCut || tooFast;
  const shouldIncrease = tooSlow;

  if (!shouldReduce && !shouldIncrease) return [];

  // Build food frequency map — only gram-scalable, non-cheat foods
  const map = new Map<string, { totalGrams: number; totalCalories: number; daysCount: number; carbsPer100g: number; proteinPer100g: number }>();

  for (const dayItems of dailyLogs) {
    // Deduplicate by name within the same day before aggregating
    const seen = new Set<string>();
    for (const item of dayItems) {
      if (item.isCheatMeal) continue;
      const gramMatch = item.serving.match(/^(\d+(?:\.\d+)?)\s*g\b/);
      if (!gramMatch) continue;
      const baseG = parseFloat(gramMatch[1]!);
      if (baseG <= 0) continue;

      const key = item.name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);

      const carbsPer100g = (item.carbs / baseG) * 100;
      const proteinPer100g = (item.protein / baseG) * 100;

      const existing = map.get(key);
      if (existing) {
        existing.totalGrams += baseG;
        existing.totalCalories += item.calories;
        existing.daysCount += 1;
      } else {
        map.set(key, {
          totalGrams: baseG,
          totalCalories: item.calories,
          daysCount: 1,
          carbsPer100g,
          proteinPer100g,
        });
      }
    }
  }

  // Filter: logged 3+ days, carb-heavy (not protein sources)
  const patterns: (FoodPattern & { carbsPer100g: number; calPer100g: number })[] = [];
  for (const [name, data] of map.entries()) {
    if (data.daysCount < 3) continue;
    // Skip protein-dominant foods
    if (data.proteinPer100g > data.carbsPer100g) continue;
    // Must have meaningful carbs
    if (data.carbsPer100g < 15) continue;

    patterns.push({
      name,
      avgGrams: Math.round(data.totalGrams / data.daysCount),
      daysLogged: data.daysCount,
      avgCalories: Math.round(data.totalCalories / data.daysCount),
      carbsPer100g: data.carbsPer100g,
      calPer100g: (data.totalCalories / data.daysCount) / (data.totalGrams / data.daysCount) * 100,
    });
  }

  if (patterns.length === 0) return [];

  const changePct = shouldReduce ? -0.20 : 0.15;

  const suggestions: QuantitySuggestion[] = patterns.map((p) => {
    const rawSuggested = p.avgGrams * (1 + changePct);
    const suggestedGrams = Math.max(50, Math.round(rawSuggested / 25) * 25);
    const deltaGrams = suggestedGrams - p.avgGrams;
    const deltaCalories = Math.round((deltaGrams / 100) * p.calPer100g);
    const applyDays = Math.abs(deltaGrams) > 50 ? 5 : 3;

    const dirWord = shouldReduce ? "reducing" : "increasing";
    const saveLine = shouldReduce
      ? `saves ~${Math.abs(deltaCalories)} kcal/day`
      : `adds ~${Math.abs(deltaCalories)} kcal/day`;

    const reason = `You averaged ${p.avgGrams}g of ${p.name}/day over ${p.daysLogged} days — ${dirWord} to ${suggestedGrams}g ${saveLine} toward your ${goal} goal.`;

    return { foodName: p.name, currentAvgGrams: p.avgGrams, suggestedGrams, deltaGrams, deltaCalories, applyDays, reason };
  });

  // Sort by absolute calorie impact, highest first; return top 3
  return suggestions
    .sort((a, b) => Math.abs(b.deltaCalories) - Math.abs(a.deltaCalories))
    .slice(0, 3);
}
