import { Router, type IRouter, Request, Response, NextFunction } from "express";
import { db, productsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { 
  CreateProductBody, 
  CreateProductResponse, 
  ListProductsResponseItem 
} from "@workspace/api-zod";
import { createClient } from "@supabase/supabase-js";

// 1. Create a Supabase client for the backend to verify tokens
const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '';
const supabaseBackend = createClient(supabaseUrl, supabaseKey);

// 2. The "Bouncer" middleware function
const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized: No token provided' });

  const { data: { user }, error } = await supabaseBackend.auth.getUser(token);
  if (error || !user) return res.status(401).json({ error: 'Unauthorized: Invalid token' });

  next(); // Token is valid, allow the request to proceed
};

const router: IRouter = Router();

// GET route remains open (or you can add requireAuth here too if you want to hide the list)
router.get("/products", async (_req, res) => {
  const rows = await db.select().from(productsTable);
  const data = rows.map((row) => ListProductsResponseItem.parse(row));
  res.json(data);
});

// 3. Attached requireAuth to block unauthorized POST requests
router.post("/products", requireAuth, async (req, res) => {
  const body = CreateProductBody.parse(req.body);
  const [row] = await db.insert(productsTable).values(body).returning();
  const data = CreateProductResponse.parse(row);
  res.status(201).json(data);
});

// 4. Attached requireAuth to block unauthorized DELETE requests
router.delete("/products/:code", requireAuth, async (req, res) => {
  await db.delete(productsTable).where(eq(productsTable.code, req.params.code));
  res.status(204).send();
});

export default router;