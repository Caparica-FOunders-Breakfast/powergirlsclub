import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AppSidebar, BottomNav, AppHeader, SidebarProvider } from "@/components/Navigation";
import Auth from "@/pages/Auth";
import ResetPassword from "@/pages/ResetPassword";
import Leaderboard from "@/pages/Leaderboard";
import CurrentWeek from "@/pages/CurrentWeek";
import LearnLanguage from "@/pages/LearnLanguage";
import TeamManagement from "@/pages/TeamManagement";
import Profile from "@/pages/Profile";
import MealPlan from "@/pages/MealPlan";
import More from "@/pages/More";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const AdminOnly = ({ children }: { children: JSX.Element }) => {
  const { isAdmin } = useAuth();
  return isAdmin ? children : <Navigate to="/week" replace />;
};

const ProtectedLayout = () => {
  const { user, loading, isAdmin } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) return <Navigate to="/auth" replace />;

  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <AppHeader />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={isAdmin ? <Leaderboard /> : <Navigate to="/week" replace />} />
              <Route path="/week" element={<CurrentWeek />} />
              <Route path="/learn" element={<AdminOnly><LearnLanguage /></AdminOnly>} />
              <Route path="/meals" element={<AdminOnly><MealPlan /></AdminOnly>} />
              <Route path="/teams" element={<AdminOnly><TeamManagement /></AdminOnly>} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/more" element={<AdminOnly><More /></AdminOnly>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </main>
          <BottomNav />
        </div>
      </div>
    </SidebarProvider>
  );
};

const AppRoutes = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/auth" element={user ? <Navigate to="/" replace /> : <Auth />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/*" element={<ProtectedLayout />} />
    </Routes>
  );
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
