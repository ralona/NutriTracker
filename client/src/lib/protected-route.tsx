import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Redirect, Route } from "wouter";

export function ProtectedRoute({
  path,
  component: Component,
}: {
  path: string;
  component: () => React.JSX.Element;
}) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <Route path={path}>
        <div className="flex items-center justify-center min-h-screen">
          <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
        </div>
      </Route>
    );
  }

  if (!user) {
    return (
      <Route path={path}>
        <Redirect to="/auth" />
      </Route>
    );
  }

  // Check if user is a nutritionist trying to access client paths
  if (user.role === "nutritionist" && !path.includes("nutritionist") && path !== "/") {
    return (
      <Route path={path}>
        <Redirect to="/nutritionist" />
      </Route>
    );
  }

  // Check if client is trying to access nutritionist paths
  if (user.role === "client" && path.includes("nutritionist")) {
    return (
      <Route path={path}>
        <Redirect to="/meals/weekly" />
      </Route>
    );
  }

  return <Route path={path} component={Component} />;
}
