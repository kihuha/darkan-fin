"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { TransactionTable } from "./transactionTable";
import { TransactionForm } from "../forms/transactionForm";
import { StatementImportDialog } from "./statementImportDialog";
import { TransactionFilters } from "./transactionFilters";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { type Category } from "@/lib/validations/category";
import { cn, MONTHS } from "@/lib/utils";

type Transaction = {
  id: number;
  amount: number;
  description: string;
  transaction_date: string;
  category_id: number;
  family_id: number;
};
export type TransactionWithCategory = Transaction & {
  category_name: string;
  category_type: "income" | "expense";
};

const formatCurrency = (amount: number) =>
  amount.toLocaleString("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  });

export const TransactionSection = () => {
  const [transactions, setTransactions] = useState<TransactionWithCategory[]>(
    [],
  );
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [isRecategorizing, setIsRecategorizing] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedTransaction, setSelectedTransaction] =
    useState<TransactionWithCategory | null>(null);
  const [transactionToDelete, setTransactionToDelete] =
    useState<TransactionWithCategory | null>(null);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<
    string | null
  >(null);
  const [selectedMonth, setSelectedMonth] = useState(
    () => new Date().getMonth() + 1,
  );
  const [selectedYear, setSelectedYear] = useState(() =>
    new Date().getFullYear(),
  );

  const yearOptions = Array.from(
    { length: 11 },
    (_, i) => new Date().getFullYear() - i,
  );
  const monthOptions = MONTHS.map((label, i) => ({ label, value: i + 1 }));

  const fetchTransactions = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        month: selectedMonth.toString(),
        year: selectedYear.toString(),
      });
      const response = await fetch(`/api/transaction?${params}`);
      const result = await response.json();
      if (response.ok && result.success) {
        setTransactions(result.data.rows);
      } else {
        toast.error(result.error || "Failed to load transactions");
      }
    } catch {
      toast.error("Failed to load transactions");
    } finally {
      setIsLoading(false);
    }
  }, [selectedMonth, selectedYear]);

  // Fetch categories once for the whole page; pass down to table instances
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setIsLoadingCategories(true);
        const response = await fetch("/api/category");
        const result = await response.json();
        if (result.success) setCategories(result.data);
      } catch {
        // silently fail — category select will be disabled
      } finally {
        setIsLoadingCategories(false);
      }
    };
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const handleEdit = (transaction: TransactionWithCategory) => {
    setSelectedTransaction(transaction);
    setIsDialogOpen(true);
  };

  const handleDelete = (transaction: TransactionWithCategory) => {
    setTransactionToDelete(transaction);
    setIsDialogOpen(false);
  };

  const confirmDelete = async () => {
    if (!transactionToDelete) return;
    try {
      const response = await fetch(
        `/api/transaction?id=${transactionToDelete.id}`,
        {
          method: "DELETE",
        },
      );
      if (response.status === 204) {
        toast.success("Transaction deleted");
        fetchTransactions();
      } else {
        const result = await response.json();
        toast.error(result.error || "Failed to delete transaction");
      }
    } catch {
      toast.error("Failed to delete transaction");
    } finally {
      setTransactionToDelete(null);
    }
  };

  const handleCategoryChange = async (
    transactionId: string,
    categoryId: string,
  ) => {
    try {
      const response = await fetch("/api/transaction", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: transactionId, category_id: categoryId }),
      });
      const result = await response.json();
      if (result.success) {
        setTransactions((prev) =>
          prev.map((t) =>
            t.id.toString() === transactionId
              ? {
                  ...t,
                  category_id: Number(result.data.category_id),
                  category_name: result.data.category_name,
                  category_type: result.data.category_type,
                }
              : t,
          ),
        );
        toast.success("Category updated");
      } else {
        toast.error(result.error || "Failed to update category");
      }
    } catch {
      toast.error("Failed to update category");
    }
  };

  const handleBulkDelete = async (transactionIds: string[]) => {
    try {
      const responses = await Promise.all(
        transactionIds.map((id) =>
          fetch(`/api/transaction?id=${id}`, { method: "DELETE" }),
        ),
      );
      if (responses.every((r) => r.status === 204)) {
        setTransactions((prev) =>
          prev.filter((t) => !transactionIds.includes(t.id.toString())),
        );
        toast.success(
          `Deleted ${transactionIds.length} transaction${transactionIds.length === 1 ? "" : "s"}`,
        );
      } else {
        toast.error("Some transactions failed to delete");
        fetchTransactions();
      }
    } catch {
      toast.error("Failed to delete transactions");
      fetchTransactions();
    }
  };

  const handleSuccess = () => {
    setIsDialogOpen(false);
    setSelectedTransaction(null);
    fetchTransactions();
  };

  const handleDialogChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) setSelectedTransaction(null);
  };

  const handleRecategorize = async () => {
    try {
      setIsRecategorizing(true);
      const response = await fetch("/api/category?action=recategorize", {
        method: "POST",
      });
      const result = await response.json();
      if (!response.ok || !result.success) {
        toast.error(result.error || "Failed to recategorize transactions");
        return;
      }
      const { updated, scanned } = result.data ?? {};
      toast.success(
        `Recategorized ${updated ?? 0} transactions${scanned ? ` (scanned ${scanned})` : ""}`,
      );
      fetchTransactions();
    } catch {
      toast.error("Failed to recategorize transactions");
    } finally {
      setIsRecategorizing(false);
    }
  };

  const uniqueCategories = Array.from(
    new Set(transactions.map((t) => t.category_name)),
  ).sort();

  const filteredTransactions =
    selectedCategoryFilter === null
      ? transactions
      : transactions.filter((t) => t.category_name === selectedCategoryFilter);

  const groupedTransactions = Object.entries(
    filteredTransactions.reduce<Record<string, TransactionWithCategory[]>>(
      (groups, t) => {
        const dateKey = t.transaction_date.split("T")[0];
        if (!groups[dateKey]) groups[dateKey] = [];
        groups[dateKey].push(t);
        return groups;
      },
      {},
    ),
  ).sort(([a], [b]) => b.localeCompare(a));

  const newTransactionDialog = (
    <Dialog open={isDialogOpen} onOpenChange={handleDialogChange}>
      <DialogTrigger asChild>
        <Button className="shrink-0 gap-1.5">
          <Plus className="h-4 w-4" />
          New Transaction
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-125">
        <DialogHeader>
          <DialogTitle>
            {selectedTransaction ? "Edit Transaction" : "New Transaction"}
          </DialogTitle>
          <DialogDescription>
            {selectedTransaction
              ? "Update the transaction details below"
              : "Add a transaction to track your finances"}
          </DialogDescription>
        </DialogHeader>
        <TransactionForm
          transaction={selectedTransaction}
          onSuccess={handleSuccess}
          onDelete={handleDelete}
          onCancel={() => handleDialogChange(false)}
        />
      </DialogContent>
    </Dialog>
  );

  if (isLoading) {
    return (
      <div>
        <div className="mb-6 flex items-start justify-between border-b pb-6 dark:border-zinc-800">
          <div className="space-y-1.5">
            <Skeleton className="h-7 w-36" />
            <Skeleton className="h-4 w-52" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-32" />
            <Skeleton className="h-9 w-24" />
            <Skeleton className="h-9 w-36" />
          </div>
        </div>
        <div className="mb-6 flex gap-2">
          <Skeleton className="h-9 w-48" />
          <Skeleton className="h-9 w-28" />
          <Skeleton className="h-9 w-32" />
        </div>
        <div className="space-y-6">
          {[1, 2].map((i) => (
            <div key={i}>
              <Skeleton className="mb-3 h-4 w-36" />
              {[1, 2, 3].map((j) => (
                <div
                  key={j}
                  className="flex items-center justify-between border-b py-3 dark:border-zinc-800"
                >
                  <Skeleton className="h-4 w-48" />
                  <Skeleton className="h-4 w-24" />
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-start justify-between flex-wrap gap-y-4 border-b pb-6 dark:border-zinc-800">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Transactions
          </h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {transactions.length} transactions · {MONTHS[selectedMonth - 1]}{" "}
            {selectedYear}
          </p>
        </div>
        <div className="flex items-center gap-2">
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
          {newTransactionDialog}
        </div>
      </div>

      {/* Filters row */}
      <div className="mb-6">
        <TransactionFilters
          categories={uniqueCategories}
          selectedCategory={selectedCategoryFilter}
          onCategoryChange={setSelectedCategoryFilter}
          onRecategorize={handleRecategorize}
          isRecategorizing={isRecategorizing}
          onImported={fetchTransactions}
        />
      </div>

      {/* Content */}
      {transactions.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-sm font-medium">No transactions in this period</p>
          <p className="mt-1 mb-4 text-sm text-muted-foreground md:text-xs">
            Try a different month, or import a bank statement
          </p>
          <div className="flex justify-center gap-2">
            <StatementImportDialog
              onImported={fetchTransactions}
              triggerVariant="outline"
            />
            <Button onClick={() => setIsDialogOpen(true)}>
              <Plus className="mr-1.5 h-4 w-4" />
              Add Transaction
            </Button>
          </div>
        </div>
      ) : filteredTransactions.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-sm text-muted-foreground">
            No transactions in this category
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {groupedTransactions.map(([dateKey, dayTransactions]) => {
            const [year, month, day] = dateKey.split("-").map(Number);
            const dayDate = new Date(year, month - 1, day);

            const dayNet = dayTransactions.reduce(
              (sum, t) =>
                sum +
                (t.category_type === "income"
                  ? Number(t.amount)
                  : -Number(t.amount)),
              0,
            );

            return (
              <section key={dateKey}>
                <div className="mb-1 flex items-center gap-4 border-b pb-2 dark:border-zinc-800">
                  <span className="text-sm font-semibold uppercase tracking-[0.1em] text-muted-foreground md:text-xs">
                    {format(dayDate, "EEEE, MMM d")}
                  </span>
                  <span
                    className={cn(
                      "ml-auto text-sm tabular-nums font-medium md:text-xs",
                      dayNet >= 0
                        ? "text-emerald-600 dark:text-emerald-400"
                        : "text-muted-foreground",
                    )}
                  >
                    {dayNet >= 0 ? "+" : ""}
                    {formatCurrency(dayNet)}
                  </span>
                </div>
                <TransactionTable
                  transactions={dayTransactions}
                  categories={categories}
                  isLoadingCategories={isLoadingCategories}
                  onEdit={handleEdit}
                  onCategoryChange={handleCategoryChange}
                  onDelete={handleBulkDelete}
                  showDateColumn={false}
                />
              </section>
            );
          })}
        </div>
      )}

      <AlertDialog
        open={!!transactionToDelete}
        onOpenChange={(open) => !open && setTransactionToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Transaction</AlertDialogTitle>
            <AlertDialogDescription>
              Delete &ldquo;{transactionToDelete?.description}&rdquo;? This
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
