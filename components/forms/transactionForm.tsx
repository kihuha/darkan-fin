"use client";

import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useEffect, useState } from "react";
import { type Category } from "@/lib/validations/category";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
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
import { AlertTriangle, Loader2, Sparkles } from "lucide-react";
import { format } from "date-fns";
import z from "zod";
import { cn } from "@/lib/utils";
import { TransactionWithCategory } from "../transaction/transactionSection";

type TransactionCheckResult = {
  category_name: string;
  category_type: "income" | "expense";
  budgeted_amount: number;
  spent_so_far: number;
  projected_total: number;
  projected_remaining: number;
  would_overspend: boolean;
  overspend_amount: number;
  budget_exists: boolean;
  primary_goal: {
    id: string;
    name: string;
    required_monthly_contribution: number;
  } | null;
  deters_primary_goal: boolean;
  friendly_message: string | null;
};

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
  const [check, setCheck] = useState<TransactionCheckResult | null>(null);
  const [isChecking, setIsChecking] = useState(false);

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

  const watchedCategoryId = useWatch({
    control: form.control,
    name: "category_id",
  });
  const watchedAmount = useWatch({ control: form.control, name: "amount" });
  const watchedDate = useWatch({
    control: form.control,
    name: "transaction_date",
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

  // Debounced server-side check whenever the user changes category/amount/date.
  useEffect(() => {
    const amountNumber = Number(watchedAmount);
    if (
      !watchedCategoryId ||
      !watchedDate ||
      Number.isNaN(amountNumber) ||
      amountNumber <= 0
    ) {
      setCheck(null);
      return;
    }

    const matched = categories.find(
      (c) => c.id?.toString() === watchedCategoryId,
    );
    // Skip checks for income — overspend doesn't apply.
    if (matched && matched.type === "income") {
      setCheck(null);
      return;
    }

    const controller = new AbortController();
    const handle = window.setTimeout(async () => {
      try {
        setIsChecking(true);
        const response = await fetch("/api/transaction/check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            category_id: watchedCategoryId,
            amount: amountNumber,
            transaction_date: watchedDate,
            ...(transaction?.id
              ? { exclude_transaction_id: transaction.id.toString() }
              : {}),
          }),
          signal: controller.signal,
        });
        const result = await response.json();
        if (response.ok && result.success) {
          setCheck(result.data as TransactionCheckResult);
        } else {
          setCheck(null);
        }
      } catch (error) {
        if ((error as { name?: string })?.name !== "AbortError") {
          // Silently swallow; this is an enhancement, not a blocker.
          setCheck(null);
        }
      } finally {
        setIsChecking(false);
      }
    }, 400);

    return () => {
      controller.abort();
      window.clearTimeout(handle);
    };
  }, [
    watchedCategoryId,
    watchedAmount,
    watchedDate,
    categories,
    transaction?.id,
  ]);

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

        {check?.friendly_message && (
          <Alert
            className={cn(
              "border-amber-300/60 bg-amber-50/40 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/5 dark:text-amber-200",
              check.deters_primary_goal &&
                "border-rose-300/60 bg-rose-50/40 text-rose-900 dark:border-rose-500/30 dark:bg-rose-500/5 dark:text-rose-200",
            )}
          >
            {check.deters_primary_goal ? (
              <AlertTriangle />
            ) : (
              <Sparkles />
            )}
            <AlertTitle>
              {check.deters_primary_goal
                ? "This may slow your goal"
                : "Just a quick check-in"}
            </AlertTitle>
            <AlertDescription className="text-current/90">
              <p>{check.friendly_message}</p>
              {check.budget_exists && (
                <p className="text-xs opacity-80">
                  After this: {Math.round(check.projected_total).toLocaleString(
                    "en-KE",
                  )}{" "}
                  / {Math.round(check.budgeted_amount).toLocaleString("en-KE")} KES
                  used in {check.category_name}.
                </p>
              )}
            </AlertDescription>
          </Alert>
        )}

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

          <div className="ml-auto flex items-center gap-x-2">
            {isChecking && (
              <span className="text-xs text-muted-foreground">
                Checking budget…
              </span>
            )}
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
