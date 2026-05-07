"use client";

import { useEffect, useState } from "react";
import { type Category } from "@/lib/validations/category";
import { cn } from "@/lib/utils";
import { CategoryForm } from "../forms/categoryForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { Skeleton } from "@/components/ui/skeleton";
import { MoreHorizontal, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ScrollArea } from "../ui/scroll-area";
import { ToggleGroup, ToggleGroupItem } from "../ui/toggle-group";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

type FilterType = "all" | "income" | "expense" | "recurring";

type CategoryRowProps = {
  category: Category;
  onEdit: (c: Category) => void;
  onDelete: (c: Category) => void;
};

function CategoryRow({ category, onEdit, onDelete }: CategoryRowProps) {
  return (
    <div className="group flex items-center justify-between py-3">
      <div className="min-w-0 flex-1 pr-4">
        <div className="flex items-baseline gap-2.5">
          <span className="text-sm font-medium">{category.name}</span>
          {category.repeats && (
            <span className="text-sm tabular-nums text-muted-foreground md:text-xs">
              KES {(category.amount ?? 0).toLocaleString()} / mo
            </span>
          )}
        </div>
        {category.description && (
          <p className="mt-0.5 max-w-sm truncate text-sm text-muted-foreground md:text-xs">
            {category.description}
          </p>
        )}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground opacity-0 transition-opacity focus-visible:opacity-100 group-hover:opacity-100"
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-36">
          <DropdownMenuItem onClick={() => onEdit(category)}>
            <Pencil className="h-4 w-4" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            className="text-red-500 focus:text-red-500"
            onClick={() => onDelete(category)}
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

function SectionHeader({
  label,
  count,
  type,
}: {
  label: string;
  count: number;
  type: "income" | "expense";
}) {
  return (
    <div className="flex items-center gap-2 pb-2 pt-8 first:pt-0">
      <div
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          type === "income" ? "bg-emerald-500" : "bg-rose-500",
        )}
      />
      <span className="text-sm font-semibold uppercase tracking-[0.1em] text-muted-foreground md:text-xs">
        {label}
      </span>
      <span className="ml-auto text-sm text-muted-foreground md:text-xs">{count}</span>
    </div>
  );
}

export const CategorySection = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [filter, setFilter] = useState<FilterType>("all");
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);

  const fetchCategories = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/category");
      const result = await response.json();
      if (result.success) {
        setCategories(result.data);
      } else {
        toast.error("Failed to load categories");
      }
    } catch {
      toast.error("Failed to load categories");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleEdit = (category: Category) => {
    setSelectedCategory(category);
    setIsDialogOpen(true);
  };

  const handleDelete = (category: Category) => {
    setCategoryToDelete(category);
  };

  const confirmDelete = async () => {
    if (!categoryToDelete) return;
    try {
      const response = await fetch(`/api/category?id=${categoryToDelete.id}`, {
        method: "DELETE",
      });
      if (response.status === 204) {
        toast.success("Category deleted");
        fetchCategories();
      } else {
        const result = await response.json();
        toast.error(result.error || "Failed to delete category");
      }
    } catch {
      toast.error("Failed to delete category");
    } finally {
      setCategoryToDelete(null);
    }
  };

  const handleSuccess = () => {
    setIsDialogOpen(false);
    setSelectedCategory(null);
    fetchCategories();
  };

  const handleDialogChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) setSelectedCategory(null);
  };

  const filtered = categories.filter((c) => {
    if (filter === "income" && c.type !== "income") return false;
    if (filter === "expense" && c.type !== "expense") return false;
    if (filter === "recurring" && !c.repeats) return false;
    if (search && !c.name.toLowerCase().includes(search.trim().toLowerCase()))
      return false;
    return true;
  });

  const incomeFiltered = filtered.filter((c) => c.type === "income");
  const expenseFiltered = filtered.filter((c) => c.type === "expense");

  const incomeCount = categories.filter((c) => c.type === "income").length;
  const expenseCount = categories.filter((c) => c.type === "expense").length;
  const recurringCount = categories.filter((c) => c.repeats).length;

  const showGrouped = filter === "all" || filter === "recurring";

  const newCategoryDialog = (
    <Dialog open={isDialogOpen} onOpenChange={handleDialogChange}>
      <DialogTrigger asChild>
        <Button className="gap-1.5 shrink-0">
          <Plus className="h-4 w-4" />
          New Category
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <ScrollArea className="max-h-[75vh] pr-1">
          <DialogHeader>
            <DialogTitle>
              {selectedCategory ? "Edit Category" : "New Category"}
            </DialogTitle>
            <DialogDescription>
              {selectedCategory
                ? "Update the details below"
                : "Add a category to organize your transactions"}
            </DialogDescription>
          </DialogHeader>
          <CategoryForm
            category={selectedCategory}
            onSuccess={handleSuccess}
            onCancel={() => handleDialogChange(false)}
            onDelete={handleDelete}
          />
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );

  if (isLoading) {
    return (
      <div>
        <div className="mb-6 flex items-start justify-between border-b pb-6 dark:border-zinc-800">
          <div className="space-y-1.5">
            <Skeleton className="h-7 w-32" />
            <Skeleton className="h-4 w-52" />
          </div>
          <Skeleton className="h-9 w-36" />
        </div>
        <div className="mb-6 flex gap-3">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-9 w-80" />
        </div>
        <div className="space-y-px">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="flex items-center justify-between py-3"
            >
              <Skeleton className="h-4 w-40" />
              <Skeleton className="h-4 w-20" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6 flex items-start justify-between border-b pb-6 dark:border-zinc-800">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Categories</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {incomeCount} income · {expenseCount} expense · {recurringCount}{" "}
            recurring
          </p>
        </div>
        {newCategoryDialog}
      </div>

      {/* Toolbar */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 sm:max-w-64">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search categories"
            className="pl-9"
          />
        </div>
        <ToggleGroup
          type="single"
          value={filter}
          onValueChange={(next) => {
            if (
              next === "all" ||
              next === "income" ||
              next === "expense" ||
              next === "recurring"
            ) {
              setFilter(next);
            }
          }}
          variant="outline"
          className="w-full justify-start sm:w-auto"
        >
          <ToggleGroupItem value="all">All</ToggleGroupItem>
          <ToggleGroupItem value="income">Income</ToggleGroupItem>
          <ToggleGroupItem value="expense">Expenses</ToggleGroupItem>
          <ToggleGroupItem value="recurring">Recurring</ToggleGroupItem>
        </ToggleGroup>
      </div>

      {/* Content */}
      {categories.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-sm font-medium">No categories yet</p>
          <p className="mt-1 mb-4 text-sm text-muted-foreground md:text-xs">
            Add categories to organize your transactions
          </p>
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            Create Category
          </Button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-sm text-muted-foreground">
            No categories match your search
          </p>
        </div>
      ) : showGrouped ? (
        <div>
          {incomeFiltered.length > 0 && (
            <div>
              <SectionHeader
                label="Income"
                count={incomeFiltered.length}
                type="income"
              />
              <div className="divide-y dark:divide-zinc-800">
                {incomeFiltered.map((c) => (
                  <CategoryRow
                    key={c.id}
                    category={c}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </div>
          )}
          {expenseFiltered.length > 0 && (
            <div>
              <SectionHeader
                label="Expenses"
                count={expenseFiltered.length}
                type="expense"
              />
              <div className="divide-y dark:divide-zinc-800">
                {expenseFiltered.map((c) => (
                  <CategoryRow
                    key={c.id}
                    category={c}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="divide-y dark:divide-zinc-800">
          {filtered.map((c) => (
            <CategoryRow
              key={c.id}
              category={c}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}

      <AlertDialog
        open={!!categoryToDelete}
        onOpenChange={(open) => !open && setCategoryToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              Delete &ldquo;{categoryToDelete?.name}&rdquo;? Transactions in
              this category will move to &quot;Uncategorized&quot;. This cannot
              be undone.
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
