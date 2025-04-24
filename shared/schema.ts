import { pgTable, text, serial, integer, boolean, timestamp, doublePrecision, uniqueIndex, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { uuidv7 } from "uuidv7";

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

// Creamos un esquema personalizado para manejar correctamente las fechas como string
export const insertMealSchema = z.object({
  userId: z.number(),
  date: z.string().or(z.date()).transform(val => 
    typeof val === 'string' ? new Date(val) : val
  ),
  type: z.string(),
  name: z.string().min(1, "El nombre de la comida es obligatorio"),
  description: z.string().optional().nullable(),
  calories: z.number().optional().nullable(),
  time: z.string().optional().nullable(),
  duration: z.number().optional().nullable(),
  waterIntake: z.number().optional().nullable(),
  notes: z.string().optional().nullable(),
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
  description: text("description"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  active: boolean("active").notNull().default(true),
  published: boolean("published").notNull().default(false), // Indica si el plan es visible para el cliente
});

export const insertMealPlanSchema = createInsertSchema(mealPlans).pick({
  userId: true,
  nutritionistId: true,
  weekStart: true,
  weekEnd: true,
  description: true,
  active: true,
  published: true,
});

// Detalles del plan de comidas
export const mealPlanDetails = pgTable("meal_plan_details", {
  id: serial("id").primaryKey(),
  mealPlanId: integer("meal_plan_id").notNull(),
  day: timestamp("day").notNull(),
  mealType: text("meal_type").notNull(),
  description: text("description").notNull(),
  image: text("image"),
});

export const insertMealPlanDetailSchema = createInsertSchema(mealPlanDetails).pick({
  mealPlanId: true,
  day: true, 
  mealType: true,
  description: true,
  image: true,
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
  [key in MealTypeValues]?: MealWithComments[];
};

export type WeeklyMeals = {
  [key: string]: DailyMeals; // ISO date string -> meals
};

// Plan semanal con detalles
export type MealPlanWithDetails = MealPlan & {
  details: MealPlanDetail[];
};

// Client with nutrition data
// Ejercicios y Actividad Física
export const exerciseTypes = pgTable("exercise_types", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  caloriesPerMinute: integer("calories_per_minute"),
  active: boolean("active").notNull().default(true),
});

export const insertExerciseTypeSchema = createInsertSchema(exerciseTypes).pick({
  name: true,
  description: true,
  caloriesPerMinute: true,
  active: true,
});

// Registro de actividad física diaria
export const physicalActivities = pgTable("physical_activities", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  date: timestamp("date").notNull(),
  steps: integer("steps").default(null),  // Pasos diarios
  fitSyncDate: timestamp("fit_sync_date").default(null), // Fecha de última sincronización con app de fitness
  notes: text("notes").default(null),
});

export const insertPhysicalActivitySchema = z.object({
  userId: z.number(),
  date: z.string().or(z.date()).transform((val) => new Date(val)),
  steps: z.number().optional(),
  fitSyncDate: z.string().or(z.date()).optional().transform((val) => val ? new Date(val) : null),
  notes: z.string().optional(),
});

// Ejercicios específicos realizados en un día
export const exerciseEntries = pgTable("exercise_entries", {
  id: serial("id").primaryKey(),
  activityId: integer("activity_id").notNull(),
  exerciseTypeId: integer("exercise_type_id").notNull(),
  duration: integer("duration").notNull(), // Duración en minutos
  caloriesBurned: integer("calories_burned").default(null),
  notes: text("notes").default(null),
  startTime: timestamp("start_time").default(null),
});

export const insertExerciseEntrySchema = z.object({
  activityId: z.number(),
  exerciseTypeId: z.number(),
  duration: z.number().min(1, "La duración debe ser al menos 1 minuto"),
  caloriesBurned: z.number().optional(),
  notes: z.string().optional(),
  startTime: z.union([
    z.string().refine(val => val !== ""),
    z.null()
  ]).optional().nullable(),
});

// Configuración de integración con aplicaciones de salud
export const healthAppIntegrations = pgTable("health_app_integrations", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().unique(),
  provider: text("provider", { enum: ["google_fit", "apple_health"] }).notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  tokenExpiry: timestamp("token_expiry"),
  lastSynced: timestamp("last_synced"),
  active: boolean("active").notNull().default(true),
  settings: json("settings").default({}),
});

export const insertHealthAppIntegrationSchema = createInsertSchema(healthAppIntegrations).pick({
  userId: true,
  provider: true,
  accessToken: true,
  refreshToken: true,
  tokenExpiry: true,
  lastSynced: true,
  active: true,
  settings: true,
});

// Agregar tipos adicionales
export type InsertExerciseType = z.infer<typeof insertExerciseTypeSchema>;
export type ExerciseType = typeof exerciseTypes.$inferSelect;

export type InsertPhysicalActivity = z.infer<typeof insertPhysicalActivitySchema>;
export type PhysicalActivity = typeof physicalActivities.$inferSelect;

export type InsertExerciseEntry = z.infer<typeof insertExerciseEntrySchema>;
export type ExerciseEntry = typeof exerciseEntries.$inferSelect;

export type InsertHealthAppIntegration = z.infer<typeof insertHealthAppIntegrationSchema>;
export type HealthAppIntegration = typeof healthAppIntegrations.$inferSelect;

// Tipos extendidos
export type PhysicalActivityWithExercises = PhysicalActivity & {
  exercises: (ExerciseEntry & {
    exerciseType: ExerciseType;
  })[];
};

export type ClientWithSummary = User & {
  latestMeal?: Meal;
  progress: number;
  pendingComments: number;
  lastWeekStatus: 'Bien' | 'Regular' | 'Insuficiente';
  activePlan?: MealPlanWithDetails;
  latestActivity?: PhysicalActivityWithExercises;
};
