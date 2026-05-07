"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  LayoutGrid,
  List,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { cn, MONTHS } from "@/lib/utils";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

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

type DashboardView = "grid" | "list";

const formatCurrency = (amount: number) =>
  amount.toLocaleString("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  });

const statusBadgeClasses = {
  over: "bg-destructive/15 text-destructive border-destructive/30",
  warning: "bg-amber-500/15 text-amber-500 border-amber-500/30",
  onTrack: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30",
};

export default function DashboardPage() {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(
    currentDate.getMonth() + 1,
  );
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
  const [view, setView] = useState<DashboardView>("grid");
  const [budgetData, setBudgetData] = useState<BudgetOverview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalBudget, setTotalBudget] = useState(0);
  const [totalSpent, setTotalSpent] = useState(0);

  const yearOptions = Array.from(
    { length: 3 },
    (_, i) => currentDate.getFullYear() - i,
  );

  const monthOptions = MONTHS.map((month, index) => ({
    label: month,
    value: index + 1,
  }));

  const fetchBudgetOverview = useCallback(async () => {
    try {
      setIsLoading(true);

      // Fetch budget for selected month/year
      const budgetResponse = await fetch(
        `/api/budget?month=${selectedMonth}&year=${selectedYear}`,
      );
      const budgetResult = await budgetResponse.json();

      if (!budgetResult.success) {
        setBudgetData([]);
        setTotalBudget(0);
        setTotalSpent(0);
        return;
      }

      const budget = budgetResult.data;
      const budgetCategories = budget.categories || [];

      // Fetch transactions for selected month/year
      const transactionResponse = await fetch(
        `/api/transaction?month=${selectedMonth}&year=${selectedYear}`,
      );
      const transactionResult = await transactionResponse.json();

      if (!transactionResponse.ok || !transactionResult.success) {
        toast.error("Failed to load transactions");
        return;
      }

      const transactions: TransactionWithCategory[] =
        transactionResult.data.rows;

      // Calculate spending per category
      const spendingByCategory = transactions
        .filter((t) => t.category_type === "expense")
        .reduce((acc: Record<string, number>, transaction) => {
          const categoryId = transaction.category_id;
          acc[categoryId] = (acc[categoryId] || 0) + Number(transaction.amount);
          return acc;
        }, {});

      // Build overview data (only for expense categories with budgets)
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
          // Sort overbudget items to top
          if (a.isOverBudget && !b.isOverBudget) return -1;
          if (!a.isOverBudget && b.isOverBudget) return 1;
          // Then sort by percentage descending
          return b.percentage - a.percentage;
        });

      setBudgetData(overview);
      setTotalBudget(
        overview.reduce((sum, item) => sum + item.budgetAmount, 0),
      );
      setTotalSpent(overview.reduce((sum, item) => sum + item.spentAmount, 0));
    } catch (error) {
      console.error("Error fetching budget overview:", error);
      toast.error("Failed to load budget overview");
    } finally {
      setIsLoading(false);
    }
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    fetchBudgetOverview();
  }, [fetchBudgetOverview, selectedMonth, selectedYear]);

  const isOverallOverBudget = totalSpent > totalBudget;
  const remaining = totalBudget - totalSpent;
  const percentUsed = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;
  const topAllocations = [...budgetData]
    .sort((a, b) => b.budgetAmount - a.budgetAmount)
    .slice(0, 5);

  return (
    <div className="relative left-1/2 right-1/2 min-h-screen w-screen -translate-x-1/2 overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute -right-20 -top-16 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl dark:bg-emerald-400/10" />
      <div className="pointer-events-none absolute -left-24 bottom-16 h-72 w-72 rounded-full bg-indigo-500/10 blur-3xl" />

      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-4 md:px-6 md:py-6">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Personal Finance
            </p>
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
              Dashboard
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={selectedYear.toString()}
              onValueChange={(value) => setSelectedYear(parseInt(value))}
            >
              <SelectTrigger className="w-28 border-border bg-card/70 text-foreground dark:border-zinc-800 dark:bg-zinc-900/70">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-border bg-popover text-popover-foreground dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100">
                {yearOptions.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={selectedMonth.toString()}
              onValueChange={(value) => setSelectedMonth(parseInt(value))}
            >
              <SelectTrigger className="w-28 border-border bg-card/70 text-foreground dark:border-zinc-800 dark:bg-zinc-900/70">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="border-border bg-popover text-popover-foreground dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100">
                {monthOptions.map((month) => (
                  <SelectItem key={month.value} value={month.value.toString()}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <ToggleGroup
              type="single"
              value={view}
              onValueChange={(next) => {
                if (next === "grid" || next === "list") {
                  setView(next);
                }
              }}
              variant="outline"
              className="rounded-lg border border-border bg-card/70 dark:border-zinc-800 dark:bg-zinc-900/70"
            >
              <ToggleGroupItem value="grid" aria-label="Grid view">
                <LayoutGrid className="h-4 w-4" />
              </ToggleGroupItem>
              <ToggleGroupItem value="list" aria-label="List view">
                <List className="h-4 w-4" />
              </ToggleGroupItem>
            </ToggleGroup>
          </div>
        </header>

        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-3">
            {[1, 2, 3].map((i) => (
              <Card
                key={i}
                className="border-border bg-gradient-to-br from-card to-muted/40 dark:from-zinc-900/80 dark:to-zinc-900/40 dark:border-zinc-800"
              >
                <CardHeader>
                  <Skeleton className="h-4 w-20" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-32" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="border-border bg-gradient-to-br from-card to-muted/40 dark:from-zinc-900/80 dark:to-zinc-900/40 dark:border-zinc-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Budget
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-3xl font-bold tracking-tight">
                  {formatCurrency(totalBudget)}
                </div>
                <div className="grid h-8 grid-cols-12 items-end gap-1">
                  {monthOptions.map((month) => {
                    const selected = month.value === selectedMonth;
                    return (
                      <div
                        key={month.value}
                        className={cn(
                          "rounded-sm bg-muted transition-all dark:bg-zinc-700/50",
                          selected ? "h-full bg-indigo-500/70" : "h-1/2",
                        )}
                      />
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card className="border-border bg-gradient-to-br from-card to-muted/40 dark:from-zinc-900/80 dark:to-zinc-900/40 dark:border-zinc-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Spent
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-3xl font-bold tracking-tight">
                  {formatCurrency(totalSpent)}
                </div>
                <div className="flex items-center gap-3">
                  <Progress
                    value={Math.min(percentUsed, 100)}
                    className="h-2.5 bg-muted [&>div]:bg-gradient-to-r [&>div]:from-red-400 [&>div]:to-amber-400 dark:bg-zinc-800"
                  />
                  <span className="text-xs text-muted-foreground">
                    {percentUsed.toFixed(0)}%
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 to-background dark:to-zinc-900/40">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Remaining
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div
                  className={cn(
                    "text-3xl font-bold tracking-tight",
                    isOverallOverBudget ? "text-red-400" : "text-emerald-400",
                  )}
                >
                  {isOverallOverBudget && "-"}
                  {formatCurrency(Math.abs(remaining))}
                </div>
                <div className="inline-flex items-center gap-2 text-xs text-emerald-400">
                  <Clock3 className="h-4 w-4" />
                  {isOverallOverBudget ? "Budget limit exceeded" : "On budget"}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {!isLoading && budgetData.length > 0 && (
          <Card className="border-border bg-card/70 dark:border-zinc-800 dark:bg-zinc-900/50">
            <CardContent className="grid gap-6 p-6 md:grid-cols-[180px_1fr] md:items-center">
              <div className="relative mx-auto flex h-36 w-36 items-center justify-center">
                <Progress
                  value={Math.min(percentUsed, 100)}
                  className="h-36 w-36 rounded-full bg-muted p-1 [&>div]:rounded-full [&>div]:bg-emerald-400 dark:bg-zinc-800"
                />
                <div className="absolute text-center">
                  <p className="text-2xl font-bold">{percentUsed.toFixed(0)}%</p>
                  <p className="text-xs text-muted-foreground">used</p>
                </div>
              </div>

              <div>
                <h3 className="mb-4 text-base font-semibold">Top Allocations</h3>
                <div className="space-y-3">
                  {topAllocations.map((item) => {
                    const allocationPct = (item.budgetAmount / totalBudget) * 100;
                    return (
                      <div key={item.categoryId} className="space-y-1.5">
                        <div className="flex items-center justify-between text-sm">
                          <span>{item.categoryName}</span>
                          <span className="text-muted-foreground">
                            {allocationPct.toFixed(1)}%
                          </span>
                        </div>
                        <Progress
                          value={allocationPct}
                          className="h-1.5 bg-muted [&>div]:bg-emerald-400 dark:bg-zinc-800"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Category Breakdown</h2>
          <p className="text-xs text-muted-foreground">
            {budgetData.length} categories · {MONTHS[selectedMonth - 1]}{" "}
            {selectedYear}
          </p>
        </div>

        <Card className="border-border bg-card/70 dark:border-zinc-800 dark:bg-zinc-900/50">
          <CardContent className="p-4 md:p-6">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : budgetData.length === 0 ? (
              <div className="py-10 text-center text-muted-foreground">
                No budget set for {MONTHS[selectedMonth - 1]} {selectedYear}
              </div>
            ) : view === "grid" ? (
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                {budgetData.map((item) => {
                  const itemRemaining = item.budgetAmount - item.spentAmount;
                  const status = item.isOverBudget
                    ? "over"
                    : item.percentage > 70
                      ? "warning"
                      : "onTrack";

                  return (
                    <Card
                      key={item.categoryId}
                      className="border-border bg-card/80 transition hover:-translate-y-0.5 hover:border-border dark:border-zinc-800 dark:bg-zinc-900/70 dark:hover:border-zinc-700"
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-start justify-between gap-2">
                          <CardTitle className="text-base font-medium">
                            {item.categoryName}
                          </CardTitle>
                          <Badge
                            variant="outline"
                            className={cn("gap-1", statusBadgeClasses[status])}
                          >
                            {item.isOverBudget ? (
                              <TrendingUp className="h-3 w-3" />
                            ) : item.percentage > 70 ? (
                              <AlertCircle className="h-3 w-3" />
                            ) : (
                              <TrendingDown className="h-3 w-3" />
                            )}
                            {item.isOverBudget
                              ? "Over"
                              : item.percentage > 70
                                ? "Warning"
                                : "On Track"}
                          </Badge>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <p className="text-2xl font-bold">
                          {formatCurrency(item.budgetAmount)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(item.spentAmount)} spent ·{" "}
                          <span
                            className={cn(
                              item.isOverBudget ? "text-red-400" : "text-emerald-400",
                            )}
                          >
                            {item.isOverBudget && "-"}
                            {formatCurrency(Math.abs(itemRemaining))} left
                          </span>
                        </p>
                        <div className="space-y-1.5">
                          <Progress
                            value={Math.min(item.percentage, 100)}
                            className={cn(
                              "h-2 bg-muted dark:bg-zinc-800",
                              item.isOverBudget
                                ? "[&>div]:bg-red-400"
                                : item.percentage > 70
                                  ? "[&>div]:bg-amber-400"
                                  : "[&>div]:bg-emerald-400",
                            )}
                          />
                          <p className="text-right text-xs text-muted-foreground">
                            {item.percentage.toFixed(0)}%
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border hover:bg-transparent dark:border-zinc-800">
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Budget</TableHead>
                      <TableHead className="text-right">Spent</TableHead>
                      <TableHead className="text-right">Remaining</TableHead>
                      <TableHead>Progress</TableHead>
                      <TableHead className="text-right">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {budgetData.map((item) => {
                      const itemRemaining = item.budgetAmount - item.spentAmount;
                      const status = item.isOverBudget
                        ? "over"
                        : item.percentage > 70
                          ? "warning"
                          : "onTrack";

                      return (
                        <TableRow
                          key={item.categoryId}
                          className="border-border/80 hover:bg-muted/60 dark:border-zinc-800/80 dark:hover:bg-zinc-800/40"
                        >
                          <TableCell className="font-medium">
                            {item.categoryName}
                          </TableCell>
                          <TableCell className="text-right">
                            {formatCurrency(item.budgetAmount)}
                          </TableCell>
                          <TableCell className="text-right text-muted-foreground">
                            {formatCurrency(item.spentAmount)}
                          </TableCell>
                          <TableCell
                            className={cn(
                              "text-right",
                              item.isOverBudget ? "text-red-400" : "text-emerald-400",
                            )}
                          >
                            {item.isOverBudget && "-"}
                            {formatCurrency(Math.abs(itemRemaining))}
                          </TableCell>
                          <TableCell className="min-w-36">
                            <div className="flex items-center gap-2">
                              <Progress
                                value={Math.min(item.percentage, 100)}
                                className={cn(
                                  "h-2 bg-muted dark:bg-zinc-800",
                                  item.isOverBudget
                                    ? "[&>div]:bg-red-400"
                                    : item.percentage > 70
                                      ? "[&>div]:bg-amber-400"
                                      : "[&>div]:bg-emerald-400",
                                )}
                              />
                              <span className="text-xs text-muted-foreground">
                                {item.percentage.toFixed(0)}%
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge
                              variant="outline"
                              className={cn("gap-1", statusBadgeClasses[status])}
                            >
                              {item.isOverBudget ? (
                                <TrendingUp className="h-3 w-3" />
                              ) : item.percentage > 70 ? (
                                <AlertCircle className="h-3 w-3" />
                              ) : (
                                <CheckCircle2 className="h-3 w-3" />
                              )}
                              {item.isOverBudget
                                ? "Over Budget"
                                : item.percentage > 70
                                  ? "Warning"
                                  : "On Track"}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
