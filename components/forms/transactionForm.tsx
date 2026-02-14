"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { type Category } from "@/lib/validations/category";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { format } from "date-fns";
import z from "zod";
import { TransactionWithCategory } from "../transaction/transactionSection";

interface TransactionFormProps {
  transaction?: {
    id: number;
    amount: number;
    description: string;
    transaction_date: string;
    category_id: number;
    family_id: number;
  } | null;
  onSuccess?: () => void;
  onCancel?: () => void;
  onDelete?: (transaction: TransactionWithCategory) => void;
}

export function TransactionForm({
  transaction,
  onSuccess,
  onCancel,
  onDelete,
}: TransactionFormProps) {
  const isEditing = !!transaction?.id;
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);

  const formSchema = z.object({
    category_id: z.string().min(1, "Category is required"),
    amount: z.string().refine((val) => !isNaN(Number(val)) && Number(val) > 0, {
      message: "Amount must be a positive number",
    }),
    transaction_date: z.string().min(1, "Transaction date is required"),
    description: z
      .string()
      .max(1000, "Description must be less than 1000 characters")
      .optional()
      .nullable(),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      category_id: transaction?.category_id?.toString() || "",
      amount: transaction?.amount?.toString() || "",
      transaction_date: transaction?.transaction_date
        ? format(new Date(transaction.transaction_date), "yyyy-MM-dd")
        : format(new Date(), "yyyy-MM-dd"),
      description: transaction?.description || "",
    },
  });

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        setIsLoadingCategories(true);
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
        setIsLoadingCategories(false);
      }
    };

    fetchCategories();
  }, []);

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    try {
      const url = "/api/transaction";
      const method = isEditing ? "PATCH" : "POST";
      const payload = isEditing
        ? { ...data, id: transaction!.id, amount: parseFloat(data.amount) }
        : { ...data, amount: parseFloat(data.amount) };

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        toast.error(result.error || "Failed to save transaction");
        return;
      }

      toast.success(
        isEditing
          ? "Transaction updated successfully"
          : "Transaction created successfully",
      );
      form.reset();
      onSuccess?.();
    } catch (error) {
      console.error("Error saving transaction:", error);
      toast.error("An unexpected error occurred");
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="category_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Category</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
                disabled={isLoadingCategories}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectGroup>
                    <SelectLabel>Income</SelectLabel>
                    <SelectSeparator />
                    {categories
                      .filter((category) => category.type === "income")
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map((category) => (
                        <SelectItem
                          key={category.id}
                          value={category.id!.toString()}
                        >
                          {category.name}
                        </SelectItem>
                      ))}
                  </SelectGroup>

                  <SelectGroup>
                    <SelectLabel>Expense</SelectLabel>
                    <SelectSeparator />
                    {categories
                      .filter((category) => category.type === "expense")
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map((category) => (
                        <SelectItem
                          key={category.id}
                          value={category.id!.toString()}
                        >
                          {category.name}
                        </SelectItem>
                      ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
              <FormDescription>
                Select the category for this transaction
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="amount"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Amount</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  {...field}
                  onChange={(e) => field.onChange(e.target.value)}
                  value={field.value ?? ""}
                />
              </FormControl>
              <FormDescription>Enter the transaction amount</FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="transaction_date"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Date</FormLabel>
              <FormControl>
                <Input type="date" {...field} />
              </FormControl>
              <FormDescription>
                Select the date of the transaction
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description (Optional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Add any notes about this transaction"
                  className="resize-none"
                  {...field}
                  value={field.value || ""}
                />
              </FormControl>
              <FormDescription>
                Provide additional details about the transaction
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-between gap-2">
          {onDelete && isEditing && (
            <Button
              type="button"
              variant="destructive"
              className="mr-2"
              onClick={() => {
                onDelete(transaction as TransactionWithCategory);
              }}
            >
              Delete
            </Button>
          )}

          <div className="flex items-center gap-x-2">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {isEditing ? "Update" : "Create"} Transaction
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}
