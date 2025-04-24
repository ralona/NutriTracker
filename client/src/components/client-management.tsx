import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UserPlus, Mail, MoreHorizontal, Trash2, Edit, UserCheck, UserX, Copy, ExternalLink, FileText } from "lucide-react";
import { ClientWithSummary, User } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { getStatusBadgeClass, getProgressLabel } from "@/lib/utils";
import ClientCard from "./client-card";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { format } from "date-fns";
import { useLocation } from "wouter";

// Schema para invitar a un nuevo cliente
const inviteClientSchema = z.object({
  name: z.string().min(3, "El nombre debe tener al menos 3 caracteres"),
  email: z.string().email("Email inválido")
});

type InviteClientValues = z.infer<typeof inviteClientSchema>;

export default function ClientManagement() {
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const [selectedClient, setSelectedClient] = useState<ClientWithSummary | null>(null);
  const [isInviteDialogOpen, setIsInviteDialogOpen] = useState(false);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [clientsView, setClientsView] = useState<"active" | "pending" | "all">("active");

  // Obtener todos los clientes
  const { data: clients = [], isLoading } = useQuery({
    queryKey: ["/api/nutritionist/clients"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/nutritionist/clients");
      return res.json();
    }
  });

  // Mutación para enviar invitación
  const inviteMutation = useMutation({
    mutationFn: async (data: InviteClientValues) => {
      const res = await apiRequest("POST", "/api/invitations", data);
      return res.json();
    },
    onSuccess: (data) => {
      setInviteLink(window.location.origin + data.inviteLink);
      toast({
        title: "Invitación creada",
        description: "Se ha creado la invitación para el nuevo paciente",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/nutritionist/clients"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error al crear invitación",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Mutación para desactivar un cliente
  const deactivateClientMutation = useMutation({
    mutationFn: async (clientId: number) => {
      const res = await apiRequest("POST", `/api/nutritionist/clients/${clientId}/deactivate`);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Cliente desactivado",
        description: "El cliente ha sido desactivado correctamente",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/nutritionist/clients"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error al desactivar cliente",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Mutación para activar un cliente
  const activateClientMutation = useMutation({
    mutationFn: async (clientId: number) => {
      const res = await apiRequest("POST", `/api/nutritionist/clients/${clientId}/activate`);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Cliente activado",
        description: "El cliente ha sido activado correctamente",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/nutritionist/clients"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error al activar cliente",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Mutación para eliminar un cliente
  const deleteClientMutation = useMutation({
    mutationFn: async (clientId: number) => {
      const res = await apiRequest("DELETE", `/api/nutritionist/clients/${clientId}`);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Cliente eliminado",
        description: "El cliente ha sido eliminado correctamente",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/nutritionist/clients"] });
    },
    onError: (error: any) => {
      toast({
        title: "Error al eliminar cliente",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Configuración del formulario de invitación
  const form = useForm<InviteClientValues>({
    resolver: zodResolver(inviteClientSchema),
    defaultValues: {
      name: "",
      email: ""
    }
  });

  // Manejador para enviar invitación
  function onSubmitInvite(values: InviteClientValues) {
    inviteMutation.mutate(values);
  }

  // Función para copiar el enlace de invitación al portapapeles
  const copyInviteLink = () => {
    if (inviteLink) {
      navigator.clipboard.writeText(inviteLink)
        .then(() => {
          toast({
            title: "Enlace copiado",
            description: "El enlace de invitación se ha copiado al portapapeles",
          });
        })
        .catch(err => {
          toast({
            title: "Error al copiar",
            description: "No se pudo copiar el enlace",
            variant: "destructive",
          });
        });
    }
  };

  // Filtrar clientes según la vista seleccionada
  const filteredClients = clients.filter((client: ClientWithSummary) => {
    if (clientsView === "active") return client.active;
    if (clientsView === "pending") return !client.active;
    return true; // "all"
  });

  // Comprobar si hay invitaciones pendientes (clientes inactivos)
  const hasPendingInvitations = clients.some((client: ClientWithSummary) => !client.active);

  return (
    <div className="space-y-6">
      {/* Cabecera con botón para invitar nuevo cliente */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Gestión de Pacientes</h2>
          <p className="text-muted-foreground">
            Administra tus pacientes, invita nuevos y visualiza su progreso
          </p>
        </div>
        <Dialog open={isInviteDialogOpen} onOpenChange={setIsInviteDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <UserPlus className="size-4" />
              <span>Invitar paciente</span>
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invitar nuevo paciente</DialogTitle>
              <DialogDescription>
                Crea una invitación para un nuevo paciente. Se generará un enlace que podrás compartir.
              </DialogDescription>
            </DialogHeader>
            
            {/* Si ya se generó un enlace, mostrarlo */}
            {inviteLink ? (
              <div className="space-y-4">
                <div className="bg-muted p-3 rounded-md relative">
                  <p className="text-sm break-all pr-10">{inviteLink}</p>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="absolute right-2 top-2"
                    onClick={copyInviteLink}
                  >
                    <Copy className="size-4" />
                  </Button>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    className="w-full gap-2"
                    onClick={copyInviteLink}
                  >
                    <Copy className="size-4" />
                    <span>Copiar enlace</span>
                  </Button>
                  <Button 
                    className="w-full gap-2"
                    onClick={() => {
                      setInviteLink(null);
                      form.reset();
                    }}
                  >
                    <UserPlus className="size-4" />
                    <span>Nueva invitación</span>
                  </Button>
                </div>
              </div>
            ) : (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmitInvite)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre completo</FormLabel>
                        <FormControl>
                          <Input placeholder="Nombre del paciente" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="email@ejemplo.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <DialogFooter>
                    <Button 
                      type="submit" 
                      disabled={inviteMutation.isPending}
                      className="w-full"
                    >
                      {inviteMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 size-4 animate-spin" />
                          <span>Creando invitación...</span>
                        </>
                      ) : (
                        <>
                          <Mail className="mr-2 size-4" />
                          <span>Generar enlace de invitación</span>
                        </>
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </Form>
            )}
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabs para filtrar clientes */}
      <Tabs 
        defaultValue="active" 
        value={clientsView} 
        onValueChange={(v) => setClientsView(v as "active" | "pending" | "all")}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
          <TabsTrigger value="active">
            Activos
          </TabsTrigger>
          <TabsTrigger value="pending" className="relative">
            Pendientes
            {hasPendingInvitations && (
              <Badge 
                variant="destructive" 
                className="absolute -top-1 -right-1 w-5 h-5 flex items-center justify-center p-0 text-[0.6rem]"
              >
                !
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="all">Todos</TabsTrigger>
        </TabsList>
        
        <TabsContent value="active" className="mt-6">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
            </div>
          ) : filteredClients.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center pt-10 pb-10">
                <div className="rounded-full bg-muted p-3 mb-4">
                  <UserPlus className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium mb-2">No hay pacientes activos</h3>
                <p className="text-sm text-muted-foreground text-center max-w-md mb-4">
                  Los pacientes activos aparecerán aquí cuando acepten su invitación y completen el registro.
                </p>
                <Button onClick={() => setIsInviteDialogOpen(true)}>
                  Invitar paciente
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredClients.map((client: ClientWithSummary) => (
                <ClientCard 
                  key={client.id} 
                  client={client}
                  onClick={() => setSelectedClient(client)}
                />
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="pending" className="mt-6">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
            </div>
          ) : filteredClients.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center pt-10 pb-10">
                <div className="rounded-full bg-muted p-3 mb-4">
                  <Mail className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium mb-2">No hay invitaciones pendientes</h3>
                <p className="text-sm text-muted-foreground text-center max-w-md mb-4">
                  Cuando envíes invitaciones a tus pacientes, aparecerán aquí hasta que completen su registro.
                </p>
                <Button onClick={() => setIsInviteDialogOpen(true)}>
                  Invitar paciente
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {filteredClients.map((client: ClientWithSummary) => (
                <Card key={client.id} className="overflow-hidden">
                  <div className="flex flex-col sm:flex-row justify-between gap-4 p-6">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-medium">{client.name}</h3>
                        <Badge variant="outline" className="border-amber-500 text-amber-600">
                          Pendiente
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        <Mail className="w-4 h-4 inline-block mr-1" />
                        {client.email}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Invitación enviada el {format(new Date(client.inviteExpires ? new Date(client.inviteExpires).getTime() - 7*24*60*60*1000 : new Date()), 'dd/MM/yyyy')}
                      </p>
                      {client.inviteExpires && (
                        <p className="text-sm text-amber-600">
                          Expira el {format(new Date(client.inviteExpires), 'dd/MM/yyyy')}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-row sm:flex-col justify-start gap-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setIsInviteDialogOpen(true)}
                        className="w-full gap-1"
                      >
                        <Mail className="size-3" />
                        <span>Reenviar</span>
                      </Button>
                      <Button 
                        variant="destructive" 
                        size="sm"
                        onClick={() => deleteClientMutation.mutate(client.id)}
                        className="w-full gap-1"
                      >
                        <Trash2 className="size-3" />
                        <span>Eliminar</span>
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="all" className="mt-6">
          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
            </div>
          ) : filteredClients.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center pt-10 pb-10">
                <div className="rounded-full bg-muted p-3 mb-4">
                  <UserPlus className="h-6 w-6 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-medium mb-2">No hay pacientes registrados</h3>
                <p className="text-sm text-muted-foreground text-center max-w-md mb-4">
                  Comienza invitando a tus pacientes para que puedan registrarse y utilizar la plataforma.
                </p>
                <Button onClick={() => setIsInviteDialogOpen(true)}>
                  Invitar paciente
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredClients.map((client: ClientWithSummary) => (
                <Card key={client.id} className="overflow-hidden">
                  <CardHeader className="pb-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          {client.name}
                          {client.active ? (
                            <Badge variant="outline" className="border-green-500 text-green-600">
                              Activo
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-amber-500 text-amber-600">
                              Pendiente
                            </Badge>
                          )}
                        </CardTitle>
                        <CardDescription>{client.email}</CardDescription>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {client.active ? (
                            <DropdownMenuItem onClick={() => deactivateClientMutation.mutate(client.id)}>
                              <UserX className="mr-2 h-4 w-4" />
                              <span>Desactivar</span>
                            </DropdownMenuItem>
                          ) : (
                            <>
                              <DropdownMenuItem onClick={() => setIsInviteDialogOpen(true)}>
                                <Mail className="mr-2 h-4 w-4" />
                                <span>Reenviar invitación</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => activateClientMutation.mutate(client.id)}>
                                <UserCheck className="mr-2 h-4 w-4" />
                                <span>Activar manualmente</span>
                              </DropdownMenuItem>
                            </>
                          )}
                          <DropdownMenuItem onClick={() => deleteClientMutation.mutate(client.id)}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            <span>Eliminar</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </CardHeader>
                  {client.active && (
                    <CardContent className="pb-4">
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div>
                          <p className="text-xs text-muted-foreground">Progreso</p>
                          <p className="text-sm font-medium">
                            <Badge className={getStatusBadgeClass(client.lastWeekStatus)}>
                              {getProgressLabel(client.progress)}
                            </Badge>
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Comentarios</p>
                          <p className="text-sm font-medium">{client.pendingComments}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Último registro</p>
                          <p className="text-sm font-medium">
                            {client.latestMeal ? format(new Date(client.latestMeal.date), 'dd/MM') : '-'}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  )}
                  <CardFooter>
                    <Button 
                      variant="outline" 
                      className="w-full" 
                      onClick={() => setSelectedClient(client)}
                      disabled={!client.active}
                    >
                      <ExternalLink className="mr-2 h-4 w-4" />
                      <span>Ver detalles</span>
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Modal de detalles del cliente */}
      {selectedClient && (
        <Dialog open={!!selectedClient} onOpenChange={(open) => !open && setSelectedClient(null)}>
          <DialogContent className="sm:max-w-4xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {selectedClient.name}
                <Badge variant="outline" className="ml-2 border-green-500 text-green-600">
                  Activo
                </Badge>
              </DialogTitle>
              <DialogDescription>
                <span className="flex items-center gap-1">
                  <Mail className="size-3 inline" /> {selectedClient.email}
                </span>
              </DialogDescription>
            </DialogHeader>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <Card>
                <CardHeader className="py-4">
                  <CardTitle className="text-base">Progreso general</CardTitle>
                </CardHeader>
                <CardContent className="py-0">
                  <div className="flex items-center justify-center py-4">
                    <div className="flex flex-col items-center justify-center">
                      <div className="text-4xl font-bold mb-2">{selectedClient.progress}%</div>
                      <Badge className={getStatusBadgeClass(selectedClient.lastWeekStatus)}>
                        {selectedClient.lastWeekStatus}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="py-4">
                  <CardTitle className="text-base">Comentarios pendientes</CardTitle>
                </CardHeader>
                <CardContent className="py-0">
                  <div className="flex items-center justify-center py-4 h-full">
                    <div className="text-4xl font-bold">
                      {selectedClient.pendingComments}
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="py-4">
                  <CardTitle className="text-base">Última actividad</CardTitle>
                </CardHeader>
                <CardContent className="py-0">
                  <div className="flex flex-col items-center justify-center py-4 h-full gap-2">
                    {selectedClient.latestMeal ? (
                      <>
                        <div className="text-sm text-muted-foreground">
                          {format(new Date(selectedClient.latestMeal.date), 'dd/MM/yyyy')}
                        </div>
                        <div className="text-base font-medium">{selectedClient.latestMeal.name}</div>
                      </>
                    ) : (
                      <div className="text-sm text-muted-foreground">Sin registros</div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
            
            <div className="border rounded-md">
              <div className="p-4 border-b">
                <h3 className="font-medium">Acciones disponibles</h3>
              </div>
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Button 
                  variant="outline" 
                  className="gap-2 w-full"
                  onClick={() => {
                    navigate(`/nutritionist/clients/${selectedClient.id}`);
                    setSelectedClient(null);
                  }}
                >
                  <FileText className="size-4" />
                  <span>Ver perfil completo</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="gap-2 w-full"
                  onClick={() => {
                    setSelectedClient(null);
                    // Añadir lógica para crear plan
                  }}
                >
                  <Edit className="size-4" />
                  <span>Crear plan alimenticio</span>
                </Button>
                <Button 
                  variant="outline" 
                  className="gap-2 w-full"
                  onClick={() => {
                    deactivateClientMutation.mutate(selectedClient.id);
                    setSelectedClient(null);
                  }}
                >
                  <UserX className="size-4" />
                  <span>Desactivar paciente</span>
                </Button>
                <Button 
                  variant="destructive" 
                  className="gap-2 w-full"
                  onClick={() => {
                    deleteClientMutation.mutate(selectedClient.id);
                    setSelectedClient(null);
                  }}
                >
                  <Trash2 className="size-4" />
                  <span>Eliminar paciente</span>
                </Button>
              </div>
            </div>
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setSelectedClient(null)}>
                Cerrar
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}