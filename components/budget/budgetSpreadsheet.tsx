"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Save, Download } from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

interface CategoryBudgetItem {
  category_id: string;
  category_name: string;
  category_type: "income" | "expense";
  category_amount: number;
  repeats: boolean;
  amount: number;
  budget_item_id?: string;
}

interface BudgetSpreadsheetProps {
  month: number;
  year: number;
  categories: CategoryBudgetItem[];
  onSave?: () => void;
}

export function BudgetSpreadsheet({
  month,
  year,
  categories,
  onSave,
}: BudgetSpreadsheetProps) {
  const [budgetItems, setBudgetItems] = useState<Map<string, number>>(
    new Map()
  );
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    // Initialize budget items from categories
    const itemsMap = new Map<string, number>();
    categories.forEach((cat) => {
      itemsMap.set(cat.category_id, cat.amount);
    });
    setBudgetItems(itemsMap);
  }, [categories]);

  const handleAmountChange = (categoryId: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    setBudgetItems((prev) => new Map(prev).set(categoryId, numValue));
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);

      const items = Array.from(budgetItems.entries()).map(
        ([category_id, amount]) => ({
          category_id,
          amount,
        })
      );

      const response = await fetch("/api/budget", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          month,
          year,
          items,
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        toast.error(result.error || "Failed to save budget");
        return;
      }

      toast.success("Budget saved successfully");
      onSave?.();
    } catch (error) {
      console.error("Error saving budget:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsSaving(false);
    }
  };

  // Separate categories into income and expenses based on type
  const incomeCategories = categories.filter(
    (cat) => cat.category_type === "income"
  );
  const expenseCategories = categories.filter(
    (cat) => cat.category_type === "expense"
  );

  const calculateTotal = (cats: CategoryBudgetItem[]) => {
    return cats.reduce((sum, cat) => {
      const amount = budgetItems.get(cat.category_id) || 0;
      return sum + amount;
    }, 0);
  };

  const handleDownload = () => {
    try {
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

      // Prepare data for export
      const incomeData = incomeCategories.map((cat) => ({
        Category: cat.category_name,
        "Budget Amount": budgetItems.get(cat.category_id) || 0,
      }));

      const expenseData = expenseCategories.map((cat) => ({
        Category: cat.category_name,
        "Budget Amount": budgetItems.get(cat.category_id) || 0,
      }));

      // Create workbook
      const wb = XLSX.utils.book_new();

      // Add income sheet
      if (incomeData.length > 0) {
        const incomeSheet = XLSX.utils.json_to_sheet(incomeData);
        XLSX.utils.book_append_sheet(wb, incomeSheet, "Income");
      }

      // Add expense sheet
      if (expenseData.length > 0) {
        const expenseSheet = XLSX.utils.json_to_sheet(expenseData);
        XLSX.utils.book_append_sheet(wb, expenseSheet, "Expenses");
      }

      // Calculate totals before creating summary sheet
      const totalIncome = calculateTotal(incomeCategories);
      const totalExpenses = calculateTotal(expenseCategories);
      const netAmount = totalIncome - totalExpenses;

      // Add summary sheet
      const summaryData = [
        { Metric: "Total Income", Amount: totalIncome },
        { Metric: "Total Expenses", Amount: totalExpenses },
        { Metric: "Net Amount", Amount: netAmount },
      ];
      const summarySheet = XLSX.utils.json_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, summarySheet, "Summary");

      // Generate filename
      const monthName = MONTHS[month - 1];
      const filename = `Budget_${monthName}_${year}.xlsx`;

      // Download file
      XLSX.writeFile(wb, filename);
      toast.success("Budget downloaded successfully");
    } catch (error) {
      console.error("Error downloading budget:", error);
      toast.error("Failed to download budget");
    }
  };

  const renderCategoryTable = (
    title: string,
    cats: CategoryBudgetItem[],
    emptyMessage: string
  ) => (
    <div className="space-y-2">
      <h3 className="text-lg font-semibold">{title}</h3>
      <div className=" border border-white/60 bg-white/70 shadow-sm backdrop-blur">
        <div className="overflow-x-auto">
          <Table className="min-w-90">
            <TableHeader>
              <TableRow>
                <TableHead className="w-[60%]">Category</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {cats.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={2}
                    className="text-center text-muted-foreground"
                  >
                    {emptyMessage}
                  </TableCell>
                </TableRow>
              ) : (
                <>
                  {cats.map((category) => (
                    <TableRow key={category.category_id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <span>{category.category_name}</span>
                          {category.repeats && (
                            <span className="text-xs text-muted-foreground">
                              (Recurring)
                            </span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          className="text-right font-mono"
                          value={budgetItems.get(category.category_id) || 0}
                          onChange={(e) =>
                            handleAmountChange(
                              category.category_id,
                              e.target.value
                            )
                          }
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="bg-muted/40 font-semibold">
                    <TableCell>Total</TableCell>
                    <TableCell className="text-right font-mono">
                      {calculateTotal(cats).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </TableCell>
                  </TableRow>
                </>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );

  const totalIncome = calculateTotal(incomeCategories);
  const totalExpenses = calculateTotal(expenseCategories);
  const netAmount = totalIncome - totalExpenses;

  return (
    <div className="space-y-6">
      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <div className="text-sm text-muted-foreground">
            Net Amount:{" "}
            <span
              className={`font-bold ${
                netAmount >= 0 ? "text-green-600" : "text-red-600"
              }`}
            >
              {netAmount.toLocaleString(undefined, {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </span>
          </div>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full sm:w-auto"
          >
            {isSaving ? (
              <>
                <Save className="mr-2 h-4 w-4 animate-pulse" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Budget
              </>
            )}
          </Button>
          <Button
            onClick={handleDownload}
            variant="outline"
            className="w-full sm:w-auto"
          >
            <Download className="mr-2 h-4 w-4" />
            Download XLSX
          </Button>
        </div>
      </div>

      {categories.length === 0 ? (
        <div className=" border border-white/60 bg-white/70 p-8 text-center text-muted-foreground shadow-sm backdrop-blur">
          No categories available. Create categories first.
        </div>
      ) : (
        <>
          {renderCategoryTable(
            "Income",
            incomeCategories,
            "No income categories. Create an income category first."
          )}
          {renderCategoryTable(
            "Expenses",
            expenseCategories,
            "No expense categories. Create an expense category first."
          )}
        </>
      )}
    </div>
  );
}
