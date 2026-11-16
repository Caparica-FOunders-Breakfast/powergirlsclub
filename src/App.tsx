import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AdminProvider, useAdminView } from "@/contexts/AdminContext";
import { AppSidebar, BottomNav, AppHeader, SidebarProvider } from "@/components/Navigation";
import FeatureGate from "@/components/FeatureGate";

// Pages are code-split so a first load only ships the page it needs. The heavy
// bits (charts, the member area, admin, language/meals) no longer block the
// landing/login paint.
const Auth = lazy(() => import("@/pages/Auth"));
const ResetPassword = lazy(() => import("@/pages/ResetPassword"));
const Leaderboard = lazy(() => import("@/pages/Leaderboard"));
const CurrentWeek = lazy(() => import("@/pages/CurrentWeek"));
const LearnLanguage = lazy(() => import("@/pages/LearnLanguage"));
const TeamManagement = lazy(() => import("@/pages/TeamManagement"));
const Profile = lazy(() => import("@/pages/Profile"));
const MealPlan = lazy(() => import("@/pages/MealPlan"));
const More = lazy(() => import("@/pages/More"));
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Users = lazy(() => import("@/pages/Users"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const Landing = lazy(() => import("@/pages/Landing"));
const Privacy = lazy(() => import("@/pages/Privacy"));
const Terms = lazy(() => import("@/pages/Terms"));

const queryClient = new QueryClient();

const PageFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

// App routes that require auth — used to send logged-out visitors to login
// (rather than a 404) when they hit a real app URL directly.
const PROTECTED_PATHS = [
  "/week",
  "/learn",
  "/meals",
  "/teams",
  "/profile",
  "/more",
  "/dashboard",
  "/users",
];

// Gate admin-only pages on the *real* admin role, not the view toggle, so a
// real admin can always open /dashboard, /learn, /meals, etc. directly by URL
// — even while previewing the app in "user" view. Non-admins are still bounced.
const AdminOnly = ({ children }: { children: JSX.Element }) => {
  const { isRealAdmin } = useAdminView();
  return isRealAdmin ? children : <Navigate to="/week" replace />;
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
        <div className="flex-1 flex flex-col min-w-0 lg:bg-[#FBF9FB]">
          <AppHeader />
          <main className="flex-1 pb-[76px] lg:pb-0">
            <Suspense fallback={<PageFallback />}>
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
              {/* Teams & Challenges are open to all members, not admin-only. */}
              <Route path="/teams" element={<TeamManagement />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/more" element={<AdminOnly><More /></AdminOnly>} />
              <Route path="/dashboard" element={<AdminOnly><Dashboard /></AdminOnly>} />
              <Route path="/users" element={<AdminOnly><Users /></AdminOnly>} />
              <Route path="*" element={<NotFound />} />
            </Routes>
            </Suspense>
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
    <Suspense fallback={<PageFallback />}>
    <Routes>
      <Route path="/auth" element={user ? <Navigate to="/" replace /> : <Auth />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      {/* Public static pages — reachable whether or not you're logged in. */}
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />
      {user ? (
        /* Logged in: everything (including "/") runs inside the app shell. */
        <Route path="/*" element={<ProtectedLayout />} />
      ) : (
        <>
          {/* Logged out: public landing page at "/". */}
          <Route path="/" element={<Landing />} />
          {/* Known app routes send you to login first; after signing in you
              land in the app. Truly unknown URLs fall through to a real 404. */}
          {PROTECTED_PATHS.map((p) => (
            <Route key={p} path={p} element={<Navigate to="/auth?mode=login" replace />} />
          ))}
          <Route path="*" element={<NotFound />} />
        </>
      )}
    </Routes>
    </Suspense>
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
