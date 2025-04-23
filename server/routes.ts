import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { 
  insertMealSchema, 
  insertCommentSchema, 
  insertNutritionSummarySchema,
  MealType,
  DailyMeals
} from "@shared/schema";
import { z } from "zod";
import { startOfWeek, endOfWeek, startOfDay, endOfDay, format, addDays, parseISO } from "date-fns";

// Helper to check if user is authenticated
const isAuthenticated = (req: Request, res: Response, next: Function) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
};

// Helper to check if user is a nutritionist
const isNutritionist = (req: Request, res: Response, next: Function) => {
  if (req.isAuthenticated() && req.user.role === "nutritionist") {
    return next();
  }
  res.status(403).json({ message: "Forbidden. Nutritionist access required." });
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Set up authentication routes
  setupAuth(app);

  // MEAL MANAGEMENT
  // Get meals for a specific date
  app.get("/api/meals/daily", isAuthenticated, async (req, res) => {
    const userId = req.user.id;
    const dateStr = req.query.date as string || new Date().toISOString();
    const date = parseISO(dateStr);
    
    try {
      const meals = await storage.getMealsByDateRange(
        userId,
        startOfDay(date),
        endOfDay(date)
      );
      
      const dailyMeals: DailyMeals = {};
      for (const meal of meals) {
        const mealComments = await storage.getCommentsByMealId(meal.id);
        dailyMeals[meal.type as keyof typeof dailyMeals] = {
          ...meal,
          comments: mealComments
        };
      }
      
      res.json(dailyMeals);
    } catch (error) {
      res.status(500).json({ message: (error as Error).message });
    }
  });

  // Get meals for a week
  app.get("/api/meals/weekly", isAuthenticated, async (req, res) => {
    const userId = req.user.id;
    const dateStr = req.query.date as string || new Date().toISOString();
    const date = parseISO(dateStr);
    
    const weekStart = startOfWeek(date, { weekStartsOn: 1 }); // Start from Monday
    const weekEnd = endOfWeek(date, { weekStartsOn: 1 });
    
    try {
      const meals = await storage.getMealsByDateRange(userId, weekStart, weekEnd);
      
      // Group meals by day and type
      const weeklyMeals: Record<string, DailyMeals> = {};
      
      // Initialize week days
      for (let i = 0; i < 7; i++) {
        const day = addDays(weekStart, i);
        weeklyMeals[format(day, 'yyyy-MM-dd')] = {};
      }
      
      // Fill with actual meal data
      for (const meal of meals) {
        const dayKey = format(meal.date, 'yyyy-MM-dd');
        const mealComments = await storage.getCommentsByMealId(meal.id);
        
        if (!weeklyMeals[dayKey]) {
          weeklyMeals[dayKey] = {};
        }
        
        weeklyMeals[dayKey][meal.type as keyof DailyMeals] = {
          ...meal,
          comments: mealComments
        };
      }
      
      // Get nutrition summaries for the week
      const summaries = await storage.getNutritionSummariesByDateRange(
        userId,
        weekStart,
        weekEnd
      );
      
      res.json({
        meals: weeklyMeals,
        summaries: summaries
      });
    } catch (error) {
      res.status(500).json({ message: (error as Error).message });
    }
  });

  // Create a new meal
  app.post("/api/meals", isAuthenticated, async (req, res) => {
    try {
      const mealData = insertMealSchema.parse({
        ...req.body,
        userId: req.user.id
      });
      
      const meal = await storage.createMeal(mealData);
      
      // Update nutrition summary
      const date = new Date(meal.date);
      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);
      
      const dailyMeals = await storage.getMealsByDateRange(
        req.user.id,
        dayStart,
        dayEnd
      );
      
      const totalCalories = dailyMeals.reduce((sum, meal) => sum + (meal.calories || 0), 0);
      
      // Get or create summary
      let summary = await storage.getNutritionSummaryByDate(req.user.id, dayStart);
      
      if (summary) {
        await storage.updateNutritionSummary(summary.id, { caloriesTotal: totalCalories });
      } else {
        await storage.createNutritionSummary({
          userId: req.user.id,
          date: dayStart,
          caloriesTotal: totalCalories
        });
      }
      
      res.status(201).json(meal);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      res.status(500).json({ message: (error as Error).message });
    }
  });

  // Update a meal
  app.patch("/api/meals/:id", isAuthenticated, async (req, res) => {
    const mealId = Number(req.params.id);
    
    try {
      const existingMeal = await storage.getMealById(mealId);
      
      if (!existingMeal) {
        return res.status(404).json({ message: "Meal not found" });
      }
      
      if (existingMeal.userId !== req.user.id && req.user.role !== "nutritionist") {
        return res.status(403).json({ message: "Not authorized to update this meal" });
      }
      
      const updatedMeal = await storage.updateMeal(mealId, req.body);
      
      // Update nutrition summary if calories changed
      if (req.body.calories !== undefined) {
        const date = new Date(existingMeal.date);
        const dayStart = startOfDay(date);
        const dayEnd = endOfDay(date);
        
        const dailyMeals = await storage.getMealsByDateRange(
          existingMeal.userId,
          dayStart,
          dayEnd
        );
        
        const totalCalories = dailyMeals.reduce((sum, meal) => sum + (meal.calories || 0), 0);
        
        let summary = await storage.getNutritionSummaryByDate(existingMeal.userId, dayStart);
        
        if (summary) {
          await storage.updateNutritionSummary(summary.id, { caloriesTotal: totalCalories });
        }
      }
      
      res.json(updatedMeal);
    } catch (error) {
      res.status(500).json({ message: (error as Error).message });
    }
  });

  // Delete a meal
  app.delete("/api/meals/:id", isAuthenticated, async (req, res) => {
    const mealId = Number(req.params.id);
    
    try {
      const meal = await storage.getMealById(mealId);
      
      if (!meal) {
        return res.status(404).json({ message: "Meal not found" });
      }
      
      if (meal.userId !== req.user.id) {
        return res.status(403).json({ message: "Not authorized to delete this meal" });
      }
      
      await storage.deleteMeal(mealId);
      
      // Update nutrition summary
      const date = new Date(meal.date);
      const dayStart = startOfDay(date);
      const dayEnd = endOfDay(date);
      
      const dailyMeals = await storage.getMealsByDateRange(
        req.user.id,
        dayStart,
        dayEnd
      );
      
      const totalCalories = dailyMeals.reduce((sum, meal) => sum + (meal.calories || 0), 0);
      
      let summary = await storage.getNutritionSummaryByDate(req.user.id, dayStart);
      
      if (summary) {
        await storage.updateNutritionSummary(summary.id, { caloriesTotal: totalCalories });
      }
      
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: (error as Error).message });
    }
  });

  // COMMENTS MANAGEMENT
  // Add a comment to a meal
  app.post("/api/comments", isAuthenticated, async (req, res) => {
    try {
      // Get the meal to check permissions
      const meal = await storage.getMealById(req.body.mealId);
      
      if (!meal) {
        return res.status(404).json({ message: "Meal not found" });
      }
      
      // Check if the user is authorized (must be the nutritionist of the meal owner)
      if (req.user.role === "nutritionist") {
        // Nutritionist can comment on their clients' meals
        const mealOwner = await storage.getUser(meal.userId);
        if (!mealOwner || mealOwner.nutritionistId !== req.user.id) {
          return res.status(403).json({ message: "Not authorized to comment on this meal" });
        }
      } else {
        // Clients can only comment on their own meals
        if (meal.userId !== req.user.id) {
          return res.status(403).json({ message: "Not authorized to comment on this meal" });
        }
      }
      
      const commentData = insertCommentSchema.parse({
        ...req.body,
        nutritionistId: req.user.id
      });
      
      const comment = await storage.createComment(commentData);
      
      res.status(201).json(comment);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      res.status(500).json({ message: (error as Error).message });
    }
  });

  // NUTRITIONIST ROUTES
  // Get all clients for a nutritionist
  app.get("/api/nutritionist/clients", isNutritionist, async (req, res) => {
    try {
      const nutritionistId = req.user.id;
      const clients = await storage.getClientsByNutritionistId(nutritionistId);
      
      // Enrich with additional data
      const enrichedClients = await Promise.all(clients.map(async (client) => {
        // Get latest meal
        const meals = await storage.getMealsByDateRange(
          client.id,
          new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
          new Date()
        );
        
        const latestMeal = meals.length > 0 
          ? meals.sort((a, b) => b.date.getTime() - a.date.getTime())[0] 
          : undefined;
        
        // Calculate progress (simplified)
        const progress = Math.floor(Math.random() * 101); // In a real app, would use actual data
        
        // Calculate pending comments
        const pendingComments = await storage.getPendingCommentCount(client.id);
        
        // Determine last week status (simplified)
        const mealCount = meals.length;
        let lastWeekStatus: 'Bien' | 'Regular' | 'Insuficiente' = 'Insuficiente';
        
        if (mealCount > 15) {
          lastWeekStatus = 'Bien';
        } else if (mealCount > 7) {
          lastWeekStatus = 'Regular';
        }
        
        return {
          ...client,
          latestMeal,
          progress,
          pendingComments,
          lastWeekStatus
        };
      }));
      
      res.json(enrichedClients);
    } catch (error) {
      res.status(500).json({ message: (error as Error).message });
    }
  });

  // Get a specific client's data
  app.get("/api/nutritionist/clients/:id", isNutritionist, async (req, res) => {
    try {
      const clientId = Number(req.params.id);
      const client = await storage.getUser(clientId);
      
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      
      if (client.nutritionistId !== req.user.id) {
        return res.status(403).json({ message: "Not authorized to view this client" });
      }
      
      res.json(client);
    } catch (error) {
      res.status(500).json({ message: (error as Error).message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
