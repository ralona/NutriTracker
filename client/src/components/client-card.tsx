import { ClientWithSummary } from "@shared/schema";
import { getStatusBadgeClass, getProgressLabel } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ClientCardProps {
  client: ClientWithSummary;
  onClick: () => void;
}

export default function ClientCard({ client, onClick }: ClientCardProps) {
  // Get the status badge class
  const badgeClass = getStatusBadgeClass(client.lastWeekStatus);
  
  // Format the last meal date if it exists
  const lastMealDate = client.latestMeal 
    ? format(new Date(client.latestMeal.date), "d 'de' MMMM", { locale: es })
    : "Sin registros";
  
  // Determine activity status
  const isActive = client.latestMeal && new Date(client.latestMeal.date).getTime() > Date.now() - 3 * 24 * 60 * 60 * 1000;
  const activityStatus = isActive ? "Activo" : "Inactivo";
  const activityBadgeClass = isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800";
  
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow cursor-pointer" onClick={onClick}>
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center">
            <div className="h-10 w-10 rounded-full bg-primary-500 flex items-center justify-center text-white font-medium">
              {client.name.slice(0, 2).toUpperCase()}
            </div>
            <div className="ml-3">
              <h4 className="text-sm font-medium text-gray-900">{client.name}</h4>
              <p className="text-xs text-gray-500">Último registro: {lastMealDate}</p>
            </div>
          </div>
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${activityBadgeClass}`}>
            {activityStatus}
          </span>
        </div>
        
        <div className="mt-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-500">Progreso del plan</span>
            <span className="text-gray-900 font-medium">{client.progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
            <div 
              className={`h-2 rounded-full ${
                client.progress >= 70 ? 'bg-green-500' : 
                client.progress >= 40 ? 'bg-amber-500' : 
                'bg-red-500'
              }`} 
              style={{ width: `${client.progress}%` }}
            ></div>
          </div>
        </div>
        
        <div className="mt-4 text-sm text-gray-500">
          <div className="flex items-center justify-between">
            <span>Última semana:</span>
            <span className={`font-medium ${
              client.lastWeekStatus === 'Bien' ? 'text-green-600' : 
              client.lastWeekStatus === 'Regular' ? 'text-amber-600' : 
              'text-red-600'
            }`}>
              {client.lastWeekStatus}
            </span>
          </div>
          <div className="flex items-center justify-between mt-1">
            <span>Comentarios pendientes:</span>
            <span className="font-medium text-amber-600">{client.pendingComments}</span>
          </div>
        </div>
      </div>
      <div className="bg-gray-50 px-4 py-3">
        <Button variant="link" className="w-full justify-between p-0 text-sm text-primary-600 font-medium hover:text-primary-700">
          <span>Ver planes alimenticios</span>
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
}
