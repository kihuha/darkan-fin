import { Button } from "@/components/ui/button";
import { StatementImportDialog } from "./statementImportDialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, RefreshCw } from "lucide-react";

type TransactionFiltersProps = {
  categories: string[];
  selectedCategory: string | null;
  onCategoryChange: (value: string | null) => void;
  onRecategorize: () => void;
  isRecategorizing: boolean;
  onImported: () => void;
};

export const TransactionFilters = ({
  categories,
  selectedCategory,
  onCategoryChange,
  onRecategorize,
  isRecategorizing,
  onImported,
}: TransactionFiltersProps) => {
  return (
    <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
      <Select
        value={selectedCategory ?? "all"}
        onValueChange={(v) => onCategoryChange(v === "all" ? null : v)}
      >
        <SelectTrigger className="w-full sm:w-48">
          <SelectValue placeholder="All categories" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All categories</SelectItem>
          {categories.map((category) => (
            <SelectItem key={category} value={category}>
              {category}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Button
        variant="outline"
        onClick={onRecategorize}
        disabled={isRecategorizing}
        className="w-full gap-1.5 sm:w-auto"
      >
        {isRecategorizing ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <RefreshCw className="h-4 w-4" />
        )}
        Recategorize
      </Button>

      <StatementImportDialog
        onImported={onImported}
        triggerVariant="outline"
        triggerClassName="w-full sm:w-auto"
      />
    </div>
  );
};
