"use client";

import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { motion } from "motion/react";
import { MoreHorizontal, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { GoalForm } from "@/components/forms/goalForm";
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
import { Badge } from "@/components/ui/badge";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { GoalResponse } from "@/lib/validations/goal";

const formatCurrency = (amount: number) =>
  amount.toLocaleString("en-KE", {
    style: "currency",
    currency: "KES",
    maximumFractionDigits: 0,
  });

function GoalCard({
  goal,
  onEdit,
  onDelete,
  onMakePrimary,
  renderedAt,
}: {
  goal: GoalResponse;
  onEdit: (goal: GoalResponse) => void;
  onDelete: (goal: GoalResponse) => void;
  onMakePrimary: (goal: GoalResponse) => void;
  renderedAt: number;
}) {
  const targetDate = useMemo(
    () => new Date(goal.target_date),
    [goal.target_date],
  );
  const isPast = targetDate.getTime() < renderedAt;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.3,
        ease: [0.16, 1, 0.3, 1] as [number, number, number, number],
      }}
      className={cn(
        "group relative rounded-lg border bg-card p-5 transition-colors",
        goal.is_primary
          ? "border-amber-300/70 bg-amber-50/40 dark:border-amber-500/30 dark:bg-amber-500/5"
          : "hover:border-border/80",
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            {goal.is_primary && (
              <Badge
                variant="outline"
                className="gap-1 border-amber-400/50 bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-300"
              >
                <Star className="h-3 w-3 fill-current" />
                Primary
              </Badge>
            )}
            <h3 className="truncate text-base font-semibold">{goal.name}</h3>
          </div>
          {goal.notes && (
            <p className="mt-1.5 text-sm text-muted-foreground">{goal.notes}</p>
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
          <DropdownMenuContent align="end" className="w-44">
            {!goal.is_primary && (
              <DropdownMenuItem onClick={() => onMakePrimary(goal)}>
                <Star className="h-4 w-4" />
                Make primary
              </DropdownMenuItem>
            )}
            <DropdownMenuItem onClick={() => onEdit(goal)}>
              <Pencil className="h-4 w-4" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-red-500 focus:text-red-500"
              onClick={() => onDelete(goal)}
            >
              <Trash2 className="h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3 text-sm">
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Target
          </p>
          <p className="mt-0.5 font-mono font-semibold tabular-nums">
            {formatCurrency(goal.target_amount)}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            By
          </p>
          <p
            className={cn(
              "mt-0.5 font-medium",
              isPast && "text-rose-500",
            )}
          >
            {format(targetDate, "MMM yyyy")}
          </p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Per month
          </p>
          <p className="mt-0.5 font-mono font-semibold tabular-nums">
            {formatCurrency(goal.required_monthly_contribution)}
          </p>
        </div>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        {goal.months_remaining} {goal.months_remaining === 1 ? "month" : "months"}{" "}
        remaining · estimate based on budget surplus
      </p>
    </motion.div>
  );
}

export function GoalSection() {
  const [goals, setGoals] = useState<GoalResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<GoalResponse | null>(null);
  const [goalToDelete, setGoalToDelete] = useState<GoalResponse | null>(null);
  const [renderedAt] = useState<number>(() => Date.now());

  const fetchGoals = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/goal");
      const result = await response.json();
      if (response.ok && result.success) {
        setGoals(result.data);
      } else {
        toast.error(result.error || "Failed to load goals");
      }
    } catch {
      toast.error("Failed to load goals");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, []);

  const handleEdit = (goal: GoalResponse) => {
    setSelectedGoal(goal);
    setIsDialogOpen(true);
  };

  const handleDelete = (goal: GoalResponse) => {
    setGoalToDelete(goal);
    setIsDialogOpen(false);
  };

  const confirmDelete = async () => {
    if (!goalToDelete) return;
    try {
      const response = await fetch(`/api/goal/${goalToDelete.id}`, {
        method: "DELETE",
      });
      if (response.status === 204) {
        toast.success("Goal deleted");
        fetchGoals();
      } else {
        const result = await response.json();
        toast.error(result.error || "Failed to delete goal");
      }
    } catch {
      toast.error("Failed to delete goal");
    } finally {
      setGoalToDelete(null);
    }
  };

  const handleMakePrimary = async (goal: GoalResponse) => {
    try {
      const response = await fetch(`/api/goal/${goal.id}/primary`, {
        method: "POST",
      });
      const result = await response.json();
      if (response.ok && result.success) {
        toast.success(`"${goal.name}" is now your primary goal`);
        fetchGoals();
      } else {
        toast.error(result.error || "Failed to set primary goal");
      }
    } catch {
      toast.error("Failed to set primary goal");
    }
  };

  const handleSuccess = () => {
    setIsDialogOpen(false);
    setSelectedGoal(null);
    fetchGoals();
  };

  const handleDialogChange = (open: boolean) => {
    setIsDialogOpen(open);
    if (!open) setSelectedGoal(null);
  };

  const primaryGoal = goals.find((g) => g.is_primary);
  const otherGoals = goals.filter((g) => !g.is_primary);

  const newGoalDialog = (
    <Dialog open={isDialogOpen} onOpenChange={handleDialogChange}>
      <DialogTrigger asChild>
        <Button className="shrink-0 gap-1.5">
          <Plus className="h-4 w-4" />
          New Goal
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <ScrollArea className="max-h-[75vh] pr-1">
          <DialogHeader>
            <DialogTitle>
              {selectedGoal ? "Edit Goal" : "New Savings Goal"}
            </DialogTitle>
            <DialogDescription>
              {selectedGoal
                ? "Update the details below"
                : "Set a target you want to reach. Your primary goal shapes the AI's budget suggestions."}
            </DialogDescription>
          </DialogHeader>
          <GoalForm
            goal={selectedGoal}
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
          <Skeleton className="h-9 w-32" />
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-36 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-start justify-between border-b pb-6 dark:border-zinc-800">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Goals</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {goals.length === 0
              ? "Set targets and let AI help you plan toward them."
              : `${goals.length} ${goals.length === 1 ? "goal" : "goals"}${
                  primaryGoal ? ` · primary: ${primaryGoal.name}` : ""
                }`}
          </p>
        </div>
        {newGoalDialog}
      </div>

      {goals.length === 0 ? (
        <div className="rounded-lg border border-dashed py-16 text-center">
          <p className="text-sm font-medium">No goals yet</p>
          <p className="mt-1 mb-4 text-sm text-muted-foreground">
            Create your first goal to unlock AI-tailored budget suggestions.
          </p>
          <Button onClick={() => setIsDialogOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            Create Goal
          </Button>
        </div>
      ) : (
        <div className="space-y-6">
          {primaryGoal && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                Primary
              </p>
              <GoalCard
                goal={primaryGoal}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onMakePrimary={handleMakePrimary}
                renderedAt={renderedAt}
              />
            </div>
          )}
          {otherGoals.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                Other goals
              </p>
              <div className="grid gap-3 md:grid-cols-2">
                {otherGoals.map((goal) => (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    onEdit={handleEdit}
                    onDelete={handleDelete}
                    onMakePrimary={handleMakePrimary}
                    renderedAt={renderedAt}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      <AlertDialog
        open={!!goalToDelete}
        onOpenChange={(open) => !open && setGoalToDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Goal</AlertDialogTitle>
            <AlertDialogDescription>
              Delete &ldquo;{goalToDelete?.name}&rdquo;? This cannot be undone.
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
}
