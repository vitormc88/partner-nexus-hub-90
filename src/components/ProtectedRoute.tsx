import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useMyPermissions } from "@/hooks/useUsers";

const routeModules: Array<{ prefix: string; moduleKey: string }> = [
  { prefix: "/clients", moduleKey: "clients" },
  { prefix: "/renewals", moduleKey: "renewals" },
  { prefix: "/pipeline", moduleKey: "pipeline" },
  { prefix: "/deals", moduleKey: "pipeline" },
  { prefix: "/deal-registrations", moduleKey: "deal_registrations" },
  { prefix: "/commissions", moduleKey: "commissions" },
  { prefix: "/onboarding", moduleKey: "onboarding" },
  { prefix: "/certifications", moduleKey: "certifications" },
  { prefix: "/knowledge", moduleKey: "knowledge_base" },
  { prefix: "/training", moduleKey: "training" },
  { prefix: "/announcements", moduleKey: "announcements" },
  { prefix: "/community", moduleKey: "community" },
  { prefix: "/settings", moduleKey: "settings" },
  { prefix: "/analytics", moduleKey: "dashboard" },
  { prefix: "/partners", moduleKey: "dashboard" },
  { prefix: "/notifications", moduleKey: "dashboard" },
  { prefix: "/users", moduleKey: "_admin_only" },
];

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { session, isLoading, isAdmin } = useAuth();
  const location = useLocation();
  const { data: myPerms, isLoading: permsLoading, isError: permsError } = useMyPermissions();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) return <Navigate to="/auth" replace />;

  // HQ Admin bypasses all module checks
  if (isAdmin) return <>{children}</>;

  // Find which module this route belongs to
  // Use exact match first, then prefix match — but skip "/" prefix to avoid false positives
  const matchedRoute = routeModules.find((route) => {
    if (route.prefix === "/") return location.pathname === "/";
    return location.pathname === route.prefix || location.pathname.startsWith(`${route.prefix}/`);
  });

  // Admin-only routes (like /users) are blocked for non-admins
  if (matchedRoute?.moduleKey === "_admin_only") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-6">
        <div className="rounded-xl border bg-card p-6 text-center max-w-md">
          <h2 className="text-lg font-semibold text-foreground">Access restricted</h2>
          <p className="mt-2 text-sm text-muted-foreground">This section is restricted to administrators.</p>
        </div>
      </div>
    );
  }

  // Dashboard (root "/") — allow if user has ANY permission at all
  if (!matchedRoute || location.pathname === "/") {
    if (permsLoading) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      );
    }
    // Allow dashboard if user has any module permission
    const hasDashboard = myPerms?.some((p) => p.module_key === "dashboard" && p.access_level !== "no_access");
    const hasAnyPerm = myPerms && myPerms.length > 0;
    if (hasDashboard || hasAnyPerm) return <>{children}</>;
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-6">
        <div className="rounded-xl border bg-card p-6 text-center max-w-md">
          <h2 className="text-lg font-semibold text-foreground">Access restricted</h2>
          <p className="mt-2 text-sm text-muted-foreground">You do not have permission to access this module.</p>
        </div>
      </div>
    );
  }

  // Wait for permissions to load
  if (permsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // If permissions failed to load, show error instead of blocking
  if (permsError || !myPerms) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-6">
        <div className="rounded-xl border bg-card p-6 text-center max-w-md">
          <h2 className="text-lg font-semibold text-foreground">Unable to load permissions</h2>
          <p className="mt-2 text-sm text-muted-foreground">Please refresh the page or contact your administrator.</p>
        </div>
      </div>
    );
  }

  // Check access for the specific module ONLY — independent of all other modules
  const hasAccess = myPerms.some(
    (permission) => permission.module_key === matchedRoute.moduleKey && permission.access_level !== "no_access"
  );

  if (!hasAccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-6">
        <div className="rounded-xl border bg-card p-6 text-center max-w-md">
          <h2 className="text-lg font-semibold text-foreground">Access restricted</h2>
          <p className="mt-2 text-sm text-muted-foreground">You do not have permission to access this module.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
