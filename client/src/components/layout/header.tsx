import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Loader2, LogOut, User as UserIcon, Settings, Menu } from "lucide-react";

export default function Header() {
  const { user, isLoading, logoutMutation } = useAuth();
  const [location] = useLocation();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

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

  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h7" />
          </svg>
          <Link href="/">
            <span className="text-xl font-semibold text-gray-800 cursor-pointer">NutriTrack</span>
          </Link>
        </div>
        
        <div className="hidden md:flex items-center space-x-6">
          {user && (
            <>
              {user.role === "client" && (
                <>
                  <Link href="/meals/weekly">
                    <span className={`text-sm font-medium ${location === "/meals/weekly" ? "text-primary-600" : "text-gray-600 hover:text-primary-600"} transition-colors cursor-pointer`}>
                      Plan Semanal
                    </span>
                  </Link>
                  <Link href="/meals/daily">
                    <span className={`text-sm font-medium ${location === "/meals/daily" ? "text-primary-600" : "text-gray-600 hover:text-primary-600"} transition-colors cursor-pointer`}>
                      Comidas Diarias
                    </span>
                  </Link>
                </>
              )}
              
              {user.role === "nutritionist" && (
                <Link href="/nutritionist">
                  <span className={`text-sm font-medium ${location === "/nutritionist" ? "text-primary-600" : "text-gray-600 hover:text-primary-600"} transition-colors cursor-pointer`}>
                    Panel de Nutricionista
                  </span>
                </Link>
              )}
            </>
          )}
        </div>
        
        <div className="flex items-center space-x-4">
          {isLoading ? (
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          ) : user ? (
            <>
              <div className="hidden md:flex items-center space-x-2">
                <span className="text-sm text-gray-600">{user.name}</span>
                {user.role === "nutritionist" && (
                  <span className="text-xs px-2 py-1 rounded-full bg-primary-100 text-primary-800">
                    Nutricionista
                  </span>
                )}
              </div>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-primary-500 text-white font-semibold">
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
                    <DropdownMenuItem className="md:hidden">
                      <Link href="/nutritionist">Panel de Nutricionista</Link>
                    </DropdownMenuItem>
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
