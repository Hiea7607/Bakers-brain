import { Router, type IRouter } from "express";
import { db, ingredientsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import type { CreateIngredient } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/ingredients", async (_req, res) => {
  const rows = await db.select().from(ingredientsTable);
  res.json(rows);
});

router.post("/ingredients", async (req, res) => {
  const body = req.body as CreateIngredient;

  const [row] = await db
    .insert(ingredientsTable)
    .values(body)
    .onConflictDoUpdate({
      target: ingredientsTable.code,
      set: {
        stock: body.stock,
      },
    })
    .returning();

  res.status(201).json(row);
});

router.delete("/ingredients/:code", async (req, res) => {
  await db.delete(ingredientsTable).where(eq(ingredientsTable.code, req.params.code));
  res.status(204).send();
});

export default router;