"use client";

import { useCallback, useEffect, useState } from "react";
import { format } from "date-fns";
import { TransactionTable } from "./transactionTable";
import { TransactionForm } from "../forms/transactionForm";
import { MpesaImportDialog } from "./mpesaImportDialog";
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
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { TransactionFilters } from "./transactionFilters";

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

export const TransactionSection = () => {
  const [transactions, setTransactions] = useState<TransactionWithCategory[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(true);
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

  const fetchTransactions = useCallback(async () => {
    try {
      setIsLoading(true);
      const searchParams = new URLSearchParams({
        month: selectedMonth.toString(),
        year: selectedYear.toString(),
      });

      const response = await fetch(
        `/api/transaction?${searchParams.toString()}`,
      );
      const result = await response.json();

      if (response.ok && result.success) {
        setTransactions(result.data.rows);
      } else {
        toast.error(result.error || "Failed to load transactions");
      }
    } catch (error) {
      console.error("Error fetching transactions:", error);
      toast.error("Failed to load transactions");
    } finally {
      setIsLoading(false);
    }
  }, [selectedMonth, selectedYear]);

  useEffect(() => {
    fetchTransactions();
  }, [selectedMonth, selectedYear, fetchTransactions]);

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
        toast.success("Transaction deleted successfully");
        fetchTransactions();
      } else {
        const result = await response.json();
        toast.error(result.error || "Failed to delete transaction");
      }
    } catch (error) {
      console.error("Error deleting transaction:", error);
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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: transactionId,
          category_id: categoryId,
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Update the local state with the updated transaction
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
        toast.success("Category updated successfully");
      } else {
        toast.error(result.error || "Failed to update category");
      }
    } catch (error) {
      console.error("Error updating category:", error);
      toast.error("Failed to update category");
    }
  };

  const handleBulkDelete = async (transactionIds: string[]) => {
    try {
      // Delete transactions sequentially or in parallel
      const deletePromises = transactionIds.map((id) =>
        fetch(`/api/transaction?id=${id}`, {
          method: "DELETE",
        }),
      );

      const responses = await Promise.all(deletePromises);

      const allSuccessful = responses.every(
        (response) => response.status === 204,
      );

      if (allSuccessful) {
        // Update local state by removing deleted transactions
        setTransactions((prev) =>
          prev.filter((t) => !transactionIds.includes(t.id.toString())),
        );
        toast.success(
          `Successfully deleted ${transactionIds.length} transaction(s)`,
        );
      } else {
        toast.error("Some transactions failed to delete");
        // Refresh to get accurate state
        fetchTransactions();
      }
    } catch (error) {
      console.error("Error deleting transactions:", error);
      toast.error("Failed to delete transactions");
      // Refresh to get accurate state
      fetchTransactions();
    }
  };

  const handleSuccess = () => {
    setIsDialogOpen(false);
    setSelectedTransaction(null);
    fetchTransactions();
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
        `Recategorized ${updated ?? 0} transactions${
          scanned ? ` (scanned ${scanned})` : ""
        }.`,
      );
      fetchTransactions();
    } catch (error) {
      console.error("Error recategorizing transactions:", error);
      toast.error("Failed to recategorize transactions");
    } finally {
      setIsRecategorizing(false);
    }
  };

  const handleDialogChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) {
      setSelectedTransaction(null);
    }
  };

  // Get unique categories from transactions
  const uniqueCategories = Array.from(
    new Set(transactions.map((t) => t.category_name)),
  ).sort();

  // Filter transactions based on selected category
  const filteredTransactions =
    selectedCategoryFilter === null
      ? transactions
      : transactions.filter((t) => t.category_name === selectedCategoryFilter);

  // Group transactions by day
  const groupedTransactions = Object.entries(
    filteredTransactions.reduce<Record<string, TransactionWithCategory[]>>(
      (groups, transaction) => {
        const dateKey = transaction.transaction_date.split("T")[0];

        if (!groups[dateKey]) {
          groups[dateKey] = [];
        }

        groups[dateKey].push(transaction);
        return groups;
      },
      {},
    ),
  ).sort(([left], [right]) => right.localeCompare(left));

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <Skeleton className="h-8 w-40" />
          <Skeleton className="h-10 w-full sm:w-40" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <h2 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            Transactions
          </h2>
          <p className="text-sm text-muted-foreground sm:text-base">
            Track all your income and expenses
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
          <TransactionFilters
            categories={uniqueCategories}
            selectedCategory={selectedCategoryFilter}
            onCategoryChange={setSelectedCategoryFilter}
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
            onMonthChange={setSelectedMonth}
            onYearChange={setSelectedYear}
            onRecategorize={handleRecategorize}
            isRecategorizing={isRecategorizing}
            onImported={fetchTransactions}
          />

          <Dialog open={isDialogOpen} onOpenChange={handleDialogChange}>
            <DialogTrigger asChild>
              <Button className="w-full sm:w-auto">
                <Plus className="mr-2 h-4 w-4" />
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
                    ? "Update the details of your transaction"
                    : "Add a new transaction to track your finances"}
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
        </div>
      </div>

      {transactions.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>No transactions in this period</EmptyTitle>
            <EmptyDescription>
              Try selecting a different month or year, or add a new transaction
            </EmptyDescription>
          </EmptyHeader>
          <EmptyContent>
            <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-center">
              <MpesaImportDialog
                onImported={fetchTransactions}
                triggerClassName="w-full sm:w-auto"
                triggerVariant="outline"
              />
              <Button
                onClick={() => setIsDialogOpen(true)}
                className="hidden w-full md:w-auto"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Transaction
              </Button>
            </div>
          </EmptyContent>
        </Empty>
      ) : filteredTransactions.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>No transactions in this category</EmptyTitle>
            <EmptyDescription>
              Try selecting a different category or add a new transaction
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="space-y-5">
          {groupedTransactions.map(([dateKey, dayTransactions]) => {
            const [year, month, day] = dateKey.split("-").map(Number);
            const dayDate = new Date(year, month - 1, day);

            return (
              <section key={dateKey} className="space-y-2">
                <h3 className="text-sm font-medium text-muted-foreground">
                  {format(dayDate, "EEEE, MMM d, yyyy")}
                </h3>
                <TransactionTable
                  transactions={dayTransactions}
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
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the
              transaction.
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
