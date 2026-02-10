import { NextRequest, NextResponse } from "next/server";
import db from "@/utils/db";
import { createBudgetSchema } from "@/lib/validations/budget";
import { ApiError, requireFamilyContext } from "@/utils/auth-helpers";

type BudgetRecord = {
  id: string;
  month: number;
  year: number;
  created_at: string;
  updated_at: string;
};

type CategoryRecord = {
  id: string;
  name: string;
  type: "income" | "expense";
  amount: string | number | null;
  repeats: boolean | null;
  description: string | null;
};

type BudgetItemRecord = {
  id: string;
  budget_id: string;
  category_id: string;
  amount: string | number;
  created_at: string;
  updated_at: string;
};

const toNumber = (value: string | number | null) =>
  value === null ? 0 : Number(value);

// GET - Fetch budget for a specific month and year with all items
export async function GET(request: NextRequest) {
  try {
    const { familyId } = await requireFamilyContext(request.headers);
    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month");
    const year = searchParams.get("year");

    if (!month || !year) {
      return NextResponse.json(
        { success: false, error: "Month and year are required" },
        { status: 400 },
      );
    }

    const monthNum = parseInt(month);
    const yearNum = parseInt(year);

    if (monthNum < 1 || monthNum > 12 || yearNum < 2000) {
      return NextResponse.json(
        { success: false, error: "Invalid month or year" },
        { status: 400 },
      );
    }

    // Get or create budget for this month/year
    let budget = await db.oneOrNone<BudgetRecord>(
      `SELECT id, month, year, created_at, updated_at 
       FROM budget 
       WHERE family_id = $1 AND month = $2 AND year = $3`,
      [familyId, monthNum, yearNum],
    );

    if (!budget) {
      budget = await db.one<BudgetRecord>(
        `INSERT INTO budget (family_id, month, year)
         VALUES ($1, $2, $3)
         RETURNING id, month, year, created_at, updated_at`,
        [familyId, monthNum, yearNum],
      );
    }

    // Get all categories
    const categories = await db.any<CategoryRecord>(
      `
      SELECT id, name, type, amount, repeats, description
      FROM category
      WHERE family_id = $1
      ORDER BY type DESC, name ASC
    `,
      [familyId],
    );

    // Get existing budget items for this budget
    const items = await db.any<BudgetItemRecord>(
      `SELECT id, budget_id, category_id, amount, created_at, updated_at
       FROM budget_item
       WHERE budget_id = $1 AND family_id = $2`,
      [budget.id, familyId],
    );

    // Create a map of category_id -> budget_item for quick lookup
    const itemsMap = new Map<string, BudgetItemRecord>(
      items.map((item) => [item.category_id.toString(), item]),
    );

    // Build the complete budget data with all categories
    const budgetData = {
      ...budget,
      categories: categories.map((category) => {
        const existingItem = itemsMap.get(category.id.toString());
        const categoryAmount = toNumber(category.amount);
        return {
          category_id: category.id.toString(),
          category_name: category.name,
          category_type: category.type,
          category_amount: categoryAmount,
          repeats: category.repeats,
          amount: existingItem
            ? toNumber(existingItem.amount)
            : category.repeats
              ? categoryAmount
              : 0,
          budget_item_id: existingItem?.id.toString(),
        };
      }),
    };

    return NextResponse.json(
      { success: true, data: budgetData },
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status },
      );
    }
    console.error("Error fetching budget:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch budget" },
      { status: 500 },
    );
  }
}

// POST - Create or update budget items
export async function POST(request: NextRequest) {
  try {
    const { familyId } = await requireFamilyContext(request.headers);
    const body = await request.json();
    const validationResult = createBudgetSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          details: validationResult.error.issues,
        },
        { status: 400 },
      );
    }

    const { month, year, items } = validationResult.data;

    // Get or create budget
    let budget = await db.oneOrNone(
      `SELECT id FROM budget WHERE family_id = $1 AND month = $2 AND year = $3`,
      [familyId, month, year],
    );

    if (!budget) {
      budget = await db.one(
        `INSERT INTO budget (family_id, month, year)
         VALUES ($1, $2, $3)
         RETURNING id`,
        [familyId, month, year],
      );
    }

    const categoryIds = Array.from(
      new Set(items.map((item) => item.category_id)),
    );

    if (categoryIds.length > 0) {
      const validCategories = await db.any(
        `SELECT id
         FROM category
         WHERE family_id = $1
           AND id IN ($2:csv)`,
        [familyId, categoryIds],
      );

      if (validCategories.length !== categoryIds.length) {
        return NextResponse.json(
          { success: false, error: "One or more categories are invalid" },
          { status: 400 },
        );
      }
    }

    // Upsert budget items
    for (const item of items) {
      await db.none(
        `INSERT INTO budget_item (budget_id, category_id, amount, family_id)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (budget_id, category_id) 
         DO UPDATE SET amount = $3, updated_at = NOW()`,
        [budget.id, item.category_id, item.amount, familyId],
      );
    }

    return NextResponse.json(
      { success: true, message: "Budget saved successfully" },
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status },
      );
    }
    console.error("Error saving budget:", error);
    return NextResponse.json(
      { success: false, error: "Failed to save budget" },
      { status: 500 },
    );
  }
}
