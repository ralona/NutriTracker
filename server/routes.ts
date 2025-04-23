import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { setupAuth, hashPassword } from "./auth";
import { storage } from "./storage";
import { createInvitation, verifyInvitationToken, activateInvitation } from "./invite";
import { db, pool } from "./db";
import { 
  insertMealSchema, 
  insertCommentSchema, 
  insertNutritionSummarySchema,
  insertMealPlanSchema,
  insertMealPlanDetailSchema,
  MealType,
  DailyMeals,
  mealPlans as mealPlansTable,
  mealPlanDetails as mealPlanDetailsTable
} from "@shared/schema";
import { eq, and, inArray, between, desc } from "drizzle-orm";
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
  
  // Ruta especial para debug de autenticación
  app.post("/api/debug-login", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Se requiere email y password" });
    }
    
    try {
      console.log("DEBUG - Buscando usuario:", email);
      const user = await storage.getUserByEmail(email);
      
      if (!user) {
        console.log("DEBUG - Usuario no encontrado");
        return res.status(401).json({ error: "Credenciales inválidas" });
      }
      
      console.log("DEBUG - Usuario encontrado:", user.id, user.email, user.active);
      console.log("DEBUG - Password almacenada:", user.password);
      
      // IMPORTANTE: Solo para depuración, nunca en producción!
      if (user.password === password) {
        console.log("DEBUG - Contraseña coincide exactamente (texto plano)");
        req.login(user, (err) => {
          if (err) {
            console.error("DEBUG - Error en req.login:", err);
            return res.status(500).json({ error: "Error de autenticación" });
          }
          return res.status(200).json(user);
        });
      } else {
        console.log("DEBUG - Contraseña no coincide exactamente");
        return res.status(401).json({ error: "Credenciales inválidas" });
      }
    } catch (error) {
      console.error("DEBUG - Error:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });
  
  // Ruta administrativa para hashear todas las contraseñas en texto plano
  // IMPORTANTE: Esta ruta debe eliminarse en producción
  app.post("/api/admin/hash-passwords", async (req, res) => {
    try {
      // Obtener usuarios con contraseñas sin hashear (aquellas que no contienen un punto)
      // Usando pool directamente para ejecutar SQL plano
      const { rows } = await pool.query(
        "SELECT * FROM users WHERE position('.' in password) = 0"
      );
      
      console.log(`Encontrados ${rows.length} usuarios con contraseñas en texto plano`);
      
      const updates = [];
      for (const user of rows) {
        const hashedPassword = await hashPassword(user.password);
        console.log(`Hasheando contraseña para usuario ${user.id}: ${user.email}`);
        
        updates.push(
          storage.updateUser(user.id, {
            password: hashedPassword
          })
        );
      }
      
      await Promise.all(updates);
      
      res.json({ 
        message: `Se hashearon las contraseñas de ${updates.length} usuarios` 
      });
    } catch (error) {
      console.error("Error al hashear contraseñas:", error);
      res.status(500).json({ error: "Error interno del servidor" });
    }
  });

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
      
      // Agrupar comidas por tipo
      for (const meal of meals) {
        const mealComments = await storage.getCommentsByMealId(meal.id);
        const mealWithComments = {
          ...meal,
          comments: mealComments
        };
        
        // Si ya existe un array para este tipo, añadimos la comida
        if (dailyMeals[meal.type as keyof typeof dailyMeals]) {
          dailyMeals[meal.type as keyof typeof dailyMeals]!.push(mealWithComments);
        } else {
          // Si no existe, creamos un nuevo array con esta comida
          dailyMeals[meal.type as keyof typeof dailyMeals] = [mealWithComments];
        }
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
        const mealWithComments = {
          ...meal,
          comments: mealComments
        };
        
        if (!weeklyMeals[dayKey]) {
          weeklyMeals[dayKey] = {};
        }
        
        // Si ya existe un array para este tipo, añadimos la comida
        if (weeklyMeals[dayKey][meal.type as keyof DailyMeals]) {
          weeklyMeals[dayKey][meal.type as keyof DailyMeals]!.push(mealWithComments);
        } else {
          // Si no existe, creamos un nuevo array con esta comida
          weeklyMeals[dayKey][meal.type as keyof DailyMeals] = [mealWithComments];
        }
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
      
      if (client.nutritionistId !== req.user!.id) {
        return res.status(403).json({ message: "Not authorized to view this client" });
      }
      
      res.json(client);
    } catch (error) {
      res.status(500).json({ message: (error as Error).message });
    }
  });
  
  // Activar un cliente
  app.post("/api/nutritionist/clients/:id/activate", isNutritionist, async (req, res) => {
    try {
      const clientId = Number(req.params.id);
      const client = await storage.getUser(clientId);
      
      if (!client) {
        return res.status(404).json({ message: "Cliente no encontrado" });
      }
      
      if (client.nutritionistId !== req.user!.id) {
        return res.status(403).json({ message: "No autorizado a modificar este cliente" });
      }
      
      const updatedClient = await storage.updateUser(clientId, { active: true });
      
      res.json({
        message: "Cliente activado correctamente",
        client: updatedClient
      });
    } catch (error) {
      res.status(500).json({ message: (error as Error).message });
    }
  });
  
  // Desactivar un cliente
  app.post("/api/nutritionist/clients/:id/deactivate", isNutritionist, async (req, res) => {
    try {
      const clientId = Number(req.params.id);
      const client = await storage.getUser(clientId);
      
      if (!client) {
        return res.status(404).json({ message: "Cliente no encontrado" });
      }
      
      if (client.nutritionistId !== req.user!.id) {
        return res.status(403).json({ message: "No autorizado a modificar este cliente" });
      }
      
      const updatedClient = await storage.updateUser(clientId, { active: false });
      
      res.json({
        message: "Cliente desactivado correctamente",
        client: updatedClient
      });
    } catch (error) {
      res.status(500).json({ message: (error as Error).message });
    }
  });
  
  // Eliminar un cliente
  app.delete("/api/nutritionist/clients/:id", isNutritionist, async (req, res) => {
    try {
      const clientId = Number(req.params.id);
      const client = await storage.getUser(clientId);
      
      if (!client) {
        return res.status(404).json({ message: "Cliente no encontrado" });
      }
      
      if (client.nutritionistId !== req.user!.id) {
        return res.status(403).json({ message: "No autorizado a eliminar este cliente" });
      }
      
      // Aquí se debería implementar la lógica para eliminar al cliente
      // Por ahora, simplemente lo marcamos como inactivo
      const updatedClient = await storage.updateUser(clientId, { 
        active: false,
        // Si tuviéramos un campo "deleted", lo marcaríamos como true
      });
      
      res.json({
        message: "Cliente eliminado correctamente",
        client: updatedClient
      });
    } catch (error) {
      res.status(500).json({ message: (error as Error).message });
    }
  });

  // INVITACIONES
  // Crear una invitación para un nuevo paciente
  app.post("/api/invitations", isNutritionist, async (req, res) => {
    try {
      const { name, email } = req.body;
      
      if (!name || !email) {
        return res.status(400).json({ message: "Nombre y email son requeridos" });
      }
      
      // Verificar si el email ya está en uso
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "Este email ya está registrado" });
      }
      
      const invitation = await createInvitation(name, email, req.user!.id);
      
      res.status(201).json({
        message: "Invitación creada con éxito",
        inviteLink: invitation.inviteLink
      });
    } catch (error) {
      res.status(500).json({ message: (error as Error).message });
    }
  });
  
  // Verificar token de invitación
  app.get("/api/invitations/verify/:token", async (req, res) => {
    try {
      const token = req.params.token;
      
      if (!token) {
        return res.status(400).json({ message: "Token de invitación requerido" });
      }
      
      const user = await verifyInvitationToken(token);
      
      if (!user) {
        return res.status(404).json({ 
          valid: false,
          message: "Invitación inválida o expirada" 
        });
      }
      
      res.json({
        valid: true,
        user: {
          name: user.name,
          email: user.email
        }
      });
    } catch (error) {
      res.status(500).json({ message: (error as Error).message });
    }
  });
  
  // Activar cuenta con token de invitación
  app.post("/api/invitations/activate/:token", async (req, res) => {
    try {
      const token = req.params.token;
      const { password } = req.body;
      
      if (!token || !password) {
        return res.status(400).json({ message: "Token y contraseña son requeridos" });
      }
      
      const user = await activateInvitation(token, password);
      
      if (!user) {
        return res.status(404).json({ message: "Invitación inválida o expirada" });
      }
      
      // Iniciar sesión automáticamente
      req.login(user, (err) => {
        if (err) {
          return res.status(500).json({ message: err.message });
        }
        res.json({ message: "Cuenta activada con éxito", user });
      });
    } catch (error) {
      res.status(500).json({ message: (error as Error).message });
    }
  });
  
  // PLANES DE COMIDA
  // Crear un nuevo plan de comidas
  app.post("/api/meal-plans", isNutritionist, async (req, res) => {
    try {
      const { userId, weekStart, weekEnd, description, published = false } = req.body;
      
      // Verificar que el usuario existe y es cliente del nutricionista
      const client = await storage.getUser(userId);
      
      if (!client) {
        return res.status(404).json({ message: "Cliente no encontrado" });
      }
      
      if (client.nutritionistId !== req.user!.id) {
        return res.status(403).json({ message: "No autorizado a crear planes para este cliente" });
      }
      
      const mealPlanData = insertMealPlanSchema.parse({
        nutritionistId: req.user!.id,
        userId,
        weekStart,
        weekEnd,
        description,
        active: true,
        published, // Por defecto, los planes se crean sin publicar
        createdAt: new Date()
      });
      
      const mealPlan = await storage.createMealPlan(mealPlanData);
      
      res.status(201).json(mealPlan);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      res.status(500).json({ message: (error as Error).message });
    }
  });
  
  // Añadir detalles a un plan de comidas
  app.post("/api/meal-plans/:id/details", isNutritionist, async (req, res) => {
    try {
      const mealPlanId = Number(req.params.id);
      const { day, mealType, description, image } = req.body;
      
      // Verificar que el plan existe y pertenece al nutricionista
      const mealPlan = await storage.getMealPlanById(mealPlanId);
      
      if (!mealPlan) {
        return res.status(404).json({ message: "Plan de comidas no encontrado" });
      }
      
      if (mealPlan.nutritionistId !== req.user!.id) {
        return res.status(403).json({ message: "No autorizado a modificar este plan" });
      }
      
      const detailData = insertMealPlanDetailSchema.parse({
        mealPlanId,
        day,
        mealType,
        description,
        image
      });
      
      const detail = await storage.addMealPlanDetail(detailData);
      
      res.status(201).json(detail);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ errors: error.errors });
      }
      res.status(500).json({ message: (error as Error).message });
    }
  });
  
  // Obtener plan de comidas activo para un usuario
  app.get("/api/meal-plans/active", isAuthenticated, async (req, res) => {
    try {
      const userId = req.user!.id;
      const isNutritionist = req.user!.role === 'nutritionist';
      const mealPlan = await storage.getActiveMealPlanForUser(userId, isNutritionist);
      
      if (!mealPlan) {
        return res.status(404).json({ message: "No hay un plan de comidas activo" });
      }
      
      res.json(mealPlan);
    } catch (error) {
      res.status(500).json({ message: (error as Error).message });
    }
  });
  
  // Obtener plan de comidas por ID
  app.get("/api/meal-plans/:id", isAuthenticated, async (req, res) => {
    try {
      const mealPlanId = Number(req.params.id);
      const mealPlan = await storage.getMealPlanWithDetails(mealPlanId);
      
      if (!mealPlan) {
        return res.status(404).json({ message: "Plan de comidas no encontrado" });
      }
      
      // Verificar acceso: debe ser el nutricionista que creó el plan o el usuario para quien se creó
      if (mealPlan.nutritionistId !== req.user!.id && mealPlan.userId !== req.user!.id) {
        return res.status(403).json({ message: "No autorizado a ver este plan" });
      }
      
      res.json(mealPlan);
    } catch (error) {
      res.status(500).json({ message: (error as Error).message });
    }
  });
  
  // Desactivar plan de comidas
  app.post("/api/meal-plans/:id/deactivate", isNutritionist, async (req, res) => {
    try {
      const mealPlanId = Number(req.params.id);
      const mealPlan = await storage.getMealPlanById(mealPlanId);
      
      if (!mealPlan) {
        return res.status(404).json({ message: "Plan de comidas no encontrado" });
      }
      
      if (mealPlan.nutritionistId !== req.user!.id) {
        return res.status(403).json({ message: "No autorizado a modificar este plan" });
      }
      
      await storage.deactivateMealPlan(mealPlanId);
      
      res.json({ message: "Plan de comidas desactivado con éxito" });
    } catch (error) {
      res.status(500).json({ message: (error as Error).message });
    }
  });
  
  // Publicar o despublicar un plan de comidas
  app.post("/api/meal-plans/:id/publish", isNutritionist, async (req, res) => {
    try {
      const mealPlanId = Number(req.params.id);
      const { published } = req.body;
      
      if (published === undefined) {
        return res.status(400).json({ message: "Se requiere el campo 'published'" });
      }
      
      const mealPlan = await storage.getMealPlanById(mealPlanId);
      if (!mealPlan) {
        return res.status(404).json({ message: "Plan de comidas no encontrado" });
      }
      
      // Verificar que el nutricionista que intenta actualizar es el creador del plan
      if (mealPlan.nutritionistId !== req.user!.id) {
        return res.status(403).json({ message: "No autorizado a modificar este plan" });
      }
      
      const [updatedMealPlan] = await db
        .update(mealPlansTable)
        .set({ published })
        .where(eq(mealPlansTable.id, mealPlanId))
        .returning();
      
      res.json({
        message: published ? "Plan de comidas publicado correctamente" : "Plan de comidas despublicado correctamente", 
        mealPlan: updatedMealPlan
      });
    } catch (error) {
      res.status(500).json({ message: (error as Error).message });
    }
  });
  
  // Obtener todos los planes de comida creados por un nutricionista
  app.get("/api/meal-plans/nutritionist", isNutritionist, async (req, res) => {
    try {
      const nutritionistId = req.user!.id;
      
      // Obtener todos los planes creados por el nutricionista
      const plans = await db
        .select()
        .from(mealPlansTable)
        .where(eq(mealPlansTable.nutritionistId, nutritionistId))
        .orderBy(mealPlansTable.createdAt);
      
      // Para cada plan, obtener sus detalles
      const mealPlansWithDetails = await Promise.all(
        plans.map(async (plan) => {
          const details = await db
            .select()
            .from(mealPlanDetailsTable)
            .where(eq(mealPlanDetailsTable.mealPlanId, plan.id));
          
          return {
            ...plan,
            details
          };
        })
      );
      
      res.json(mealPlansWithDetails);
    } catch (error) {
      res.status(500).json({ message: (error as Error).message });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
