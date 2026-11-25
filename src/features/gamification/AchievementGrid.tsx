import { motion } from "framer-motion";
import { Award, Beef, Dumbbell, Flame, Lock, Salad, Sunrise, Target, Trophy, TrendingUp, Zap } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAppSelector } from "@/store";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 24;

const icons = {
  flame: Flame,
  beef: Beef,
  dumbbell: Dumbbell,
  sunrise: Sunrise,
  "trending-up": TrendingUp,
  trophy: Trophy,
  zap: Zap,
  target: Target,
  award: Award,
  salad: Salad,
} as const;

export function AchievementGrid() {
  const streak = useAppSelector((s) => s.gamification.streak);
  const xp = useAppSelector((s) => s.gamification.xp);
  const workouts = useAppSelector((s) => s.workout.history);
  const profile = useAppSelector((s) => s.profile);
  const nutrition = useAppSelector((s) => s.nutrition);

  const totalVolume = workouts.reduce((sum, w) => sum + (w.volume ?? 0), 0);
  const totalSets = workouts.reduce((sum, w) => sum + (w.totalSets ?? 0), 0);

  type Ex = { name?: string; sets?: { weight?: number; done?: boolean }[]; muscle?: string };
  const allExercises = workouts.flatMap((w) => w.exercises as Ex[]);

  const maxLift = (keyword: string) =>
    allExercises
      .filter((e) => e.name?.toLowerCase().includes(keyword))
      .flatMap((e) => e.sets ?? [])
      .filter((s) => s.done !== false)
      .reduce((max, s) => Math.max(max, s.weight ?? 0), 0);

  const maxBench = maxLift("bench");
  const maxDeadlift = maxLift("deadlift");
  const maxSquat = maxLift("squat");
  const maxOhp = maxLift("overhead press");
  const bigThree = maxBench + maxSquat + maxDeadlift;

  const longestWorkout = workouts.reduce((max, w) => Math.max(max, w.durationMin ?? 0), 0);
  const proteinToday = Math.round(nutrition.consumed.protein);
  const proteinTarget = Math.round(profile.weightKg * 1.6);
  const waterToday = (nutrition as unknown as { water?: number }).water ?? 0;

  const hasEarlyWorkout = workouts.some((w) => { const h = new Date(w.date).getHours(); return h >= 4 && h < 7; });
  const hasLateWorkout = workouts.some((w) => new Date(w.date).getHours() >= 21);

  const maxMuscleGroups = workouts.reduce((max, w) => {
    const groups = new Set((w.exercises as Ex[]).map((e) => e.muscle).filter(Boolean));
    return Math.max(max, groups.size);
  }, 0);

  const uniqueExercises = new Set(
    workouts.flatMap((w) => (w.exercises as Ex[]).map((e) => e.name?.toLowerCase().trim())).filter(Boolean)
  ).size;

  const achievements = [
    // — First steps —
    { id: "a2",   name: "First Rep",          desc: "Complete your first workout",          icon: "dumbbell" as const, unlocked: workouts.length >= 1,                                              progress: `${Math.min(workouts.length, 1)}/1` },
    { id: "a100", name: "Comeback Kid",        desc: "Complete 2 workouts",                  icon: "award" as const,    unlocked: workouts.length >= 2,                                              progress: `${workouts.length}/2 workouts` },

    // — Streaks —
    { id: "a20",  name: "2-Day Streak",        desc: "2-day workout streak",                 icon: "flame" as const,    unlocked: streak >= 2,                                                       progress: `${Math.min(streak, 2)}/2 days` },
    { id: "a21",  name: "3-Day Streak",        desc: "3-day workout streak",                 icon: "flame" as const,    unlocked: streak >= 3,                                                       progress: `${Math.min(streak, 3)}/3 days` },
    { id: "a4",   name: "5-Day Streak",        desc: "5-day workout streak",                 icon: "sunrise" as const,  unlocked: streak >= 5,                                                       progress: `${Math.min(streak, 5)}/5 days` },
    { id: "a22",  name: "7-Day Streak",        desc: "7-day workout streak",                 icon: "flame" as const,    unlocked: streak >= 7,                                                       progress: `${Math.min(streak, 7)}/7 days` },
    { id: "a23",  name: "14-Day Streak",       desc: "14-day workout streak",                icon: "flame" as const,    unlocked: streak >= 14,                                                      progress: `${Math.min(streak, 14)}/14 days` },
    { id: "a1",   name: "Iron Habit",          desc: "20-day streak",                        icon: "flame" as const,    unlocked: streak >= 20,                                                      progress: `${Math.min(streak, 20)}/20 days` },
    { id: "a13",  name: "On Fire",             desc: "30-day streak",                        icon: "flame" as const,    unlocked: streak >= 30,                                                      progress: `${Math.min(streak, 30)}/30 days` },
    { id: "a24",  name: "60-Day Streak",       desc: "60-day workout streak",                icon: "flame" as const,    unlocked: streak >= 60,                                                      progress: `${Math.min(streak, 60)}/60 days` },
    { id: "a25",  name: "90-Day Streak",       desc: "90-day workout streak",                icon: "flame" as const,    unlocked: streak >= 90,                                                      progress: `${Math.min(streak, 90)}/90 days` },
    { id: "a26",  name: "365-Day Streak",      desc: "Full year streak",                     icon: "trophy" as const,   unlocked: streak >= 365,                                                     progress: `${Math.min(streak, 365)}/365 days` },
    { id: "a84",  name: "Perfect Week",        desc: "7 days straight",                      icon: "sunrise" as const,  unlocked: streak >= 7,                                                       progress: `${Math.min(streak, 7)}/7 days` },
    { id: "a85",  name: "No Days Off",         desc: "14 consecutive days",                  icon: "flame" as const,    unlocked: streak >= 14,                                                      progress: `${Math.min(streak, 14)}/14 days` },
    { id: "a88",  name: "Iron Warrior",        desc: "10-day streak + 20 workouts",          icon: "trophy" as const,   unlocked: streak >= 10 && workouts.length >= 20,                             progress: `streak ${streak}/10, workouts ${workouts.length}/20` },

    // — Workout count —
    { id: "a27",  name: "5 Workouts",          desc: "5 workouts logged",                    icon: "dumbbell" as const, unlocked: workouts.length >= 5,                                              progress: `${workouts.length}/5 workouts` },
    { id: "a28",  name: "10 Workouts",         desc: "10 workouts logged",                   icon: "dumbbell" as const, unlocked: workouts.length >= 10,                                             progress: `${workouts.length}/10 workouts` },
    { id: "a29",  name: "25 Workouts",         desc: "25 workouts logged",                   icon: "award" as const,    unlocked: workouts.length >= 25,                                             progress: `${workouts.length}/25 workouts` },
    { id: "a86",  name: "Consistent",          desc: "20 workouts logged",                   icon: "award" as const,    unlocked: workouts.length >= 20,                                             progress: `${workouts.length}/20 workouts` },
    { id: "a87",  name: "Dedicated",           desc: "30 workouts logged",                   icon: "award" as const,    unlocked: workouts.length >= 30,                                             progress: `${workouts.length}/30 workouts` },
    { id: "a7",   name: "Halfway There",       desc: "50 workouts logged",                   icon: "award" as const,    unlocked: workouts.length >= 50,                                             progress: `${workouts.length}/50 workouts` },
    { id: "a30",  name: "75 Workouts",         desc: "75 workouts logged",                   icon: "award" as const,    unlocked: workouts.length >= 75,                                             progress: `${workouts.length}/75 workouts` },
    { id: "a6",   name: "Century",             desc: "100 workouts logged",                  icon: "trophy" as const,   unlocked: workouts.length >= 100,                                            progress: `${workouts.length}/100 workouts` },
    { id: "a31",  name: "150 Workouts",        desc: "150 workouts logged",                  icon: "trophy" as const,   unlocked: workouts.length >= 150,                                            progress: `${workouts.length}/150 workouts` },
    { id: "a32",  name: "250 Workouts",        desc: "250 workouts logged",                  icon: "trophy" as const,   unlocked: workouts.length >= 250,                                            progress: `${workouts.length}/250 workouts` },
    { id: "a33",  name: "365 Workouts",        desc: "365 workouts logged",                  icon: "trophy" as const,   unlocked: workouts.length >= 365,                                            progress: `${workouts.length}/365 workouts` },
    { id: "a89",  name: "Gym Rat",             desc: "60 workouts logged",                   icon: "dumbbell" as const, unlocked: workouts.length >= 60,                                             progress: `${workouts.length}/60 workouts` },
    { id: "a18",  name: "500 Club",            desc: "500 workouts logged",                  icon: "trophy" as const,   unlocked: workouts.length >= 500,                                            progress: `${workouts.length}/500 workouts` },
    { id: "a34",  name: "1000 Workouts",       desc: "1000 workouts logged",                 icon: "trophy" as const,   unlocked: workouts.length >= 1000,                                           progress: `${workouts.length}/1000 workouts` },

    // — Duration —
    { id: "a35",  name: "Quick Burn",          desc: "Single workout over 20 min",           icon: "zap" as const,      unlocked: longestWorkout >= 20,                                              progress: `${longestWorkout}/20 min` },
    { id: "a36",  name: "Half Hour Hero",      desc: "Single workout over 30 min",           icon: "zap" as const,      unlocked: longestWorkout >= 30,                                              progress: `${longestWorkout}/30 min` },
    { id: "a37",  name: "Hour Strong",         desc: "Single workout over 60 min",           icon: "zap" as const,      unlocked: longestWorkout >= 60,                                              progress: `${longestWorkout}/60 min` },
    { id: "a14",  name: "Marathon Session",    desc: "Single workout over 90 min",           icon: "zap" as const,      unlocked: longestWorkout >= 90,                                              progress: `${longestWorkout}/90 min` },
    { id: "a38",  name: "2-Hour Warrior",      desc: "Single workout over 120 min",          icon: "zap" as const,      unlocked: longestWorkout >= 120,                                             progress: `${longestWorkout}/120 min` },
    { id: "a39",  name: "Early Bird",          desc: "Complete a workout before 7am",        icon: "sunrise" as const,  unlocked: hasEarlyWorkout,                                                   progress: "Complete a workout before 7am" },
    { id: "a40",  name: "Night Owl",           desc: "Complete a workout after 9pm",         icon: "zap" as const,      unlocked: hasLateWorkout,                                                    progress: "Complete a workout after 9pm" },

    // — Volume —
    { id: "a92",  name: "Big Lifter",          desc: "5,000 kg total volume",                icon: "trending-up" as const, unlocked: totalVolume >= 5000,                                           progress: `${Math.round(totalVolume / 1000)}k / 5k kg` },
    { id: "a41",  name: "First Tonne",         desc: "1,000 kg total volume",                icon: "trending-up" as const, unlocked: totalVolume >= 1000,                                           progress: `${Math.round(totalVolume / 1000)}k / 1k kg` },
    { id: "a42",  name: "10k Volume",          desc: "10,000 kg total volume",               icon: "trending-up" as const, unlocked: totalVolume >= 10000,                                          progress: `${Math.round(totalVolume / 1000)}k / 10k kg` },
    { id: "a43",  name: "30k Volume",          desc: "30,000 kg total volume",               icon: "trending-up" as const, unlocked: totalVolume >= 30000,                                          progress: `${Math.round(totalVolume / 1000)}k / 30k kg` },
    { id: "a5",   name: "Volume King",         desc: "60,000 kg total volume",               icon: "trending-up" as const, unlocked: totalVolume >= 60000,                                          progress: `${Math.round(totalVolume / 1000)}k / 60k kg` },
    { id: "a44",  name: "100k Volume",         desc: "100,000 kg total volume",              icon: "trending-up" as const, unlocked: totalVolume >= 100000,                                         progress: `${Math.round(totalVolume / 1000)}k / 100k kg` },
    { id: "a8",   name: "Volume Lord",         desc: "200,000 kg total volume",              icon: "trending-up" as const, unlocked: totalVolume >= 200000,                                         progress: `${Math.round(totalVolume / 1000)}k / 200k kg` },
    { id: "a45",  name: "500k Volume",         desc: "500,000 kg total volume",              icon: "trending-up" as const, unlocked: totalVolume >= 500000,                                         progress: `${Math.round(totalVolume / 1000)}k / 500k kg` },
    { id: "a46",  name: "1M Volume",           desc: "1,000,000 kg total volume",            icon: "trending-up" as const, unlocked: totalVolume >= 1000000,                                        progress: `${(totalVolume / 1000000).toFixed(2)}M / 1M kg` },
    { id: "a47",  name: "Set Machine",         desc: "100 total sets logged",                icon: "zap" as const,      unlocked: totalSets >= 100,                                                  progress: `${totalSets}/100 sets` },
    { id: "a9",   name: "Set Grinder",         desc: "500 total sets logged",                icon: "zap" as const,      unlocked: totalSets >= 500,                                                  progress: `${totalSets}/500 sets` },
    { id: "a48",  name: "Set Monster",         desc: "2,000 total sets logged",              icon: "zap" as const,      unlocked: totalSets >= 2000,                                                 progress: `${totalSets}/2000 sets` },

    // — Bench —
    { id: "a49",  name: "First Bench",         desc: "Bench press 20 kg",                    icon: "dumbbell" as const, unlocked: maxBench >= 20,                                                    progress: `${maxBench}/20 kg` },
    { id: "a50",  name: "Bench 60kg",          desc: "Bench press 60 kg",                    icon: "dumbbell" as const, unlocked: maxBench >= 60,                                                    progress: `${maxBench}/60 kg` },
    { id: "a51",  name: "Bench 80kg",          desc: "Bench press 80 kg",                    icon: "dumbbell" as const, unlocked: maxBench >= 80,                                                    progress: `${maxBench}/80 kg` },
    { id: "a10",  name: "Plate Club",          desc: "Bench press 100 kg",                   icon: "dumbbell" as const, unlocked: maxBench >= 100,                                                   progress: `${maxBench}/100 kg` },
    { id: "a3",   name: "Bench Boss",          desc: "Bench 1.1× bodyweight",                icon: "dumbbell" as const, unlocked: maxBench >= profile.weightKg * 1.1,                               progress: maxBench > 0 ? `${maxBench}kg / ${Math.round(profile.weightKg * 1.1)}kg` : "No bench data yet" },
    { id: "a52",  name: "Bench 120kg",         desc: "Bench press 120 kg",                   icon: "dumbbell" as const, unlocked: maxBench >= 120,                                                   progress: `${maxBench}/120 kg` },
    { id: "a53",  name: "Bench 140kg",         desc: "Bench press 140 kg",                   icon: "dumbbell" as const, unlocked: maxBench >= 140,                                                   progress: `${maxBench}/140 kg` },
    { id: "a54",  name: "Bench 1.5×",          desc: "Bench 1.5× bodyweight",                icon: "dumbbell" as const, unlocked: maxBench >= profile.weightKg * 1.5,                               progress: maxBench > 0 ? `${maxBench}kg / ${Math.round(profile.weightKg * 1.5)}kg` : "No bench data yet" },

    // — Deadlift —
    { id: "a55",  name: "First Pull",          desc: "Deadlift 20 kg",                       icon: "beef" as const,     unlocked: maxDeadlift >= 20,                                                 progress: `${maxDeadlift}/20 kg` },
    { id: "a56",  name: "Deadlift 100kg",      desc: "Deadlift 100 kg",                      icon: "beef" as const,     unlocked: maxDeadlift >= 100,                                                progress: `${maxDeadlift}/100 kg` },
    { id: "a57",  name: "Deadlift 140kg",      desc: "Deadlift 140 kg",                      icon: "beef" as const,     unlocked: maxDeadlift >= 140,                                                progress: `${maxDeadlift}/140 kg` },
    { id: "a58",  name: "Deadlift 180kg",      desc: "Deadlift 180 kg",                      icon: "beef" as const,     unlocked: maxDeadlift >= 180,                                                progress: `${maxDeadlift}/180 kg` },
    { id: "a59",  name: "Deadlift 1.5×",       desc: "Deadlift 1.5× bodyweight",             icon: "beef" as const,     unlocked: maxDeadlift >= profile.weightKg * 1.5,                            progress: maxDeadlift > 0 ? `${maxDeadlift}kg / ${Math.round(profile.weightKg * 1.5)}kg` : "No deadlift data yet" },
    { id: "a11",  name: "Deadlift 2×",         desc: "Deadlift 2× bodyweight",               icon: "beef" as const,     unlocked: maxDeadlift >= profile.weightKg * 2,                              progress: maxDeadlift > 0 ? `${maxDeadlift}kg / ${Math.round(profile.weightKg * 2)}kg` : "No deadlift data yet" },
    { id: "a60",  name: "Deadlift 2.5×",       desc: "Deadlift 2.5× bodyweight",             icon: "beef" as const,     unlocked: maxDeadlift >= profile.weightKg * 2.5,                            progress: maxDeadlift > 0 ? `${maxDeadlift}kg / ${Math.round(profile.weightKg * 2.5)}kg` : "No deadlift data yet" },

    // — Squat —
    { id: "a61",  name: "First Squat",         desc: "Squat 20 kg",                          icon: "target" as const,   unlocked: maxSquat >= 20,                                                    progress: `${maxSquat}/20 kg` },
    { id: "a62",  name: "Squat 60kg",          desc: "Squat 60 kg",                          icon: "target" as const,   unlocked: maxSquat >= 60,                                                    progress: `${maxSquat}/60 kg` },
    { id: "a63",  name: "Squat 100kg",         desc: "Squat 100 kg",                         icon: "target" as const,   unlocked: maxSquat >= 100,                                                   progress: `${maxSquat}/100 kg` },
    { id: "a12",  name: "Squat 1.5×",          desc: "Squat 1.5× bodyweight",                icon: "target" as const,   unlocked: maxSquat >= profile.weightKg * 1.5,                               progress: maxSquat > 0 ? `${maxSquat}kg / ${Math.round(profile.weightKg * 1.5)}kg` : "No squat data yet" },
    { id: "a64",  name: "Squat 2×",            desc: "Squat 2× bodyweight",                  icon: "target" as const,   unlocked: maxSquat >= profile.weightKg * 2,                                 progress: maxSquat > 0 ? `${maxSquat}kg / ${Math.round(profile.weightKg * 2)}kg` : "No squat data yet" },

    // — OHP —
    { id: "a65",  name: "OHP 40kg",            desc: "Overhead press 40 kg",                 icon: "dumbbell" as const, unlocked: maxOhp >= 40,                                                      progress: `${maxOhp}/40 kg` },
    { id: "a66",  name: "OHP 60kg",            desc: "Overhead press 60 kg",                 icon: "dumbbell" as const, unlocked: maxOhp >= 60,                                                      progress: `${maxOhp}/60 kg` },
    { id: "a19",  name: "OHP Half",            desc: "Overhead press 0.75× bodyweight",      icon: "dumbbell" as const, unlocked: maxOhp >= profile.weightKg * 0.75,                                progress: maxOhp > 0 ? `${maxOhp}kg / ${Math.round(profile.weightKg * 0.75)}kg` : "No OHP data yet" },
    { id: "a67",  name: "OHP Bodyweight",      desc: "Overhead press bodyweight",            icon: "dumbbell" as const, unlocked: maxOhp >= profile.weightKg,                                        progress: maxOhp > 0 ? `${maxOhp}kg / ${Math.round(profile.weightKg)}kg` : "No OHP data yet" },

    // — Compound milestones —
    { id: "a68",  name: "Big Three 300",       desc: "Bench + Squat + Deadlift ≥ 300 kg",   icon: "trophy" as const,   unlocked: bigThree >= 300,                                                   progress: `${bigThree} / 300 kg` },
    { id: "a69",  name: "Big Three 500",       desc: "Bench + Squat + Deadlift ≥ 500 kg",   icon: "trophy" as const,   unlocked: bigThree >= 500,                                                   progress: `${bigThree} / 500 kg` },
    { id: "a94",  name: "Triple Threat",       desc: "Log bench, squat and deadlift",        icon: "trophy" as const,   unlocked: maxBench > 0 && maxDeadlift > 0 && maxSquat > 0,                  progress: `bench ${maxBench > 0 ? "✓" : "✗"} · squat ${maxSquat > 0 ? "✓" : "✗"} · deadlift ${maxDeadlift > 0 ? "✓" : "✗"}` },
    { id: "a95",  name: "All Rounder",         desc: "Log all 4 big lifts",                  icon: "trophy" as const,   unlocked: maxBench > 0 && maxDeadlift > 0 && maxSquat > 0 && maxOhp > 0,    progress: `bench · squat · deadlift · ohp` },
    { id: "a93",  name: "Powerhouse",          desc: "Bench 80 + Deadlift 100 + Squat 80 kg", icon: "trophy" as const, unlocked: maxBench >= 80 && maxDeadlift >= 100 && maxSquat >= 80,             progress: `B${maxBench}/80 · D${maxDeadlift}/100 · S${maxSquat}/80` },

    // — Variety —
    { id: "a90",  name: "Variety Pack",        desc: "3+ muscle groups in one workout",      icon: "award" as const,    unlocked: maxMuscleGroups >= 3,                                              progress: `${maxMuscleGroups}/3 muscle groups` },
    { id: "a91",  name: "Full Body Day",       desc: "5+ muscle groups in one workout",      icon: "award" as const,    unlocked: maxMuscleGroups >= 5,                                              progress: `${maxMuscleGroups}/5 muscle groups` },
    { id: "a96",  name: "Exercise Explorer",   desc: "10 unique exercises logged",           icon: "zap" as const,      unlocked: uniqueExercises >= 10,                                             progress: `${uniqueExercises}/10 exercises` },
    { id: "a97",  name: "Exercise Enthusiast", desc: "25 unique exercises logged",           icon: "zap" as const,      unlocked: uniqueExercises >= 25,                                             progress: `${uniqueExercises}/25 exercises` },
    { id: "a98",  name: "Exercise Master",     desc: "50 unique exercises logged",           icon: "trophy" as const,   unlocked: uniqueExercises >= 50,                                             progress: `${uniqueExercises}/50 exercises` },

    // — Nutrition —
    { id: "a70",  name: "Calorie Counter",     desc: "Log your first meal",                  icon: "salad" as const,    unlocked: nutrition.consumed.calories >= 1,                                  progress: "Log your first meal" },
    { id: "a71",  name: "2000 kcal Day",       desc: "Log 2,000+ calories in a day",         icon: "salad" as const,    unlocked: nutrition.consumed.calories >= 2000,                               progress: `${Math.round(nutrition.consumed.calories)}/2000 kcal` },
    { id: "a15",  name: "Protein Pro",         desc: "Hit protein target today",             icon: "salad" as const,    unlocked: proteinToday >= proteinTarget,                                     progress: `${proteinToday}g / ${proteinTarget}g` },
    { id: "a72",  name: "High Protein",        desc: "Log 150g+ protein in a day",           icon: "salad" as const,    unlocked: proteinToday >= 150,                                               progress: `${proteinToday}/150g` },
    { id: "a73",  name: "Macro Master",        desc: "Hit protein, carbs and fat in one day", icon: "salad" as const,   unlocked: proteinToday >= proteinTarget && nutrition.consumed.carbs >= 1 && nutrition.consumed.fat >= 1, progress: `protein ${proteinToday}/${proteinTarget}g` },
    { id: "a74",  name: "Hydrated",            desc: "Drink 8 glasses of water",             icon: "salad" as const,    unlocked: waterToday >= 8,                                                   progress: `${waterToday}/8 glasses` },
    { id: "a75",  name: "Carb Load",           desc: "Log 300g+ carbs in a day",             icon: "salad" as const,    unlocked: nutrition.consumed.carbs >= 300,                                   progress: `${Math.round(nutrition.consumed.carbs)}/300g` },
    { id: "a76",  name: "Clean Eating",        desc: "Log 1500+ kcal with ≤60g fat",         icon: "salad" as const,    unlocked: nutrition.consumed.fat <= 60 && nutrition.consumed.calories >= 1500, progress: `fat ${Math.round(nutrition.consumed.fat)}/60g` },

    // — XP —
    { id: "a77",  name: "First XP",            desc: "Earn your first 15 XP",                icon: "zap" as const,      unlocked: xp >= 15,                                                          progress: `${xp}/15 XP` },
    { id: "a78",  name: "XP 500",              desc: "Earn 500 XP",                          icon: "zap" as const,      unlocked: xp >= 500,                                                         progress: `${xp}/500 XP` },
    { id: "a16",  name: "Level Up",            desc: "Earn 1,000 XP",                        icon: "zap" as const,      unlocked: xp >= 1000,                                                        progress: `${xp}/1,000 XP` },
    { id: "a79",  name: "XP 2500",             desc: "Earn 2,500 XP",                        icon: "zap" as const,      unlocked: xp >= 2500,                                                        progress: `${xp.toLocaleString()}/2,500 XP` },
    { id: "a80",  name: "XP 5000",             desc: "Earn 5,000 XP",                        icon: "zap" as const,      unlocked: xp >= 5000,                                                        progress: `${xp.toLocaleString()}/5,000 XP` },
    { id: "a17",  name: "Elite",               desc: "Earn 10,000 XP",                       icon: "trophy" as const,   unlocked: xp >= 10000,                                                       progress: `${xp.toLocaleString()}/10,000 XP` },
    { id: "a81",  name: "XP 25000",            desc: "Earn 25,000 XP",                       icon: "trophy" as const,   unlocked: xp >= 25000,                                                       progress: `${xp.toLocaleString()}/25,000 XP` },
    { id: "a82",  name: "XP 50000",            desc: "Earn 50,000 XP",                       icon: "trophy" as const,   unlocked: xp >= 50000,                                                       progress: `${xp.toLocaleString()}/50,000 XP` },
    { id: "a99",  name: "Living Legend",       desc: "Earn 50,000 XP",                       icon: "trophy" as const,   unlocked: xp >= 50000,                                                       progress: `${xp.toLocaleString()}/50,000 XP` },
    { id: "a83",  name: "XP 100000",           desc: "Earn 100,000 XP",                      icon: "trophy" as const,   unlocked: xp >= 100000,                                                      progress: `${xp.toLocaleString()}/100,000 XP` },
  ];

  const unlocked = achievements.filter((a) => a.unlocked).length;

  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisibleCount((n) => Math.min(n + PAGE_SIZE, achievements.length));
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [achievements.length]);

  const visible = achievements.slice(0, visibleCount);
  const hasMore = visibleCount < achievements.length;

  return (
    <>
      <p className="mb-3 text-xs text-muted-foreground">{unlocked} of {achievements.length} unlocked</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {visible.map((a, i) => {
          const Icon = icons[a.icon as keyof typeof icons] ?? Trophy;
          return (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: Math.min(i * 0.015, 0.3) }}
              whileHover={{ y: -4 }}
              className={cn(
                "surface-card flex flex-col items-center gap-2 rounded-3xl p-5 text-center",
                !a.unlocked && "opacity-55",
              )}
            >
              <span className={cn(
                "grid size-12 place-items-center rounded-2xl",
                a.unlocked ? "gradient-primary text-primary-foreground" : "bg-muted text-muted-foreground",
              )}>
                {a.unlocked ? <Icon className="size-5" /> : <Lock className="size-4" />}
              </span>
              <p className="text-sm font-semibold">{a.name}</p>
              <p className="text-xs text-muted-foreground">{a.desc}</p>
              {!a.unlocked && <p className="text-[10px] text-muted-foreground/70">{a.progress}</p>}
            </motion.div>
          );
        })}
      </div>

      {/* Sentinel for infinite scroll */}
      <div ref={sentinelRef} className="mt-2" />
      {hasMore && (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Array.from({ length: Math.min(PAGE_SIZE, achievements.length - visibleCount) }).map((_, i) => (
            <div key={i} className="animate-pulse rounded-3xl bg-muted p-5 h-32" />
          ))}
        </div>
      )}
    </>
  );
}
