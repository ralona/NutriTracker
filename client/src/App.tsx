import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "./lib/protected-route";
import { ThemeProvider } from "next-themes";

import Header from "@/components/layout/header";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import HomePage from "@/pages/home-page";
import WeeklyView from "@/pages/weekly-view";
import MealTracking from "@/pages/meal-tracking";
import ActivityTracking from "@/pages/activity-tracking";
import NutritionistDashboard from "@/pages/nutritionist-dashboard";
import MealPlanManagement from "@/pages/meal-plan-management";
import ActivateInvitationPage from "@/pages/activate-invitation";
import ClientProfile from "@/pages/client-profile";
import { useAuth } from "@/hooks/use-auth";
import { Redirect } from "wouter";

// Ruta protegida específicamente para nutricionistas
function NutritionistRoute({ path, component: Component }: { path: string; component: () => React.JSX.Element }) {
  const { user } = useAuth();
  
  // Si no es nutricionista, redirigir a la página principal
  if (user && user.role !== "nutritionist") {
    return (
      <Route path={path}>
        <Redirect to="/" />
      </Route>
    );
  }
  
  // Si es nutricionista, utilizar la ruta protegida normal
  return <ProtectedRoute path={path} component={Component} />;
}

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <Route path="/invite/:token" component={ActivateInvitationPage} />
      <ProtectedRoute path="/" component={HomePage} />
      <ProtectedRoute path="/meals/weekly" component={WeeklyView} />
      <ProtectedRoute path="/meals/daily" component={MealTracking} />
      <ProtectedRoute path="/activities" component={ActivityTracking} />
      <NutritionistRoute path="/nutritionist" component={NutritionistDashboard} />
      <NutritionistRoute path="/meal-plans" component={MealPlanManagement} />
      <NutritionistRoute path="/nutritionist/clients/:clientId" component={ClientProfile} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
        <AuthProvider>
          <TooltipProvider>
            <div className="min-h-screen bg-background text-foreground">
              <Header />
              <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <Router />
              </main>
              <Toaster />
            </div>
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
