import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Lock, Check, AlertCircle } from 'lucide-react';

interface OAuthDialogProps {
  open: boolean;
  onClose: () => void;
  provider: 'google_fit' | 'apple_health';
  onSuccess: () => void;
}

export default function OAuthDialog({ open, onClose, provider, onSuccess }: OAuthDialogProps) {
  const { toast } = useToast();
  const [step, setStep] = useState<'authorize' | 'connecting' | 'success' | 'error'>('authorize');
  
  const providerName = provider === 'google_fit' ? 'Google Fit' : 'Apple Health';
  const providerColor = provider === 'google_fit' ? 'bg-blue-500' : 'bg-black';
  const providerTextColor = provider === 'google_fit' ? 'text-white' : 'text-white';
  
  const handleAuthorize = async () => {
    setStep('connecting');
    
    try {
      // Simulamos una conexión OAuth
      // En una implementación real, abriríamos una ventana emergente
      // para la autenticación de Google o Apple
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Enviamos los datos de la integración al servidor
      const response = await apiRequest("POST", "/api/health-app-integration", {
        provider,
        accessToken: "oauth_demo_token_" + Math.random().toString(36).substring(2, 15),
        refreshToken: "refresh_token_" + Math.random().toString(36).substring(2, 15),
        tokenExpiry: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7).toISOString(), // 7 días
        settings: {}
      });
      
      if (response.ok) {
        setStep('success');
        toast({
          title: "Conexión exitosa",
          description: `Se ha conectado correctamente con ${providerName}.`,
        });
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1500);
      } else {
        const errorData = await response.json();
        console.error("Error al conectar:", errorData);
        throw new Error(errorData.message || "Error al conectar con el servicio");
      }
    } catch (error) {
      console.error("Error de OAuth:", error);
      setStep('error');
      toast({
        title: "Error de conexión",
        description: error instanceof Error ? error.message : "No se pudo conectar con el servicio",
        variant: "destructive"
      });
    }
  };
  
  return (
    <Dialog open={open} onOpenChange={() => {
      if (step !== 'connecting') {
        onClose();
      }
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Conectar con {providerName}</DialogTitle>
          <DialogDescription>
            Conecta tu cuenta para sincronizar automáticamente tus datos de actividad física.
          </DialogDescription>
        </DialogHeader>
        
        {step === 'authorize' && (
          <div className="space-y-4 py-4">
            <div className="flex flex-col items-center justify-center gap-4 py-6">
              <div className="rounded-full p-3 bg-muted">
                <Lock className="h-10 w-10 text-primary" />
              </div>
              <div className="text-center">
                <h3 className="font-medium text-lg mb-1">Autorizar acceso</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  MisComidas necesita tu permiso para acceder a tus datos de actividad física en {providerName}.
                </p>
                <p className="text-xs text-muted-foreground mb-4">
                  Solo accederemos a información relacionada con tus pasos diarios y actividad física.
                  No tendremos acceso a otra información personal.
                </p>
              </div>
            </div>
          </div>
        )}
        
        {step === 'connecting' && (
          <div className="flex flex-col items-center justify-center py-10 gap-4">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary"></div>
            <p className="text-center font-medium">Conectando con {providerName}...</p>
            <p className="text-sm text-muted-foreground text-center">
              Esto puede tardar unos segundos. No cierres esta ventana.
            </p>
          </div>
        )}
        
        {step === 'success' && (
          <div className="flex flex-col items-center justify-center py-10 gap-4">
            <div className="rounded-full p-3 bg-green-100">
              <Check className="h-10 w-10 text-green-600" />
            </div>
            <p className="text-center font-medium">¡Conexión exitosa!</p>
            <p className="text-sm text-muted-foreground text-center">
              Ahora puedes sincronizar tus datos de actividad física desde {providerName}.
            </p>
          </div>
        )}
        
        {step === 'error' && (
          <div className="flex flex-col items-center justify-center py-10 gap-4">
            <div className="rounded-full p-3 bg-red-100">
              <AlertCircle className="h-10 w-10 text-red-600" />
            </div>
            <p className="text-center font-medium">Error de conexión</p>
            <p className="text-sm text-muted-foreground text-center">
              No se pudo establecer la conexión con {providerName}. Por favor, inténtalo de nuevo.
            </p>
          </div>
        )}
        
        <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-between">
          {step === 'authorize' && (
            <>
              <Button variant="outline" onClick={onClose} type="button">
                Cancelar
              </Button>
              <Button 
                type="button" 
                className={`${providerColor} ${providerTextColor}`}
                onClick={handleAuthorize}
              >
                Conectar con {providerName}
              </Button>
            </>
          )}
          
          {step === 'connecting' && (
            <Button variant="outline" disabled type="button">
              Conectando...
            </Button>
          )}
          
          {step === 'error' && (
            <>
              <Button variant="outline" onClick={onClose} type="button">
                Cerrar
              </Button>
              <Button onClick={() => setStep('authorize')} type="button">
                Reintentar
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}