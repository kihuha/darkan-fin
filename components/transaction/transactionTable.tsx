"use client";

import { type Transaction } from "@/lib/validations/transaction";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Edit2, MoreHorizontal, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

interface TransactionTableProps {
  transactions: (Transaction & {
    category_name: string;
    category_type: "income" | "expense";
  })[];
  onEdit: (
    transaction: Transaction & {
      category_name: string;
      category_type: "income" | "expense";
    }
  ) => void;
  onDelete: (
    transaction: Transaction & {
      category_name: string;
      category_type: "income" | "expense";
    }
  ) => void;
}

export function TransactionTable({
  transactions,
  onEdit,
  onDelete,
}: TransactionTableProps) {
  return (
    <div className=" border border-white/60 bg-white/70 shadow-sm backdrop-blur">
      <div className="overflow-x-auto">
        <Table className="min-w-190">
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="text-xs uppercase tracking-wide text-muted-foreground">
                Date
              </TableHead>
              <TableHead className="text-xs uppercase tracking-wide text-muted-foreground">
                Category
              </TableHead>
              <TableHead className="text-xs uppercase tracking-wide text-muted-foreground">
                Type
              </TableHead>
              <TableHead className="text-xs uppercase tracking-wide text-muted-foreground">
                Amount
              </TableHead>
              <TableHead className="text-xs uppercase tracking-wide text-muted-foreground">
                Description
              </TableHead>
              <TableHead className="text-right text-xs uppercase tracking-wide text-muted-foreground">
                Actions
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {transactions.map((transaction) => (
              <TableRow
                key={transaction.id}
                className="cursor-pointer hover:bg-muted/50"
              >
                <TableCell className="font-medium whitespace-nowrap">
                  {format(
                    new Date(transaction.transactionDate),
                    "MMM dd, yyyy"
                  )}
                </TableCell>
                <TableCell>{transaction.category_name}</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      transaction.category_type === "income"
                        ? "default"
                        : "secondary"
                    }
                  >
                    {transaction.category_type === "income"
                      ? "Income"
                      : "Expense"}
                  </Badge>
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
                <TableCell className="text-muted-foreground">
                  {transaction.description || "—"}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <MoreHorizontal className="h-4 w-4" />
                        <span className="sr-only">Open menu</span>
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuLabel>Actions</DropdownMenuLabel>
                      <DropdownMenuItem onClick={() => onEdit(transaction)}>
                        <Edit2 className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onDelete(transaction)}
                        className="text-red-600 focus:text-red-600"
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
