import { pgTable, text, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const productsTable = pgTable("products", {
  code: text("code").primaryKey(),
  name: text("name").notNull(),
  price: numeric("price", { mode: "number" }).notNull(),
  cost: numeric("cost", { mode: "number" }).notNull(),
});

export const insertProductSchema = createInsertSchema(productsTable);
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Product = typeof productsTable.$inferSelect;