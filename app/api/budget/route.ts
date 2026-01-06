import { NextRequest, NextResponse } from "next/server";
import db from "@/utils/db";
import { createBudgetSchema } from "@/lib/validations/budget";

// GET - Fetch budget for a specific month and year with all items
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const month = searchParams.get("month");
    const year = searchParams.get("year");

    if (!month || !year) {
      return NextResponse.json(
        { success: false, error: "Month and year are required" },
        { status: 400 }
      );
    }

    const monthNum = parseInt(month);
    const yearNum = parseInt(year);

    if (monthNum < 1 || monthNum > 12 || yearNum < 2000) {
      return NextResponse.json(
        { success: false, error: "Invalid month or year" },
        { status: 400 }
      );
    }

    // Get or create budget for this month/year
    let budget = await db.oneOrNone(
      `SELECT id, month, year, created_at, updated_at 
       FROM budget 
       WHERE month = $1 AND year = $2`,
      [monthNum, yearNum]
    );

    if (!budget) {
      budget = await db.one(
        `INSERT INTO budget (month, year)
         VALUES ($1, $2)
         RETURNING id, month, year, created_at, updated_at`,
        [monthNum, yearNum]
      );
    }

    // Get all categories
    const categories = await db.any(`
      SELECT id, name, type, amount, repeats, description
      FROM category
      ORDER BY type DESC, name ASC
    `);

    // Get existing budget items for this budget
    const items = await db.any(
      `SELECT id, budget_id, category_id, amount, created_at, updated_at
       FROM budget_item
       WHERE budget_id = $1`,
      [budget.id]
    );

    // Create a map of category_id -> budget_item for quick lookup
    const itemsMap = new Map(
      items.map((item) => [item.category_id.toString(), item])
    );

    // Build the complete budget data with all categories
    const budgetData = {
      ...budget,
      categories: categories.map((category) => {
        const existingItem = itemsMap.get(category.id.toString());
        return {
          category_id: category.id.toString(),
          category_name: category.name,
          category_type: category.type,
          category_amount: category.amount,
          repeats: category.repeats,
          amount: existingItem
            ? parseFloat(existingItem.amount)
            : category.repeats
            ? parseFloat(category.amount)
            : 0,
          budget_item_id: existingItem?.id.toString(),
        };
      }),
    };

    return NextResponse.json(
      { success: true, data: budgetData },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching budget:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch budget" },
      { status: 500 }
    );
  }
}

// POST - Create or update budget items
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validationResult = createBudgetSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          success: false,
          error: "Validation failed",
          details: validationResult.error.issues,
        },
        { status: 400 }
      );
    }

    const { month, year, items } = validationResult.data;

    // Get or create budget
    let budget = await db.oneOrNone(
      `SELECT id FROM budget WHERE month = $1 AND year = $2`,
      [month, year]
    );

    if (!budget) {
      budget = await db.one(
        `INSERT INTO budget (month, year)
         VALUES ($1, $2)
         RETURNING id`,
        [month, year]
      );
    }

    // Upsert budget items
    for (const item of items) {
      await db.none(
        `INSERT INTO budget_item (budget_id, category_id, amount)
         VALUES ($1, $2, $3)
         ON CONFLICT (budget_id, category_id) 
         DO UPDATE SET amount = $3, updated_at = NOW()`,
        [budget.id, item.category_id, item.amount]
      );
    }

    return NextResponse.json(
      { success: true, message: "Budget saved successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error saving budget:", error);
    return NextResponse.json(
      { success: false, error: "Failed to save budget" },
      { status: 500 }
    );
  }
}
