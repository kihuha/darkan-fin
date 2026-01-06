import { NextRequest, NextResponse } from "next/server";
import db from "@/utils/db";
import {
  createCategorySchema,
  updateCategorySchema,
} from "@/lib/validations/category";

// GET - Fetch all categories
export async function GET() {
  try {
    const categories = await db.any(`
      SELECT id, name, type, amount, repeats, description, created_at, updated_at
      FROM category
      ORDER BY name ASC
    `);

    return NextResponse.json(
      { success: true, data: categories },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching categories:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch categories" },
      { status: 500 }
    );
  }
}

// POST - Create a new category
export async function POST(request: NextRequest) {
  try {
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
        { status: 400 }
      );
    }

    const { name, type, amount, repeats, description } = validationResult.data;

    // Check if category with same name already exists
    const existing = await db.oneOrNone(
      "SELECT id FROM category WHERE LOWER(name) = LOWER($1)",
      [name]
    );

    if (existing) {
      return NextResponse.json(
        { success: false, error: "A category with this name already exists" },
        { status: 409 }
      );
    }

    // Insert new category
    const newCategory = await db.one(
      `INSERT INTO category (name, type, amount, repeats, description)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, type, amount, repeats, description, created_at, updated_at`,
      [name, type, amount ?? 0, repeats, description || null]
    );

    return NextResponse.json(
      { success: true, data: newCategory },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating category:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create category" },
      { status: 500 }
    );
  }
}

// PATCH - Update an existing category
export async function PATCH(request: NextRequest) {
  try {
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
        { status: 400 }
      );
    }

    const { id, name, type, amount, repeats, description } =
      validationResult.data;

    // Check if category exists
    const existing = await db.oneOrNone(
      "SELECT id FROM category WHERE id = $1",
      [id]
    );

    if (!existing) {
      return NextResponse.json(
        { success: false, error: "Category not found" },
        { status: 404 }
      );
    }

    // Check if another category with the same name exists (if name is being updated)
    if (name) {
      const duplicate = await db.oneOrNone(
        "SELECT id FROM category WHERE LOWER(name) = LOWER($1) AND id != $2",
        [name, id]
      );

      if (duplicate) {
        return NextResponse.json(
          { success: false, error: "A category with this name already exists" },
          { status: 409 }
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

    updates.push(`updated_at = NOW()`);
    values.push(id);

    const query = `
      UPDATE category
      SET ${updates.join(", ")}
      WHERE id = $${paramCount}
      RETURNING id, name, type, amount, repeats, description, created_at, updated_at
    `;

    const updatedCategory = await db.one(query, values);

    return NextResponse.json(
      { success: true, data: updatedCategory },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error updating category:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update category" },
      { status: 500 }
    );
  }
}

// DELETE - Delete a category and move its items to "Uncategorized"
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json(
        { success: false, error: "Category ID is required" },
        { status: 400 }
      );
    }

    // Check if category exists
    const category = await db.oneOrNone(
      "SELECT id, name FROM category WHERE id = $1",
      [id]
    );

    if (!category) {
      return NextResponse.json(
        { success: false, error: "Category not found" },
        { status: 404 }
      );
    }

    // Prevent deletion of Uncategorized category
    if (category.name.toLowerCase() === "uncategorized") {
      return NextResponse.json(
        { success: false, error: "Cannot delete the Uncategorized category" },
        { status: 400 }
      );
    }

    // Get or create Uncategorized category
    let uncategorized = await db.oneOrNone(
      "SELECT id FROM category WHERE LOWER(name) = 'uncategorized'"
    );

    if (!uncategorized) {
      uncategorized = await db.one(
        `INSERT INTO category (name, type, amount, repeats, description)
         VALUES ('Uncategorized', 'expense', 0, false, 'Default category for uncategorized items')
         RETURNING id`
      );
    }

    // Move all budget items to Uncategorized category
    await db.none(
      `UPDATE budget_item 
       SET category_id = $1 
       WHERE category_id = $2`,
      [uncategorized.id, id]
    );

    // Delete the category
    await db.none("DELETE FROM category WHERE id = $1", [id]);

    return NextResponse.json(
      { success: true, message: "Category deleted successfully" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error deleting category:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete category" },
      { status: 500 }
    );
  }
}
