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
import NutritionistDashboard from "@/pages/nutritionist-dashboard";
import ActivateInvitationPage from "@/pages/activate-invitation";

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <Route path="/invite/:token" component={ActivateInvitationPage} />
      <ProtectedRoute path="/" component={HomePage} />
      <ProtectedRoute path="/meals/weekly" component={WeeklyView} />
      <ProtectedRoute path="/meals/daily" component={MealTracking} />
      <ProtectedRoute path="/nutritionist" component={NutritionistDashboard} />
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
