import { NextRequest, NextResponse } from "next/server";
import { format, isValid, parse } from "date-fns";
import db from "@/utils/db";
import { ApiError, requireFamilyContext } from "@/utils/auth-helpers";
import { findCategoryIdByTags } from "@/lib/category-recategorization";

export async function POST(request: NextRequest) {
  try {
    const { familyId, userId } = await requireFamilyContext(request.headers);
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { success: false, error: "Statement file is required." },
        { status: 400 },
      );
    }

    const uploadFormData = new FormData();
    uploadFormData.append("file", file, file.name || "statement.pdf");

    const uploadResponse = await fetch(
      `${process.env.API_BASE_URL}/statements/upload-pdf`,
      {
        method: "POST",
        headers: {
          accept: "application/json",
        },
        body: uploadFormData,
        cache: "no-store",
      },
    );

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      return NextResponse.json(
        {
          success: false,
          error: "Failed to parse statement.",
          details: errorText || undefined,
        },
        { status: 502 },
      );
    }

    const parsedStatement = (await uploadResponse.json()) as Array<{
      ref?: string;
      time?: string;
      details?: string;
      status?: string;
      money_in?: number | string | null;
      money_out?: number | string | null;
    }>;

    if (!Array.isArray(parsedStatement) || parsedStatement.length === 0) {
      return NextResponse.json(
        { success: false, error: "Parsed statement is empty." },
        { status: 400 },
      );
    }

    const categories = await db.any(
      "SELECT id, name, tags FROM category WHERE family_id = $1",
      [familyId],
    );

    const uncategorizedCategory = categories.find(
      (category: { name?: string }) =>
        category.name?.toLowerCase() === "uncategorized",
    );

    if (!uncategorizedCategory?.id) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Default Uncategorized category not found. Please run the database seed.",
        },
        { status: 500 },
      );
    }

    const matchableCategories = categories.filter(
      (category: { id: number | string }) =>
        category.id !== uncategorizedCategory.id,
    );

    let skipped = 0;
    const transactions = parsedStatement
      .map((entry) => {
        const dateValue = parseStatementDate(entry.time);
        if (!dateValue) {
          skipped += 1;
          return null;
        }

        const moneyIn = parseMoney(entry.money_in);
        const moneyOut = parseMoney(entry.money_out);

        let amount = 0;

        if (moneyIn > 0) {
          amount = moneyIn;
        } else if (moneyOut > 0) {
          amount = moneyOut;
        } else {
          skipped += 1;
          return null;
        }

        const descriptionParts = [];
        if (entry.details) {
          descriptionParts.push(entry.details.trim());
        }
        if (entry.ref) {
          descriptionParts.push(`Ref: ${entry.ref}`);
        }
        if (entry.status) {
          descriptionParts.push(`Status: ${entry.status}`);
        }

        const description = descriptionParts.join(" | ") || "";
        const categoryId = findCategoryIdByTags(
          description,
          matchableCategories,
          uncategorizedCategory.id,
        );

        return {
          amount,
          categoryId,
          transactionDate: format(dateValue, "yyyy-MM-dd"),
          description: description || null,
        };
      })
      .filter(Boolean) as Array<{
      amount: number;
      categoryId: number | string;
      transactionDate: string;
      description: string | null;
    }>;

    if (transactions.length === 0) {
      return NextResponse.json(
        { success: false, error: "No valid transactions found to import." },
        { status: 400 },
      );
    }

    await db.tx(async (tx) => {
      const inserts = transactions.map((transaction) =>
        tx.none(
          `INSERT INTO transaction (category_id, user_id, amount, transaction_date, description, family_id)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            transaction.categoryId || uncategorizedCategory.id,
            userId,
            transaction.amount,
            transaction.transactionDate,
            transaction.description || null,
            familyId,
          ],
        ),
      );

      await tx.batch(inserts);
    });

    return NextResponse.json(
      {
        success: true,
        data: {
          imported: transactions.length,
          skipped,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status },
      );
    }

    console.error("Error importing M-Pesa statement:", error);
    return NextResponse.json(
      { success: false, error: "Failed to import statement." },
      { status: 500 },
    );
  }
}

function parseStatementDate(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const parsed = parse(value, "yyyy-MM-dd HH:mm:ss", new Date());
  if (!isValid(parsed)) {
    return null;
  }

  return parsed;
}

function parseMoney(value: number | string | null | undefined) {
  if (value === null || value === undefined) {
    return 0;
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }

  const normalized = value.replace(/,/g, "").trim();
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}
