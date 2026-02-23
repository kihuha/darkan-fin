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
import { PDFDocument } from "pdf-lib";

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
  const [protectedFiles, setProtectedFiles] = useState<{
    [key: string]: boolean;
  }>({});
  const [passwords, setPasswords] = useState<{ [key: string]: string }>({});
  const [isCheckingFiles, setIsCheckingFiles] = useState(false);

  const resetForm = () => {
    setFiles([]);
    setIsUploading(false);
    setProtectedFiles({});
    setPasswords({});
  };

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (!nextOpen) {
      resetForm();
    }
  };

  // Check if a PDF is password-protected
  const checkPasswordProtection = async (file: File): Promise<boolean> => {
    try {
      const arrayBuffer = await file.arrayBuffer();

      // First, try loading without any password
      try {
        await PDFDocument.load(arrayBuffer);
        // If successful, it's not password-protected
        return false;
      } catch (error: unknown) {
        // If it fails due to encryption, try with ignoreEncryption
        const errorMessage = (error as Error)?.message || "";
        if (
          errorMessage.includes("encryption") ||
          errorMessage.includes("password") ||
          errorMessage.includes("encrypted")
        ) {
          try {
            // Try to load while ignoring encryption
            await PDFDocument.load(arrayBuffer, { ignoreEncryption: true });
            // If this succeeds, it means the PDF is encrypted but we can partially read it
            return true;
          } catch {
            // If even ignoring encryption fails, it's still encrypted
            return true;
          }
        }
        // For other errors, it's probably not a valid PDF or has other issues
        return false;
      }
    } catch (error) {
      console.error(`Error checking ${file.name}:`, error);
      return false;
    }
  };

  const handleFileChange = async (event: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files ?? []);
    setFiles(selected);
    setIsCheckingFiles(true);

    // Check each file for password protection
    const protected_map: { [key: string]: boolean } = {};
    for (const file of selected) {
      const isProtected = await checkPasswordProtection(file);
      protected_map[file.name] = isProtected;
    }

    setProtectedFiles(protected_map);
    setIsCheckingFiles(false);
  };

  const handlePasswordChange = (fileName: string, password: string) => {
    setPasswords((prev) => ({
      ...prev,
      [fileName]: password,
    }));
  };

  const handleImport = async () => {
    if (files.length === 0) {
      toast.error("Select statement files to upload.");
      return;
    }

    // Check if there are any protected files without passwords
    const protectedWithoutPasswords = Object.entries(protectedFiles)
      .filter(([, isProtected]) => isProtected)
      .filter(([fileName]) => !passwords[fileName])
      .map(([fileName]) => fileName);

    if (protectedWithoutPasswords.length > 0) {
      toast.error(
        `Please provide passwords for: ${protectedWithoutPasswords.join(", ")}`,
      );
      return;
    }

    try {
      setIsUploading(true);
      const formData = new FormData();

      // Append all files to the form data
      for (const file of files) {
        formData.append("files", file);
      }

      // Append passwords for protected files
      formData.append("passwords", JSON.stringify(passwords));

      const response = await fetch("/api/transaction/import/statement", {
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
            disabled={isCheckingFiles || isUploading}
          />
          {files.length > 0 && (
            <div className="text-sm text-muted-foreground">
              {files.length} file{files.length !== 1 ? "s" : ""} selected
            </div>
          )}
          {isCheckingFiles && (
            <div className="text-sm text-muted-foreground">
              Checking files for password protection...
            </div>
          )}
          <div className="text-xs text-muted-foreground">
            PDFs are parsed automatically. CSV/Excel statements should include
            Completion Time or Transaction Date, Paid In, Withdrawn, and
            Details.
          </div>

          {/* Show password input only for protected files */}
          {Object.values(protectedFiles).some((isProtected) => isProtected) && (
            <div>
              <Alert variant="destructive">
                <AlertTitle>PDF Password Required</AlertTitle>
                <AlertDescription>
                  <p>Please provide the password for these pdfs</p>
                  {files.map((file) =>
                    protectedFiles[file.name] ? (
                      <div
                        key={file.name}
                        className="grid grid-cols-2 gap-x-3 w-full items-center py-2"
                      >
                        <p className="truncate text-xs">{file.name}</p>
                        <Input
                          type="password"
                          placeholder="password"
                          value={passwords[file.name] || ""}
                          onChange={(e) =>
                            handlePasswordChange(file.name, e.target.value)
                          }
                          disabled={isUploading}
                        />
                      </div>
                    ) : null,
                  )}
                </AlertDescription>
              </Alert>
            </div>
          )}

          <div className="flex items-center justify-end gap-2">
            <Button
              variant="ghost"
              onClick={() => handleOpenChange(false)}
              disabled={isUploading || isCheckingFiles}
            >
              Cancel
            </Button>
            <Button
              onClick={handleImport}
              disabled={isUploading || isCheckingFiles}
            >
              {isUploading
                ? "Importing..."
                : isCheckingFiles
                  ? "Checking..."
                  : "Import Transactions"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
