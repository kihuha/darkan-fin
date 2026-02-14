"use client";

import { useEffect, useState } from "react";

import { type Category } from "@/lib/validations/category";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { TransactionWithCategory } from "./transactionSection";

interface TransactionTableProps {
  transactions: TransactionWithCategory[];
  onEdit: (transaction: TransactionWithCategory) => void;
  showDateColumn?: boolean;
  onCategoryChange?: (
    transactionId: string,
    categoryId: string,
  ) => Promise<void>;
}

export function TransactionTable({
  transactions,
  onEdit,
  showDateColumn = true,
  onCategoryChange,
}: TransactionTableProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setIsLoadingCategories(true);
        const response = await fetch("/api/category");
        const result = await response.json();

        if (result.success) {
          setCategories(result.data);
        }
      } catch (error) {
        console.error("Error fetching categories:", error);
      } finally {
        setIsLoadingCategories(false);
      }
    };

    fetchCategories();
  }, []);

  const handleCategoryChange = async (
    transactionId: string,
    categoryId: string,
  ) => {
    setUpdatingId(transactionId);
    try {
      if (onCategoryChange) {
        await onCategoryChange(transactionId, categoryId);
      }
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <div className="w-full ">
      <div className="overflow-x-auto">
        <Table className="min-w-190">
          <TableHeader>
            <TableRow className="bg-muted/40">
              {showDateColumn && (
                <TableHead className="text-xs md:text-sm font-semibold tracking-wide text-muted-foreground">
                  Date
                </TableHead>
              )}
              <TableHead className="text-xs md:text-sm font-semibold tracking-wide text-muted-foreground">
                Category
              </TableHead>

              <TableHead className="text-xs md:text-sm font-semibold tracking-wide text-muted-foreground">
                Amount
              </TableHead>
              <TableHead className="text-xs md:text-sm font-semibold tracking-wide text-muted-foreground">
                Description
              </TableHead>
              <TableHead className="text-right text-xs md:text-sm font-semibold tracking-wide text-muted-foreground"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((transaction) => (
              <TableRow
                key={transaction.id}
                className="cursor-pointer hover:bg-muted/50"
              >
                {showDateColumn && (
                  <TableCell className="font-medium whitespace-nowrap">
                    {format(
                      new Date(transaction.transaction_date),
                      "MMM dd, yyyy",
                    )}
                  </TableCell>
                )}
                <TableCell>
                  <Select
                    value={transaction.category_id.toString() || ""}
                    onValueChange={(categoryId) =>
                      handleCategoryChange(
                        transaction.id!.toString(),
                        categoryId,
                      )
                    }
                    disabled={
                      updatingId === transaction.id!.toString() ||
                      isLoadingCategories
                    }
                  >
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem
                          key={category.id}
                          value={category.id!.toString()}
                        >
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </TableCell>

                <TableCell className="font-mono">
                  <span
                    className={
                      transaction.category_type === "income"
                        ? "text-green-600"
                        : "text-red-600"
                    }
                  >
                    {transaction.category_type === "income" ? "+" : "-"}
                    {Number(transaction.amount).toLocaleString("en-US", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </TableCell>
                <TableCell className="text-muted-foreground max-w-xs wrap-break-word whitespace-normal">
                  {transaction.description || "—"}
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="outline" onClick={() => onEdit(transaction)}>
                    Edit
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
