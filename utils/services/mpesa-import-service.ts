import "server-only";

import { createHash } from "crypto";
import { format, isValid, parse } from "date-fns";
import type { IDatabase, ITask } from "pg-promise";
import { findCategoryIdByTags, type CategoryTagEntry } from "@/lib/category-recategorization";
import type { MpesaTransformEntry } from "@/lib/validations/mpesa";
import { ApiError } from "@/utils/errors";

type DatabaseOrTransaction = IDatabase<unknown> | ITask<unknown>;

type CategoryRecord = CategoryTagEntry & {
  id: string | number;
  name: string;
};

type NormalizedTransaction = {
  category_id: string | number;
  amount: number;
  transaction_date: string;
  description: string | null;
  fingerprint: string;
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
  const chunks = [entry.details, entry.ref ? `Ref: ${entry.ref}` : undefined, entry.status ? `Status: ${entry.status}` : undefined]
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
}): string {
  return createHash("sha256")
    .update(
      [
        input.family_id,
        input.transaction_date,
        input.amount.toFixed(2),
        (input.description ?? "").toLowerCase(),
      ].join("|"),
    )
    .digest("hex");
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
      fingerprint: build_fingerprint({
        family_id,
        transaction_date,
        amount,
        description,
      }),
    });
  }

  return {
    normalized,
    errors_count,
  };
}

async function get_existing_fingerprints(args: {
  tx: DatabaseOrTransaction;
  family_id: string;
  min_date: string;
  max_date: string;
}): Promise<Set<string>> {
  const { tx, family_id, min_date, max_date } = args;

  const rows = await tx.any<{
    amount: number | string;
    transaction_date: string;
    description: string | null;
  }>(
    `SELECT amount, transaction_date::text, description
     FROM transaction
     WHERE family_id = $1
       AND transaction_date BETWEEN $2::date AND $3::date`,
    [family_id, min_date, max_date],
  );

  return new Set(
    rows.map((row) =>
      build_fingerprint({
        family_id,
        transaction_date: row.transaction_date,
        amount: Number(row.amount),
        description: row.description,
      }),
    ),
  );
}

async function bulk_insert(args: {
  tx: DatabaseOrTransaction;
  family_id: string;
  user_id: string;
  transactions: NormalizedTransaction[];
}): Promise<number> {
  const { tx, family_id, user_id, transactions } = args;

  if (transactions.length === 0) {
    return 0;
  }

  const values: unknown[] = [];
  const rows = transactions
    .map((transaction, index) => {
      const offset = index * 6;
      values.push(
        family_id,
        transaction.category_id,
        user_id,
        transaction.amount,
        transaction.transaction_date,
        transaction.description,
      );

      return `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4}, $${offset + 5}, $${offset + 6})`;
    })
    .join(", ");

  const inserted = await tx.result(
    `INSERT INTO transaction (family_id, category_id, user_id, amount, transaction_date, description)
     VALUES ${rows}`,
    values,
  );

  return inserted.rowCount;
}

export async function import_mpesa_transactions(args: {
  db: DatabaseOrTransaction;
  family_id: string;
  user_id: string;
  entries: MpesaTransformEntry[];
}): Promise<MpesaImportSummary> {
  const { db, family_id, user_id, entries } = args;

  return db.tx(async (tx) => {
    const categories = await tx.any<CategoryRecord>(
      `SELECT id, name, tags
       FROM category
       WHERE family_id = $1`,
      [family_id],
    );

    const { normalized, errors_count } = normalize_entries({
      entries,
      family_id,
      categories,
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
      tx,
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
      tx,
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
