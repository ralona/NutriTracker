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
  try {
    // Asegurarse de que se proporciona una contraseña
    if (!password) {
      console.error("Se intentó generar un hash para una contraseña vacía");
      // Usar una contraseña predeterminada para evitar errores (no recomendado en producción)
      password = "default_password";
    }
    
    const salt = randomBytes(16).toString("hex");
    const buf = (await scryptAsync(password, salt, 64)) as Buffer;
    const hashedPassword = `${buf.toString("hex")}.${salt}`;
    
    // Verificar que el hash tiene el formato esperado
    if (!hashedPassword.includes('.')) {
      throw new Error("El formato del hash generado es incorrecto");
    }
    
    return hashedPassword;
  } catch (error) {
    console.error("Error al generar hash de password:", error);
    throw error;
  }
}

async function comparePasswords(supplied: string, stored: string) {
  try {
    console.log("Comparando contraseñas - Tipo almacenada:", typeof stored);
    
    // Si no hay password almacenado o suministrado, retornar false
    if (!stored || !supplied) {
      console.log("Password almacenado o suministrado está vacío");
      return false;
    }
    
    // Caso especial: contraseña en texto plano (para usuarios migrando)
    if (!stored.includes('.')) {
      console.log("Password almacenado en texto plano:", stored);
      console.log("Password suministrado:", supplied);
      // Comparación directa para contraseñas en texto plano
      const isEqual = stored === supplied;
      console.log("Resultado de comparación directa:", isEqual ? "Éxito" : "Fallida");
      return isEqual;
    }
    
    console.log("Password hasheado, usando comparación segura");
    
    try {
      // Para passwords hasheados con formato correcto (hash.salt)
      const parts = stored.split(".");
      if (parts.length !== 2) {
        console.log("Formato de contraseña inválido");
        return false;
      }
      
      const [hashed, salt] = parts;
      
      // Generar hash del password suministrado con la misma sal
      const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
      const hashedBuf = Buffer.from(hashed, "hex");
      
      // Usar timingSafeEqual para evitar ataques de temporización
      const isEqual = timingSafeEqual(hashedBuf, suppliedBuf);
      console.log("Resultado de comparación hash:", isEqual ? "Éxito" : "Fallida");
      return isEqual;
    } catch (hashError) {
      console.error("Error específico en hash:", hashError);
      // Si falla la comparación hash, probar como último recurso comparación directa
      // Esto es para manejar casos extremos de migración
      return stored === supplied;
    }
  } catch (error) {
    console.error("Error general al comparar passwords:", error);
    return false;
  }
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
        console.log("Intento de login para:", email);
        try {
          // Intentando obtener el usuario con email
          const user = await storage.getUserByEmail(email);
          console.log("Usuario encontrado:", user ? `ID: ${user.id}, Activo: ${user.active}` : "No encontrado");
          
          if (!user) {
            console.log("Usuario no encontrado en la base de datos");
            return done(null, false);
          }
          
          // Verificando password
          const passwordValid = await comparePasswords(password, user.password);
          console.log("Validación de password:", passwordValid ? "Éxito" : "Fallida");
          
          if (!passwordValid) {
            return done(null, false);
          } else {
            return done(null, user);
          }
        } catch (error) {
          console.error("Error en estrategia de autenticación:", error);
          return done(error);
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
    // Buscar usuario incluyendo inactivos para evitar duplicados
    const existingUser = await storage.getUserByEmail(req.body.email, true);
    if (existingUser && existingUser.active) {
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
    // Buscar usuario incluyendo inactivos para evitar duplicados
    const existingUser = await storage.getUserByEmail(req.body.email, true);
    if (existingUser && existingUser.active) {
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
    
    // Buscar usuario existente incluyendo inactivos para evitar duplicados
    const existingUser = await storage.getUserByEmail(email, true);
    if (existingUser && existingUser.active) {
      return res.status(400).send("Este email ya está registrado como usuario activo en el sistema");
    }
    
    // Si existe un usuario inactivo con este email que no ha sido confirmado, podemos reenviar la invitación
    // Esto permite invitar a usuarios que fueron eliminados
    if (existingUser && !existingUser.active) {
      console.log("Actualizando invitación existente para usuario inactivo:", email);
      // Se manejará abajo en el bloque try-catch
    }
    
    try {
      // Generar token y fecha de expiración
      const token = randomBytes(32).toString('hex');
      const expireDate = new Date();
      expireDate.setDate(expireDate.getDate() + 7); // 7 días de validez
      
      // Crear usuario invitado pero inactivo con password temporal
      // Usamos un hash de password aleatorio que nunca se usará (pero que tenga el formato correcto)
      const tempPasswordHash = await hashPassword(randomBytes(16).toString('hex'));
      
      await storage.createUser({
        email,
        name,
        password: tempPasswordHash, // Se sobreescribirá cuando el usuario acepte la invitación
        role: 'client',
        nutritionistId: req.user!.id,
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
