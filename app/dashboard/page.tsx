"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { motion, type Variants } from "motion/react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { cn, MONTHS } from "@/lib/utils";

type TransactionWithCategory = {
  id: number;
  amount: number;
  description: string;
  transaction_date: string;
  category_id: number;
  family_id: number;
  category_name: string;
  category_type: "income" | "expense";
};

type BudgetCategory = {
  category_id: string;
  category_name: string;
  category_type: "income" | "expense";
  category_amount: number | null;
  repeats: boolean;
  amount: number;
  budget_item_id?: string;
};

type BudgetOverview = {
  categoryId: string;
  categoryName: string;
  budgetAmount: number;
  spentAmount: number;
  percentage: number;
  isOverBudget: boolean;
};

const formatCurrency = (amount: number) =>
  amount.toLocaleString("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  });

const statusColors = {
  over: { dot: "bg-red-500", bar: "bg-red-500" },
  warning: { dot: "bg-amber-400", bar: "bg-amber-400" },
  ok: { dot: "bg-emerald-500", bar: "bg-emerald-500" },
} as const;

function getStatus(item: BudgetOverview): "over" | "warning" | "ok" {
  if (item.isOverBudget) return "over";
  if (item.percentage > 70) return "warning";
  return "ok";
}

// Animates a number from its previous value to `target` using ease-out quart.
// Respects prefers-reduced-motion.
function useAnimatedNumber(target: number, duration = 680): number {
  const [displayed, setDisplayed] = useState(target);
  const displayedRef = useRef(target);
  const frameRef = useRef<number>(0);

  displayedRef.current = displayed;

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      setDisplayed(target);
      return;
    }

    const startValue = displayedRef.current;
    const startTime = performance.now();

    cancelAnimationFrame(frameRef.current);

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - t, 4); // ease-out quart
      setDisplayed(Math.round(startValue + (target - startValue) * eased));
      if (t < 1) frameRef.current = requestAnimationFrame(tick);
    };

    frameRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameRef.current);
  }, [target, duration]);

  return displayed;
}

const rowVariants: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] },
  },
};

const listVariants: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.04, delayChildren: 0.05 },
  },
};

export default function DashboardPage() {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(currentDate.getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());

  const [budgetData, setBudgetData] = useState<BudgetOverview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [dataVersion, setDataVersion] = useState(0);

  // Actual values — used for status/color logic (don't animate)
  const [totalBudget, setTotalBudget] = useState(0);
  const [totalSpent, setTotalSpent] = useState(0);

  // Display targets — driven to 0 on load start, real value on load end
  const [displayBudget, setDisplayBudget] = useState(0);
  const [displaySpent, setDisplaySpent] = useState(0);
  const [displayRemaining, setDisplayRemaining] = useState(0);

  const animatedBudget = useAnimatedNumber(displayBudget);
  const animatedSpent = useAnimatedNumber(displaySpent);
  const animatedRemaining = useAnimatedNumber(Math.abs(displayRemaining));

  const isOverallOverBudget = totalSpent > totalBudget;
  const percentUsed = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  const summaryBarColor = isOverallOverBudget
    ? "bg-red-500"
    : percentUsed > 70
      ? "bg-amber-400"
      : "bg-emerald-500";

  const yearOptions = Array.from(
    { length: 3 },
    (_, i) => currentDate.getFullYear() - i,
  );
  const monthOptions = MONTHS.map((month, index) => ({
    label: month,
    value: index + 1,
  }));

  const fetchBudgetOverview = useCallback(async () => {
    setIsLoading(true);
    // Animate current display values down to zero immediately
    setDisplayBudget(0);
    setDisplaySpent(0);
    setDisplayRemaining(0);

    try {
      const [budgetResponse, transactionResponse] = await Promise.all([
        fetch(`/api/budget?month=${selectedMonth}&year=${selectedYear}`),
        fetch(`/api/transaction?month=${selectedMonth}&year=${selectedYear}`),
      ]);

      const budgetResult = await budgetResponse.json();
      if (!budgetResult.success) {
        setBudgetData([]);
        setTotalBudget(0);
        setTotalSpent(0);
        return;
      }

      const transactionResult = await transactionResponse.json();
      if (!transactionResponse.ok || !transactionResult.success) {
        toast.error("Failed to load transactions");
        return;
      }

      const budgetCategories = budgetResult.data.categories || [];
      const transactions: TransactionWithCategory[] = transactionResult.data.rows;

      const spendingByCategory = transactions
        .filter((t) => t.category_type === "expense")
        .reduce((acc: Record<string, number>, t) => {
          acc[t.category_id] = (acc[t.category_id] || 0) + Number(t.amount);
          return acc;
        }, {});

      const overview: BudgetOverview[] = budgetCategories
        .filter(
          (item: BudgetCategory) =>
            item.category_type === "expense" && item.amount > 0,
        )
        .map((item: BudgetCategory) => {
          const spentAmount = spendingByCategory[item.category_id] || 0;
          const budgetAmount = Number(item.amount);
          const percentage =
            budgetAmount > 0 ? (spentAmount / budgetAmount) * 100 : 0;
          return {
            categoryId: item.category_id,
            categoryName: item.category_name,
            budgetAmount,
            spentAmount,
            percentage,
            isOverBudget: spentAmount > budgetAmount,
          };
        })
        .sort((a: BudgetOverview, b: BudgetOverview) => {
          if (a.isOverBudget && !b.isOverBudget) return -1;
          if (!a.isOverBudget && b.isOverBudget) return 1;
          return b.percentage - a.percentage;
        });

      const newBudget = overview.reduce((s, i) => s + i.budgetAmount, 0);
      const newSpent = overview.reduce((s, i) => s + i.spentAmount, 0);

      setBudgetData(overview);
      setTotalBudget(newBudget);
      setTotalSpent(newSpent);
      // Trigger count-up animation to real values
      setDisplayBudget(newBudget);
      setDisplaySpent(newSpent);
      setDisplayRemaining(newBudget - newSpent);
      setDataVersion((v) => v + 1);
      setIsFirstLoad(false);
    } catch {
      toast.error("Failed to load budget overview");
    } finally {
      setIsLoading(false);
    }
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    fetchBudgetOverview();
  }, [fetchBudgetOverview]);

  const showSkeleton = isLoading && isFirstLoad;
  const dimCategories = isLoading && !isFirstLoad;

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between border-b pb-6 mb-6 dark:border-zinc-800">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Budget overview · {MONTHS[selectedMonth - 1]} {selectedYear}
          </p>
        </div>
        <div className="flex gap-2">
          <Select
            value={selectedMonth.toString()}
            onValueChange={(v) => setSelectedMonth(parseInt(v))}
          >
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {monthOptions.map((m) => (
                <SelectItem key={m.value} value={m.value.toString()}>
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={selectedYear.toString()}
            onValueChange={(v) => setSelectedYear(parseInt(v))}
          >
            <SelectTrigger className="w-24">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {yearOptions.map((y) => (
                <SelectItem key={y} value={y.toString()}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Budget summary */}
      {showSkeleton ? (
        <div className="mb-8 space-y-3">
          <Skeleton className="h-11 w-52" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-2 w-full mt-4" />
        </div>
      ) : (
        <div className="mb-10">
          <div className="flex items-end justify-between mb-3">
            <div>
              <div className="text-[2.75rem] font-bold tabular-nums tracking-tight leading-none">
                {formatCurrency(animatedSpent)}
              </div>
              <div className="text-sm text-muted-foreground mt-1.5">
                of {formatCurrency(animatedBudget)} budgeted
              </div>
            </div>
            {totalBudget > 0 && (
              <div className="text-right">
                <div
                  className={cn(
                    "text-lg font-semibold tabular-nums",
                    isOverallOverBudget
                      ? "text-red-500"
                      : "text-emerald-600 dark:text-emerald-400",
                  )}
                >
                  {isOverallOverBudget ? "+" : ""}
                  {formatCurrency(animatedRemaining)}
                </div>
                <div className="text-sm text-muted-foreground md:text-xs mt-0.5">
                  {isOverallOverBudget ? "over budget" : "remaining"}
                </div>
              </div>
            )}
          </div>

          {totalBudget > 0 && (
            <>
              <div className="h-2 bg-muted dark:bg-zinc-800 rounded-full overflow-hidden">
                <motion.div
                  className={cn("h-full rounded-full", summaryBarColor)}
                  animate={{ width: `${Math.min(percentUsed, 100)}%` }}
                  transition={{
                    type: "spring",
                    stiffness: 50,
                    damping: 14,
                    mass: 0.8,
                  }}
                />
              </div>
              <p className="text-sm text-muted-foreground md:text-xs mt-1.5">
                {percentUsed.toFixed(0)}% of monthly budget spent
              </p>
            </>
          )}
        </div>
      )}

      {/* Category list */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <h2 className="text-sm font-semibold uppercase tracking-[0.1em] text-muted-foreground md:text-xs">
            Categories
          </h2>
          {!isLoading && budgetData.length > 0 && (
            <span className="text-sm text-muted-foreground md:text-xs">
              {budgetData.length} tracked
            </span>
          )}
        </div>

        {showSkeleton ? (
          <div className="divide-y dark:divide-zinc-800">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="py-4 space-y-2.5">
                <div className="flex items-center justify-between">
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-4 w-36" />
                </div>
                <Skeleton className="h-1.5 w-full" />
              </div>
            ))}
          </div>
        ) : budgetData.length === 0 ? (
          <div className="py-16 text-center">
            <p className="text-sm text-muted-foreground">
              No budget set for {MONTHS[selectedMonth - 1]} {selectedYear}
            </p>
            <p className="text-sm text-muted-foreground/60 md:text-xs mt-1">
              Go to Budget to add category allocations
            </p>
          </div>
        ) : (
          <div
            className={cn(
              "transition-opacity duration-200",
              dimCategories ? "pointer-events-none opacity-30" : "opacity-100",
            )}
          >
            <motion.div
              key={`cats-${dataVersion}`}
              className="divide-y dark:divide-zinc-800"
              initial="hidden"
              animate="visible"
              variants={listVariants}
            >
              {budgetData.map((item) => {
                const status = getStatus(item);
                const colors = statusColors[status];
                const itemRemaining = item.budgetAmount - item.spentAmount;

                return (
                  <motion.div
                    key={item.categoryId}
                    variants={rowVariants}
                    className="py-4"
                  >
                    <div className="flex items-start justify-between mb-2.5">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div
                          className={cn(
                            "mt-0.5 h-2 w-2 shrink-0 rounded-full",
                            colors.dot,
                          )}
                        />
                        <span className="text-sm font-medium truncate">
                          {item.categoryName}
                        </span>
                        {item.isOverBudget && (
                          <span className="shrink-0 text-sm font-medium text-red-500 md:text-xs">
                            {formatCurrency(Math.abs(itemRemaining))} over
                          </span>
                        )}
                      </div>
                      <div className="ml-4 shrink-0 text-right">
                        <span className="text-sm tabular-nums font-medium">
                          {formatCurrency(item.spentAmount)}
                        </span>
                        <span className="text-sm text-muted-foreground md:text-xs">
                          {" "}
                          / {formatCurrency(item.budgetAmount)}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted dark:bg-zinc-800">
                        <motion.div
                          className={cn("h-full rounded-full", colors.bar)}
                          initial={{ width: "0%" }}
                          animate={{
                            width: `${Math.min(item.percentage, 100)}%`,
                          }}
                          transition={{
                            type: "spring",
                            stiffness: 55,
                            damping: 11,
                            mass: 0.9,
                          }}
                        />
                      </div>
                      <span className="w-9 shrink-0 text-right text-sm tabular-nums text-muted-foreground md:text-xs">
                        {item.percentage.toFixed(0)}%
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}
