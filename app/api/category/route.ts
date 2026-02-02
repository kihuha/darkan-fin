import { NextRequest, NextResponse } from "next/server";
import db from "@/utils/db";
import {
  createCategorySchema,
  updateCategorySchema,
} from "@/lib/validations/category";
import { ApiError, requireFamilyContext } from "@/utils/auth-helpers";
import { findCategoryIdByTags } from "@/lib/category-recategorization";

// GET - Fetch all categories
export async function GET(request: NextRequest) {
  try {
    const { familyId } = await requireFamilyContext(request.headers);

    const categories = await db.any(
      `
        SELECT id, name, type, amount, repeats, description, tags, created_at, updated_at
        FROM category
        WHERE family_id = $1
        ORDER BY name ASC
      `,
      [familyId],
    );

    return NextResponse.json(
      { success: true, data: categories },
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status },
      );
    }
    console.error("Error fetching categories:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch categories" },
      { status: 500 },
    );
  }
}

// POST - Create a new category
export async function POST(request: NextRequest) {
  try {
    const { familyId } = await requireFamilyContext(request.headers);
    const { searchParams } = new URL(request.url);
    const action = searchParams.get("action");

    if (action === "recategorize") {
      const result = await recategorizeTransactions(familyId);
      return NextResponse.json(
        { success: true, data: result },
        { status: 200 },
      );
    }

    const body = await request.json();

    // Validate request body
    const validationResult = createCategorySchema.safeParse(body);

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

    const { name, type, amount, repeats, description, tags } =
      validationResult.data;

    // Check if category with same name already exists
    const existing = await db.oneOrNone(
      "SELECT id FROM category WHERE family_id = $1 AND LOWER(name) = LOWER($2)",
      [familyId, name],
    );

    if (existing) {
      return NextResponse.json(
        { success: false, error: "A category with this name already exists" },
        { status: 409 },
      );
    }

    // Insert new category
    const newCategory = await db.one(
      `INSERT INTO category (family_id, name, type, amount, repeats, description, tags)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id, name, type, amount, repeats, description, tags, created_at, updated_at`,
      [
        familyId,
        name,
        type,
        amount ?? 0,
        repeats,
        description || null,
        tags ?? [],
      ],
    );

    return NextResponse.json(
      { success: true, data: newCategory },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status },
      );
    }
    console.error("Error creating category:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create category" },
      { status: 500 },
    );
  }
}

// PATCH - Update an existing category
export async function PATCH(request: NextRequest) {
  try {
    const { familyId } = await requireFamilyContext(request.headers);
    const body = await request.json();

    // Validate request body
    const validationResult = updateCategorySchema.safeParse(body);

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

    const { id, name, type, amount, repeats, description, tags } =
      validationResult.data;

    // Check if category exists
    const existing = await db.oneOrNone(
      "SELECT id FROM category WHERE id = $1 AND family_id = $2",
      [id, familyId],
    );

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Category not found" },
        { status: 404 },
      );
    }

    // Check if another category with the same name exists (if name is being updated)
    if (name) {
      const duplicate = await db.oneOrNone(
        `SELECT id
         FROM category
         WHERE family_id = $1
           AND LOWER(name) = LOWER($2)
           AND id != $3`,
        [familyId, name, id],
      );

      if (duplicate) {
        return NextResponse.json(
          { success: false, error: "A category with this name already exists" },
          { status: 409 },
        );
      }
    }

    // Build dynamic update query
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramCount = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramCount++}`);
      values.push(name);
    }
    if (type !== undefined) {
      updates.push(`type = $${paramCount++}`);
      values.push(type);
    }
    if (amount !== undefined) {
      updates.push(`amount = $${paramCount++}`);
      values.push(amount);
    }
    if (repeats !== undefined) {
      updates.push(`repeats = $${paramCount++}`);
      values.push(repeats);
    }
    if (description !== undefined) {
      updates.push(`description = $${paramCount++}`);
      values.push(description);
    }
    if (tags !== undefined) {
      updates.push(`tags = $${paramCount++}`);
      values.push(tags);
    }

    updates.push(`updated_at = NOW()`);
    values.push(id, familyId);

    const query = `
      UPDATE category
      SET ${updates.join(", ")}
      WHERE id = $${paramCount} AND family_id = $${paramCount + 1}
      RETURNING id, name, type, amount, repeats, description, tags, created_at, updated_at
    `;

    const updatedCategory = await db.one(query, values);

    return NextResponse.json(
      { success: true, data: updatedCategory },
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status },
      );
    }
    console.error("Error updating category:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update category" },
      { status: 500 },
    );
  }
}

// DELETE - Delete a category and move its items to "Uncategorized"
export async function DELETE(request: NextRequest) {
  try {
    const { familyId } = await requireFamilyContext(request.headers);
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Category ID is required" },
        { status: 400 },
      );
    }

    // Check if category exists
    const category = await db.oneOrNone(
      "SELECT id, name FROM category WHERE id = $1 AND family_id = $2",
      [id, familyId],
    );

    if (!category) {
      return NextResponse.json(
        { success: false, error: "Category not found" },
        { status: 404 },
      );
    }

    // Prevent deletion of Uncategorized category
    if (category.name.toLowerCase() === "uncategorized") {
      return NextResponse.json(
        { success: false, error: "Cannot delete the Uncategorized category" },
        { status: 400 },
      );
    }

    // Get or create Uncategorized category
    let uncategorized = await db.oneOrNone(
      "SELECT id FROM category WHERE family_id = $1 AND LOWER(name) = 'uncategorized'",
      [familyId],
    );

    if (!uncategorized) {
      uncategorized = await db.one(
        `INSERT INTO category (family_id, name, type, amount, repeats, description)
         VALUES ($1, 'Uncategorized', 'expense', 0, false, 'Default category for uncategorized items')
         ON CONFLICT (family_id, LOWER(name))
         DO UPDATE SET updated_at = NOW()
         RETURNING id`,
        [familyId],
      );
    }

    await db.tx(async (tx) => {
      // Move all budget items to Uncategorized category
      await tx.none(
        `UPDATE budget_item 
         SET category_id = $1 
         WHERE category_id = $2 AND family_id = $3`,
        [uncategorized.id, id, familyId],
      );

      // Move all transactions to Uncategorized category
      await tx.none(
        `UPDATE transaction
         SET category_id = $1
         WHERE category_id = $2 AND family_id = $3`,
        [uncategorized.id, id, familyId],
      );

      // Delete the category
      await tx.none("DELETE FROM category WHERE id = $1 AND family_id = $2", [
        id,
        familyId,
      ]);
    });

    return NextResponse.json(
      { success: true, message: "Category deleted successfully" },
      { status: 200 },
    );
  } catch (error) {
    if (error instanceof ApiError) {
      return NextResponse.json(
        { success: false, error: error.message },
        { status: error.status },
      );
    }
    console.error("Error deleting category:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete category" },
      { status: 500 },
    );
  }
}

async function recategorizeTransactions(familyId: string) {
  return db.tx(async (tx) => {
    const categories = await tx.any(
      "SELECT id, name, tags FROM category WHERE family_id = $1",
      [familyId],
    );

    const uncategorized = categories.find(
      (category: { name?: string }) =>
        category.name?.toLowerCase() === "uncategorized",
    );

    if (!uncategorized?.id) {
      throw new ApiError(
        500,
        "Default Uncategorized category not found. Please run the database seed.",
      );
    }

    const matchableCategories = categories.filter(
      (category: { id: number | string }) => category.id !== uncategorized.id,
    );

    const transactions = await tx.any(
      `SELECT id, description
       FROM transaction
       WHERE family_id = $1 AND category_id = $2`,
      [familyId, uncategorized.id],
    );

    let updated = 0;

    for (const transaction of transactions) {
      const nextCategoryId = findCategoryIdByTags(
        transaction.description,
        matchableCategories,
        uncategorized.id,
      );

      if (nextCategoryId !== uncategorized.id) {
        await tx.none(
          "UPDATE transaction SET category_id = $1 WHERE id = $2 AND family_id = $3",
          [nextCategoryId, transaction.id, familyId],
        );
        updated += 1;
      }
    }

    return {
      updated,
      scanned: transactions.length,
    };
  });
}
