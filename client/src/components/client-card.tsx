import { ClientWithSummary } from "@shared/schema";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, Calendar, MessageSquare, Activity } from "lucide-react";
import { getProgressLabel, getStatusBadgeClass } from "@/lib/utils";
import { format } from "date-fns";
import { Progress } from "@/components/ui/progress";

interface ClientCardProps {
  client: ClientWithSummary;
  onClick: () => void;
}

export default function ClientCard({ client, onClick }: ClientCardProps) {
  const hasRecentActivity = client.latestMeal && 
    (new Date().getTime() - new Date(client.latestMeal.date).getTime()) < 7 * 24 * 60 * 60 * 1000;

  return (
    <Card className="overflow-hidden transition-all hover:shadow-md">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold">{client.name}</CardTitle>
        <p className="text-sm text-muted-foreground">{client.email}</p>
      </CardHeader>
      <CardContent className="pb-2 space-y-4">
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm">Progreso</span>
            <Badge variant={getStatusBadgeClass(client.lastWeekStatus) as any}>
              {getProgressLabel(client.progress)}
            </Badge>
          </div>
          <Progress value={client.progress} className="h-2" />
        </div>
        
        <div className="grid grid-cols-2 gap-2">
          <div className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">
              {client.latestMeal 
                ? format(new Date(client.latestMeal.date), 'dd/MM/yy')
                : 'Sin actividad'}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">
              {client.pendingComments > 0 
                ? `${client.pendingComments} comentarios` 
                : 'Sin comentarios'}
            </span>
          </div>
        </div>

        {client.activePlan && (
          <div className="border rounded p-2 bg-muted/30">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium">Plan activo</span>
              <Badge variant="outline" className="text-xs">
                Semana {format(new Date(client.activePlan.weekStart), 'dd/MM')}
              </Badge>
            </div>
          </div>
        )}
      </CardContent>
      <CardFooter className="pt-2">
        <Button variant="outline" className="w-full" onClick={onClick}>
          <ExternalLink className="mr-2 h-4 w-4" />
          <span>Ver detalles</span>
        </Button>
      </CardFooter>
      
      {hasRecentActivity && (
        <div className="absolute top-3 right-3">
          <div className="relative">
            <Activity className="h-5 w-5 text-green-500" />
            <span className="absolute -top-1 -right-1 h-2 w-2 rounded-full bg-green-500 animate-pulse" />
          </div>
        </div>
      )}
    </Card>
  );
}