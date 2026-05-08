"use client";

import { useCallback, useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Info,
  Loader2,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

export type AiProposalItem = {
  category_id: string;
  suggested_amount: number;
  rationale: string;
};

export type AiProposalKind = "plan" | "balanced" | "needs_more_data";

export type AiProposal = {
  kind?: AiProposalKind;
  headline: string;
  monthly_contribution_target: number;
  items: AiProposalItem[];
  risks: string[];
  primary_goal_id: string | null;
  generated_at: string;
};

type CategoryRow = {
  category_id: string;
  category_name: string;
  category_type: "income" | "expense";
  current_amount: number;
};

type AiProposalDialogProps = {
  month: number;
  year: number;
  categories: CategoryRow[];
  onApply: (amounts: Record<string, number>) => void;
  onProposalLoaded?: (proposal: AiProposal | null) => void;
};

const formatCurrency = (amount: number) =>
  amount.toLocaleString("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  });

export function AiProposalDialog({
  month,
  year,
  categories,
  onApply,
  onProposalLoaded,
}: AiProposalDialogProps) {
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [proposal, setProposal] = useState<AiProposal | null>(null);
  const [selected, setSelected] = useState<Record<string, boolean>>({});

  const categoriesById = useMemo(() => {
    const map = new Map<string, CategoryRow>();
    for (const c of categories) map.set(c.category_id, c);
    return map;
  }, [categories]);

  const filteredItems = useMemo(() => {
    if (!proposal) return [];
    return proposal.items.filter((item) => categoriesById.has(item.category_id));
  }, [proposal, categoriesById]);

  const totalSuggestedExpenses = useMemo(() => {
    return filteredItems.reduce((sum, item) => {
      const cat = categoriesById.get(item.category_id);
      if (cat?.category_type !== "expense") return sum;
      return sum + (selected[item.category_id] ? item.suggested_amount : 0);
    }, 0);
  }, [filteredItems, categoriesById, selected]);

  const fetchProposal = useCallback(async () => {
    try {
      setIsLoading(true);
      setProposal(null);
      const response = await fetch("/api/budget/suggest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month, year }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        toast.error(result.message || result.error || "Failed to generate proposal");
        setProposal(null);
        onProposalLoaded?.(null);
        return;
      }
      const next = result.data as AiProposal;
      setProposal(next);
      // Pre-select every row by default.
      const initial: Record<string, boolean> = {};
      for (const item of next.items) {
        initial[item.category_id] = true;
      }
      setSelected(initial);
      onProposalLoaded?.(next);
    } catch (error) {
      console.error("Error generating proposal:", error);
      toast.error("Failed to generate proposal");
    } finally {
      setIsLoading(false);
    }
  }, [month, year, onProposalLoaded]);

  const handleOpenChange = (next: boolean) => {
    setOpen(next);
    if (next && !proposal && !isLoading) {
      void fetchProposal();
    }
  };

  const toggleSelected = (category_id: string) => {
    setSelected((prev) => ({ ...prev, [category_id]: !prev[category_id] }));
  };

  const handleApply = () => {
    if (!proposal) return;
    const amounts: Record<string, number> = {};
    for (const item of filteredItems) {
      if (selected[item.category_id]) {
        amounts[item.category_id] = item.suggested_amount;
      }
    }
    if (Object.keys(amounts).length === 0) {
      toast.error("Select at least one suggestion to apply");
      return;
    }
    onApply(amounts);
    toast.success(
      `Applied ${Object.keys(amounts).length} suggestion${Object.keys(amounts).length === 1 ? "" : "s"}. Don't forget to save.`,
    );
    setOpen(false);
  };

  const incomeRows = filteredItems.filter(
    (item) => categoriesById.get(item.category_id)?.category_type === "income",
  );
  const expenseRows = filteredItems.filter(
    (item) => categoriesById.get(item.category_id)?.category_type === "expense",
  );

  const effectiveKind: AiProposalKind = useMemo(() => {
    if (!proposal) return "plan";
    if (proposal.kind) return proposal.kind;
    return filteredItems.length === 0 ? "balanced" : "plan";
  }, [proposal, filteredItems]);

  const hasActionableItems = filteredItems.length > 0;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="gap-1.5 border-violet-300/60 shadow-md shadow-violet-500/10 dark:border-violet-500/30"
        >
          <Sparkles className="h-4 w-4" />
          Plan with AI
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>AI Budget Proposal</DialogTitle>
          <DialogDescription>
            A goal-aware allocation across your categories. Toggle individual
            rows, then apply. You can still tweak before saving.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-3 py-4">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-5 w-1/2" />
            <div className="space-y-2 pt-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))}
            </div>
          </div>
        ) : !proposal ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            No proposal yet.
          </div>
        ) : (
          <div className="space-y-5">
            <ProposalSummary
              proposal={proposal}
              kind={effectiveKind}
              totalSuggestedExpenses={totalSuggestedExpenses}
            />

            {hasActionableItems && (
              <ScrollArea className="max-h-[40vh] pr-2">
                <div className="space-y-5">
                  {incomeRows.length > 0 && (
                    <ProposalSection
                      title="Income"
                      rows={incomeRows}
                      categoriesById={categoriesById}
                      selected={selected}
                      onToggle={toggleSelected}
                    />
                  )}
                  {expenseRows.length > 0 && (
                    <ProposalSection
                      title="Expenses"
                      rows={expenseRows}
                      categoriesById={categoriesById}
                      selected={selected}
                      onToggle={toggleSelected}
                    />
                  )}
                </div>
              </ScrollArea>
            )}

            {proposal.risks.length > 0 && (
              <div className="rounded-md border border-amber-200/60 bg-amber-50/40 p-3 text-sm dark:border-amber-500/30 dark:bg-amber-500/5">
                <div className="mb-1.5 flex items-center gap-1.5 font-medium text-amber-700 dark:text-amber-300">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  {effectiveKind === "needs_more_data"
                    ? "Why we couldn't propose changes"
                    : "Trade-offs to consider"}
                </div>
                <ul className="ml-5 list-disc space-y-1 text-muted-foreground">
                  {proposal.risks.map((risk, idx) => (
                    <li key={idx}>{risk}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 sm:justify-between">
          <Button
            variant="ghost"
            onClick={() => void fetchProposal()}
            disabled={isLoading}
            className="gap-1.5"
          >
            {isLoading ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            Regenerate
          </Button>
          {hasActionableItems ? (
            <Button
              onClick={handleApply}
              disabled={!proposal || isLoading}
              className="gap-1.5"
            >
              Apply selected
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          ) : (
            <Button
              variant="secondary"
              onClick={() => setOpen(false)}
              disabled={isLoading}
            >
              Got it
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ProposalSummary({
  proposal,
  kind,
  totalSuggestedExpenses,
}: {
  proposal: AiProposal;
  kind: AiProposalKind;
  totalSuggestedExpenses: number;
}) {
  if (kind === "balanced") {
    return (
      <div className="rounded-md border border-emerald-200/60 bg-emerald-50/40 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/5">
        <div className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-emerald-700 dark:text-emerald-300">
          <CheckCircle2 className="h-4 w-4" />
          Your budget already looks balanced
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {proposal.headline ||
            "Your current allocations look prudent — there isn't a meaningful change worth applying right now. Keep going."}
        </p>
        {proposal.monthly_contribution_target > 0 && (
          <div className="mt-3">
            <Badge variant="secondary" className="font-mono">
              Keep saving {formatCurrency(proposal.monthly_contribution_target)} / mo
            </Badge>
          </div>
        )}
      </div>
    );
  }

  if (kind === "needs_more_data") {
    return (
      <div className="rounded-md border border-blue-200/60 bg-blue-50/40 p-4 dark:border-blue-500/20 dark:bg-blue-500/5">
        <div className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-blue-700 dark:text-blue-300">
          <Info className="h-4 w-4" />
          We need a bit more to work with
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {proposal.headline ||
            "Add a few transactions or set this month's income/expense allocations, then come back. The more we see, the better the suggestion."}
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md border border-violet-200/60 bg-violet-50/40 p-4 dark:border-violet-500/20 dark:bg-violet-500/5">
      <p className="text-sm font-medium leading-relaxed">{proposal.headline}</p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Badge variant="secondary" className="font-mono">
          Save {formatCurrency(proposal.monthly_contribution_target)} / mo
        </Badge>
        <Badge variant="outline" className="font-mono">
          Suggested expenses {formatCurrency(totalSuggestedExpenses)}
        </Badge>
      </div>
    </div>
  );
}

function ProposalSection({
  title,
  rows,
  categoriesById,
  selected,
  onToggle,
}: {
  title: string;
  rows: AiProposalItem[];
  categoriesById: Map<string, CategoryRow>;
  selected: Record<string, boolean>;
  onToggle: (id: string) => void;
}) {
  return (
    <div>
      <p className="mb-1.5 text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
        {title}
      </p>
      <div className="divide-y rounded-md border">
        {rows.map((item) => {
          const cat = categoriesById.get(item.category_id);
          if (!cat) return null;
          const delta = item.suggested_amount - cat.current_amount;
          const deltaPositive = delta > 0;
          const deltaNegative = delta < 0;
          return (
            <label
              key={item.category_id}
              className={cn(
                "flex cursor-pointer items-start gap-3 p-3 transition-colors",
                selected[item.category_id] ? "bg-muted/30" : "hover:bg-muted/20",
              )}
            >
              <Checkbox
                checked={!!selected[item.category_id]}
                onCheckedChange={() => onToggle(item.category_id)}
                className="mt-0.5"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-sm font-medium">
                    {cat.category_name}
                  </span>
                  <span className="shrink-0 font-mono text-sm tabular-nums">
                    {formatCurrency(cat.current_amount)}{" "}
                    <ArrowRight className="inline h-3 w-3 align-middle text-muted-foreground" />{" "}
                    <span className="font-semibold">
                      {formatCurrency(item.suggested_amount)}
                    </span>
                    {delta !== 0 && (
                      <span
                        className={cn(
                          "ml-2 text-xs",
                          deltaPositive && "text-amber-600 dark:text-amber-400",
                          deltaNegative && "text-emerald-600 dark:text-emerald-400",
                        )}
                      >
                        {deltaPositive ? "+" : ""}
                        {formatCurrency(delta)}
                      </span>
                    )}
                  </span>
                </div>
                {item.rationale && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {item.rationale}
                  </p>
                )}
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
}
