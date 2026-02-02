"use client";

import { useEffect, useState } from "react";
import { type Transaction } from "@/lib/validations/transaction";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus } from "lucide-react";
import { toast } from "sonner";

type TransactionWithCategory = Transaction & {
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

  const fetchTransactions = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/transaction");
      const result = await response.json();

      if (result.success) {
        setTransactions(result.data);
      } else {
        toast.error("Failed to load transactions");
      }
    } catch (error) {
      console.error("Error fetching transactions:", error);
      toast.error("Failed to load transactions");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const handleEdit = (transaction: TransactionWithCategory) => {
    setSelectedTransaction(transaction);
    setIsDialogOpen(true);
  };

  const handleDelete = (transaction: TransactionWithCategory) => {
    setTransactionToDelete(transaction);
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

      const result = await response.json();

      if (result.success) {
        toast.success("Transaction deleted successfully");
        fetchTransactions();
      } else {
        toast.error(result.error || "Failed to delete transaction");
      }
    } catch (error) {
      console.error("Error deleting transaction:", error);
      toast.error("Failed to delete transaction");
    } finally {
      setTransactionToDelete(null);
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
          <Select
            value={selectedCategoryFilter || "all"}
            onValueChange={(value) =>
              setSelectedCategoryFilter(value === "all" ? null : value)
            }
          >
            <SelectTrigger className="w-full sm:w-auto">
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {uniqueCategories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            variant="outline"
            onClick={handleRecategorize}
            disabled={isRecategorizing}
            className="w-full sm:w-auto"
          >
            {isRecategorizing
              ? "Recategorizing..."
              : "Recategorize Transactions"}
          </Button>
          <MpesaImportDialog
            onImported={fetchTransactions}
            triggerClassName="w-full sm:w-auto"
            triggerVariant="outline"
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
                onCancel={() => handleDialogChange(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {transactions.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyTitle>No transactions yet</EmptyTitle>
            <EmptyDescription>
              Start tracking your finances by adding your first transaction
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
                className="w-full sm:w-auto"
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
        <TransactionTable
          transactions={filteredTransactions}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
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
