import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AdminProvider, useIsAdmin } from "@/contexts/AdminContext";
import { AppSidebar, BottomNav, AppHeader, SidebarProvider } from "@/components/Navigation";
import FeatureGate from "@/components/FeatureGate";
import Auth from "@/pages/Auth";
import ResetPassword from "@/pages/ResetPassword";
import Leaderboard from "@/pages/Leaderboard";
import CurrentWeek from "@/pages/CurrentWeek";
import LearnLanguage from "@/pages/LearnLanguage";
import TeamManagement from "@/pages/TeamManagement";
import Profile from "@/pages/Profile";
import MealPlan from "@/pages/MealPlan";
import More from "@/pages/More";
import Dashboard from "@/pages/Dashboard";
import Users from "@/pages/Users";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const AdminOnly = ({ children }: { children: JSX.Element }) => {
  const isAdmin = useIsAdmin();
  return isAdmin ? children : <Navigate to="/week" replace />;
};

const ProtectedLayout = () => {
  const { user, loading } = useAuth();

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
        <div className="flex-1 flex flex-col min-w-0 lg:bg-[#f4f4f7]">
          <AppHeader />
          <main className="flex-1">
            <Routes>
              <Route path="/" element={<Leaderboard />} />
              <Route path="/week" element={<CurrentWeek />} />
              <Route
                path="/learn"
                element={
                  <AdminOnly>
                    <FeatureGate flag="language_enabled" title="Language coaching">
                      <LearnLanguage />
                    </FeatureGate>
                  </AdminOnly>
                }
              />
              <Route
                path="/meals"
                element={
                  <AdminOnly>
                    <FeatureGate flag="meals_enabled" title="Meals & nutrition">
                      <MealPlan />
                    </FeatureGate>
                  </AdminOnly>
                }
              />
              <Route path="/teams" element={<AdminOnly><TeamManagement /></AdminOnly>} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/more" element={<AdminOnly><More /></AdminOnly>} />
              <Route path="/dashboard" element={<AdminOnly><Dashboard /></AdminOnly>} />
              <Route path="/users" element={<AdminOnly><Users /></AdminOnly>} />
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
      <AdminProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </TooltipProvider>
      </AdminProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
