import { 
  users, type User, type InsertUser,
  meals, type Meal, type InsertMeal,
  comments, type Comment, type InsertComment,
  nutritionSummaries, type NutritionSummary, type InsertNutritionSummary,
  ClientWithSummary
} from "@shared/schema";
import session from "express-session";
import createMemoryStore from "memorystore";

const MemoryStore = createMemoryStore(session);

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
  sessionStore: session.SessionStore;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private meals: Map<number, Meal>;
  private comments: Map<number, Comment>;
  private nutritionSummaries: Map<number, NutritionSummary>;
  
  sessionStore: session.SessionStore;
  
  private userIdCounter: number;
  private mealIdCounter: number;
  private commentIdCounter: number;
  private summaryIdCounter: number;

  constructor() {
    this.users = new Map();
    this.meals = new Map();
    this.comments = new Map();
    this.nutritionSummaries = new Map();
    
    this.userIdCounter = 1;
    this.mealIdCounter = 1;
    this.commentIdCounter = 1;
    this.summaryIdCounter = 1;
    
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000 // 24 hours
    });
    
    // Create sample nutritionist
    this.createUser({
      username: "nutricionista",
      password: "password123",
      name: "Cristina Sánchez",
      email: "nutricion.cristinasanchez@gmail.com",
      role: "nutritionist",
      nutritionistId: null,
    });
  }

  // User management
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username.toLowerCase() === username.toLowerCase(),
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }
  
  async updateUser(id: number, userData: Partial<User>): Promise<User> {
    const user = await this.getUser(id);
    if (!user) {
      throw new Error("User not found");
    }
    
    const updatedUser = { ...user, ...userData };
    this.users.set(id, updatedUser);
    return updatedUser;
  }
  
  async getClientsByNutritionistId(nutritionistId: number): Promise<User[]> {
    return Array.from(this.users.values()).filter(
      (user) => user.nutritionistId === nutritionistId
    );
  }

  // Meal management
  async getMealById(id: number): Promise<Meal | undefined> {
    return this.meals.get(id);
  }
  
  async getMealsByDateRange(userId: number, startDate: Date, endDate: Date): Promise<Meal[]> {
    return Array.from(this.meals.values()).filter(
      (meal) => meal.userId === userId && 
                meal.date >= startDate && 
                meal.date <= endDate
    );
  }
  
  async createMeal(mealData: InsertMeal): Promise<Meal> {
    const id = this.mealIdCounter++;
    const meal: Meal = { ...mealData, id };
    
    // Ensure date is a Date object
    if (typeof meal.date === 'string') {
      meal.date = new Date(meal.date);
    }
    
    this.meals.set(id, meal);
    return meal;
  }
  
  async updateMeal(id: number, mealData: Partial<Meal>): Promise<Meal> {
    const meal = await this.getMealById(id);
    if (!meal) {
      throw new Error("Meal not found");
    }
    
    const updatedMeal = { ...meal, ...mealData };
    
    // Ensure date is a Date object
    if (typeof updatedMeal.date === 'string') {
      updatedMeal.date = new Date(updatedMeal.date);
    }
    
    this.meals.set(id, updatedMeal);
    return updatedMeal;
  }
  
  async deleteMeal(id: number): Promise<void> {
    this.meals.delete(id);
    
    // Delete associated comments
    const mealComments = await this.getCommentsByMealId(id);
    for (const comment of mealComments) {
      this.comments.delete(comment.id);
    }
  }

  // Comment management
  async getCommentsByMealId(mealId: number): Promise<Comment[]> {
    return Array.from(this.comments.values()).filter(
      (comment) => comment.mealId === mealId
    );
  }
  
  async createComment(commentData: InsertComment): Promise<Comment> {
    const id = this.commentIdCounter++;
    const createdAt = new Date();
    const comment: Comment = { ...commentData, id, createdAt };
    this.comments.set(id, comment);
    return comment;
  }
  
  async getPendingCommentCount(userId: number): Promise<number> {
    // Get all meals by user
    const userMeals = Array.from(this.meals.values()).filter(
      (meal) => meal.userId === userId
    );
    
    // Get meal IDs
    const mealIds = userMeals.map(meal => meal.id);
    
    // Count comments
    return Array.from(this.comments.values()).filter(
      (comment) => mealIds.includes(comment.mealId)
    ).length;
  }

  // Nutrition summary management
  async getNutritionSummaryByDate(userId: number, date: Date): Promise<NutritionSummary | undefined> {
    // Simplified version for in-memory - just look for same date
    return Array.from(this.nutritionSummaries.values()).find(
      (summary) => summary.userId === userId && 
                    summary.date.toDateString() === date.toDateString()
    );
  }
  
  async getNutritionSummariesByDateRange(userId: number, startDate: Date, endDate: Date): Promise<NutritionSummary[]> {
    return Array.from(this.nutritionSummaries.values()).filter(
      (summary) => summary.userId === userId && 
                    summary.date >= startDate && 
                    summary.date <= endDate
    );
  }
  
  async createNutritionSummary(summaryData: InsertNutritionSummary): Promise<NutritionSummary> {
    const id = this.summaryIdCounter++;
    const summary: NutritionSummary = { ...summaryData, id };
    
    // Ensure date is a Date object
    if (typeof summary.date === 'string') {
      summary.date = new Date(summary.date);
    }
    
    this.nutritionSummaries.set(id, summary);
    return summary;
  }
  
  async updateNutritionSummary(id: number, summaryData: Partial<NutritionSummary>): Promise<NutritionSummary> {
    const summary = this.nutritionSummaries.get(id);
    if (!summary) {
      throw new Error("Nutrition summary not found");
    }
    
    const updatedSummary = { ...summary, ...summaryData };
    
    // Ensure date is a Date object
    if (typeof updatedSummary.date === 'string') {
      updatedSummary.date = new Date(updatedSummary.date);
    }
    
    this.nutritionSummaries.set(id, updatedSummary);
    return updatedSummary;
  }
}

export const storage = new MemStorage();
