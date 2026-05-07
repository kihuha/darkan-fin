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
  const currentMonth = currentDate.getMonth() + 1;

  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [selectedMonth, setSelectedMonth] = useState<number>(currentMonth);
  const [budgetData, setBudgetData] = useState<BudgetData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Budget</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {MONTHS[selectedMonth - 1]} {selectedYear}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select
            value={selectedYear.toString()}
            onValueChange={(value) => setSelectedYear(parseInt(value))}
          >
            <SelectTrigger className="w-24">
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
            <SelectTrigger className="w-36">
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
      </header>

      {isLoading ? (
        <div className="space-y-6">
          <div className="flex items-baseline gap-5 border-y border-border py-3">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-40" />
            <Skeleton className="ml-auto h-6 w-36" />
          </div>
          <div>
            <div className="flex items-center justify-between border-b border-border py-2.5">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-4 w-28" />
            </div>
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="flex items-center justify-between border-b border-border/40 py-2"
              >
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-9 w-36" />
              </div>
            ))}
          </div>
          <div>
            <div className="flex items-center justify-between border-b border-border py-2.5">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-4 w-28" />
            </div>
            {[1, 2, 3, 4, 5].map((i) => (
              <div
                key={i}
                className="flex items-center justify-between border-b border-border/40 py-2"
              >
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-9 w-36" />
              </div>
            ))}
          </div>
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
  );
};
