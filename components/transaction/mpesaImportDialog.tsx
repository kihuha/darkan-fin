"use client";

import { useState, type ChangeEvent } from "react";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { VariantProps } from "class-variance-authority";

const ACCEPTED_TYPES = [".pdf", "application/pdf"].join(",");

type MpesaImportDialogProps = {
  onImported?: () => void;
  triggerClassName?: string;
  triggerVariant?: VariantProps<typeof buttonVariants>["variant"];
};

export function MpesaImportDialog({
  onImported,
  triggerClassName,
  triggerVariant = "outline",
}: MpesaImportDialogProps) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const resetForm = () => {
    setFile(null);
    setIsUploading(false);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      resetForm();
    }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0] ?? null;
    setFile(selected);
  };

  const handleImport = async () => {
    if (!file) {
      toast.error("Select an M-Pesa statement file to upload.");
      return;
    }

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/transaction/import/mpesa", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        toast.error(result.error || "Failed to import statement.");
        return;
      }

      const { inserted_count, skipped_duplicates_count, errors_count } =
        result.data ?? {};
      toast.success(
        `Imported ${inserted_count ?? 0} transactions${
          skipped_duplicates_count
            ? `, skipped duplicates ${skipped_duplicates_count}`
            : ""
        }${errors_count ? `, discarded invalid rows ${errors_count}` : ""}.`,
      );

      onImported?.();
      handleOpenChange(false);
    } catch (error) {
      console.error("Error importing M-Pesa statement:", error);
      toast.error("Failed to import statement.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          variant={triggerVariant}
          className={triggerClassName}
          disabled={isUploading}
        >
          <Upload className="mr-2 h-4 w-4" />
          Import M-Pesa Statement
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import M-Pesa Statement</DialogTitle>
          <DialogDescription>
            Upload a PDF statement to add transactions in bulk.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Input
            type="file"
            accept={ACCEPTED_TYPES}
            onChange={handleFileChange}
          />
          <div className="text-xs text-muted-foreground">
            PDFs are parsed automatically. CSV/Excel statements should include
            Completion Time or Transaction Date, Paid In, Withdrawn, and
            Details.
          </div>
          <div className="flex items-center justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => handleOpenChange(false)}
              disabled={isUploading}
            >
              Cancel
            </Button>
            <Button onClick={handleImport} disabled={isUploading}>
              {isUploading ? "Importing..." : "Import Transactions"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
