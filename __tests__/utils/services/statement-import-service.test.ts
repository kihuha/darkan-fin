import { import_statement_transactions } from "@/utils/services/statement-import-service";

describe("statement import service", () => {
  it("normalizes, deduplicates, and inserts in bulk", async () => {
    const any = jest
      .fn()
      .mockResolvedValueOnce([
        { id: "1", name: "Uncategorized", tags: [] },
        { id: "2", name: "Food", tags: ["shop"] },
      ])
      .mockResolvedValueOnce([
        {
          amount: "50.00",
          transaction_date: "2026-02-02",
          description: "Transport",
        },
      ]);

    const result = jest.fn().mockResolvedValue({ rowCount: 1 });

    const tx = {
      any,
      result,
    };

    const db = {
      tx: async (callback: (inner: typeof tx) => Promise<unknown>) =>
        callback(tx),
    };

    const summary = await import_statement_transactions({
      db: db as never,
      family_id: "42",
      user_id: "user-1",
      entries: [
        {
          time: "2026-02-01 12:00:00",
          details: "Grocery Shop",
          money_in: "0",
          money_out: "100",
        },
        {
          time: "2026-02-01 12:00:00",
          details: "Grocery Shop",
          money_in: "0",
          money_out: "100",
        },
        {
          time: "bad date",
          details: "Broken",
          money_in: "0",
          money_out: "10",
        },
        {
          time: "2026-02-02 10:00:00",
          details: "Transport",
          money_in: "0",
          money_out: "50",
        },
      ],
    });

    expect(summary).toEqual({
      inserted_count: 1,
      skipped_duplicates_count: 2,
      errors_count: 1,
    });

    expect(any).toHaveBeenCalledTimes(2);
    expect(result).toHaveBeenCalledTimes(1);

    const insert_sql = result.mock.calls[0][0] as string;
    expect(insert_sql).toContain("INSERT INTO transaction");
  });
});
