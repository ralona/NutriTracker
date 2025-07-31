# NutriTracker 🥗

Sistema de seguimiento nutricional que permite a los clientes registrar sus comidas y a los nutricionistas monitorear y comentar el progreso de sus pacientes.

## 🚀 Inicio Rápido con Docker

### Requisitos
- Docker Desktop instalado
- Git

### Instalación

1. **Clona el repositorio:**
   ```bash
   git clone <repository-url>
   cd NutriTracker
   ```

2. **Configura las variables de entorno:**
   ```bash
   cp .env.example .env
   ```

3. **Levanta todos los servicios:**
   ```bash
   docker compose up -d
   ```

4. **Ejecuta las migraciones de base de datos:**
   ```bash
   docker compose --profile setup run migrate
   ```

5. **Accede a la aplicación:**
   - **Web App**: http://localhost:3000
   - **Base de datos**: localhost:5432
   - **PGAdmin** (opcional): http://localhost:5050

### Credenciales de Acceso

**Nutricionistas:**
- `nutritionist@nutritracker.com` / `nutritest123`

**Clientes:**
- `client@nutritracker.com` / `clienttest123`
- `test@nutritracker.com` / `testpass123`

## 🛠 Desarrollo Local

### Servicios Docker

La aplicación incluye los siguientes servicios:

- **app**: Aplicación Node.js (Express + React)
- **postgres**: Base de datos PostgreSQL 16
- **redis**: Cache para sesiones (puerto 6380)
- **migrate**: Servicio para ejecutar migraciones
- **pgadmin**: Interfaz gráfica para la base de datos (opcional)

### Comandos Útiles

```bash
# Ver logs de la aplicación
docker compose logs -f app

# Reiniciar un servicio específico
docker compose restart app

# Acceder al contenedor de la aplicación
docker compose exec app sh

# Ejecutar comandos en la base de datos
docker compose exec postgres psql -U nutritracker -d nutritracker_db

# Parar todos los servicios
docker compose down

# Resetear base de datos (elimina volúmenes)
docker compose down -v && docker compose up -d
```

### Desarrollo sin Docker

Si prefieres ejecutar sin Docker:

1. **Instala dependencias:**
   ```bash
   npm install
   ```

2. **Configura la base de datos:**
   - Instala PostgreSQL y Redis localmente
   - Actualiza `DATABASE_URL` y `REDIS_URL` en `.env`

3. **Ejecuta migraciones:**
   ```bash
   npm run db:push
   ```

4. **Inicia la aplicación:**
   ```bash
   npm run dev
   ```

## 🏗 Arquitectura

### Stack Tecnológico

**Frontend:**
- React 18 con TypeScript
- Vite para bundling
- TailwindCSS para estilos
- Radix UI para componentes
- Wouter para routing
- TanStack Query para estado

**Backend:**
- Express.js con TypeScript
- Drizzle ORM para base de datos
- Passport.js para autenticación
- Express Session para manejo de sesiones

**Base de Datos:**
- PostgreSQL 16
- Redis para sesiones

### Estructura del Proyecto

```
├── client/           # Frontend React
│   ├── src/
│   │   ├── components/  # Componentes reutilizables
│   │   ├── pages/       # Páginas de la aplicación
│   │   ├── hooks/       # Custom hooks
│   │   └── lib/         # Utilidades
├── server/           # Backend Express
│   ├── auth.ts         # Configuración de autenticación
│   ├── db.ts           # Configuración de base de datos
│   ├── routes.ts       # Rutas de la API
│   └── storage.ts      # Capa de acceso a datos
├── shared/           # Código compartido
│   └── schema.ts       # Esquemas de base de datos
├── scripts/          # Scripts de inicialización
└── docker-compose.yml # Configuración de Docker
```

## 📊 Funcionalidades

### Para Clientes
- ✅ Registro y login
- ✅ Registro de comidas diarias
- ✅ Seguimiento de agua consumida
- ✅ Visualización de comentarios del nutricionista
- ✅ Vista semanal de comidas
- ✅ Seguimiento de actividad física
- ✅ Integración con apps de salud (simulada)

### Para Nutricionistas
- ✅ Dashboard con resumen de clientes
- ✅ Gestión de clientes asignados
- ✅ Comentarios en comidas de clientes
- ✅ Creación de planes de comidas semanales
- ✅ Vista de progreso de clientes
- ✅ Sistema de invitaciones

## 🔧 Configuración Avanzada

### Variables de Entorno

```env
# Base de datos
DATABASE_URL=postgresql://nutritracker:nutritracker_pass@localhost:5432/nutritracker_db

# Redis
REDIS_URL=redis://localhost:6380

# Sesiones
SESSION_SECRET=your-secret-key-here

# Email (SendGrid)
SENDGRID_API_KEY=your-sendgrid-key

# PGAdmin (opcional)
PGADMIN_EMAIL=admin@nutritracker.com
PGADMIN_PASSWORD=admin
```

### Migraciones de Base de Datos

El proyecto usa Drizzle Kit con modo `push` para desarrollo rápido:

```bash
# Aplicar cambios del esquema
npm run db:push

# Generar migraciones tradicionales (opcional)
npx drizzle-kit generate --name migration_name
```

## 📱 API Endpoints

### Autenticación
- `POST /api/register` - Registro de cliente
- `POST /api/register/nutritionist` - Registro de nutricionista
- `POST /api/login` - Login
- `POST /api/logout` - Logout
- `GET /api/user` - Usuario actual

### Comidas y Nutrición
- `GET /api/meals` - Obtener comidas
- `POST /api/meals` - Crear comida
- `PUT /api/meals/:id` - Actualizar comida
- `DELETE /api/meals/:id` - Eliminar comida

### Comentarios
- `POST /api/comments` - Crear comentario
- `GET /api/meals/:id/comments` - Obtener comentarios

### Actividad Física
- `GET /api/activities` - Obtener actividades
- `POST /api/activities` - Crear actividad
- `GET /api/exercise-types` - Tipos de ejercicio

## 🚧 Solución de Problemas

### Puerto en uso
Si el puerto 3000 está ocupado:
```bash
# Cambiar puerto en docker-compose.yml
ports:
  - "3001:5000"  # Usar puerto 3001
```

### Problemas de base de datos
```bash
# Resetear completamente
docker compose down -v
docker compose up -d
docker compose --profile setup run migrate
```

### Logs y depuración
```bash
# Ver todos los logs
docker compose logs

# Ver logs específicos
docker compose logs app
docker compose logs postgres
```

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver el archivo `LICENSE` para más detalles.

## 📚 Documentación Adicional

- [Guía Completa de Docker](./README.Docker.md) - Documentación detallada de Docker
- [API Reference](./docs/api.md) - Documentación completa de la API
- [Database Schema](./docs/schema.md) - Esquema de base de datos