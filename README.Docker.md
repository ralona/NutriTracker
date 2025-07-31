# NutriTracker - Docker Setup Guide

This guide explains how to run NutriTracker using Docker containers for local development and testing.

## Prerequisites

- Docker Desktop installed ([Download here](https://www.docker.com/products/docker-desktop))
- Docker Compose (included with Docker Desktop)
- Git

## Quick Start

1. **Clone the repository** (if you haven't already):
   ```bash
   git clone <repository-url>
   cd NutriTracker
   ```

2. **Copy the environment file**:
   ```bash
   cp .env.example .env
   ```

3. **Start all services**:
   ```bash
   docker-compose up -d
   ```

4. **Run database migrations** (first time only):
   ```bash
   docker-compose --profile setup run migrate
   ```

5. **Access the application**:
   - Application: http://localhost:3000
   - PostgreSQL: localhost:5432
   - Redis: localhost:6379
   - PGAdmin (optional): http://localhost:5050

## Services Included

### Core Services (always running)
- **app**: Node.js application (Express + React)
- **postgres**: PostgreSQL database
- **redis**: Redis for session storage

### Optional Services
- **pgadmin**: Database management interface (use `--profile tools`)
- **migrate**: Database migration runner (use `--profile setup`)

## Common Commands

### Start all services
```bash
docker-compose up -d
```

### Stop all services
```bash
docker-compose down
```

### View logs
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f app
```

### Run database migrations
```bash
docker-compose --profile setup run migrate
```

### Access PGAdmin
```bash
docker-compose --profile tools up -d pgadmin
```

### Reset database
```bash
docker-compose down -v
docker-compose up -d
docker-compose --profile setup run migrate
```

### Execute commands in containers
```bash
# Access app container shell
docker-compose exec app sh

# Access PostgreSQL
docker-compose exec postgres psql -U nutritracker -d nutritracker_db
```

## Development Workflow

1. The application runs with hot-reload enabled
2. Changes to code will automatically restart the server
3. Client-side changes trigger Vite's HMR (Hot Module Replacement)

## Default Credentials

### Database
- User: `nutritracker`
- Password: `nutritracker_pass`
- Database: `nutritracker_db`

### PGAdmin (if enabled)
- Email: `admin@nutritracker.com`
- Password: `admin`

### Sample Users (created by init script)
- Nutritionist: `nutritionist@nutritracker.com` / `nutritest123`
- Client: `client@nutritracker.com` / `clienttest123`

## Environment Variables

Key environment variables in `.env`:

```env
# Database
DB_USER=nutritracker
DB_PASSWORD=nutritracker_pass
DB_NAME=nutritracker_db

# Session
SESSION_SECRET=your-secret-key-here

# Email (optional)
SENDGRID_API_KEY=your-sendgrid-key
```

## Troubleshooting

### Port already in use
```bash
# Check what's using port 3000
lsof -i :3000

# Change port in docker-compose.yml if needed
```

### Database connection issues
```bash
# Check if postgres is healthy
docker-compose ps

# View postgres logs
docker-compose logs postgres
```

### Permission issues
```bash
# Reset volumes and rebuild
docker-compose down -v
docker-compose build --no-cache
docker-compose up -d
```

## Production Deployment

For production deployment:

1. Use the production stage in Dockerfile:
   ```yaml
   build:
     target: runner  # instead of dev
   ```

2. Set proper environment variables
3. Use Docker secrets for sensitive data
4. Consider using Docker Swarm or Kubernetes

## Additional Notes

- The `attached_assets` folder is excluded from the Docker image
- Node modules are cached in a Docker volume for faster rebuilds
- Database data persists in Docker volumes between restarts
- Use `docker-compose down -v` to completely reset all data