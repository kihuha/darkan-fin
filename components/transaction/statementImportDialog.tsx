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
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";

const ACCEPTED_TYPES = [".pdf", "application/pdf"].join(",");

type StatementImportDialogProps = {
  onImported?: () => void;
  triggerClassName?: string;
  triggerVariant?: VariantProps<typeof buttonVariants>["variant"];
};

export function StatementImportDialog({
  onImported,
  triggerClassName,
  triggerVariant = "outline",
}: StatementImportDialogProps) {
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [isUploading, setIsUploading] = useState(false);

  const resetForm = () => {
    setFiles([]);
    setIsUploading(false);
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      resetForm();
    }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files ?? []);
    setFiles(selected);
  };

  const handleImport = async () => {
    if (files.length === 0) {
      toast.error("Select statement files to upload.");
      return;
    }

    try {
      setIsUploading(true);
      const formData = new FormData();

      // Append all files to the form data
      for (const file of files) {
        formData.append("files", file);
      }

      const response = await fetch("/api/transaction/import/mpesa", {
        method: "POST",
        body: formData,
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        toast.error(result.error || "Failed to import statements.");
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
      console.error("Error importing statements:", error);
      toast.error("Failed to import statements.");
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
          Import Statements
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Import Statements</DialogTitle>
          <DialogDescription>
            Upload PDF statements to add transactions in bulk.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Input
            type="file"
            accept={ACCEPTED_TYPES}
            onChange={handleFileChange}
            multiple
          />
          {files.length > 0 && (
            <div className="text-sm text-muted-foreground">
              {files.length} file{files.length !== 1 ? "s" : ""} selected
            </div>
          )}
          <div className="text-xs text-muted-foreground">
            PDFs are parsed automatically. CSV/Excel statements should include
            Completion Time or Transaction Date, Paid In, Withdrawn, and
            Details.
          </div>
          <div>
            <Alert variant="destructive">
              <AlertTitle>PDF Password Required</AlertTitle>
              <AlertDescription>
                <p>Please provide the password for these pdfs</p>
                {files.map((file, index) => (
                  <div
                    key={index}
                    className="grid grid-cols-2 gap-x-3 w-full items-center py-2"
                  >
                    <p className="truncate text-xs">{file.name}</p>
                    <Input
                      type="password"
                      placeholder="password"
                      disabled={isUploading}
                    />
                  </div>
                ))}
              </AlertDescription>
            </Alert>
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
