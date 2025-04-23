import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Eye, EyeOff } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";

// Schema para la activación de invitación
const activateInvitationSchema = z.object({
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
  confirmPassword: z.string().min(6, "La contraseña debe tener al menos 6 caracteres"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"]
});

type ActivateInvitationValues = z.infer<typeof activateInvitationSchema>;

export default function ActivateInvitationPage() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [match, params] = useRoute("/invite/:token");
  const token = params?.token || "";
  const [userDetails, setUserDetails] = useState<null | { name: string, email: string }>(null);
  const [expired, setExpired] = useState(false);
  
  // Estados para controlar la visibilidad de las contraseñas
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Verificar si el token es válido
  const { isLoading, error } = useQuery({
    queryKey: ["/api/invitations/verify", token],
    queryFn: async () => {
      if (!token) throw new Error("Token no proporcionado");
      const res = await apiRequest("GET", `/api/invitations/verify/${token}`);
      const data = await res.json();
      if (data.user) {
        setUserDetails({
          name: data.user.name,
          email: data.user.email
        });
      }
      return data;
    },
    enabled: !!token && !user,
    retry: false
  });

  // Manejar errores de la verificación
  useEffect(() => {
    if (error instanceof Error) {
      if (error.message.includes("expirada")) {
        setExpired(true);
      }
      toast({
        title: "Error al verificar invitación",
        description: error.message,
        variant: "destructive",
      });
    }
  }, [error, toast]);

  // Redireccionar si ya hay sesión iniciada
  useEffect(() => {
    if (user) {
      setLocation("/meals/weekly");
    }
  }, [user, setLocation]);

  // Setup form
  const form = useForm<ActivateInvitationValues>({
    resolver: zodResolver(activateInvitationSchema),
    defaultValues: {
      password: "",
      confirmPassword: "",
    }
  });

  // Activar cuenta con el token
  const activateMutation = useMutation({
    mutationFn: async (data: { password: string }) => {
      const res = await apiRequest("POST", `/api/invitations/activate/${token}`, data);
      return await res.json();
    },
    onSuccess: () => {
      toast({
        title: "Cuenta activada con éxito",
        description: "Ya puedes iniciar sesión con tu email y contraseña",
      });
      setLocation("/auth");
    },
    onError: (error: any) => {
      toast({
        title: "Error al activar cuenta",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  function onSubmit(data: ActivateInvitationValues) {
    const { confirmPassword, ...rest } = data;
    activateMutation.mutate(rest);
  }

  if (!match) {
    return (
      <div className="flex justify-center items-center min-h-[80vh]">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Enlace inválido</CardTitle>
            <CardDescription>
              El enlace de invitación que intentas usar no es válido.
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button onClick={() => setLocation("/auth")} className="w-full">
              Ir a la página de inicio de sesión
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[80vh]">
        <div className="flex flex-col items-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Verificando invitación...</p>
        </div>
      </div>
    );
  }

  if (error || expired || !userDetails) {
    return (
      <div className="flex justify-center items-center min-h-[80vh]">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>{expired ? "Invitación expirada" : "Invitación inválida"}</CardTitle>
            <CardDescription>
              {expired 
                ? "Esta invitación ha expirado. Solicita una nueva invitación a tu nutricionista."
                : "La invitación que intentas usar no es válida o ha sido cancelada."}
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button onClick={() => setLocation("/auth")} className="w-full">
              Ir a la página de inicio de sesión
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex justify-center items-center min-h-[80vh]">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Activa tu cuenta</CardTitle>
          <CardDescription>
            Hola {userDetails.name}, completa tu registro para empezar a usar NutriTrack.
            <p className="mt-2">Email: <span className="font-medium">{userDetails.email}</span></p>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contraseña</FormLabel>
                    <div className="relative">
                      <FormControl>
                        <Input 
                          type={showPassword ? "text" : "password"} 
                          placeholder="Crea una contraseña" 
                          {...field} 
                        />
                      </FormControl>
                      <button 
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        onClick={() => setShowPassword(!showPassword)}
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirmar contraseña</FormLabel>
                    <div className="relative">
                      <FormControl>
                        <Input 
                          type={showConfirmPassword ? "text" : "password"} 
                          placeholder="Repite la contraseña" 
                          {...field} 
                        />
                      </FormControl>
                      <button 
                        type="button"
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button 
                type="submit" 
                className="w-full" 
                disabled={activateMutation.isPending}
              >
                {activateMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Activando cuenta...
                  </>
                ) : 'Activar cuenta'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}