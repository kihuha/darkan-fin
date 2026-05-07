"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Save, Sparkles, TrendingDown, TrendingUp } from "lucide-react";
import { toast } from "sonner";
import { AiDialog } from "../ai-dialog";
import { cn } from "@/lib/utils";

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
    new Map(),
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
        }),
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
    (cat) => cat.category_type === "income",
  );
  const expenseCategories = categories.filter(
    (cat) => cat.category_type === "expense",
  );

  const calculateTotal = (cats: CategoryBudgetItem[]) => {
    return cats.reduce((sum, cat) => {
      const amount = budgetItems.get(cat.category_id) || 0;
      return sum + amount;
    }, 0);
  };

  const formatCurrency = (amount: number) =>
    amount.toLocaleString("en-KE", {
      style: "currency",
      currency: "KES",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const renderCategoryTable = (
    title: "Income" | "Expenses",
    cats: CategoryBudgetItem[],
    emptyMessage: string,
    variant: "income" | "expense",
  ) => (
    <Card className="overflow-hidden border-border bg-card/70 dark:border-zinc-800 dark:bg-zinc-900/50">
      <CardHeader className="border-b border-border pb-3 dark:border-zinc-800">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{title}</CardTitle>
          <Badge
            variant="outline"
            className="border-border text-muted-foreground dark:border-zinc-700 dark:text-zinc-300"
          >
            {cats.length} categories
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="grid grid-cols-[1fr_140px] border-b border-border px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground dark:border-zinc-800 dark:text-zinc-500 md:px-6">
          <span>Category</span>
          <span className="text-right">Amount</span>
        </div>
        {cats.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-muted-foreground">
            {emptyMessage}
          </div>
        ) : (
          <>
            {cats.map((category) => (
              <div
                key={category.category_id}
                className="grid min-h-14 grid-cols-[1fr_140px] items-center gap-3 border-b border-border px-4 py-2 transition hover:bg-muted/60 dark:border-zinc-800/70 dark:hover:bg-zinc-800/40 md:px-6"
              >
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{category.category_name}</span>
                  {category.repeats && (
                    <Badge
                      variant="outline"
                      className="border-indigo-500/30 bg-indigo-500/10 text-indigo-300"
                    >
                      Recurring
                    </Badge>
                  )}
                </div>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  className={cn(
                    "h-9 border-border bg-background text-right font-mono text-sm text-foreground dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100",
                    "focus-visible:ring-indigo-500/60",
                  )}
                  value={budgetItems.get(category.category_id) || 0}
                  onChange={(e) =>
                    handleAmountChange(category.category_id, e.target.value)
                  }
                />
              </div>
            ))}
            <div className="grid min-h-14 grid-cols-[1fr_140px] items-center bg-muted/60 px-4 py-2 dark:bg-zinc-800/50 md:px-6">
              <span className="text-sm font-semibold">Total</span>
              <span
                className={cn(
                  "text-right font-mono text-sm font-semibold",
                  variant === "income" ? "text-emerald-400" : "text-rose-400",
                )}
              >
                {formatCurrency(calculateTotal(cats))}
              </span>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );

  const totalIncome = calculateTotal(incomeCategories);
  const totalExpenses = calculateTotal(expenseCategories);
  const netAmount = totalIncome - totalExpenses;
  const recurringTotal = expenseCategories
    .filter((cat) => cat.repeats)
    .reduce((sum, cat) => sum + (budgetItems.get(cat.category_id) || 0), 0);

  return (
    <div className="space-y-6">
      <Card
        className={cn(
          "border p-0",
          netAmount >= 0
            ? "border-emerald-500/30 bg-gradient-to-r from-emerald-500/10 to-background dark:to-zinc-900/40"
            : "border-rose-500/30 bg-gradient-to-r from-rose-500/10 to-background dark:to-zinc-900/40",
        )}
      >
        <CardContent className="flex flex-col items-start justify-between gap-3 p-4 md:flex-row md:items-center md:p-5">
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">Net Amount:</span>
            <span
              className={cn(
                "font-mono text-xl font-bold",
                netAmount >= 0 ? "text-emerald-400" : "text-rose-400",
              )}
            >
              {formatCurrency(netAmount)}
            </span>
          </div>
          <AiDialog
            context={{ incomeCategories, expenseCategories }}
            suggestions={[
              "How can I reduce my monthly expenses?",
              "What are effective budgeting strategies?",
              "Analyze my spending patterns",
              "How should I allocate my income?",
              "Tips for managing debt",
              "How to create a realistic budget?",
              "What's a good emergency fund amount?",
              "How can I save more money?",
            ]}
            contextLabel={`${new Date(year, month - 1).toLocaleString("default", { month: "long", year: "numeric" })} Budget`}
            placeholder="Ask for budgeting advice, tips, or insights based on your current budget data."
          />
        </CardContent>
      </Card>

      <div className="grid gap-3 md:grid-cols-3">
        <Card className="border-emerald-500/30 bg-emerald-500/10">
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Income
            </p>
            <p className="mt-1 font-mono text-xl font-bold text-emerald-400">
              {formatCurrency(totalIncome)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-rose-500/30 bg-rose-500/10">
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Expenses
            </p>
            <p className="mt-1 font-mono text-xl font-bold text-rose-400">
              {formatCurrency(totalExpenses)}
            </p>
          </CardContent>
        </Card>
        <Card className="border-indigo-500/30 bg-indigo-500/10">
          <CardContent className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">
              Recurring
            </p>
            <p className="mt-1 font-mono text-xl font-bold text-indigo-300">
              {formatCurrency(recurringTotal)}
            </p>
          </CardContent>
        </Card>
      </div>

      {categories.length === 0 ? (
        <Card className="border-border bg-card/70 dark:border-zinc-800 dark:bg-zinc-900/50">
          <CardContent className="p-8 text-center text-muted-foreground">
          No categories available. Create categories first.
          </CardContent>
        </Card>
      ) : (
        <>
          {renderCategoryTable(
            "Income",
            incomeCategories,
            "No income categories. Create an income category first.",
            "income",
          )}
          {renderCategoryTable(
            "Expenses",
            expenseCategories,
            "No expense categories. Create an expense category first.",
            "expense",
          )}
        </>
      )}

      <Card className="border-border bg-card/70 dark:border-zinc-800 dark:bg-zinc-900/50">
        <CardContent className="flex flex-col items-start justify-between gap-4 p-4 md:flex-row md:items-center md:p-5">
          <p className="text-sm text-muted-foreground">
            {expenseCategories.filter((c) => (budgetItems.get(c.category_id) || 0) > 0)
              .length}{" "}
            expense categories and{" "}
            {incomeCategories.filter((c) => (budgetItems.get(c.category_id) || 0) > 0)
              .length}{" "}
            income sources have values.
          </p>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="w-full gap-2 md:w-auto"
          >
            {isSaving ? (
              <>
                <Save className="h-4 w-4 animate-pulse" />
                Saving...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Save Budget
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
