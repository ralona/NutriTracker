-- Database initialization script for NutriTracker
-- This script creates initial data for development

-- Create extensions if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Insert default exercise types
INSERT INTO exercise_types (name, description, calories_per_minute, icon_name, active)
VALUES 
  ('Correr', 'Carrera a ritmo moderado', 10, 'running', true),
  ('Caminar', 'Caminata a paso ligero', 5, 'footprints', true),
  ('Bicicleta', 'Ciclismo recreativo', 8, 'bike', true),
  ('Natación', 'Natación estilo libre', 12, 'waves', true),
  ('Yoga', 'Práctica de yoga', 3, 'heart', true),
  ('Pesas', 'Entrenamiento con pesas', 6, 'dumbbell', true),
  ('Pilates', 'Ejercicios de pilates', 4, 'activity', true),
  ('Baile', 'Baile aeróbico', 7, 'music', true)
ON CONFLICT DO NOTHING;

-- Insert a default nutritionist user for development
INSERT INTO users (password, name, email, role, active)
VALUES 
  -- Password: nutritest123 (you should hash this properly in production)
  ('$2b$10$X3jKqKqKqKqKqKqKqKqKqKqKqKqKqKqKqKqKqKqKqKqKqKqKqKqKqK', 
   'Dr. Ana García', 
   'nutritionist@nutritracker.com', 
   'nutritionist', 
   true)
ON CONFLICT (email) DO NOTHING;

-- Insert a sample client for development
INSERT INTO users (password, name, email, role, nutritionist_id, active)
VALUES 
  -- Password: clienttest123 (you should hash this properly in production)
  ('$2b$10$Y4kLrLrLrLrLrLrLrLrLrLrLrLrLrLrLrLrLrLrLrLrLrLrLrLrLrL', 
   'Juan Pérez', 
   'client@nutritracker.com', 
   'client', 
   1, 
   true)
ON CONFLICT (email) DO NOTHING;

-- Create some sample meal data for the client
INSERT INTO meals (user_id, date, type, name, description, calories, time, duration, water_intake, notes)
VALUES 
  (2, CURRENT_DATE, 'Desayuno', 'Avena con frutas', 'Avena con plátano y fresas', 350, '08:00', 15, 0.5, 'Desayuno saludable'),
  (2, CURRENT_DATE, 'Media Mañana', 'Frutos secos', 'Almendras y nueces', 180, '11:00', 5, 0.25, NULL),
  (2, CURRENT_DATE, 'Comida', 'Ensalada de pollo', 'Pechuga de pollo a la plancha con verduras', 450, '14:00', 30, 0.5, 'Comida balanceada'),
  (2, CURRENT_DATE - INTERVAL '1 day', 'Desayuno', 'Tostadas integrales', 'Pan integral con aguacate', 320, '08:30', 20, 0.3, NULL),
  (2, CURRENT_DATE - INTERVAL '1 day', 'Comida', 'Salmón con quinoa', 'Salmón al horno con quinoa y brócoli', 520, '14:30', 35, 0.5, 'Alto en omega-3')
ON CONFLICT DO NOTHING;

-- Add some sample comments from the nutritionist
INSERT INTO comments (meal_id, nutritionist_id, content, read)
VALUES 
  (1, 1, 'Excelente elección para el desayuno. La avena proporciona energía sostenida.', false),
  (3, 1, 'Muy bien balanceada esta comida. Recuerda agregar un poco más de vegetales verdes.', false)
ON CONFLICT DO NOTHING;

-- Add sample physical activity
INSERT INTO physical_activities (user_id, date, steps, notes)
VALUES 
  (2, CURRENT_DATE, 8500, 'Caminata matutina en el parque'),
  (2, CURRENT_DATE - INTERVAL '1 day', 6200, 'Día menos activo')
ON CONFLICT DO NOTHING;

-- Note: In production, you should:
-- 1. Use proper password hashing (bcrypt)
-- 2. Generate secure passwords
-- 3. Consider using environment variables for initial user data
-- 4. Add proper error handling and logging