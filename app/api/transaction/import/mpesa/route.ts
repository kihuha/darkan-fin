import { statement_import_form_schema } from "@/lib/validations/statement";
import { jsonSuccess } from "@/utils/api-response";
import { ApiError } from "@/utils/errors";
import { withRouteContext } from "@/utils/route";
import {
  uploadStatementForTransform,
  uploadMultipleStatementsForTransform,
} from "@/utils/clients/statementTransformClient";
import { import_statement_transactions } from "@/utils/services/statement-import-service";
import { enforceRateLimit } from "@/utils/server/rate-limit";
import { logInfo } from "@/utils/server/logger";

export const POST = withRouteContext(
  async ({ request, request_id, family, user }) => {
    if (!family || !user) {
      throw new ApiError(500, "INTERNAL_ERROR", "Route context is incomplete");
    }

    enforceRateLimit(`statement_import:${family.family_id}`, 5, 60_000);

    const form_data = await request.formData();

    // Extract files from FormData
    const files = form_data
      .getAll("files")
      .filter((item): item is File => item instanceof File);
    const single_file = form_data.get("file");

    const parsed_form = statement_import_form_schema.safeParse({
      file: single_file instanceof File ? single_file : undefined,
      files: files.length > 0 ? files : undefined,
    });

    if (!parsed_form.success) {
      throw new ApiError(
        400,
        "VALIDATION_ERROR",
        "Validation failed",
        parsed_form.error.issues,
      );
    }

    // Use the appropriate function based on whether single or multiple files
    const entries = parsed_form.data.files
      ? await uploadMultipleStatementsForTransform(parsed_form.data.files)
      : await uploadStatementForTransform(parsed_form.data.file!);

    const summary = await import_statement_transactions({
      family_id: family.family_id,
      user_id: user.user_id,
      entries,
    });

    logInfo("statement_import.completed", {
      request_id,
      family_id: family.family_id,
      user_id: user.user_id,
      inserted_count: summary.inserted_count,
      skipped_duplicates_count: summary.skipped_duplicates_count,
      errors_count: summary.errors_count,
    });

    return jsonSuccess(summary, {
      request_id,
      status: 200,
    });
  },
);
