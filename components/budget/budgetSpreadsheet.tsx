"use client";

import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Save } from "lucide-react";
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
        ([category_id, amount]) => ({ category_id, amount }),
      );
      const response = await fetch("/api/budget", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ month, year, items }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        toast.error(result.error || "Failed to save budget");
        return;
      }
      toast.success("Budget saved");
      onSave?.();
    } catch (error) {
      console.error("Error saving budget:", error);
      toast.error("An unexpected error occurred");
    } finally {
      setIsSaving(false);
    }
  };

  const incomeCategories = categories.filter(
    (cat) => cat.category_type === "income",
  );
  const expenseCategories = categories.filter(
    (cat) => cat.category_type === "expense",
  );

  const calculateTotal = (cats: CategoryBudgetItem[]) =>
    cats.reduce((sum, cat) => sum + (budgetItems.get(cat.category_id) || 0), 0);

  const formatCurrency = (amount: number) =>
    amount.toLocaleString("en-KE", {
      style: "currency",
      currency: "KES",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });

  const totalIncome = calculateTotal(incomeCategories);
  const totalExpenses = calculateTotal(expenseCategories);
  const netAmount = totalIncome - totalExpenses;
  const periodLabel = new Date(year, month - 1).toLocaleString("default", {
    month: "long",
    year: "numeric",
  });

  const renderSection = (
    title: "Income" | "Expenses",
    cats: CategoryBudgetItem[],
    emptyMessage: string,
    variant: "income" | "expense",
  ) => (
    <div>
      <div className="flex items-center justify-between border-b border-border py-2.5">
        <span className="text-sm font-semibold uppercase tracking-[0.1em] text-muted-foreground md:text-xs">
          {title}
        </span>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground md:text-xs">
            {cats.length} {cats.length === 1 ? "category" : "categories"}
          </span>
          <span
            className={cn(
              "font-mono text-sm font-semibold tabular-nums",
              variant === "income"
                ? "text-emerald-600 dark:text-emerald-400"
                : "text-rose-500",
            )}
          >
            {formatCurrency(calculateTotal(cats))}
          </span>
        </div>
      </div>
      {cats.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          {emptyMessage}
        </p>
      ) : (
        cats.map((cat) => (
          <div
            key={cat.category_id}
            className="-mx-1 flex items-center gap-3 rounded-sm border-b border-border/40 px-1 py-1.5 transition-colors hover:bg-muted/30"
          >
            <span className="flex-1 truncate text-sm font-medium">
              {cat.category_name}
            </span>
            {cat.repeats && (
              <span className="shrink-0 text-sm font-medium text-muted-foreground/60 md:text-xs">
                Recurring
              </span>
            )}
            <Input
              type="number"
              step="0.01"
              min="0"
              value={budgetItems.get(cat.category_id) || 0}
              onChange={(e) =>
                handleAmountChange(cat.category_id, e.target.value)
              }
              className={cn(
                "h-9 w-36 shrink-0 text-right font-mono text-sm tabular-nums",
                "border-transparent bg-transparent shadow-none",
                "hover:border-border/60 hover:bg-muted/20",
                "focus-visible:border-border focus-visible:bg-background focus-visible:ring-0 focus-visible:shadow-sm",
                "transition-all duration-150",
              )}
            />
          </div>
        ))
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Summary strip */}
      <div className="flex flex-wrap items-baseline gap-x-5 gap-y-2 border-y border-border py-3">
        <div className="flex items-baseline gap-1.5">
          <span className="text-sm font-medium uppercase tracking-widest text-muted-foreground md:text-xs">
            Income
          </span>
          <span className="font-mono text-sm font-semibold tabular-nums text-emerald-600 dark:text-emerald-400">
            {formatCurrency(totalIncome)}
          </span>
        </div>
        <span aria-hidden="true" className="select-none text-border">
          ·
        </span>
        <div className="flex items-baseline gap-1.5">
          <span className="text-sm font-medium uppercase tracking-widest text-muted-foreground md:text-xs">
            Expenses
          </span>
          <span className="font-mono text-sm font-semibold tabular-nums text-rose-500">
            {formatCurrency(totalExpenses)}
          </span>
        </div>
        <div className="ml-auto flex items-center gap-3">
          <div className="flex items-baseline gap-1.5">
            <span className="text-sm font-medium uppercase tracking-widest text-muted-foreground md:text-xs">
              Net
            </span>
            <span
              className={cn(
                "font-mono text-xl font-bold tabular-nums",
                netAmount >= 0 ? "text-foreground" : "text-rose-500",
              )}
            >
              {netAmount >= 0 ? "+" : ""}
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
            contextLabel={`${periodLabel} Budget`}
            placeholder="Ask for budgeting advice, tips, or insights based on your current budget data."
          />
        </div>
      </div>

      {/* Category tables */}
      {categories.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted-foreground">
          No categories available. Create categories first.
        </p>
      ) : (
        <div className="space-y-8">
          {renderSection(
            "Income",
            incomeCategories,
            "No income categories. Create one first.",
            "income",
          )}
          {renderSection(
            "Expenses",
            expenseCategories,
            "No expense categories. Create one first.",
            "expense",
          )}
        </div>
      )}

      {/* Save bar */}
      <div className="flex items-center justify-between gap-4 border-t border-border pt-5">
        <p className="text-sm text-muted-foreground">
          {
            categories.filter(
              (c) => (budgetItems.get(c.category_id) || 0) > 0,
            ).length
          }{" "}
          of {categories.length} categories have values
        </p>
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="min-w-[120px] gap-2"
        >
          {isSaving ? (
            <>
              <Save className="h-4 w-4 animate-pulse" />
              Saving...
            </>
          ) : (
            "Save Budget"
          )}
        </Button>
      </div>
    </div>
  );
}
