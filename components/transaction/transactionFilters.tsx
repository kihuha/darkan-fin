import { Button } from "@/components/ui/button";
import { MpesaImportDialog } from "./mpesaImportDialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CircleDashed } from "lucide-react";

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
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline">
          <CircleDashed className="mr-1" />
          Filters & Actions
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="flex flex-col gap-3">
          <Select
            value={selectedCategory || "all"}
            onValueChange={(value) =>
              onCategoryChange(value === "all" ? null : value)
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Filter by category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
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
            className="w-full"
          >
            {isRecategorizing
              ? "Recategorizing..."
              : "Recategorize Transactions"}
          </Button>
          <MpesaImportDialog
            onImported={onImported}
            triggerClassName="w-full"
            triggerVariant="outline"
          />
        </div>
      </PopoverContent>
    </Popover>
  );
};
