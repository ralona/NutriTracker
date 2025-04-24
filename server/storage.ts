import { 
  users, type User, type InsertUser,
  meals, type Meal, type InsertMeal,
  comments, type Comment, type InsertComment,
  nutritionSummaries, type NutritionSummary, type InsertNutritionSummary,
  mealPlans, type MealPlan, type InsertMealPlan,
  mealPlanDetails, type MealPlanDetail, type InsertMealPlanDetail,
  exerciseTypes, type ExerciseType, type InsertExerciseType,
  physicalActivities, type PhysicalActivity, type InsertPhysicalActivity,
  exerciseEntries, type ExerciseEntry, type InsertExerciseEntry,
  healthAppIntegrations, type HealthAppIntegration, type InsertHealthAppIntegration,
  ClientWithSummary, MealPlanWithDetails, PhysicalActivityWithExercises
} from "@shared/schema";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { db } from "./db";
import { eq, and, between, desc, inArray, isNull, isNotNull } from "drizzle-orm";
import { pool } from './db';
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

const PostgresSessionStore = connectPg(session);

export interface IStorage {
  // User management
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByInviteToken(token: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<User>): Promise<User>;
  getClientsByNutritionistId(nutritionistId: number): Promise<User[]>;
  
  // Meal management
  getMealById(id: number): Promise<Meal | undefined>;
  getMealsByDateRange(userId: number, startDate: Date, endDate: Date): Promise<Meal[]>;
  createMeal(meal: InsertMeal): Promise<Meal>;
  updateMeal(id: number, meal: Partial<Meal>): Promise<Meal>;
  deleteMeal(id: number): Promise<void>;
  
  // Comment management
  getCommentsByMealId(mealId: number): Promise<Comment[]>;
  createComment(comment: InsertComment): Promise<Comment>;
  getPendingCommentCount(userId: number): Promise<number>;
  
  // Nutrition summary management
  getNutritionSummaryByDate(userId: number, date: Date): Promise<NutritionSummary | undefined>;
  getNutritionSummariesByDateRange(userId: number, startDate: Date, endDate: Date): Promise<NutritionSummary[]>;
  createNutritionSummary(summary: InsertNutritionSummary): Promise<NutritionSummary>;
  updateNutritionSummary(id: number, summary: Partial<NutritionSummary>): Promise<NutritionSummary>;
  
  // Meal Plan management
  createMealPlan(mealPlan: InsertMealPlan): Promise<MealPlan>;
  getMealPlanById(id: number): Promise<MealPlan | undefined>;
  getMealPlanWithDetails(id: number): Promise<MealPlanWithDetails | undefined>;
  getActiveMealPlanForUser(userId: number, isNutritionist?: boolean): Promise<MealPlanWithDetails | undefined>;
  addMealPlanDetail(detail: InsertMealPlanDetail): Promise<MealPlanDetail>;
  deactivateMealPlan(id: number): Promise<void>;
  
  // Physical Activity management
  getExerciseTypes(): Promise<ExerciseType[]>;
  getExerciseTypeById(id: number): Promise<ExerciseType | undefined>;
  createExerciseType(type: InsertExerciseType): Promise<ExerciseType>;
  updateExerciseType(id: number, type: Partial<ExerciseType>): Promise<ExerciseType>;
  
  getPhysicalActivityByDate(userId: number, date: Date): Promise<PhysicalActivity | undefined>;
  getPhysicalActivitiesByDateRange(userId: number, startDate: Date, endDate: Date): Promise<PhysicalActivity[]>;
  getPhysicalActivityWithExercises(id: number): Promise<PhysicalActivityWithExercises | undefined>;
  createPhysicalActivity(activity: InsertPhysicalActivity): Promise<PhysicalActivity>;
  updatePhysicalActivity(id: number, activity: Partial<PhysicalActivity>): Promise<PhysicalActivity>;
  
  addExerciseEntry(entry: InsertExerciseEntry): Promise<ExerciseEntry>;
  updateExerciseEntry(id: number, entry: Partial<ExerciseEntry>): Promise<ExerciseEntry>;
  deleteExerciseEntry(id: number): Promise<void>;
  
  // Health App Integration
  getHealthAppIntegration(userId: number): Promise<HealthAppIntegration | undefined>;
  createHealthAppIntegration(integration: InsertHealthAppIntegration): Promise<HealthAppIntegration>;
  updateHealthAppIntegration(id: number, integration: Partial<HealthAppIntegration>): Promise<HealthAppIntegration>;
  syncHealthAppData(userId: number): Promise<PhysicalActivity | undefined>;
  
  // Session store
  sessionStore: session.Store;
  
  // Inicialización
  initialize(): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  sessionStore: session.Store;
  
  constructor() {
    this.sessionStore = new PostgresSessionStore({
      pool,
      createTableIfMissing: true
    });
  }
  
  async initialize(): Promise<void> {
    const adminExists = await this.getUserByEmail("nutricion.cristinasanchez@gmail.com");
    
    if (!adminExists) {
      // Crear usuario nutricionista de ejemplo
      await this.createUser({
        password: await hashPassword("password123"),
        name: "Cristina Sánchez",
        email: "nutricion.cristinasanchez@gmail.com",
        role: "nutritionist",
        nutritionistId: null,
        active: true
      });
    }
  }
  
  async getUser(id: number): Promise<User | undefined> {
    const results = await db.select().from(users).where(eq(users.id, id));
    return results.length > 0 ? results[0] : undefined;
  }
  
  async getUserByEmail(email: string, includeInactive = false): Promise<User | undefined> {
    console.log(`Buscando usuario con email: ${email}, includeInactive: ${includeInactive}`);
    
    // Construir la query correctamente
    const whereConditions = includeInactive 
      ? eq(users.email, email.toLowerCase())
      : and(
          eq(users.email, email.toLowerCase()),
          eq(users.active, true)
        );
    
    const results = await db.select().from(users).where(whereConditions);
    
    console.log(`Resultados encontrados: ${results.length}`);
    if (results.length > 0) {
      console.log(`Usuario encontrado - ID: ${results[0].id}, Activo: ${results[0].active}, Rol: ${results[0].role}`);
    }
    
    return results.length > 0 ? results[0] : undefined;
  }
  
  async getUserByInviteToken(token: string): Promise<User | undefined> {
    const results = await db.select().from(users).where(eq(users.inviteToken, token));
    return results.length > 0 ? results[0] : undefined;
  }
  
  async createUser(insertUser: InsertUser): Promise<User> {
    const userData = {
      ...insertUser,
      email: insertUser.email.toLowerCase()
    };
    
    const [user] = await db
      .insert(users)
      .values(userData)
      .returning();
    return user;
  }
  
  async updateUser(id: number, userData: Partial<User>): Promise<User> {
    const [updatedUser] = await db
      .update(users)
      .set(userData)
      .where(eq(users.id, id))
      .returning();
    
    if (!updatedUser) {
      throw new Error("Usuario no encontrado");
    }
    
    return updatedUser;
  }
  
  async getClientsByNutritionistId(nutritionistId: number): Promise<User[]> {
    return db
      .select()
      .from(users)
      .where(and(
        eq(users.role, "client"),
        eq(users.nutritionistId, nutritionistId),
        eq(users.active, true)
      ));
  }
  
  async getMealById(id: number): Promise<Meal | undefined> {
    const [meal] = await db.select().from(meals).where(eq(meals.id, id));
    return meal;
  }
  
  async getMealsByDateRange(userId: number, startDate: Date, endDate: Date): Promise<Meal[]> {
    return db
      .select()
      .from(meals)
      .where(and(
        eq(meals.userId, userId),
        between(meals.date, startDate, endDate)
      ));
  }
  
  async createMeal(mealData: InsertMeal): Promise<Meal> {
    const [meal] = await db
      .insert(meals)
      .values({
        ...mealData,
        date: new Date(mealData.date),
      })
      .returning();
    return meal;
  }
  
  async updateMeal(id: number, mealData: Partial<Meal>): Promise<Meal> {
    // Si hay una fecha en los datos, asegurar que sea un objeto Date
    const newMealData = { ...mealData };
    if (newMealData.date && typeof newMealData.date === 'string') {
      newMealData.date = new Date(newMealData.date);
    }
    
    const [updatedMeal] = await db
      .update(meals)
      .set(newMealData)
      .where(eq(meals.id, id))
      .returning();
    
    if (!updatedMeal) {
      throw new Error("Comida no encontrada");
    }
    
    return updatedMeal;
  }
  
  async deleteMeal(id: number): Promise<void> {
    // Primero eliminar comentarios asociados
    await db.delete(comments).where(eq(comments.mealId, id));
    
    // Después eliminar la comida
    await db.delete(meals).where(eq(meals.id, id));
  }
  
  async getCommentsByMealId(mealId: number): Promise<Comment[]> {
    return db
      .select()
      .from(comments)
      .where(eq(comments.mealId, mealId))
      .orderBy(desc(comments.createdAt));
  }
  
  async createComment(commentData: InsertComment): Promise<Comment> {
    // Asegurar que no intentamos insertar createdAt manualmente
    const { createdAt, ...restData } = commentData as any;
    
    const [comment] = await db
      .insert(comments)
      .values(restData)
      .returning();
    return comment;
  }
  
  async getPendingCommentCount(userId: number): Promise<number> {
    // Obtiene todas las comidas del usuario
    const userMeals = await db
      .select()
      .from(meals)
      .where(eq(meals.userId, userId));
    
    // Obtiene los IDs de las comidas
    const mealIds = userMeals.map(meal => meal.id);
    
    if (mealIds.length === 0) {
      return 0;
    }
    
    // Cuenta los comentarios no leídos de las comidas del usuario
    const unreadComments = await db
      .select()
      .from(comments)
      .where(and(
        eq(comments.read, false),
        inArray(comments.mealId, mealIds)
      ));
    
    return unreadComments.length;
  }
  
  async getNutritionSummaryByDate(userId: number, date: Date): Promise<NutritionSummary | undefined> {
    // Convertir la fecha a UTC
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);
    
    const [summary] = await db
      .select()
      .from(nutritionSummaries)
      .where(and(
        eq(nutritionSummaries.userId, userId),
        between(nutritionSummaries.date, startDate, endDate)
      ));
    
    return summary;
  }
  
  async getNutritionSummariesByDateRange(userId: number, startDate: Date, endDate: Date): Promise<NutritionSummary[]> {
    return db
      .select()
      .from(nutritionSummaries)
      .where(and(
        eq(nutritionSummaries.userId, userId),
        between(nutritionSummaries.date, startDate, endDate)
      ));
  }
  
  async createNutritionSummary(summaryData: InsertNutritionSummary): Promise<NutritionSummary> {
    const [summary] = await db
      .insert(nutritionSummaries)
      .values({
        ...summaryData,
        date: new Date(summaryData.date),
      })
      .returning();
    return summary;
  }
  
  async updateNutritionSummary(id: number, summaryData: Partial<NutritionSummary>): Promise<NutritionSummary> {
    // Si hay una fecha en los datos, asegurar que sea un objeto Date
    const newSummaryData = { ...summaryData };
    if (newSummaryData.date && typeof newSummaryData.date === 'string') {
      newSummaryData.date = new Date(newSummaryData.date);
    }
    
    const [updatedSummary] = await db
      .update(nutritionSummaries)
      .set(newSummaryData)
      .where(eq(nutritionSummaries.id, id))
      .returning();
    
    if (!updatedSummary) {
      throw new Error("Resumen nutricional no encontrado");
    }
    
    return updatedSummary;
  }
  
  // Funciones de Plan de Comidas
  async createMealPlan(mealPlanData: InsertMealPlan): Promise<MealPlan> {
    // Desactivar planes activos existentes para este usuario
    await db
      .update(mealPlans)
      .set({ active: false })
      .where(and(
        eq(mealPlans.userId, mealPlanData.userId),
        eq(mealPlans.active, true)
      ));
    
    // Crear el nuevo plan
    const [mealPlan] = await db
      .insert(mealPlans)
      .values({
        ...mealPlanData,
        weekStart: new Date(mealPlanData.weekStart),
        weekEnd: new Date(mealPlanData.weekEnd)
      })
      .returning();
    
    return mealPlan;
  }
  
  async getMealPlanById(id: number): Promise<MealPlan | undefined> {
    const [mealPlan] = await db
      .select()
      .from(mealPlans)
      .where(eq(mealPlans.id, id));
    
    return mealPlan;
  }
  
  async getMealPlanWithDetails(id: number): Promise<MealPlanWithDetails | undefined> {
    const plan = await this.getMealPlanById(id);
    
    if (!plan) {
      return undefined;
    }
    
    const details = await db
      .select()
      .from(mealPlanDetails)
      .where(eq(mealPlanDetails.mealPlanId, id));
    
    return {
      ...plan,
      details
    };
  }
  
  async getActiveMealPlanForUser(userId: number, isNutritionist: boolean = false): Promise<MealPlanWithDetails | undefined> {
    // Si es nutricionista, obtener el plan activo sin importar si está publicado
    // Si es cliente, obtener solo planes activos que estén publicados
    const conditions = [
      eq(mealPlans.userId, userId),
      eq(mealPlans.active, true)
    ];
    
    if (!isNutritionist) {
      // Solo para clientes, verificar que el plan esté publicado
      conditions.push(eq(mealPlans.published, true));
    }
    
    const [plan] = await db
      .select()
      .from(mealPlans)
      .where(and(...conditions));
    
    if (!plan) {
      return undefined;
    }
    
    const details = await db
      .select()
      .from(mealPlanDetails)
      .where(eq(mealPlanDetails.mealPlanId, plan.id));
    
    return {
      ...plan,
      details
    };
  }
  
  async addMealPlanDetail(detail: InsertMealPlanDetail): Promise<MealPlanDetail> {
    const [mealPlanDetail] = await db
      .insert(mealPlanDetails)
      .values({
        ...detail,
        day: new Date(detail.day)
      })
      .returning();
    
    return mealPlanDetail;
  }
  
  async deactivateMealPlan(id: number): Promise<void> {
    await db
      .update(mealPlans)
      .set({ active: false })
      .where(eq(mealPlans.id, id));
  }
}

// Instancia única de la clase de almacenamiento
export const storage = new DatabaseStorage();
