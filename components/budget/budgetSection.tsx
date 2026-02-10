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
import { Header } from "../header";

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
    <div>
      <Header
        label="Budget"
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

      {isLoading ? (
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
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
  );
};
