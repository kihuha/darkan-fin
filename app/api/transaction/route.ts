import { auth } from "@/utils/auth";
import db from "@/utils/db";
import { z } from "zod";
import { NextRequest, NextResponse } from "next/server";

const transactionSchema = z.object({
  id: z.coerce.number(),
  amount: z.coerce.number(),
  description: z.string(),
  transaction_date: z.coerce.date(),
  category_id: z.coerce.number(),
  family_id: z.coerce.number(),
  category_name: z.string(),
  category_type: z.enum(["income", "expense"]),
});

export async function GET(request: NextRequest) {
  const page = request.nextUrl.searchParams.get("page");
  const rowsPerPage = request.nextUrl.searchParams.get("rowsPerPage");
  const headers = await request.headers;
  const session = await auth.api.getSession({ headers });

  if (!session) {
    return NextResponse.json(
      { success: false, message: "Unauthorized" },
      { status: 401 },
    );
  }

  if (!page || !rowsPerPage) {
    return NextResponse.json(
      { success: false, message: "Missing pagination parameters" },
      { status: 400 },
    );
  }

  const pageNumber = parseInt(page, 10);
  const rowsPerPageNumber = parseInt(rowsPerPage, 10);

  if (isNaN(pageNumber) || isNaN(rowsPerPageNumber)) {
    return NextResponse.json(
      { success: false, message: "Invalid pagination parameters" },
      { status: 400 },
    );
  }

  // get all the transactions for the user's family with pagination
  const result = await db.query(
    `SELECT t.*, c.name AS category_name, c.type AS category_type
     FROM transaction t
     JOIN category c ON t.category_id = c.id
     WHERE t.family_id = $1
     ORDER BY t.transaction_date DESC
     LIMIT $2 OFFSET $3`,
    [session.user.family_id, rowsPerPageNumber, pageNumber * rowsPerPageNumber],
  );

  const totalPagesResult = await db.query(
    `SELECT COUNT(*) FROM transaction WHERE family_id = $1`,
    [session.user.family_id],
  );

  const total = parseInt(totalPagesResult[0].count, 10);

  const parsedData = result.map((row: z.infer<typeof transactionSchema>) =>
    transactionSchema.parse(row),
  );

  return NextResponse.json({
    success: true,
    data: parsedData,
    pagination: {
      page: pageNumber,
      rowsPerPage: rowsPerPageNumber,
      total: total,
      totalPages: Math.ceil(total / rowsPerPageNumber),
    },
  });
}
