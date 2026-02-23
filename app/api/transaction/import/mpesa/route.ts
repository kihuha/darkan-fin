import { mpesa_import_form_schema } from "@/lib/validations/mpesa";
import { jsonSuccess } from "@/utils/api-response";
import { ApiError } from "@/utils/errors";
import { withRouteContext } from "@/utils/route";
import { uploadStatementForTransform } from "@/utils/clients/mpesaTransformClient";
import { import_mpesa_transactions } from "@/utils/services/mpesa-import-service";
import { enforceRateLimit } from "@/utils/server/rate-limit";
import { logInfo } from "@/utils/server/logger";

export const POST = withRouteContext(
  async ({ request, request_id, family, user }) => {
    if (!family || !user) {
      throw new ApiError(500, "INTERNAL_ERROR", "Route context is incomplete");
    }

    enforceRateLimit(`mpesa_import:${family.family_id}`, 5, 60_000);

    const form_data = await request.formData();
    const parsed_form = mpesa_import_form_schema.safeParse(
      Object.fromEntries(form_data.entries()),
    );

    if (!parsed_form.success) {
      throw new ApiError(
        400,
        "VALIDATION_ERROR",
        "Validation failed",
        parsed_form.error.issues,
      );
    }

    const entries = await uploadStatementForTransform(parsed_form.data.file);
    const summary = await import_mpesa_transactions({
      family_id: family.family_id,
      user_id: user.user_id,
      entries,
    });

    logInfo("mpesa_import.completed", {
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
