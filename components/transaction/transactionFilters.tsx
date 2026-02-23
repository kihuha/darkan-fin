import { Button } from "@/components/ui/button";
import { StatementImportDialog } from "./statementImportDialog";
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
  selectedMonth: number;
  selectedYear: number;
  onMonthChange: (value: number) => void;
  onYearChange: (value: number) => void;
  onRecategorize: () => void;
  isRecategorizing: boolean;
  onImported: () => void;
};

export const TransactionFilters = ({
  categories,
  selectedCategory,
  onCategoryChange,
  selectedMonth,
  selectedYear,
  onMonthChange,
  onYearChange,
  onRecategorize,
  isRecategorizing,
  onImported,
}: TransactionFiltersProps) => {
  const monthOptions = [
    { value: 1, label: "January" },
    { value: 2, label: "February" },
    { value: 3, label: "March" },
    { value: 4, label: "April" },
    { value: 5, label: "May" },
    { value: 6, label: "June" },
    { value: 7, label: "July" },
    { value: 8, label: "August" },
    { value: 9, label: "September" },
    { value: 10, label: "October" },
    { value: 11, label: "November" },
    { value: 12, label: "December" },
  ];
  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from(
    { length: 11 },
    (_, index) => currentYear - index,
  );

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
          <div className="grid grid-cols-2 gap-2">
            <Select
              value={selectedMonth.toString()}
              onValueChange={(value) => onMonthChange(parseInt(value, 10))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Month" />
              </SelectTrigger>
              <SelectContent>
                {monthOptions.map((month) => (
                  <SelectItem key={month.value} value={month.value.toString()}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select
              value={selectedYear.toString()}
              onValueChange={(value) => onYearChange(parseInt(value, 10))}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map((year) => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

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
          <StatementImportDialog
            onImported={onImported}
            triggerClassName="w-full"
            triggerVariant="outline"
          />
        </div>
      </PopoverContent>
    </Popover>
  );
};
