"use client";

import { useState } from "react";
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  Row,
} from "@tanstack/react-table";
import { type Category } from "@/lib/validations/category";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { Pencil, Trash2 } from "lucide-react";
import { TransactionWithCategory } from "./transactionSection";

interface TransactionTableProps {
  transactions: TransactionWithCategory[];
  categories: Category[];
  isLoadingCategories: boolean;
  onEdit: (transaction: TransactionWithCategory) => void;
  showDateColumn?: boolean;
  onCategoryChange?: (transactionId: string, categoryId: string) => Promise<void>;
  onDelete?: (transactionIds: string[]) => Promise<void>;
}

export function TransactionTable({
  transactions,
  categories,
  isLoadingCategories,
  onEdit,
  showDateColumn = true,
  onCategoryChange,
  onDelete,
}: TransactionTableProps) {
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [rowSelection, setRowSelection] = useState({});
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [pendingDeleteIds, setPendingDeleteIds] = useState<string[]>([]);

  const handleCategoryChange = async (transactionId: string, categoryId: string) => {
    setUpdatingId(transactionId);
    try {
      if (onCategoryChange) await onCategoryChange(transactionId, categoryId);
    } finally {
      setUpdatingId(null);
    }
  };

  const initiateBulkDelete = () => {
    const selectedRows = table.getFilteredSelectedRowModel().rows;
    const ids = selectedRows.map((row) => row.original.id!.toString());
    if (ids.length === 0) return;
    setPendingDeleteIds(ids);
    setShowDeleteConfirm(true);
  };

  const confirmBulkDelete = async () => {
    setIsDeleting(true);
    try {
      if (onDelete) {
        await onDelete(pendingDeleteIds);
        setRowSelection({});
      }
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
      setPendingDeleteIds([]);
    }
  };

  const columns: ColumnDef<TransactionWithCategory>[] = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    ...(showDateColumn
      ? [
          {
            accessorKey: "transaction_date",
            header: "Date",
            cell: ({ row }: { row: Row<TransactionWithCategory> }) => (
              <div className="whitespace-nowrap font-medium">
                {format(new Date(row.original.transaction_date), "MMM dd, yyyy")}
              </div>
            ),
          } as ColumnDef<TransactionWithCategory>,
        ]
      : []),
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => (
        <div className="max-w-xs break-words whitespace-normal text-sm">
          {row.original.description || <span className="text-muted-foreground">—</span>}
        </div>
      ),
    },
    {
      accessorKey: "category_id",
      header: "Category",
      cell: ({ row }) => (
        <Select
          value={row.original.category_id.toString()}
          onValueChange={(categoryId) =>
            handleCategoryChange(row.original.id!.toString(), categoryId)
          }
          disabled={
            updatingId === row.original.id!.toString() || isLoadingCategories
          }
        >
          <SelectTrigger className="w-40 text-sm md:text-xs">
            <SelectValue placeholder="Select category" />
          </SelectTrigger>
          <SelectContent>
            {categories.map((category) => (
              <SelectItem key={category.id} value={category.id!.toString()}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ),
    },
    {
      accessorKey: "amount",
      header: () => <div className="text-right">Amount</div>,
      cell: ({ row }) => (
        <div className="text-right">
          <span
            className={
              row.original.category_type === "income"
                ? "tabular-nums font-medium text-emerald-600 dark:text-emerald-400"
                : "tabular-nums font-medium text-foreground"
            }
          >
            {row.original.category_type === "income" ? "+" : ""}
            {Number(row.original.amount).toLocaleString("en-KE", {
              style: "currency",
              currency: "KES",
              maximumFractionDigits: 0,
            })}
          </span>
        </div>
      ),
    },
    {
      id: "actions",
      header: () => null,
      cell: ({ row }) => (
        <div className="text-right">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
            onClick={() => onEdit(row.original)}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    },
  ];

  const table = useReactTable({
    data: transactions,
    columns,
    getCoreRowModel: getCoreRowModel(),
    onRowSelectionChange: setRowSelection,
    state: { rowSelection },
    getRowId: (row) => row.id!.toString(),
  });

  const selectedCount = table.getFilteredSelectedRowModel().rows.length;
  const formatAmount = (transaction: TransactionWithCategory) =>
    `${transaction.category_type === "income" ? "+" : ""}${Number(
      transaction.amount,
    ).toLocaleString("en-KE", {
      style: "currency",
      currency: "KES",
      maximumFractionDigits: 0,
    })}`;

  return (
    <>
      <div className="w-full">
        {selectedCount > 0 && (
          <div className="mb-2 flex items-center justify-between rounded-md bg-muted/50 px-3 py-2 dark:bg-zinc-800/50">
            <span className="text-sm text-muted-foreground">
              {selectedCount} selected
            </span>
            <Button
              variant="destructive"
              size="sm"
              onClick={initiateBulkDelete}
              disabled={isDeleting}
              className="h-8 gap-1.5 text-sm md:h-7 md:text-xs"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Delete {selectedCount}
            </Button>
          </div>
        )}
        <div className="space-y-2 md:hidden">
          {transactions.length === 0 ? (
            <div className="rounded-md border border-dashed p-4 text-center text-sm text-muted-foreground">
              No transactions
            </div>
          ) : (
            transactions.map((transaction) => (
              <div
                key={transaction.id}
                className="space-y-3 rounded-lg border bg-card p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {transaction.description || "No description"}
                    </p>
                    {showDateColumn && (
                      <p className="mt-0.5 text-sm text-muted-foreground md:text-xs">
                        {format(
                          new Date(transaction.transaction_date),
                          "MMM dd, yyyy",
                        )}
                      </p>
                    )}
                  </div>
                  <span
                    className={
                      transaction.category_type === "income"
                        ? "text-sm font-medium tabular-nums text-emerald-600 dark:text-emerald-400"
                        : "text-sm font-medium tabular-nums text-foreground"
                    }
                  >
                    {formatAmount(transaction)}
                  </span>
                </div>

                <Select
                  value={transaction.category_id.toString()}
                  onValueChange={(categoryId) =>
                    handleCategoryChange(transaction.id!.toString(), categoryId)
                  }
                  disabled={
                    updatingId === transaction.id!.toString() || isLoadingCategories
                  }
                >
                  <SelectTrigger className="w-full text-sm md:text-xs">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id!.toString()}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="flex items-center justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onEdit(transaction)}
                  >
                    <Pencil className="mr-1.5 h-3.5 w-3.5" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                    onClick={() => {
                      setPendingDeleteIds([transaction.id!.toString()]);
                      setShowDeleteConfirm(true);
                    }}
                  >
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                    Delete
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="border-b dark:border-zinc-800 hover:bg-transparent">
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className="text-sm font-semibold uppercase tracking-[0.06em] text-muted-foreground md:text-xs"
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(header.column.columnDef.header, header.getContext())}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    className="group border-b dark:border-zinc-800 hover:bg-muted/40 dark:hover:bg-zinc-800/30"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id} className="py-2.5">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className="h-16 text-center text-sm text-muted-foreground">
                    No transactions
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Transactions</AlertDialogTitle>
            <AlertDialogDescription>
              Delete {pendingDeleteIds.length} selected transaction
              {pendingDeleteIds.length === 1 ? "" : "s"}? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmBulkDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
