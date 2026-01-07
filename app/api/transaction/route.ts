import { NextRequest, NextResponse } from "next/server";
import db from "@/utils/db";
import { auth } from "@/utils/auth";
import {
  createTransactionSchema,
  updateTransactionSchema,
} from "@/lib/validations/transaction";

// GET - Fetch all transactions for the logged-in user
export async function GET(request: NextRequest) {
  try {
    // Get session from better-auth
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

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
      WHERE t.user_id = $1
      ORDER BY t.transaction_date DESC, t.created_at DESC
    `,
      [session.user.id]
    );

    return NextResponse.json(
      { success: true, data: transactions },
      { status: 200 }
    );
  } catch (error) {
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
    // Get session from better-auth
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

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
      "SELECT id FROM category WHERE id = $1",
      [categoryId]
    );

    if (!category) {
      return NextResponse.json(
        { success: false, error: "Category not found" },
        { status: 404 }
      );
    }

    // Insert new transaction
    const newTransaction = await db.one(
      `INSERT INTO transaction (category_id, user_id, amount, transaction_date, description)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, category_id as "categoryId", user_id as "userId", amount, transaction_date as "transactionDate", description, created_at, updated_at`,
      [
        categoryId,
        session.user.id,
        amount,
        transactionDate,
        description || null,
      ]
    );

    return NextResponse.json(
      { success: true, data: newTransaction },
      { status: 201 }
    );
  } catch (error) {
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
    // Get session from better-auth
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

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

    // Check if transaction exists and belongs to user
    const existing = await db.oneOrNone(
      "SELECT id FROM transaction WHERE id = $1 AND user_id = $2",
      [id, session.user.id]
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
        "SELECT id FROM category WHERE id = $1",
        [categoryId]
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
    const idParam = `$${paramCount}`;

    const query = `
      UPDATE transaction
      SET ${updates.join(", ")}
      WHERE id = ${idParam}
      RETURNING id, category_id as "categoryId", user_id as "userId", amount, transaction_date as "transactionDate", description, created_at, updated_at
    `;

    const updatedTransaction = await db.one(query, values);

    return NextResponse.json(
      { success: true, data: updatedTransaction },
      { status: 200 }
    );
  } catch (error) {
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
    // Get session from better-auth
    const session = await auth.api.getSession({ headers: request.headers });

    if (!session) {
      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Transaction ID is required" },
        { status: 400 }
      );
    }

    // Check if transaction exists and belongs to user
    const existing = await db.oneOrNone(
      "SELECT id FROM transaction WHERE id = $1 AND user_id = $2",
      [id, session.user.id]
    );

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Transaction not found or access denied" },
        { status: 404 }
      );
    }

    await db.none("DELETE FROM transaction WHERE id = $1", [id]);

    return NextResponse.json(
      { success: true, message: "Transaction deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting transaction:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete transaction" },
      { status: 500 }
    );
  }
}
