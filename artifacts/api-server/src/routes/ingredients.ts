import { Router, type IRouter } from "express";
import { db, ingredientsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import type { CreateIngredient, Ingredient } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/ingredients", async (_req, res) => {
  const rows = await db.select().from(ingredientsTable);
  const data = rows.map((row) => Ingredient.parse(row));
  res.json(data);
});

router.post("/ingredients", async (req, res) => {
  const body = CreateIngredient.parse(req.body);

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

  const data = Ingredient.parse(row);
  res.status(201).json(data);
});

router.delete("/ingredients/:code", async (req, res) => {
  await db.delete(ingredientsTable).where(eq(ingredientsTable.code, req.params.code));
  res.status(204).send();
});

export default router;