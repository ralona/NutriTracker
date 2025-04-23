import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { useTheme } from "next-themes";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Loader2, LogOut, User as UserIcon, Settings, Sun, Moon, Utensils } from "lucide-react";

export default function Header() {
  const { user, isLoading, logoutMutation } = useAuth();
  const [location] = useLocation();
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  // Monta el componente del lado del cliente para evitar error de hidratación
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((part) => part[0])
      .join("")
      .toUpperCase()
      .substring(0, 2);
  };

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  if (!mounted) return null;

  return (
    <header className="bg-card border-b border-border">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Link href="/" className="flex items-center space-x-2">
            <div className="bg-primary rounded-full p-1.5">
              <Utensils className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-semibold text-foreground">NutriTrack</span>
          </Link>
        </div>
        
        <div className="hidden md:flex items-center space-x-6">
          {user && (
            <>
              {user.role === "client" && (
                <>
                  <Link href="/meals/weekly">
                    <span className={`text-sm font-medium ${location === "/meals/weekly" ? "text-primary" : "text-muted-foreground hover:text-primary"} transition-colors cursor-pointer`}>
                      Plan Semanal
                    </span>
                  </Link>
                  <Link href="/meals/daily">
                    <span className={`text-sm font-medium ${location === "/meals/daily" ? "text-primary" : "text-muted-foreground hover:text-primary"} transition-colors cursor-pointer`}>
                      Comidas Diarias
                    </span>
                  </Link>
                </>
              )}
              
              {user.role === "nutritionist" && (
                <>
                  <Link href="/nutritionist">
                    <span className={`text-sm font-medium ${location === "/nutritionist" ? "text-primary" : "text-muted-foreground hover:text-primary"} transition-colors cursor-pointer`}>
                      Panel de Nutricionista
                    </span>
                  </Link>
                  <Link href="/meal-plans">
                    <span className={`text-sm font-medium ${location === "/meal-plans" ? "text-primary" : "text-muted-foreground hover:text-primary"} transition-colors cursor-pointer`}>
                      Planes de Comida
                    </span>
                  </Link>
                </>
              )}
            </>
          )}
        </div>
        
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="rounded-full"
            aria-label="Cambiar tema"
          >
            {theme === "dark" ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </Button>
          
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          ) : user ? (
            <>
              <div className="hidden md:flex items-center space-x-2">
                <span className="text-sm text-muted-foreground">{user.name}</span>
                {user.role === "nutritionist" && (
                  <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                    Nutricionista
                  </span>
                )}
              </div>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground font-semibold">
                    {getInitials(user.name)}
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Mi cuenta</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="md:hidden">
                    <UserIcon className="mr-2 h-4 w-4" />
                    <span>{user.name}</span>
                  </DropdownMenuItem>
                  {user.role === "client" && (
                    <>
                      <DropdownMenuItem className="md:hidden">
                        <Link href="/meals/weekly">Plan Semanal</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem className="md:hidden">
                        <Link href="/meals/daily">Comidas Diarias</Link>
                      </DropdownMenuItem>
                    </>
                  )}
                  {user.role === "nutritionist" && (
                    <>
                      <DropdownMenuItem className="md:hidden">
                        <Link href="/nutritionist">Panel de Nutricionista</Link>
                      </DropdownMenuItem>
                      <DropdownMenuItem className="md:hidden">
                        <Link href="/meal-plans">Planes de Comida</Link>
                      </DropdownMenuItem>
                    </>
                  )}
                  <DropdownMenuItem>
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Configuración</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Cerrar sesión</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <div className="space-x-2">
              <Button variant="outline" asChild>
                <Link href="/auth">Iniciar Sesión</Link>
              </Button>
              <Button asChild className="hidden md:inline-flex">
                <Link href="/auth">Registrarse</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
