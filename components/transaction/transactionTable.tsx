"use client";

import { useEffect, useState } from "react";
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
import { Trash2 } from "lucide-react";
import { TransactionWithCategory } from "./transactionSection";
import { toast } from "sonner";

interface TransactionTableProps {
  transactions: TransactionWithCategory[];
  onEdit: (transaction: TransactionWithCategory) => void;
  showDateColumn?: boolean;
  onCategoryChange?: (
    transactionId: string,
    categoryId: string,
  ) => Promise<void>;
  onDelete?: (transactionIds: string[]) => Promise<void>;
}

export function TransactionTable({
  transactions,
  onEdit,
  showDateColumn = true,
  onCategoryChange,
  onDelete,
}: TransactionTableProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [rowSelection, setRowSelection] = useState({});
  const [isDeleting, setIsDeleting] = useState(false);

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

  const handleBulkDelete = async () => {
    const selectedRows = table.getFilteredSelectedRowModel().rows;
    const transactionIds = selectedRows.map((row) =>
      row.original.id!.toString(),
    );

    if (transactionIds.length === 0) return;

    if (!confirm(`Delete ${transactionIds.length} transaction(s)?`)) return;

    setIsDeleting(true);
    try {
      if (onDelete) {
        await onDelete(transactionIds);
        setRowSelection({});
        toast.success(`Deleted ${transactionIds.length} transaction(s)`);
      }
    } catch (error) {
      console.error("Error deleting transactions:", error);
      toast.error("Failed to delete transactions");
    } finally {
      setIsDeleting(false);
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
              <div className="font-medium whitespace-nowrap">
                {format(
                  new Date(row.original.transaction_date),
                  "MMM dd, yyyy",
                )}
              </div>
            ),
          } as ColumnDef<TransactionWithCategory>,
        ]
      : []),
    {
      accessorKey: "category_id",
      header: "Category",
      cell: ({ row }) => (
        <Select
          value={row.original.category_id.toString() || ""}
          onValueChange={(categoryId) =>
            handleCategoryChange(row.original.id!.toString(), categoryId)
          }
          disabled={
            updatingId === row.original.id!.toString() || isLoadingCategories
          }
        >
          <SelectTrigger className="w-40">
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
      header: "Amount",
      cell: ({ row }) => (
        <div className="font-mono">
          <span
            className={
              row.original.category_type === "income"
                ? "text-green-600"
                : "text-red-600"
            }
          >
            {row.original.category_type === "income" ? "+" : "-"}
            {Number(row.original.amount).toLocaleString("en-US", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}
          </span>
        </div>
      ),
    },
    {
      accessorKey: "description",
      header: "Description",
      cell: ({ row }) => (
        <div className="text-muted-foreground max-w-xs wrap-break-word whitespace-normal">
          {row.original.description || "—"}
        </div>
      ),
    },
    {
      id: "actions",
      header: () => <div className="text-right"></div>,
      cell: ({ row }) => (
        <div className="text-right">
          <Button variant="outline" onClick={() => onEdit(row.original)}>
            Edit
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
    state: {
      rowSelection,
    },
    getRowId: (row) => row.id!.toString(),
  });

  const selectedCount = table.getFilteredSelectedRowModel().rows.length;

  return (
    <div className="w-full space-y-4">
      {selectedCount > 0 && (
        <div className="flex items-center justify-between rounded-lg border bg-muted/40 px-4 py-2">
          <span className="text-sm text-muted-foreground">
            {selectedCount} transaction(s) selected
          </span>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleBulkDelete}
            disabled={isDeleting}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            Delete Selected
          </Button>
        </div>
      )}
      <div className="overflow-x-auto rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="bg-muted/40">
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    className="text-xs md:text-sm font-semibold tracking-wide text-muted-foreground"
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
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
                  className="hover:bg-muted/50"
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No transactions found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
