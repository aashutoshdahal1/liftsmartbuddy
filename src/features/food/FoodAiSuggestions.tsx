import { motion } from "framer-motion";
import { Bot, Dumbbell, RefreshCw, Salad } from "lucide-react";
import { useEffect, useState } from "react";
import { AiRecommendationCard } from "@/features/ai/AiRecommendationCard";
import { WeeklyReviewCard } from "@/features/food/WeeklyReviewCard";
import { aiApi, type AiSuggestion } from "@/lib/api";

function SkeletonCard() {
  return (
    <div className="glass rounded-3xl p-5 space-y-3 animate-pulse">
      <div className="flex items-start gap-3">
        <div className="size-10 shrink-0 rounded-2xl bg-muted" />
        <div className="flex-1 space-y-2">
          <div className="h-4 w-16 rounded-full bg-muted" />
          <div className="h-4 w-3/4 rounded bg-muted" />
          <div className="h-3 w-full rounded bg-muted" />
          <div className="h-3 w-5/6 rounded bg-muted" />
        </div>
      </div>
    </div>
  );
}

function SectionLabel({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-3 mt-1">
      <span className="grid size-6 place-items-center rounded-xl bg-primary/12 text-primary">
        {icon}
      </span>
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{label}</p>
    </div>
  );
}

export function FoodAiSuggestions() {
  const [foodSuggestions, setFoodSuggestions] = useState<AiSuggestion[]>([]);
  const [workoutSuggestions, setWorkoutSuggestions] = useState<AiSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  async function load() {
    setLoading(true);
    setError(false);
    try {
      const [foodRes, workoutRes] = await Promise.all([
        aiApi.suggestions("food"),
        aiApi.suggestions("workout"),
      ]);
      setFoodSuggestions(foodRes.suggestions);
      setWorkoutSuggestions(workoutRes.suggestions);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  return (
    <section className="space-y-4">
      <WeeklyReviewCard />

      <div className="surface-card rounded-3xl p-5">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="grid size-8 place-items-center rounded-2xl gradient-primary text-primary-foreground">
            <Bot className="size-4" />
          </span>
          <div>
            <p className="text-sm font-bold">AI coach suggestions</p>
            <p className="text-[10px] text-muted-foreground">Food first, then today's exercise</p>
          </div>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-2xl bg-elevated px-3 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:text-foreground disabled:opacity-40"
          aria-label="Refresh AI suggestions"
        >
          <RefreshCw className={`size-3.5 ${loading ? "animate-spin" : ""}`} />
          Refresh
        </button>
      </div>

      {error && (
        <div className="rounded-3xl border border-destructive/20 bg-destructive/5 px-5 py-4 text-sm text-muted-foreground">
          Couldn't reach the AI — check your connection or add a Groq API key in Settings.
        </div>
      )}

      {loading && !error && (
        <div className="space-y-3">
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
          <SkeletonCard />
        </div>
      )}

      {!loading && !error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="space-y-3"
        >
          {foodSuggestions.length > 0 && (
            <>
              <SectionLabel icon={<Salad className="size-3.5" />} label="What to eat" />
              {foodSuggestions.map((s, i) => (
                <AiRecommendationCard key={`food-${i}`} title={s.title} body={s.body} tag={s.tag} />
              ))}
            </>
          )}

          {workoutSuggestions.length > 0 && (
            <>
              <SectionLabel icon={<Dumbbell className="size-3.5" />} label="Today's exercise" />
              {workoutSuggestions.map((s, i) => (
                <AiRecommendationCard key={`workout-${i}`} title={s.title} body={s.body} tag={s.tag} />
              ))}
            </>
          )}
        </motion.div>
      )}
      </div>
    </section>
  );
}
