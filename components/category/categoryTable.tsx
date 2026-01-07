"use client";

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
import { Edit2, MoreHorizontal, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";

interface CategoryTableProps {
  categories: Category[];
  onEdit: (category: Category) => void;
  onDelete: (category: Category) => void;
}

export function CategoryTable({
  categories,
  onEdit,
  onDelete,
}: CategoryTableProps) {
  return (
    <div className=" border border-white/60 bg-white/70 shadow-sm backdrop-blur">
      <div className="overflow-x-auto">
        <Table className="min-w-190">
          <TableHeader>
            <TableRow className="bg-muted/40">
              <TableHead className="text-xs uppercase tracking-wide text-muted-foreground">
                Name
              </TableHead>
              <TableHead className="text-xs uppercase tracking-wide text-muted-foreground">
                Type
              </TableHead>
              <TableHead className="text-xs uppercase tracking-wide text-muted-foreground">
                Amount
              </TableHead>
              <TableHead className="text-xs uppercase tracking-wide text-muted-foreground">
                Repeats
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
            {categories.map((category) => (
              <TableRow
                key={category.id}
                className="cursor-pointer hover:bg-muted/50"
              >
                <TableCell className="font-medium whitespace-nowrap">
                  {category.name}
                </TableCell>
                <TableCell>
                  <Badge
                    variant={
                      category.type === "income" ? "default" : "secondary"
                    }
                  >
                    {category.type === "income" ? "Income" : "Expense"}
                  </Badge>
                </TableCell>
                <TableCell className="font-mono">
                  {(category.amount &&
                    Number(
                      Number(category.amount).toFixed(2)
                    ).toLocaleString()) ||
                    "0.00"}
                </TableCell>
                <TableCell>
                  {category.repeats ? (
                    <Badge variant="default">Yes</Badge>
                  ) : (
                    <Badge variant="outline">No</Badge>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {category.description || "—"}
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
                      <DropdownMenuItem onClick={() => onEdit(category)}>
                        <Edit2 className="mr-2 h-4 w-4" />
                        Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => onDelete(category)}
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
