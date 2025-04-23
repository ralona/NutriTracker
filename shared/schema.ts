import { pgTable, text, serial, integer, boolean, timestamp, doublePrecision } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User model
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  role: text("role", { enum: ["client", "nutritionist"] }).notNull().default("client"),
  nutritionistId: integer("nutritionist_id"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  name: true,
  email: true,
  role: true,
  nutritionistId: true,
});

// Meal types enum
export const MealType = {
  BREAKFAST: "Desayuno",
  MORNING_SNACK: "Media Mañana",
  LUNCH: "Comida",
  AFTERNOON_SNACK: "Media Tarde",
  DINNER: "Cena",
} as const;

// Arreglar la definición del tipo para usar correctamente los valores del enum
const MEAL_TYPE_VALUES = ["Desayuno", "Media Mañana", "Comida", "Media Tarde", "Cena"] as const;
export type MealTypeValues = typeof MealType[keyof typeof MealType];

// Meal model
export const meals = pgTable("meals", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  date: timestamp("date").notNull(),
  type: text("type").notNull(),
  name: text("name").notNull(),
  description: text("description").default(null),
  calories: integer("calories").default(null),
  time: text("time").default(null),
  notes: text("notes").default(null),
});

export const insertMealSchema = createInsertSchema(meals).pick({
  userId: true,
  date: true,
  type: true,
  name: true,
  description: true,
  calories: true,
  time: true,
  notes: true,
});

// Nutritionist comments model
export const comments = pgTable("comments", {
  id: serial("id").primaryKey(),
  mealId: integer("meal_id").notNull(),
  nutritionistId: integer("nutritionist_id").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  read: boolean("read").notNull().default(false),
});

export const insertCommentSchema = createInsertSchema(comments).pick({
  mealId: true,
  nutritionistId: true,
  content: true,
  read: true,
}).omit({ createdAt: true }); // Omitir createdAt ya que tiene un valor por defecto

// Nutrition summary model
export const nutritionSummaries = pgTable("nutrition_summaries", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  date: timestamp("date").notNull(),
  caloriesTotal: integer("calories_total").default(null),
});

export const insertNutritionSummarySchema = createInsertSchema(nutritionSummaries).pick({
  userId: true,
  date: true,
  caloriesTotal: true,
});

// Type definitions
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertMeal = z.infer<typeof insertMealSchema>;
export type Meal = typeof meals.$inferSelect;

export type InsertComment = z.infer<typeof insertCommentSchema>;
export type Comment = typeof comments.$inferSelect;

export type InsertNutritionSummary = z.infer<typeof insertNutritionSummarySchema>;
export type NutritionSummary = typeof nutritionSummaries.$inferSelect;

// Extended schemas with Meal and Comments
export type MealWithComments = Meal & {
  comments: Comment[];
};

export type DailyMeals = {
  [key in MealTypeValues]?: MealWithComments;
};

export type WeeklyMeals = {
  [key: string]: DailyMeals; // ISO date string -> meals
};

// Client with nutrition data
export type ClientWithSummary = User & {
  latestMeal?: Meal;
  progress: number;
  pendingComments: number;
  lastWeekStatus: 'Bien' | 'Regular' | 'Insuficiente';
};
