"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BudgetSpreadsheet } from "./budgetSpreadsheet";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

interface BudgetData {
  id: string;
  month: number;
  year: number;
  categories: Array<{
    category_id: string;
    category_name: string;
    category_type: "income" | "expense";
    category_amount: number;
    repeats: boolean;
    amount: number;
    budget_item_id?: string;
  }>;
}

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

export const BudgetSection = () => {
  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1; // 0-indexed to 1-indexed

  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);
  const [budgetData, setBudgetData] = useState<BudgetData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Generate year options (last year + this year + next 6 years = 8 total)
  const yearOptions = Array.from({ length: 8 }, (_, i) => currentYear - 1 + i);

  const fetchBudget = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch(
        `/api/budget?month=${selectedMonth}&year=${selectedYear}`,
      );
      const result = await response.json();

      if (result.success) {
        setBudgetData(result.data);
      } else {
        toast.error("Failed to load budget");
      }
    } catch (error) {
      console.error("Error fetching budget:", error);
      toast.error("Failed to load budget");
    } finally {
      setIsLoading(false);
    }
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    fetchBudget();
  }, [fetchBudget]);

  const monthOptions = MONTHS.map((month, index) => ({
    label: month,
    value: index + 1,
  }));

  return (
    <div className="relative left-1/2 right-1/2 min-h-screen w-screen -translate-x-1/2 overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute -right-20 -top-16 h-72 w-72 rounded-full bg-indigo-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -left-24 bottom-16 h-72 w-72 rounded-full bg-pink-500/10 blur-3xl" />

      <div className="relative z-10 mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-4 md:px-6 md:py-6">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Personal Finance
            </p>
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
              Budget
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={selectedYear.toString()}
              onValueChange={(value) => setSelectedYear(parseInt(value))}
            >
              <SelectTrigger className="w-28 border-border bg-card/70 text-foreground dark:border-zinc-800 dark:bg-zinc-900/70 dark:text-zinc-100">
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
              <SelectTrigger className="w-36 border-border bg-card/70 text-foreground dark:border-zinc-800 dark:bg-zinc-900/70 dark:text-zinc-100">
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
          </div>
        </header>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        ) : budgetData ? (
          <BudgetSpreadsheet
            month={selectedMonth}
            year={selectedYear}
            categories={budgetData.categories || []}
            onSave={fetchBudget}
          />
        ) : null}
      </div>
    </div>
  );
};
