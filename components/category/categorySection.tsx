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
import {
  Empty,
  EmptyHeader,
  EmptyTitle,
  EmptyDescription,
  EmptyContent,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MoreVertical,
  Pencil,
  Plus,
  Search,
  Trash2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "../ui/badge";
import { ScrollArea } from "../ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card";
import { ToggleGroup, ToggleGroupItem } from "../ui/toggle-group";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

type FilterType = "all" | "income" | "expense" | "recurring";

const CATEGORY_ICONS: Record<string, string> = {
  "Car Maintenance": "car_repair",
  "Cleaning Lady": "cleaning_services",
  "Co-Working Space": "laptop_mac",
  "Darius' Allowance": "payments",
  "Darius' Tithe": "volunteer_activism",
  Education: "school",
  Electricity: "bolt",
  "Food and Hosting": "restaurant",
  "From ABSA - Kananu": "account_balance",
  "From Cadana": "work",
  "From Equity": "account_balance",
  "From Standard Chartered": "account_balance",
  "From Wifey": "favorite",
  "Gifts and Donations": "card_giftcard",
  Internet: "wifi",
  "Mama in Love Allowance": "favorite",
  Medical: "local_hospital",
  Miscellaneous: "inventory_2",
  "Miscellaneous Income": "move_to_inbox",
  Moneyback: "sync_alt",
  Parking: "local_parking",
  Reimbursable: "receipt_long",
  Rent: "home",
  "Rongai House Maintenance": "handyman",
  "Rongai Security": "gpp_good",
  Streaming: "live_tv",
  "Super Date": "auto_awesome",
  "Transaction Charges": "credit_card",
  Transport: "directions_bus",
  Uncategorized: "help",
  Water: "water_drop",
  "Winnie Allowance": "redeem",
  "Winnie Tithe": "volunteer_activism",
};

export const CategorySection = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [filter, setFilter] = useState<FilterType>("all");
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null,
  );
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(
    null,
  );

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
    } catch (error) {
      console.error("Error fetching categories:", error);
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
        toast.success("Category deleted successfully");
        fetchCategories();
      } else {
        const result = await response.json();
        toast.error(result.error || "Failed to delete category");
      }
    } catch (error) {
      console.error("Error deleting category:", error);
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
    if (!open) {
      setSelectedCategory(null);
    }
  };

  const filteredCategories = categories.filter((category) => {
    if (filter === "income" && category.type !== "income") return false;
    if (filter === "expense" && category.type !== "expense") return false;
    if (filter === "recurring" && !category.repeats) return false;
    if (
      search &&
      !category.name.toLowerCase().includes(search.trim().toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const incomeCount = categories.filter((c) => c.type === "income").length;
  const expenseCount = categories.filter((c) => c.type === "expense").length;
  const recurringCount = categories.filter((c) => c.repeats).length;

  if (isLoading) {
    return (
      <div className="relative left-1/2 right-1/2 min-h-screen w-screen -translate-x-1/2 overflow-hidden bg-background px-4 py-4 text-foreground md:px-6 md:py-6">
        <div className="mx-auto max-w-6xl space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-10 w-full sm:w-40" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-32 w-full" />
            <Skeleton className="h-32 w-full" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative left-1/2 right-1/2 min-h-screen w-screen -translate-x-1/2 overflow-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute -left-24 -top-16 h-72 w-72 rounded-full bg-indigo-400/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 -right-16 h-72 w-72 rounded-full bg-emerald-400/10 blur-3xl" />

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-4 md:px-6 md:py-6">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Personal Finance
            </p>
            <h1 className="text-3xl font-bold tracking-tight md:text-4xl">
              Categories
            </h1>
          </div>

          <Dialog open={isDialogOpen} onOpenChange={handleDialogChange}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                New Category
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-150">
              <ScrollArea className="max-h-[70vh] md:max-h-full">
                <DialogHeader>
                  <DialogTitle>
                    {selectedCategory ? "Edit Category" : "Create Category"}
                  </DialogTitle>
                  <DialogDescription>
                    {selectedCategory
                      ? "Update the category details below"
                      : "Add a new category to organize your transactions"}
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
        </div>

        <Card className="border-border bg-card/70 dark:border-zinc-800 dark:bg-zinc-900/50">
          <CardContent className="flex flex-wrap items-center gap-x-6 gap-y-3 p-4">
            <div className="flex items-center gap-2 text-sm">
              <span className="h-2 w-2 rounded-full bg-foreground/70" />
              <span className="text-muted-foreground">Total</span>
              <span className="font-mono font-semibold">{categories.length}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              <span className="text-muted-foreground">Income</span>
              <span className="font-mono font-semibold text-emerald-400">
                {incomeCount}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="h-2 w-2 rounded-full bg-rose-400" />
              <span className="text-muted-foreground">Expense</span>
              <span className="font-mono font-semibold text-rose-400">
                {expenseCount}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <span className="h-2 w-2 rounded-full bg-indigo-400" />
              <span className="text-muted-foreground">Recurring</span>
              <span className="font-mono font-semibold text-indigo-300">
                {recurringCount}
              </span>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
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
            className="w-full justify-start rounded-lg border border-border bg-card/70 p-1 md:w-auto dark:border-zinc-800 dark:bg-zinc-900/70"
          >
            <ToggleGroupItem value="all">All</ToggleGroupItem>
            <ToggleGroupItem value="income">Income</ToggleGroupItem>
            <ToggleGroupItem value="expense">Expenses</ToggleGroupItem>
            <ToggleGroupItem value="recurring">Recurring</ToggleGroupItem>
          </ToggleGroup>

          <div className="relative w-full md:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search categories..."
              className="border-border bg-card pl-9 text-foreground placeholder:text-muted-foreground dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500"
            />
          </div>
        </div>

        {categories.length === 0 ? (
          <Empty>
            <EmptyHeader>
              <EmptyTitle>No categories yet</EmptyTitle>
              <EmptyDescription>
                Get started by creating your first category
              </EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <Button onClick={() => setIsDialogOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Category
              </Button>
            </EmptyContent>
          </Empty>
        ) : filteredCategories.length === 0 ? (
          <Card className="border-border bg-card/70 dark:border-zinc-800 dark:bg-zinc-900/50">
            <CardContent className="py-14 text-center text-muted-foreground">
              <span
                className="material-symbols-outlined text-3xl leading-none"
                aria-hidden="true"
              >
                search
              </span>
              <p className="mt-2 text-sm font-medium text-foreground">
                No categories found
              </p>
              <p className="text-sm">Try adjusting your search or filter.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredCategories.map((category) => (
              <Card
                key={category.id}
                className={cn(
                  "border-border bg-card/80 transition hover:-translate-y-0.5 hover:bg-muted/40 dark:border-zinc-800 dark:bg-zinc-900/70 dark:hover:bg-zinc-900",
                  category.type === "income"
                    ? "hover:border-emerald-500/40"
                    : "hover:border-rose-500/30",
                )}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "flex h-10 w-10 items-center justify-center rounded-lg border text-lg",
                          category.type === "income"
                            ? "border-emerald-500/20 bg-emerald-500/10"
                            : "border-border bg-muted/50 dark:border-zinc-700 dark:bg-zinc-800/60",
                        )}
                      >
                        <span
                          className="material-symbols-outlined text-xl leading-none"
                          aria-hidden="true"
                        >
                          {CATEGORY_ICONS[category.name] ?? "folder"}
                        </span>
                      </div>
                      <div>
                        <CardTitle className="text-base leading-tight">
                          {category.name}
                        </CardTitle>
                        {category.description && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            {category.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem onClick={() => handleEdit(category)}>
                          <Pencil className="h-4 w-4" />
                          Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          className="text-red-500 focus:text-red-500"
                          onClick={() => handleDelete(category)}
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent className="flex flex-wrap items-center gap-2 pt-0">
                  <Badge
                    variant="outline"
                    className={cn(
                      "gap-1 border",
                      category.type === "income"
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                        : "border-rose-500/30 bg-rose-500/10 text-rose-300",
                    )}
                  >
                    {category.type === "income" ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    <span className="capitalize">{category.type}</span>
                  </Badge>
                  {category.repeats && (
                    <Badge
                      variant="outline"
                      className="border-indigo-500/30 bg-indigo-500/10 text-indigo-300"
                    >
                      Recurring · {category.amount.toLocaleString()}
                    </Badge>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <AlertDialog
        open={!!categoryToDelete}
        onOpenChange={(open) => !open && setCategoryToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &ldquo;{categoryToDelete?.name}
              &rdquo;? All budget items in this category will be moved to
              &quot;Uncategorized&quot;. This action cannot be undone.
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
