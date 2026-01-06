"use client";

import { useEffect, useState } from "react";
import { type Category } from "@/lib/validations/category";
import { CategoryTable } from "./categoryTable";
import { CategoryForm } from "../forms/categoryForm";
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

export const CategorySection = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null
  );
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(
    null
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

      const result = await response.json();

      if (result.success) {
        toast.success("Category deleted successfully");
        fetchCategories();
      } else {
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

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-10 w-32" />
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
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Categories</h2>
          <p className="text-muted-foreground">
            Manage your expense and income categories
          </p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={handleDialogChange}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              New Category
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-150">
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
            />
          </DialogContent>
        </Dialog>
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
      ) : (
        <CategoryTable
          categories={categories}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      )}

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
