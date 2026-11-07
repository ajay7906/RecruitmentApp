import { useState, useEffect } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../stores/authStore";
import { authApi } from "../../features/auth/api/authApi";
import { adminApi } from "../../features/admin/api/adminApi";
import { AdminSidebar } from "../../features/admin/components/AdminSidebar";
import { AdminHeader } from "../../features/admin/components/AdminHeader";

export function AdminLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const user = useAuthStore((state) => state.user);
  const accessToken = useAuthStore((state) => state.accessToken);
  const setAuth = useAuthStore((state) => state.setAuth);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const navigate = useNavigate();

  // Sync adminRole and effective permissions if not yet loaded in authStore
  useEffect(() => {
    let active = true;
    if (user?.role === "admin" && (!user.adminRole || !Array.isArray(user.permissions))) {
      adminApi
        .getCurrentAdmin()
        .then((profile) => {
          if (active && profile) {
            setAuth({ ...user, ...profile }, accessToken);
          }
        })
        .catch(() => {});
    }
    return () => {
      active = false;
    };
  }, [user, accessToken, setAuth]);

  async function handleLogout() {
    try {
      await authApi.logout();
    } catch {
      // Proceed with local session clear
    } finally {
      clearAuth();
      navigate("/login", { replace: true });
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="hidden lg:fixed lg:inset-y-0 lg:block lg:w-64">
        <AdminSidebar
          user={user}
          onNavigate={() => setMobileOpen(false)}
          onLogout={handleLogout}
        />
      </div>

      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            type="button"
            aria-label="Close navigation"
            className="absolute inset-0 bg-slate-900/50"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative z-10 h-full w-72">
            <AdminSidebar
              user={user}
              onNavigate={() => setMobileOpen(false)}
              onLogout={handleLogout}
            />
          </div>
        </div>
      )}

      <div className="lg:pl-64">
        <AdminHeader
          user={user}
          onOpenMobileMenu={() => setMobileOpen(true)}
        />
        <main className="mx-auto max-w-7xl p-5 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
