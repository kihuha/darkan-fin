import "server-only";

import { createHash } from "crypto";
import { format, isValid, parse } from "date-fns";
import { prisma } from "@/lib/prisma";
import {
  findCategoryIdByTags,
  type CategoryTagEntry,
} from "@/lib/category-recategorization";
import type { MpesaTransformEntry } from "@/lib/validations/mpesa";
import { ApiError } from "@/utils/errors";

type CategoryRecord = CategoryTagEntry & {
  id: string;
  name: string;
};

type NormalizedTransaction = {
  category_id: string;
  amount: number;
  transaction_date: string;
  description: string | null;
  fingerprint: string;
  mpesa_ref: string | null;
};

export type MpesaImportSummary = {
  inserted_count: number;
  skipped_duplicates_count: number;
  errors_count: number;
};

function parse_statement_date(value: string | undefined): Date | null {
  if (!value) {
    return null;
  }

  const normalized = value.trim();

  const candidates = [
    parse(normalized, "yyyy-MM-dd HH:mm:ss", new Date()),
    parse(normalized, "yyyy-MM-dd", new Date()),
    parse(normalized, "dd/MM/yyyy HH:mm:ss", new Date()),
    parse(normalized, "dd/MM/yyyy", new Date()),
  ];

  for (const candidate of candidates) {
    if (isValid(candidate)) {
      return candidate;
    }
  }

  return null;
}

function parse_money(value: number | string | null | undefined): number {
  if (value === null || value === undefined) {
    return 0;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? Math.abs(value) : 0;
  }

  const normalized = value.replace(/,/g, "").trim();
  const parsed = Number(normalized);

  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return Math.abs(parsed);
}

function normalize_description(entry: MpesaTransformEntry): string {
  const chunks = [
    entry.details,
    entry.ref ? `Ref: ${entry.ref}` : undefined,
    entry.status ? `Status: ${entry.status}` : undefined,
  ]
    .map((value) => value?.trim())
    .filter(Boolean) as string[];

  const merged = chunks.join(" | ").replace(/\s+/g, " ").trim();
  return merged.slice(0, 1000);
}

function build_fingerprint(input: {
  family_id: string;
  transaction_date: string;
  amount: number;
  description: string | null;
  mpesa_ref?: string | null;
}): string {
  // If we have an M-Pesa ref, use it as the primary identifier along with family_id
  // This ensures transactions with the same ref are always treated as duplicates
  const parts = [
    input.family_id,
    input.mpesa_ref || "", // Include ref if available
    input.transaction_date,
    input.amount.toFixed(2),
  ];

  // Only include description if no ref is available
  // This prevents description variations from creating duplicates when we have a ref
  if (!input.mpesa_ref) {
    parts.push((input.description ?? "").toLowerCase());
  }

  return createHash("sha256").update(parts.join("|")).digest("hex");
}

function normalize_entries(args: {
  entries: MpesaTransformEntry[];
  family_id: string;
  categories: CategoryRecord[];
}): { normalized: NormalizedTransaction[]; errors_count: number } {
  const { entries, family_id, categories } = args;

  const uncategorized = categories.find(
    (category) => category.name.toLowerCase() === "uncategorized",
  );

  if (!uncategorized?.id) {
    throw new ApiError(
      500,
      "INTERNAL_ERROR",
      "Default Uncategorized category not found. Run database seed.",
    );
  }

  const matchable_categories = categories.filter(
    (category) => category.id !== uncategorized.id,
  );

  const normalized: NormalizedTransaction[] = [];
  let errors_count = 0;

  for (const entry of entries) {
    const parsed_date = parse_statement_date(entry.time);

    if (!parsed_date) {
      errors_count += 1;
      continue;
    }

    const money_in = parse_money(entry.money_in);
    const money_out = parse_money(entry.money_out);

    const amount = money_in > 0 ? money_in : money_out;

    if (amount <= 0) {
      errors_count += 1;
      continue;
    }

    const transaction_date = format(parsed_date, "yyyy-MM-dd");
    const description = normalize_description(entry) || null;
    const mpesa_ref = entry.ref?.trim() || null;

    const category_id = findCategoryIdByTags(
      description,
      matchable_categories,
      uncategorized.id,
    );

    normalized.push({
      category_id,
      amount,
      transaction_date,
      description,
      mpesa_ref,
      fingerprint: build_fingerprint({
        family_id,
        transaction_date,
        amount,
        description,
        mpesa_ref,
      }),
    });
  }

  return {
    normalized,
    errors_count,
  };
}

async function get_existing_fingerprints(args: {
  family_id: string;
  min_date: string;
  max_date: string;
}): Promise<Set<string>> {
  const { family_id, min_date, max_date } = args;

  const rows = await prisma.transaction.findMany({
    where: {
      family_id: BigInt(family_id),
      transaction_date: {
        gte: new Date(min_date),
        lte: new Date(max_date),
      },
    },
    select: {
      amount: true,
      transaction_date: true,
      description: true,
    },
  });

  const fingerprints = new Set<string>();

  for (const row of rows) {
    const transaction_date = format(row.transaction_date, "yyyy-MM-dd");
    const description = row.description;

    // Extract M-Pesa ref from description if it exists
    // Format: "... | Ref: XXXXXXXXX | ..."
    const mpesa_ref = description?.match(/Ref:\s*([A-Z0-9]+)/i)?.[1] || null;

    const fingerprint = build_fingerprint({
      family_id,
      transaction_date,
      amount: Number(row.amount),
      description,
      mpesa_ref,
    });

    fingerprints.add(fingerprint);
  }

  return fingerprints;
}

async function bulk_insert(args: {
  family_id: string;
  user_id: string;
  transactions: NormalizedTransaction[];
}): Promise<number> {
  const { family_id, user_id, transactions } = args;

  if (transactions.length === 0) {
    return 0;
  }

  // Use createMany for bulk insert
  const result = await prisma.transaction.createMany({
    data: transactions.map((transaction) => ({
      family_id: BigInt(family_id),
      category_id: BigInt(transaction.category_id),
      user_id,
      amount: transaction.amount,
      transaction_date: new Date(transaction.transaction_date),
      description: transaction.description,
    })),
  });

  return result.count;
}

export async function import_mpesa_transactions(args: {
  family_id: string;
  user_id: string;
  entries: MpesaTransformEntry[];
}): Promise<MpesaImportSummary> {
  const { family_id, user_id, entries } = args;

  return prisma.$transaction(async (tx) => {
    // Get all categories for the family
    const categories = await tx.category.findMany({
      where: {
        family_id: BigInt(family_id),
      },
      select: {
        id: true,
        name: true,
        tags: true,
      },
    });

    // Convert to expected format
    const formattedCategories: CategoryRecord[] = categories.map((cat) => ({
      id: cat.id.toString(),
      name: cat.name,
      tags: cat.tags,
    }));

    const { normalized, errors_count } = normalize_entries({
      entries,
      family_id,
      categories: formattedCategories,
    });

    if (normalized.length === 0) {
      return {
        inserted_count: 0,
        skipped_duplicates_count: 0,
        errors_count,
      };
    }

    const sorted_dates = normalized
      .map((transaction) => transaction.transaction_date)
      .sort();

    const min_date = sorted_dates[0];
    const max_date = sorted_dates[sorted_dates.length - 1];

    const existing_fingerprints = await get_existing_fingerprints({
      family_id,
      min_date,
      max_date,
    });

    const seen_fingerprints = new Set<string>();

    const deduped = normalized.filter((transaction) => {
      if (existing_fingerprints.has(transaction.fingerprint)) {
        return false;
      }

      if (seen_fingerprints.has(transaction.fingerprint)) {
        return false;
      }

      seen_fingerprints.add(transaction.fingerprint);
      return true;
    });

    const inserted_count = await bulk_insert({
      family_id,
      user_id,
      transactions: deduped,
    });

    return {
      inserted_count,
      skipped_duplicates_count: normalized.length - deduped.length,
      errors_count,
    };
  });
}
