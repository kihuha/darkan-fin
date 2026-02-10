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
import { TrendingUp, TrendingDown, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Transaction } from "@/lib/validations/transaction";
import { Header } from "@/components/header";

type TransactionWithCategory = Transaction & {
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

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

export default function DashboardPage() {
  const currentDate = new Date();
  const [selectedMonth, setSelectedMonth] = useState(
    currentDate.getMonth() + 1,
  );
  const [selectedYear, setSelectedYear] = useState(currentDate.getFullYear());
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

      if (!transactionResult.success) {
        toast.error("Failed to load transactions");
        return;
      }

      const transactions: TransactionWithCategory[] = transactionResult.data;

      // Calculate spending per category
      const spendingByCategory = transactions
        .filter((t) => t.category_type === "expense")
        .reduce((acc: Record<string, number>, transaction) => {
          const categoryId = transaction.categoryId;
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

  return (
    <div className="space-y-6 animate-fade-up">
      <Header
        label="Dashboard"
        actions={
          <div className="flex items-center gap-4">
            <Select
              value={selectedYear.toString()}
              onValueChange={(value) => setSelectedYear(parseInt(value))}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
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
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map((month) => (
                  <SelectItem key={month.value} value={month.value.toString()}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        }
      />

      {/* Summary Cards */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
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
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Budget
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                $
                {totalBudget.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Spent
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                $
                {totalSpent.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                })}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Remaining
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className={`text-2xl font-bold ${
                  isOverallOverBudget ? "text-red-600" : "text-green-600"
                }`}
              >
                {isOverallOverBudget && "-"}$
                {Math.abs(totalBudget - totalSpent).toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Budget Table */}
      <Card>
        <CardHeader>
          <CardTitle>Category Breakdown</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-2">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : budgetData.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No budget set for {MONTHS[selectedMonth - 1]} {selectedYear}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
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
                    const remaining = item.budgetAmount - item.spentAmount;
                    const progressColor = item.isOverBudget
                      ? "bg-red-600"
                      : item.percentage > 90
                        ? "bg-orange-500"
                        : item.percentage > 75
                          ? "bg-yellow-500"
                          : "bg-green-600";

                    return (
                      <TableRow key={item.categoryId}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {item.isOverBudget && (
                              <AlertCircle className="h-4 w-4 text-red-600" />
                            )}
                            {item.categoryName}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          $
                          {item.budgetAmount.toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                          })}
                        </TableCell>
                        <TableCell className="text-right font-mono">
                          $
                          {item.spentAmount.toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                          })}
                        </TableCell>
                        <TableCell
                          className={`text-right font-mono ${
                            item.isOverBudget
                              ? "text-red-600"
                              : "text-green-600"
                          }`}
                        >
                          {item.isOverBudget && "-"}$
                          {Math.abs(remaining).toLocaleString("en-US", {
                            minimumFractionDigits: 2,
                          })}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Progress
                              value={Math.min(item.percentage, 100)}
                              className={cn("h-2", progressColor)}
                            />
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {item.percentage.toFixed(0)}%
                            </span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          {item.isOverBudget ? (
                            <Badge variant="destructive" className="gap-1">
                              <TrendingUp className="h-3 w-3" />
                              Over Budget
                            </Badge>
                          ) : item.percentage > 90 ? (
                            <Badge
                              variant="secondary"
                              className="gap-1 bg-amber-100 text-amber-800 hover:bg-amber-200 dark:bg-amber-900 dark:text-amber-200"
                            >
                              <AlertCircle className="h-3 w-3" />
                              Near Limit
                            </Badge>
                          ) : (
                            <Badge variant="default" className="gap-1">
                              <TrendingDown className="h-3 w-3" />
                              On Track
                            </Badge>
                          )}
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
  );
}
