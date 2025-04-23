import { pgTable, text, serial, integer, boolean, timestamp, doublePrecision, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User model (sin campo de usuario, usando email como identificación)
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  password: text("password").notNull(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  role: text("role", { enum: ["client", "nutritionist"] }).notNull().default("client"),
  nutritionistId: integer("nutritionist_id"),
  active: boolean("active").notNull().default(true),
  inviteToken: text("invite_token"),
  inviteExpires: timestamp("invite_expires"),
});

export const insertUserSchema = createInsertSchema(users).pick({
  password: true,
  name: true,
  email: true,
  role: true,
  nutritionistId: true,
  active: true,
  inviteToken: true,
  inviteExpires: true,
});

// Login schema simplificado
export const loginSchema = z.object({
  email: z.string().email("Email inválido"),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
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

// Meal model con nuevos campos (duración y agua bebida)
export const meals = pgTable("meals", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  date: timestamp("date").notNull(),
  type: text("type").notNull(),
  name: text("name").notNull(),
  description: text("description").default(null),
  calories: integer("calories").default(null),
  time: text("time").default(null), // Hora del día
  duration: integer("duration").default(null), // Duración en minutos
  waterIntake: doublePrecision("water_intake").default(null), // Agua en litros
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
  duration: true,
  waterIntake: true,
  notes: true,
});

// Comentarios del nutricionista
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

// Modelo para plan semanal (nuevo)
export const mealPlans = pgTable("meal_plans", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  nutritionistId: integer("nutritionist_id").notNull(),
  weekStart: timestamp("week_start").notNull(),
  weekEnd: timestamp("week_end").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  active: boolean("active").notNull().default(true),
});

export const insertMealPlanSchema = createInsertSchema(mealPlans).pick({
  userId: true,
  nutritionistId: true,
  weekStart: true,
  weekEnd: true,
  active: true,
}).omit({ createdAt: true });

// Detalles del plan de comidas
export const mealPlanDetails = pgTable("meal_plan_details", {
  id: serial("id").primaryKey(),
  mealPlanId: integer("meal_plan_id").notNull(),
  day: timestamp("day").notNull(),
  type: text("type").notNull(),
  suggestion: text("suggestion").notNull(),
  calories: integer("calories").default(null),
  notes: text("notes").default(null),
});

export const insertMealPlanDetailSchema = createInsertSchema(mealPlanDetails).pick({
  mealPlanId: true,
  day: true, 
  type: true,
  suggestion: true,
  calories: true,
  notes: true,
});

// Modelo de resumen nutricional
export const nutritionSummaries = pgTable("nutrition_summaries", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  date: timestamp("date").notNull(),
  caloriesTotal: integer("calories_total").default(null),
  waterTotal: doublePrecision("water_total").default(null), // Total de agua del día
});

export const insertNutritionSummarySchema = createInsertSchema(nutritionSummaries).pick({
  userId: true,
  date: true,
  caloriesTotal: true,
  waterTotal: true,
});

// Type definitions
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type LoginData = z.infer<typeof loginSchema>;

export type InsertMeal = z.infer<typeof insertMealSchema>;
export type Meal = typeof meals.$inferSelect;

export type InsertComment = z.infer<typeof insertCommentSchema>;
export type Comment = typeof comments.$inferSelect;

export type InsertMealPlan = z.infer<typeof insertMealPlanSchema>;
export type MealPlan = typeof mealPlans.$inferSelect;

export type InsertMealPlanDetail = z.infer<typeof insertMealPlanDetailSchema>;
export type MealPlanDetail = typeof mealPlanDetails.$inferSelect;

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

// Plan semanal con detalles
export type MealPlanWithDetails = MealPlan & {
  details: MealPlanDetail[];
};

// Client with nutrition data
export type ClientWithSummary = User & {
  latestMeal?: Meal;
  progress: number;
  pendingComments: number;
  lastWeekStatus: 'Bien' | 'Regular' | 'Insuficiente';
  activePlan?: MealPlanWithDetails;
};
