import { createSlice, type PayloadAction } from "@reduxjs/toolkit";
import { type FoodItem } from "@/lib/mock-data";

export interface CustomFoodEntry {
  id: string;
  name: string;
  // per-100g macros stored so weight can be rescaled without AI
  per100g: { calories: number; protein: number; carbs: number; fat: number };
  createdAt: string;
}

interface FoodLibraryState {
  customFoods: CustomFoodEntry[];
  favoriteIds: string[]; // ids from FOOD_DB or customFoods
  favoriteFoods: FoodItem[]; // full item snapshot for custom favourites
}

const LS_KEY = "ls_food_library";

function load(): FoodLibraryState {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { customFoods: [], favoriteIds: [], favoriteFoods: [] };
}

function persist(state: FoodLibraryState) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  } catch { /* quota */ }
}

const initialState: FoodLibraryState = load();

const foodLibrarySlice = createSlice({
  name: "foodLibrary",
  initialState,
  reducers: {
    saveCustomFood(state, action: PayloadAction<CustomFoodEntry>) {
      const existing = state.customFoods.findIndex((f) => f.id === action.payload.id);
      if (existing >= 0) {
        state.customFoods[existing] = action.payload;
      } else {
        state.customFoods.push(action.payload);
      }
      persist(state);
    },
    removeCustomFood(state, action: PayloadAction<string>) {
      state.customFoods = state.customFoods.filter((f) => f.id !== action.payload);
      state.favoriteIds = state.favoriteIds.filter((id) => id !== action.payload);
      state.favoriteFoods = state.favoriteFoods.filter((f) => f.id !== action.payload);
      persist(state);
    },
    addFavorite(state, action: PayloadAction<FoodItem>) {
      if (!state.favoriteIds.includes(action.payload.id)) {
        state.favoriteIds.push(action.payload.id);
        // Store full snapshot so it shows up in Favourites tab even without FOOD_DB
        const existing = state.favoriteFoods.findIndex((f) => f.id === action.payload.id);
        if (existing < 0) state.favoriteFoods.push(action.payload);
      }
      persist(state);
    },
    removeFavorite(state, action: PayloadAction<string>) {
      state.favoriteIds = state.favoriteIds.filter((id) => id !== action.payload);
      state.favoriteFoods = state.favoriteFoods.filter((f) => f.id !== action.payload);
      persist(state);
    },
  },
});

export const { saveCustomFood, removeCustomFood, addFavorite, removeFavorite } = foodLibrarySlice.actions;
export default foodLibrarySlice.reducer;
