import { FOOD_DB } from "./food-database";
import type { FoodItem } from "./mock-data";

export interface MacroRemaining {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface SuggestedFood {
  food: FoodItem;
  grams: number;      // suggested quantity in grams (or servings for non-gram items)
  isGrams: boolean;   // true = gram-scalable, false = serving-based
  scaled: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

export interface MealSuggestion {
  items: SuggestedFood[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  coveragePct: number; // how much of the calorie gap this covers
}

export type FoodCategory = "protein" | "carb" | "fat" | "vegetable" | "mixed";

function getCategory(food: FoodItem): FoodCategory {
  if (food.id.startsWith("db-09")) return "mixed";

  // Derive per-100-kcal macros to classify by nutritional role
  const cal = food.calories || 1;
  const proteinPct = (food.protein * 4) / cal;  // fraction of calories from protein
  const carbPct    = (food.carbs   * 4) / cal;
  const fatPct     = (food.fat     * 9) / cal;

  // Vegetables: very low calorie density (< 50 kcal per 100g serving equivalent)
  const baseG = food.serving.match(/^(\d+(?:\.\d+)?)\s*g\b/);
  if (baseG && food.calories / parseFloat(baseG[1]!) < 0.55 && food.protein < 5) return "vegetable";

  // Protein: >35% of calories from protein AND absolute protein > 8g per serving
  if (proteinPct >= 0.35 && food.protein >= 8) return "protein";

  // Fat: >50% of calories from fat AND low protein
  if (fatPct >= 0.5 && food.protein < 5) return "fat";

  // Carb: >50% of calories from carbs
  if (carbPct >= 0.5) return "carb";

  return "mixed";
}

function baseGrams(food: FoodItem): number | null {
  const m = food.serving.match(/^(\d+(?:\.\d+)?)\s*g\b/);
  return m ? parseFloat(m[1]!) : null;
}

function scaleFood(food: FoodItem, targetGrams: number): SuggestedFood {
  const base = baseGrams(food);
  if (base !== null) {
    const factor = targetGrams / base;
    return {
      food,
      grams: Math.round(targetGrams / 25) * 25, // round to nearest 25g
      isGrams: true,
      scaled: {
        calories: Math.round(food.calories * factor),
        protein:  Math.round(food.protein  * factor * 10) / 10,
        carbs:    Math.round(food.carbs    * factor * 10) / 10,
        fat:      Math.round(food.fat      * factor * 10) / 10,
      },
    };
  }
  // Non-gram serving — suggest 1 serving
  return {
    food,
    grams: 1,
    isGrams: false,
    scaled: {
      calories: food.calories,
      protein:  food.protein,
      carbs:    food.carbs,
      fat:      food.fat,
    },
  };
}

/**
 * Core suggestion engine.
 *
 * Strategy:
 * 1. Always pick a protein source (scaled to protein gap, capped at meal budget)
 * 2. Pick a carb source to fill the remaining calorie gap
 * 3. Add a vegetable filler
 * 4. Never exceed remaining calorie target
 *
 * excludeNames: lowercase food names already logged today (avoids repeating them)
 */
export function suggestMeal(
  remaining: MacroRemaining,
  goal: string,
  excludeNames: string[] = [],
): MealSuggestion | null {
  if (remaining.calories < 50) return null;

  // Cap to a single-meal budget — never suggest a full day's food at once
  const mealBudget: MacroRemaining = {
    calories: Math.min(remaining.calories, 850),
    protein:  Math.min(Math.max(remaining.protein, 20), 60), // always target at least 20g protein per meal
    carbs:    Math.min(remaining.carbs,    100),
    fat:      Math.min(remaining.fat,      30),
  };

  const available = FOOD_DB.filter(
    (f) => !excludeNames.includes(f.name.toLowerCase()) && getCategory(f) !== "mixed"
  );

  const proteins   = available.filter((f) => getCategory(f) === "protein");
  const carbs      = available.filter((f) => getCategory(f) === "carb");
  const vegetables = available.filter((f) => getCategory(f) === "vegetable");

  const items: SuggestedFood[] = [];

  // ── Step 1: Protein source — always included ──────────────────────────────────
  if (proteins.length > 0) {
    const isCut = goal === "cut" || goal === "lose-weight";
    const sortedProteins = [...proteins].sort((a, b) => {
      const densA = a.protein / (a.calories || 1);
      const densB = b.protein / (b.calories || 1);
      return isCut ? densB - densA : densA - densB;
    });

    const primary = sortedProteins[0]!;
    const base = baseGrams(primary);

    let targetGrams: number;
    if (base !== null) {
      const gramsForProtein  = (mealBudget.protein  / (primary.protein  / base));
      const gramsForCalories = (mealBudget.calories * 0.55) / (primary.calories / base);
      targetGrams = Math.max(50, Math.min(gramsForProtein, gramsForCalories, 300));
    } else {
      targetGrams = 1;
    }

    items.push(scaleFood(primary, targetGrams));
  }

  // ── Step 2: Carb source (fill remaining calorie gap) ─────────────────────────
  const calAfterProtein = mealBudget.calories - items.reduce((s, i) => s + i.scaled.calories, 0);
  const needCarbs = calAfterProtein > 100 && mealBudget.carbs > 20;

  if (needCarbs && carbs.length > 0) {
    const isCut = goal === "cut" || goal === "lose-weight";
    const sortedCarbs = [...carbs].sort((a, b) =>
      isCut ? a.calories - b.calories : b.calories - a.calories
    );

    const carbFood = sortedCarbs[0]!;
    const base = baseGrams(carbFood);

    let targetGrams: number;
    if (base !== null) {
      const gramsForCals = (calAfterProtein * 0.75) / (carbFood.calories / base);
      targetGrams = Math.max(50, Math.min(gramsForCals, 400));
    } else {
      targetGrams = 1;
    }

    items.push(scaleFood(carbFood, targetGrams));
  }

  // ── Step 3: Vegetable filler ──────────────────────────────────────────────────
  const calAfterTwo = mealBudget.calories - items.reduce((s, i) => s + i.scaled.calories, 0);
  if (calAfterTwo > 50 && vegetables.length > 0) {
    const veg = vegetables[Math.floor(Math.random() * vegetables.length)]!;
    items.push(scaleFood(veg, 100));
  }

  if (items.length === 0) return null;

  const totalCalories = items.reduce((s, i) => s + i.scaled.calories, 0);
  const totalProtein  = items.reduce((s, i) => s + i.scaled.protein, 0);
  const totalCarbs    = items.reduce((s, i) => s + i.scaled.carbs, 0);
  const totalFat      = items.reduce((s, i) => s + i.scaled.fat, 0);

  return {
    items,
    totalCalories,
    totalProtein: Math.round(totalProtein * 10) / 10,
    totalCarbs:   Math.round(totalCarbs   * 10) / 10,
    totalFat:     Math.round(totalFat     * 10) / 10,
    coveragePct: Math.min(100, Math.round((totalCalories / remaining.calories) * 100)),
  };
}

/**
 * Returns substitutes for a given food — same category, different food.
 * Sorted by closest protein-per-100g match.
 */
export function getSubstitutes(food: FoodItem, count = 3): FoodItem[] {
  const cat = getCategory(food);
  const base = baseGrams(food) ?? 100;
  const targetProteinPer100 = (food.protein / base) * 100;

  return FOOD_DB
    .filter((f) => f.id !== food.id && getCategory(f) === cat)
    .sort((a, b) => {
      const aBase = baseGrams(a) ?? 100;
      const bBase = baseGrams(b) ?? 100;
      const aDiff = Math.abs((a.protein / aBase) * 100 - targetProteinPer100);
      const bDiff = Math.abs((b.protein / bBase) * 100 - targetProteinPer100);
      return aDiff - bDiff;
    })
    .slice(0, count);
}
