import { pgTable, text, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const ingredientsTable = pgTable("ingredients", {
  code: text("code").primaryKey(),
  name: text("name").notNull(),
  unit: text("unit").notNull(),
  stock: numeric("stock", { mode: "number" }).notNull(),
  minimum: numeric("minimum", { mode: "number" }).notNull().default(0),
});

export const insertIngredientSchema = createInsertSchema(ingredientsTable);
export type InsertIngredient = z.infer<typeof insertIngredientSchema>;
export type Ingredient = typeof ingredientsTable.$inferSelect;