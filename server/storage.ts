import { 
  users, type User, type InsertUser,
  meals, type Meal, type InsertMeal,
  comments, type Comment, type InsertComment,
  nutritionSummaries, type NutritionSummary, type InsertNutritionSummary,
  ClientWithSummary
} from "@shared/schema";
import session from "express-session";
import connectPg from "connect-pg-simple";
import { db } from "./db";
import { eq, and, between, desc, inArray } from "drizzle-orm";
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
  getUserByUsername(username: string): Promise<User | undefined>;
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
    const adminExists = await this.getUserByUsername("nutricionista");
    
    if (!adminExists) {
      // Crear usuario nutricionista de ejemplo
      await this.createUser({
        username: "nutricionista",
        password: await hashPassword("password123"),
        name: "Cristina Sánchez",
        email: "nutricion.cristinasanchez@gmail.com",
        role: "nutritionist",
        nutritionistId: null,
      });
    }
  }
  
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }
  
  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username.toLowerCase()));
    return user;
  }
  
  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values({
        ...insertUser,
        username: insertUser.username.toLowerCase(),
      })
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
        eq(users.nutritionistId, nutritionistId)
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
    const [comment] = await db
      .insert(comments)
      .values({
        ...commentData,
        createdAt: new Date()
      })
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
}

export const storage = new DatabaseStorage();
