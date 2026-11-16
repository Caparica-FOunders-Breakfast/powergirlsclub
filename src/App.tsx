import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useOnboarding } from "@/hooks/useOnboarding";
import { isJustSignedUp } from "@/lib/onboarding";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { AdminProvider, useAdminView } from "@/contexts/AdminContext";
import { AppSidebar, BottomNav, AppHeader, SidebarProvider } from "@/components/Navigation";
import FeatureGate from "@/components/FeatureGate";
import { PageErrorBoundary } from "@/components/AppUpdateScreen";

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
const PlanSetup = lazy(() => import("@/pages/PlanSetup"));
const Welcome = lazy(() => import("@/pages/Welcome"));
const Landing = lazy(() => import("@/pages/Landing"));
const Privacy = lazy(() => import("@/pages/Privacy"));
const Terms = lazy(() => import("@/pages/Terms"));

const queryClient = new QueryClient();

const PageFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
);

// Branded skeleton shown while the Supabase session resolves. Returning
// visitors see the app painting in (dark header + placeholder cards) instead
// of a blank screen with a spinner, so the load feels faster.
const AppLoading = () => (
  <div style={{ minHeight: "100vh", background: "#FBF9FB", display: "flex", flexDirection: "column" }}>
    <div style={{ height: 60, background: "#2B1736", display: "flex", alignItems: "center", padding: "0 16px" }}>
      <span style={{ fontFamily: "Bangers, cursive", fontSize: 26, letterSpacing: 1, color: "#FF8AC4" }}>Power Club</span>
    </div>
    <div style={{ flex: 1, width: "100%", maxWidth: 1120, margin: "0 auto", padding: 20, display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="animate-pulse" style={{ height: 40, width: 200, borderRadius: 10, background: "#EDE4EF" }} />
      <div className="animate-pulse" style={{ height: 150, borderRadius: 20, background: "#EDE4EF" }} />
      <div className="animate-pulse" style={{ height: 120, borderRadius: 20, background: "#EDE4EF" }} />
      <div className="animate-pulse" style={{ height: 120, borderRadius: 20, background: "#EDE4EF" }} />
    </div>
  </div>
);

// App routes that require auth — used to send logged-out visitors to login
// (rather than a 404) when they hit a real app URL directly.
const PROTECTED_PATHS = [
  "/plan-setup",
  "/welcome",
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

/**
 * Members need a plan of their own. Without one they go to plan setup (or get
 * the recommended plan they picked at sign-up); never the old 5-day default.
 * Real admins are exempt so they can always reach the admin pages.
 */
const OnboardingGate = ({ children }: { children: JSX.Element }) => {
  const { isRealAdmin } = useAdminView();
  const { status } = useOnboarding();
  if (isRealAdmin) return children;
  if (status === "loading" || status === "setting-up") return <PageFallback />;
  if (status === "needs-plan") return <Navigate to="/plan-setup" replace />;
  return children;
};

const ProtectedLayout = () => {
  const { user, loading } = useAuth();

  if (loading) return <AppLoading />;

  if (!user) return <Navigate to="/auth" replace />;

  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0 lg:bg-[#FBF9FB]">
          <AppHeader />
          <main className="flex-1 pb-[calc(76px+env(safe-area-inset-bottom))] lg:pb-0">
            <PageErrorBoundary>
            <OnboardingGate>
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
            </OnboardingGate>
            </PageErrorBoundary>
          </main>
          <BottomNav />
        </div>
      </div>
    </SidebarProvider>
  );
};

const AppRoutes = () => {
  const { user, loading } = useAuth();

  // Don't block the whole app behind the Supabase session check. Public pages
  // (/auth, /privacy, /terms, /reset-password) render immediately, so the login
  // screen and marketing/legal pages paint without waiting on the auth
  // round-trip. Only the auth-dependent routes below show a fallback while the
  // session resolves, since "/" and the protected paths need to know `user`.
  return (
    <Suspense fallback={<PageFallback />}>
    <Routes>
      {/* Right after sign-up, go to the welcome screen instead of "/". */}
      <Route path="/auth" element={user ? <Navigate to={isJustSignedUp() ? "/welcome" : "/"} replace /> : <Auth />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      {/* Public static pages — reachable whether or not you're logged in. */}
      <Route path="/privacy" element={<Privacy />} />
      <Route path="/terms" element={<Terms />} />
      {loading ? (
        /* Only the auth-dependent routes wait for the session to resolve. */
        <Route path="*" element={<AppLoading />} />
      ) : user ? (
        <>
          {/* Full-page plan setup — standalone (its own header, no sidebar). */}
          <Route path="/plan-setup" element={<PlanSetup />} />
          {/* Sign-up step 5: welcome + first workout. */}
          <Route path="/welcome" element={<Welcome />} />
          {/* Logged in: everything else (including "/") runs inside the app shell. */}
          <Route path="/*" element={<ProtectedLayout />} />
        </>
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
            {/* Catches failed lazy chunks after a deploy (and any render crash)
                so the member sees the update screen, never a blank page. */}
            <PageErrorBoundary>
              <AppRoutes />
            </PageErrorBoundary>
          </BrowserRouter>
        </TooltipProvider>
      </AdminProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
