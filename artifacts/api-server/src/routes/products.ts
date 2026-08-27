import { Router, type IRouter } from "express";
import { db, productsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { 
  CreateProductBody, 
  CreateProductResponse, 
  ListProductsResponseItem 
} from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/products", async (_req, res) => {
  const rows = await db.select().from(productsTable);
  const data = rows.map((row) => ListProductsResponseItem.parse(row));
  res.json(data);
});

router.post("/products", async (req, res) => {
  const body = CreateProductBody.parse(req.body);
  const [row] = await db.insert(productsTable).values(body).returning();
  const data = CreateProductResponse.parse(row);
  res.status(201).json(data);
});

router.delete("/products/:code", async (req, res) => {
  await db.delete(productsTable).where(eq(productsTable.code, req.params.code));
  res.status(204).send();
});

export default router;