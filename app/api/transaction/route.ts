import { NextRequest, NextResponse } from "next/server";
import db from "@/utils/db";
import {
  createTransactionSchema,
  updateTransactionSchema,
} from "@/lib/validations/transaction";
import { ApiError, requireFamilyContext } from "@/utils/auth-helpers";

// GET - Fetch all transactions for the logged-in user
export async function GET(request: NextRequest) {
  try {
    const { familyId } = await requireFamilyContext(request.headers);

    const transactions = await db.any(
      `
      SELECT 
        t.id, 
        t.category_id as "categoryId", 
        t.user_id as "userId", 
        t.amount, 
        t.transaction_date as "transactionDate", 
        t.description, 
        t.created_at, 
        t.updated_at,
        c.name as category_name,
        c.type as category_type
      FROM transaction t
      JOIN category c ON t.category_id = c.id
      WHERE t.family_id = $1 AND c.family_id = $1
      ORDER BY t.transaction_date DESC, t.created_at DESC
    `,
      [familyId]
    );

    return NextResponse.json(
      { success: true, data: transactions },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status }
      );
    }
    console.error("Error fetching transactions:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch transactions" },
      { status: 500 }
    );
  }
}

// POST - Create a new transaction
export async function POST(request: NextRequest) {
  try {
    const { familyId, userId } = await requireFamilyContext(request.headers);

    const body = await request.json();

    // Validate request body
    const validationResult = createTransactionSchema.safeParse(body);

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

    const { categoryId, amount, transactionDate, description } =
      validationResult.data;

    // Verify category exists
    const category = await db.oneOrNone(
      "SELECT id FROM category WHERE id = $1 AND family_id = $2",
      [categoryId, familyId]
    );

    if (!category) {
      return NextResponse.json(
        { success: false, error: "Category not found" },
        { status: 404 }
      );
    }

    // Insert new transaction
    const newTransaction = await db.one(
      `INSERT INTO transaction (category_id, user_id, amount, transaction_date, description, family_id)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, category_id as "categoryId", user_id as "userId", amount, transaction_date as "transactionDate", description, created_at, updated_at`,
      [
        categoryId,
        userId,
        amount,
        transactionDate,
        description || null,
        familyId,
      ]
    );

    return NextResponse.json(
      { success: true, data: newTransaction },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status }
      );
    }
    console.error("Error creating transaction:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create transaction" },
      { status: 500 }
    );
  }
}

// PATCH - Update an existing transaction
export async function PATCH(request: NextRequest) {
  try {
    const { familyId } = await requireFamilyContext(request.headers);

    const body = await request.json();

    // Validate request body
    const validationResult = updateTransactionSchema.safeParse(body);

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

    const { id, categoryId, amount, transactionDate, description } =
      validationResult.data;

    // Check if transaction exists in the family
    const existing = await db.oneOrNone(
      "SELECT id FROM transaction WHERE id = $1 AND family_id = $2",
      [id, familyId]
    );

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Transaction not found or access denied" },
        { status: 404 }
      );
    }

    // If categoryId is provided, verify it exists
    if (categoryId) {
      const category = await db.oneOrNone(
        "SELECT id FROM category WHERE id = $1 AND family_id = $2",
        [categoryId, familyId]
      );

      if (!category) {
        return NextResponse.json(
          { success: false, error: "Category not found" },
          { status: 404 }
        );
      }
    }

    // Build dynamic update query
    const updates: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    if (categoryId !== undefined) {
      updates.push(`category_id = $${paramCount}`);
      values.push(categoryId);
      paramCount++;
    }

    if (amount !== undefined) {
      updates.push(`amount = $${paramCount}`);
      values.push(amount);
      paramCount++;
    }

    if (transactionDate !== undefined) {
      updates.push(`transaction_date = $${paramCount}`);
      values.push(transactionDate);
      paramCount++;
    }

    if (description !== undefined) {
      updates.push(`description = $${paramCount}`);
      values.push(description || null);
      paramCount++;
    }

    updates.push(`updated_at = NOW()`);

    values.push(id);
    values.push(familyId);
    const idParam = `$${paramCount}`;
    const familyParam = `$${paramCount + 1}`;

    const query = `
      UPDATE transaction
      SET ${updates.join(", ")}
      WHERE id = ${idParam} AND family_id = ${familyParam}
      RETURNING id, category_id as "categoryId", user_id as "userId", amount, transaction_date as "transactionDate", description, created_at, updated_at
    `;

    const updatedTransaction = await db.one(query, values);

    return NextResponse.json(
      { success: true, data: updatedTransaction },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status }
      );
    }
    console.error("Error updating transaction:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update transaction" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a transaction
export async function DELETE(request: NextRequest) {
  try {
    const { familyId } = await requireFamilyContext(request.headers);

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Transaction ID is required" },
        { status: 400 }
      );
    }

    // Check if transaction exists in the family
    const existing = await db.oneOrNone(
      "SELECT id FROM transaction WHERE id = $1 AND family_id = $2",
      [id, familyId]
    );

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Transaction not found or access denied" },
        { status: 404 }
      );
    }

    await db.none("DELETE FROM transaction WHERE id = $1 AND family_id = $2", [
      id,
      familyId,
    ]);

    return NextResponse.json(
      { success: true, message: "Transaction deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status }
      );
    }
    console.error("Error deleting transaction:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete transaction" },
      { status: 500 }
    );
  }
}
