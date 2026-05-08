"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import {
  CircleAlert,
  Sparkle,
  Sparkles,
  TrendingUp,
  X,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";

import { cn } from "@/lib/utils";

/**
 * How long each insight stays on screen before the carousel auto-advances.
 * Drives both the JS auto-advance and the SVG progress ring sweep duration —
 * they intentionally share this single value so they can never drift.
 */
const INSIGHT_INTERVAL_MS = 8000;

const EASE_OUT_QUART: [number, number, number, number] = [0.25, 1, 0.5, 1];

type Insight = {
  id: string;
  severity: "celebrate" | "info" | "warn";
  title: string;
  body: string;
  related_category_id: string | null;
  related_goal_id: string | null;
};

type InsightsResponse = {
  insights: Insight[];
  generated_at: string;
  has_primary_goal: boolean;
};

type InsightsCardProps = {
  /** Bump this number to force a refresh from the parent (e.g. after a save). */
  refreshSignal?: number;
  /** Reserved for future per-surface analytics; currently unused in the UI. */
  surface?: "budget" | "transactions";
};

const SEVERITY = {
  celebrate: {
    Icon: TrendingUp,
    tone: "text-emerald-600 dark:text-emerald-400",
    label: "Good news",
  },
  info: {
    Icon: Sparkle,
    tone: "text-muted-foreground",
    label: "Note",
  },
  warn: {
    Icon: CircleAlert,
    tone: "text-amber-600 dark:text-amber-400",
    label: "Watch",
  },
} as const;

const NUMBER_TOKEN_SPLIT =
  /(KES\s?[\d,]+(?:\.\d+)?|Ksh\s?[\d,]+(?:\.\d+)?|\b\d{1,3}(?:,\d{3})+(?:\.\d+)?|\b\d+(?:\.\d+)?%)/g;

const NUMBER_TOKEN_MATCH =
  /^(?:KES\s?[\d,]+(?:\.\d+)?|Ksh\s?[\d,]+(?:\.\d+)?|\d{1,3}(?:,\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?%)$/;

/**
 * Wrap currency, percentage, and grouped-thousands tokens in tabular-nums so
 * numbers visually anchor the sentence. Bare small integers (dates, counts)
 * are intentionally not highlighted.
 */
function emphasiseNumbers(text: string): ReactNode {
  const parts = text.split(NUMBER_TOKEN_SPLIT);
  return parts.map((part, idx) =>
    NUMBER_TOKEN_MATCH.test(part) ? (
      <span
        key={idx}
        className="font-mono tabular-nums font-medium text-foreground"
      >
        {part}
      </span>
    ) : (
      <span key={idx}>{part}</span>
    ),
  );
}

export function InsightsCard({ refreshSignal = 0 }: InsightsCardProps) {
  const prefersReducedMotion = useReducedMotion() ?? false;

  const [data, setData] = useState<InsightsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasFetched, setHasFetched] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(() => new Set());
  const [activeIndex, setActiveIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [pageVisible, setPageVisible] = useState(true);
  // Bumped on manual jumps + auto-advance ticks to restart the progress ring
  // (re-keying the SVG element re-triggers its CSS keyframe from 0).
  const [ringKey, setRingKey] = useState(0);

  const fetchInsights = useCallback(async (force: boolean) => {
    try {
      setIsLoading(true);
      const url = force ? "/api/insights?refresh=1" : "/api/insights";
      const response = await fetch(url);
      const result = await response.json();
      if (response.ok && result.success) {
        setData(result.data as InsightsResponse);
      }
    } catch {
      // Soft-fail; insights are non-critical.
    } finally {
      setIsLoading(false);
      setHasFetched(true);
    }
  }, []);

  useEffect(() => {
    void fetchInsights(false);
  }, [fetchInsights]);

  useEffect(() => {
    if (refreshSignal === 0) return;
    void fetchInsights(true);
    setDismissed(new Set());
    setActiveIndex(0);
    setRingKey((k) => k + 1);
  }, [refreshSignal, fetchInsights]);

  // Pause the carousel when the tab/window isn't visible — there's no value
  // burning the timer (or rotating GPU work) for an unseen page.
  useEffect(() => {
    if (typeof document === "undefined") return;
    const handler = () => setPageVisible(!document.hidden);
    handler();
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, []);

  const visibleInsights = useMemo(() => {
    if (!data) return [];
    return data.insights.filter((insight) => !dismissed.has(insight.id));
  }, [data, dismissed]);

  // Keep activeIndex in range when the visible list shrinks (after a dismiss).
  useEffect(() => {
    if (visibleInsights.length === 0) return;
    if (activeIndex >= visibleInsights.length) {
      setActiveIndex(0);
      setRingKey((k) => k + 1);
    }
  }, [visibleInsights.length, activeIndex]);

  const isCarouselRunning =
    !paused &&
    pageVisible &&
    !prefersReducedMotion &&
    visibleInsights.length > 1;

  // Auto-advance via setTimeout (not setInterval) so a manual jump or pause
  // toggle cleanly restarts the timer through the dependency array.
  useEffect(() => {
    if (!isCarouselRunning) return;
    const id = setTimeout(() => {
      setActiveIndex((i) => (i + 1) % visibleInsights.length);
      setRingKey((k) => k + 1);
    }, INSIGHT_INTERVAL_MS);
    return () => clearTimeout(id);
  }, [isCarouselRunning, ringKey, visibleInsights.length]);

  const goTo = useCallback((target: number) => {
    setActiveIndex(target);
    setRingKey((k) => k + 1);
  }, []);

  const handleDismiss = (id: string) => {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
    setRingKey((k) => k + 1);
  };

  if (!hasFetched && isLoading) return null;
  if (!data || visibleInsights.length === 0) return null;

  const safeIndex = Math.min(activeIndex, visibleInsights.length - 1);
  const current = visibleInsights[safeIndex];
  const cfg = SEVERITY[current.severity];
  const Icon = cfg.Icon;
  const generatedRelative = data.generated_at
    ? formatDistanceToNow(new Date(data.generated_at), { addSuffix: true })
    : null;

  return (
    <section
      aria-label="Finny notes"
      aria-roledescription="carousel"
      className="group/insights"
      // Pause on hover so an insight isn't yanked away while you're reading.
      // We deliberately do NOT pause on focus — focusing a dot to navigate or
      // clicking Refresh would otherwise lock the carousel until focus leaves.
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <header className="flex items-baseline justify-between border-b border-border pb-2.5">
        <div className="flex items-baseline gap-2.5">
          <span className="flex items-center gap-1.5 text-sm font-medium text-foreground">
            <Sparkles
              className="h-3.5 w-3.5 text-muted-foreground"
              aria-hidden
            />
            Finny notes
          </span>
          {generatedRelative && (
            <span
              className="text-xs text-muted-foreground/70"
              suppressHydrationWarning
            >
              {generatedRelative}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => {
            void fetchInsights(true);
            setRingKey((k) => k + 1);
          }}
          disabled={isLoading}
          className="text-xs font-medium text-muted-foreground transition-colors hover:text-foreground disabled:opacity-50"
        >
          {isLoading ? "Refreshing" : "Refresh"}
        </button>
      </header>

      <div
        className="relative min-h-[5.25rem] pb-3 pt-3"
        aria-live="polite"
        aria-atomic="true"
      >
        <AnimatePresence mode="wait">
          <motion.article
            key={current.id}
            initial={{
              opacity: 0,
              y: prefersReducedMotion ? 0 : 6,
            }}
            animate={{ opacity: 1, y: 0 }}
            exit={{
              opacity: 0,
              y: prefersReducedMotion ? 0 : -6,
            }}
            transition={{
              duration: prefersReducedMotion ? 0 : 0.28,
              ease: EASE_OUT_QUART,
            }}
            className="relative flex items-start gap-3 pr-9"
            aria-roledescription="slide"
            aria-label={`Insight ${safeIndex + 1} of ${visibleInsights.length}`}
          >
            <span className="sr-only">{cfg.label}: </span>
            <Icon
              className={cn("mt-0.5 h-3.5 w-3.5 shrink-0", cfg.tone)}
              aria-hidden
            />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium leading-snug text-foreground">
                {current.title}
              </p>
              <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
                {emphasiseNumbers(current.body)}
              </p>
            </div>
            <button
              type="button"
              className="absolute right-0 top-0 rounded-sm p-1 text-muted-foreground/50 opacity-0 transition-opacity hover:text-foreground focus-visible:opacity-100 group-hover/insights:opacity-100"
              aria-label={`Dismiss ${current.title}`}
              onClick={() => handleDismiss(current.id)}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </motion.article>
        </AnimatePresence>
      </div>

      {visibleInsights.length > 1 && (
        <CarouselDots
          count={visibleInsights.length}
          activeIndex={safeIndex}
          ringKey={ringKey}
          paused={!isCarouselRunning}
          showRing={!prefersReducedMotion}
          onJump={goTo}
        />
      )}
    </section>
  );
}

function CarouselDots({
  count,
  activeIndex,
  ringKey,
  paused,
  showRing,
  onJump,
}: {
  count: number;
  activeIndex: number;
  ringKey: number;
  paused: boolean;
  showRing: boolean;
  onJump: (index: number) => void;
}) {
  return (
    <div
      className="flex items-center justify-center gap-1.5 pt-1"
      role="tablist"
      aria-label="Insights"
    >
      {Array.from({ length: count }).map((_, i) => {
        const isActive = i === activeIndex;
        return (
          <button
            key={i}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-label={`Show insight ${i + 1} of ${count}`}
            onClick={() => onJump(i)}
            className="relative flex h-6 w-6 items-center justify-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring/40"
          >
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full transition-[transform,background-color] duration-200",
                isActive
                  ? "bg-foreground"
                  : "bg-muted-foreground/40 group-hover:bg-muted-foreground/70 hover:scale-110 hover:bg-muted-foreground/70",
              )}
            />
            {isActive && showRing && (
              <svg
                key={ringKey}
                className="pointer-events-none absolute inset-0 -rotate-90"
                viewBox="0 0 24 24"
                aria-hidden
              >
                <circle
                  cx="12"
                  cy="12"
                  r="8"
                  fill="none"
                  stroke="currentColor"
                  strokeOpacity="0.12"
                  strokeWidth="1.25"
                  className="text-foreground"
                />
                <circle
                  cx="12"
                  cy="12"
                  r="8"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.25"
                  strokeLinecap="round"
                  pathLength={1}
                  strokeDasharray={1}
                  strokeDashoffset={1}
                  className="text-foreground"
                  style={{
                    animationName: "insight-progress",
                    animationDuration: `${INSIGHT_INTERVAL_MS}ms`,
                    animationTimingFunction: "linear",
                    animationFillMode: "forwards",
                    animationPlayState: paused ? "paused" : "running",
                  }}
                />
              </svg>
            )}
            {isActive && !showRing && (
              <span
                aria-hidden
                className="pointer-events-none absolute inset-1 rounded-full border border-foreground/30"
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
