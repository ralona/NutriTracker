import { useAuth } from "@/hooks/use-auth";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowRight, Calendar, Clock, ListChecks, MessageCircle, ChevronRight } from "lucide-react";

export default function HomePage() {
  const { user } = useAuth();

  return (
    <div className="space-y-8">
      {/* Welcome section */}
      <section className="p-6 sm:p-10 rounded-xl bg-gradient-to-r from-primary-100 to-primary-50">
        <div className="max-w-3xl">
          <h1 className="text-3xl font-bold tracking-tight text-primary-900 sm:text-4xl">
            Bienvenido a NutriTrack, {user?.name}
          </h1>
          <p className="mt-4 text-lg text-primary-800">
            Tu plataforma para el seguimiento de alimentación y mejor salud nutricional.
            {user?.role === "nutritionist" ? 
              " Gestiona y monitoriza la alimentación de tus clientes."
              : 
              " Registra tus comidas diarias y recibe consejos de tu nutricionista."}
          </p>
          <div className="mt-8">
            <Button 
              asChild 
              size="lg" 
              className="bg-primary-600 hover:bg-primary-700"
            >
              <Link href={user?.role === "nutritionist" ? "/nutritionist" : "/meals/weekly"}>
                {user?.role === "nutritionist" ? "Ver panel de nutricionista" : "Ver plan semanal"}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features section */}
      <section className="py-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Características principales</h2>
        
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <Calendar className="h-6 w-6 text-primary-600 mb-2" />
              <CardTitle>Plan Semanal</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-sm text-gray-600">
                Visualiza y organiza tus comidas en un calendario semanal para una mejor planificación.
              </CardDescription>
              <Button variant="link" asChild className="mt-2 p-0 text-primary-600 hover:text-primary-700">
                <Link href="/meals/weekly">
                  Ver plan <ChevronRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <Clock className="h-6 w-6 text-primary-600 mb-2" />
              <CardTitle>Registro Diario</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-sm text-gray-600">
                Registra tus comidas diarias, incluyendo descripciones, calorías y horarios.
              </CardDescription>
              <Button variant="link" asChild className="mt-2 p-0 text-primary-600 hover:text-primary-700">
                <Link href="/meals/daily">
                  Registrar comidas <ChevronRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <MessageCircle className="h-6 w-6 text-primary-600 mb-2" />
              <CardTitle>Comentarios</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-sm text-gray-600">
                {user?.role === "nutritionist" 
                  ? "Revisa y comenta las comidas de tus clientes para brindarles consejos personalizados."
                  : "Recibe comentarios y consejos personalizados de tu nutricionista sobre tus comidas."}
              </CardDescription>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="pb-2">
              <ListChecks className="h-6 w-6 text-primary-600 mb-2" />
              <CardTitle>Seguimiento</CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-sm text-gray-600">
                Monitoriza calorías y nutrientes para mantener un registro de tu progreso nutricional.
              </CardDescription>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Quick links section */}
      <section className="py-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Accesos rápidos</h2>
        
        <div className="grid gap-4 md:grid-cols-2">
          {user?.role === "nutritionist" ? (
            <>
              <Link href="/nutritionist">
                <div className="group bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow flex justify-between items-center">
                  <div>
                    <h3 className="font-medium text-gray-900">Panel de nutricionista</h3>
                    <p className="text-sm text-gray-600">Gestiona tus clientes y sus planes alimenticios</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-primary-600" />
                </div>
              </Link>
              <div className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow flex justify-between items-center">
                <div>
                  <h3 className="font-medium text-gray-900">Comentarios pendientes</h3>
                  <p className="text-sm text-gray-600">Revisa las comidas que necesitan tu valoración</p>
                </div>
                <ChevronRight className="h-5 w-5 text-gray-400 hover:text-primary-600" />
              </div>
            </>
          ) : (
            <>
              <Link href="/meals/weekly">
                <div className="group bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow flex justify-between items-center">
                  <div>
                    <h3 className="font-medium text-gray-900">Plan semanal</h3>
                    <p className="text-sm text-gray-600">Visualiza tus comidas en formato semanal</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-primary-600" />
                </div>
              </Link>
              <Link href="/meals/daily">
                <div className="group bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow flex justify-between items-center">
                  <div>
                    <h3 className="font-medium text-gray-900">Comidas de hoy</h3>
                    <p className="text-sm text-gray-600">Registra tu alimentación del día</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-primary-600" />
                </div>
              </Link>
            </>
          )}
        </div>
      </section>
    </div>
  );
}
