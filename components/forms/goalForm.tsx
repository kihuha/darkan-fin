"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import z from "zod";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
import type { GoalResponse } from "@/lib/validations/goal";

const formSchema = z.object({
  id: z.string().optional(),
  name: z
    .string()
    .min(1, "Goal name is required")
    .max(150, "Goal name must be less than 150 characters"),
  target_amount: z
    .string()
    .refine(
      (value) => value !== "" && !Number.isNaN(Number(value)) && Number(value) > 0,
      "Target amount must be a positive number",
    ),
  target_date: z
    .string()
    .min(1, "Target date is required")
    .refine((value) => !Number.isNaN(new Date(value).getTime()), {
      message: "Target date must be a valid date",
    }),
  notes: z
    .string()
    .max(1000, "Notes must be less than 1000 characters")
    .optional()
    .nullable(),
  is_primary: z.boolean(),
});

type GoalFormProps = {
  goal?: GoalResponse | null;
  onSuccess?: () => void;
  onCancel?: () => void;
  onDelete?: (goal: GoalResponse) => void;
};

export function GoalForm({ goal, onSuccess, onCancel, onDelete }: GoalFormProps) {
  const isEditing = !!goal?.id;

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: goal?.name || "",
      target_amount: goal?.target_amount?.toString() || "",
      target_date: goal?.target_date
        ? format(new Date(goal.target_date), "yyyy-MM-dd")
        : "",
      notes: goal?.notes || "",
      is_primary: goal?.is_primary || false,
    },
  });

  const onSubmit = async (data: z.infer<typeof formSchema>) => {
    try {
      const payload = {
        name: data.name.trim(),
        target_amount: parseFloat(data.target_amount),
        target_date: data.target_date,
        notes: data.notes?.trim() || null,
        is_primary: data.is_primary,
      };

      const url = isEditing ? `/api/goal/${goal!.id}` : "/api/goal";
      const method = isEditing ? "PATCH" : "POST";

      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        toast.error(result.error || result.message || "Failed to save goal");
        return;
      }

      toast.success(
        isEditing ? "Goal updated successfully" : "Goal created successfully",
      );
      form.reset();
      onSuccess?.();
    } catch (error) {
      console.error("Error saving goal:", error);
      toast.error("An unexpected error occurred");
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Name</FormLabel>
              <FormControl>
                <Input
                  placeholder="e.g., Emergency Fund, Vacation, New Car"
                  {...field}
                  autoFocus
                />
              </FormControl>
              <FormDescription>
                Give your goal a short, clear name.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="target_amount"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Target amount</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    {...field}
                    value={field.value ?? ""}
                    onChange={(e) => field.onChange(e.target.value)}
                  />
                </FormControl>
                <FormDescription>In KES.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="target_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Target date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormDescription>When you want to hit it.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Notes</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="What is this for? (optional)"
                  className="min-h-20 resize-none"
                  {...field}
                  value={field.value || ""}
                />
              </FormControl>
              <FormDescription>
                A line or two of context helps the AI tailor advice.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="is_primary"
          render={({ field }) => (
            <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border bg-muted/20 p-4">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              </FormControl>
              <div className="space-y-1 leading-none">
                <FormLabel>Set as primary goal</FormLabel>
                <FormDescription>
                  The primary goal drives AI budget suggestions and overspend
                  warnings. Only one goal can be primary at a time.
                </FormDescription>
              </div>
            </FormItem>
          )}
        />

        <div className="flex justify-between gap-3 border-t pt-3">
          <div>
            {isEditing && onDelete && (
              <Button
                type="button"
                variant="destructive"
                onClick={() => onDelete(goal!)}
              >
                Delete
              </Button>
            )}
          </div>
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
              {isEditing ? "Update Goal" : "Create Goal"}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}
