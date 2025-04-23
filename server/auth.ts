import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser, LoginData } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "nutritrack-secret-key",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Configuración para usar email en lugar de username
  passport.use(
    new LocalStrategy(
      {
        usernameField: 'email',
        passwordField: 'password'
      },
      async (email, password, done) => {
        const user = await storage.getUserByEmail(email);
        if (!user || !(await comparePasswords(password, user.password))) {
          return done(null, false);
        } else {
          return done(null, user);
        }
      }
    ),
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    const user = await storage.getUser(id);
    done(null, user);
  });

  app.post("/api/register", async (req, res, next) => {
    const existingUser = await storage.getUserByEmail(req.body.email);
    if (existingUser) {
      return res.status(400).send("El email ya está registrado");
    }

    try {
      const user = await storage.createUser({
        ...req.body,
        password: await hashPassword(req.body.password),
      });

      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json(user);
      });
    } catch (error) {
      return res.status(400).send((error as Error).message);
    }
  });

  app.post("/api/login", passport.authenticate("local"), (req, res) => {
    res.status(200).json(req.user);
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });
  
  // Ruta para registro como nutricionista
  app.post("/api/register/nutritionist", async (req, res, next) => {
    const existingUser = await storage.getUserByEmail(req.body.email);
    if (existingUser) {
      return res.status(400).send("El email ya está registrado");
    }

    try {
      const userData = {
        ...req.body,
        role: "nutritionist",
        nutritionistId: null,
        password: await hashPassword(req.body.password),
      };
      
      const user = await storage.createUser(userData);

      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json(user);
      });
    } catch (error) {
      return res.status(400).send((error as Error).message);
    }
  });
  
  // Invitación de paciente
  app.post("/api/invite", async (req, res) => {
    if (!req.isAuthenticated() || req.user.role !== "nutritionist") {
      return res.status(403).send("Acceso denegado");
    }
    
    const { email, name } = req.body;
    if (!email || !name) {
      return res.status(400).send("Se requiere email y nombre del paciente");
    }
    
    const existingUser = await storage.getUserByEmail(email);
    if (existingUser) {
      return res.status(400).send("Este email ya está registrado en el sistema");
    }
    
    try {
      // Generar token y fecha de expiración
      const token = randomBytes(32).toString('hex');
      const expireDate = new Date();
      expireDate.setDate(expireDate.getDate() + 7); // 7 días de validez
      
      // Crear usuario invitado pero inactivo
      await storage.createUser({
        email,
        name,
        password: '', // Se establecerá cuando el usuario acepte la invitación
        role: 'client',
        nutritionistId: req.user.id,
        active: false,
        inviteToken: token,
        inviteExpires: expireDate
      });
      
      // Aquí se enviaría el email con el enlace de invitación
      // Necesitamos implementar el envío de emails
      
      res.status(200).json({
        message: "Invitación enviada correctamente",
        inviteLink: `/accept-invite?token=${token}`
      });
    } catch (error) {
      res.status(500).send((error as Error).message);
    }
  });
  
  // Aceptar invitación
  app.post("/api/accept-invite", async (req, res, next) => {
    const { token, password } = req.body;
    
    if (!token || !password) {
      return res.status(400).send("Se requiere token y contraseña");
    }
    
    try {
      // Buscar el usuario con ese token y que no esté expirado
      const user = await storage.getUserByInviteToken(token);
      
      if (!user) {
        return res.status(400).send("Invitación inválida o expirada");
      }
      
      if (user.inviteExpires && new Date(user.inviteExpires) < new Date()) {
        return res.status(400).send("La invitación ha expirado");
      }
      
      // Actualizar el usuario
      const updatedUser = await storage.updateUser(user.id, {
        password: await hashPassword(password),
        active: true,
        inviteToken: null,
        inviteExpires: null
      });
      
      // Iniciar sesión
      req.login(updatedUser, (err) => {
        if (err) return next(err);
        res.status(200).json(updatedUser);
      });
      
    } catch (error) {
      res.status(500).send((error as Error).message);
    }
  });
}
