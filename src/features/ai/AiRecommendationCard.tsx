import { motion } from "framer-motion";
import { Activity, Dumbbell, Salad, Sparkles, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

const TAG_STYLES: Record<string, { bg: string; text: string; icon: typeof Sparkles }> = {
  training:  { bg: "bg-violet-500/12", text: "text-violet-400", icon: Dumbbell },
  nutrition: { bg: "bg-emerald-500/12", text: "text-emerald-400", icon: Salad },
  recovery:  { bg: "bg-blue-500/12",   text: "text-blue-400",   icon: Activity },
  progress:  { bg: "bg-amber-500/12",  text: "text-amber-400",  icon: TrendingUp },
};

function formatBody(body: string) {
  // Split on ". " followed by capital letter, or " — ", keeping natural sentence breaks
  const sentences = body
    .split(/(?<=\.)\s+(?=[A-Z])|(?= — )/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (sentences.length <= 1) {
    return <p className="text-sm leading-relaxed text-muted-foreground">{highlightValues(body)}</p>;
  }

  return (
    <ul className="mt-1 space-y-1.5">
      {sentences.map((s, i) => (
        <li key={i} className="flex items-start gap-2 text-sm leading-relaxed text-muted-foreground">
          <span className="mt-[5px] size-1.5 shrink-0 rounded-full bg-current opacity-40" />
          <span>{highlightValues(s)}</span>
        </li>
      ))}
    </ul>
  );
}

function highlightValues(text: string) {
  // Bold numbers with units (e.g. "3 sets", "2.5kg", "90s", "8–10 reps", "5%", "20-min")
  const parts = text.split(/(\d+[\d.,–\-]*(?:\s*(?:kg|g|kcal|cal|%|s|min|rep[s]?|set[s]?|week[s]?|day[s]?|x\d+))?)/gi);
  return (
    <>
      {parts.map((p, i) =>
        /^\d/.test(p) ? (
          <strong key={i} className="font-semibold text-foreground">{p}</strong>
        ) : (
          p
        )
      )}
    </>
  );
}

interface AiRecommendationCardProps {
  title: string;
  body: string;
  tag: string;
  className?: string;
}

export function AiRecommendationCard({ title, body, tag, className }: AiRecommendationCardProps) {
  const style = TAG_STYLES[tag.toLowerCase()] ?? TAG_STYLES["training"]!;
  const Icon = style.icon;

  return (
    <motion.article
      whileHover={{ y: -2 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      className={cn("surface-card rounded-3xl p-5", className)}
    >
      <div className="flex items-start gap-3">
        <span className={cn("grid size-10 shrink-0 place-items-center rounded-2xl", style.bg, style.text)}>
          <Icon className="size-4.5" />
        </span>
        <div className="min-w-0 flex-1">
          <span className={cn("inline-block rounded-lg px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide mb-2", style.bg, style.text)}>
            {tag}
          </span>
          <h3 className="font-display text-sm font-bold leading-snug">{title}</h3>
          <div className="mt-1.5">{formatBody(body)}</div>
        </div>
      </div>
    </motion.article>
  );
}
