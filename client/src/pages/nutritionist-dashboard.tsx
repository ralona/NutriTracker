import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { ClientWithSummary } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Users, 
  BarChart, 
  MessageSquare, 
  CalendarRange, 
  ChevronRight
} from "lucide-react";
import ClientCard from "@/components/client-card";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function NutritionistDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("clients");

  // Fetch clients
  const { data: clients, isLoading } = useQuery<ClientWithSummary[]>({
    queryKey: ["/api/nutritionist/clients"],
    queryFn: async () => {
      const response = await fetch("/api/nutritionist/clients");
      if (!response.ok) throw new Error("Error fetching clients");
      return response.json();
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: (error as Error).message || "No se pudieron cargar los clientes",
        variant: "destructive",
      });
    }
  });

  // Client stats
  const totalClients = clients?.length || 0;
  const activeClients = clients?.filter(client => 
    client.latestMeal && new Date(client.latestMeal.date).getTime() > Date.now() - 7 * 24 * 60 * 60 * 1000
  ).length || 0;
  const percentChange = totalClients > 0 ? Math.round((activeClients / totalClients) * 100) : 0;
  
  // Comments stats
  const totalPendingComments = clients?.reduce((sum, client) => sum + client.pendingComments, 0) || 0;
  const totalRegisteredMeals = clients?.reduce((sum, client) => {
    // This is a mock calculation - in a real app we'd have this data
    return sum + (client.progress > 50 ? 15 : client.progress > 25 ? 8 : 3);
  }, 0) || 0;

  // Group clients by progress
  const goodProgress = clients?.filter(client => client.progress >= 70) || [];
  const mediumProgress = clients?.filter(client => client.progress >= 40 && client.progress < 70) || [];
  const lowProgress = clients?.filter(client => client.progress < 40) || [];

  return (
    <div className="space-y-8">
      <div className="bg-white shadow rounded-lg overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-800">Panel de Nutricionista</h2>
          <p className="mt-1 text-sm text-gray-600">Gestiona y monitoriza los planes de tus clientes</p>
        </div>
        
        <div className="p-6">
          <Tabs defaultValue="clients" value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6">
              <TabsTrigger value="clients" className="flex items-center">
                <Users className="h-4 w-4 mr-2" />
                Clientes
              </TabsTrigger>
              <TabsTrigger value="stats" className="flex items-center">
                <BarChart className="h-4 w-4 mr-2" />
                Estadísticas
              </TabsTrigger>
              <TabsTrigger value="calendar" className="flex items-center">
                <CalendarRange className="h-4 w-4 mr-2" />
                Calendario
              </TabsTrigger>
              <TabsTrigger value="messages" className="flex items-center">
                <MessageSquare className="h-4 w-4 mr-2" />
                Mensajes
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="clients">
              {isLoading ? (
                <div className="flex justify-center py-10">
                  <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-primary-500 border-r-2"></div>
                </div>
              ) : (
                <>
                  <h3 className="text-lg font-medium text-gray-900 mb-4">Mis Clientes</h3>
                  
                  {clients && clients.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                      {clients.map((client) => (
                        <ClientCard 
                          key={client.id}
                          client={client}
                          onClick={() => {
                            // In a real app, navigate to client detail page
                            console.log("View client:", client.id);
                          }}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-10">
                      <p className="text-gray-500">No hay clientes asignados</p>
                      <Button variant="outline" className="mt-4">
                        Añadir nuevo cliente
                      </Button>
                    </div>
                  )}
                </>
              )}
            </TabsContent>
            
            <TabsContent value="stats">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Resumen de Actividad</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <Card>
                  <CardContent className="pt-6">
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-500">Total Clientes</p>
                      <p className="text-3xl font-semibold text-gray-900">{totalClients}</p>
                      <div className="text-sm">
                        <span className="font-medium text-green-600">+{percentChange}% </span>
                        <span className="text-gray-500">activos esta semana</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-6">
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-500">Comidas Registradas (Semana)</p>
                      <p className="text-3xl font-semibold text-gray-900">{totalRegisteredMeals}</p>
                      <div className="text-sm">
                        <span className="font-medium text-green-600">+4.1% </span>
                        <span className="text-gray-500">respecto a la semana pasada</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="pt-6">
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-500">Comentarios Pendientes</p>
                      <p className="text-3xl font-semibold text-gray-900">{totalPendingComments}</p>
                      <div className="text-sm">
                        <span className="font-medium text-red-600">+3 </span>
                        <span className="text-gray-500">desde ayer</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
              
              <h3 className="text-lg font-medium text-gray-900 mb-4">Progreso de Clientes</h3>
              
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <Card>
                  <CardHeader className="pb-3">
                    <h4 className="text-sm font-medium flex items-center">
                      <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
                      Buen progreso ({goodProgress.length})
                    </h4>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {goodProgress.slice(0, 3).map(client => (
                        <div key={client.id} className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 font-semibold mr-3">
                              {client.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-medium">{client.name}</p>
                              <p className="text-xs text-gray-500">{client.progress}% completado</p>
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-gray-400" />
                        </div>
                      ))}
                      {goodProgress.length === 0 && (
                        <p className="text-center text-sm text-gray-500 py-3">No hay clientes en esta categoría</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-3">
                    <h4 className="text-sm font-medium flex items-center">
                      <div className="w-3 h-3 rounded-full bg-yellow-500 mr-2"></div>
                      Progreso medio ({mediumProgress.length})
                    </h4>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {mediumProgress.slice(0, 3).map(client => (
                        <div key={client.id} className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="h-8 w-8 rounded-full bg-yellow-100 flex items-center justify-center text-yellow-700 font-semibold mr-3">
                              {client.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-medium">{client.name}</p>
                              <p className="text-xs text-gray-500">{client.progress}% completado</p>
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-gray-400" />
                        </div>
                      ))}
                      {mediumProgress.length === 0 && (
                        <p className="text-center text-sm text-gray-500 py-3">No hay clientes en esta categoría</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader className="pb-3">
                    <h4 className="text-sm font-medium flex items-center">
                      <div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
                      Progreso bajo ({lowProgress.length})
                    </h4>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {lowProgress.slice(0, 3).map(client => (
                        <div key={client.id} className="flex items-center justify-between">
                          <div className="flex items-center">
                            <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center text-red-700 font-semibold mr-3">
                              {client.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-medium">{client.name}</p>
                              <p className="text-xs text-gray-500">{client.progress}% completado</p>
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-gray-400" />
                        </div>
                      ))}
                      {lowProgress.length === 0 && (
                        <p className="text-center text-sm text-gray-500 py-3">No hay clientes en esta categoría</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            <TabsContent value="calendar">
              <div className="text-center py-10">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Calendario de Citas</h3>
                <p className="text-gray-500 mb-6">Aquí podrás gestionar tus citas con clientes</p>
                <p className="text-gray-400">(Función en desarrollo)</p>
              </div>
            </TabsContent>
            
            <TabsContent value="messages">
              <div className="text-center py-10">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Mensajes</h3>
                <p className="text-gray-500 mb-6">Aquí podrás gestionar tus mensajes con clientes</p>
                <p className="text-gray-400">(Función en desarrollo)</p>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
