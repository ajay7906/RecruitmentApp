import { NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  BriefcaseBusiness,
  LayoutDashboard,
  UserRound,
  Building2,
  ShieldCheck,
  Search,
  FileText,
  FileUp,
  CalendarClock,
  Award,
  Bell,
  BarChart3,
  FileSpreadsheet,
  LogOut,
  Menu,
} from "lucide-react";
import { useState } from "react";
import { useAuthStore } from "../../stores/authStore";
import { authApi } from "../../features/auth/api/authApi";
import { NotificationBell } from "../../features/notifications/components/NotificationBell";

function getNavItems(role) {
  const items = [
    { to: "/app/dashboard", label: "Overview", icon: LayoutDashboard },
    { to: "/app/profile", label: "My profile", icon: UserRound },
  ];

  if (!role || role === "candidate") {
    items.push(
      {
        to: "/app/resumes",
        label: "My resumes",
        icon: FileUp,
      },
      {
        to: "/app/interviews",
        label: "My interviews",
        icon: CalendarClock,
      }
    );
  }

  if (role === "recruiter" || role === "admin") {
    items.push(
      {
        to: "/app/companies",
        label: "My companies",
        icon: Building2,
      },
      {
        to: "/app/jobs/manage",
        label: "Job management",
        icon: BriefcaseBusiness,
      },
      {
        to: "/app/recruiter/interviews",
        label: "Interviews",
        icon: CalendarClock,
      },
      {
        to: "/app/recruiter/hiring",
        label: "Hiring decisions",
        icon: Award,
      }
    );
  }

  if (role === "admin") {
    items.push(
      {
        to: "/admin/dashboard",
        label: "Admin Console",
        icon: ShieldCheck,
      },
      {
        to: "/admin/companies/approvals",
        label: "Company approvals",
        icon: ShieldCheck,
      },
      {
        to: "/admin/jobs/approvals",
        label: "Job moderation",
        icon: ShieldCheck,
      }
    );
  }

  items.push(
    { to: "/app/jobs", label: "Find jobs", icon: Search, end: true },
    { to: "/app/applications", label: "Applications", icon: FileText },
    { to: "/app/notifications", label: "Notifications", icon: Bell },
    { to: "/app/analytics", label: "Analytics", icon: BarChart3 }
  );

  if (role === "recruiter" || role === "admin") {
    items.push({
      to: "/app/reports",
      label: "Reports & Export",
      icon: FileSpreadsheet,
    });
  }

  return items;
}

export function DashboardLayout() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const user = useAuthStore((state) => state.user);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  const navigate = useNavigate();

  const displayName = user?.fullName || user?.name || "Welcome back";
  const navItems = getNavItems(user?.role);

  async function handleLogout() {
    try {
      await authApi.logout();
    } catch {
      // Clear the client session even if the logout endpoint is unavailable.
    } finally {
      clearAuth();
      navigate("/login", { replace: true });
    }
  }

 const sidebar = (
  <aside className="flex h-full flex-col overflow-hidden border-r border-slate-200 bg-white">
    {/* Logo - Fixed at top */}
    <div className="flex h-16 shrink-0 items-center gap-2 border-b border-slate-100 px-5 text-lg font-bold text-ink">
      <BriefcaseBusiness className="text-brand" size={21} />
      Recruitro
    </div>

    {/* Navigation - Scrollable */}
    <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5">
      <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
        Workspace
      </p>

      <nav className="space-y-1">
        {navItems.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={() => setMobileOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                isActive
                  ? "bg-blue-50 text-brand"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>
    </div>

    {/* User & Logout - Fixed at bottom */}
    <div className="shrink-0 border-t border-slate-100 bg-white p-4">
      <div className="mb-3 truncate px-2 text-sm text-slate-500">
        {user?.email || "Signed-in user"}
      </div>

      <button
        onClick={handleLogout}
        className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
      >
        <LogOut size={18} />
        Log out
      </button>
    </div>
  </aside>
);

  return (
    <div className="min-h-screen bg-canvas">
      <div className="hidden lg:fixed lg:inset-y-0 lg:block lg:w-64">
        {sidebar}
      </div>
      {mobileOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            aria-label="Close navigation"
            className="absolute inset-0 bg-slate-900/40"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative z-10 h-full w-72">{sidebar}</div>
        </div>
      )}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-5 backdrop-blur lg:px-8">
          <button
            aria-label="Open navigation"
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden"
            onClick={() => setMobileOpen(true)}
          >
            <Menu size={20} />
          </button>
          <div className="ml-auto flex items-center gap-3">
            <NotificationBell />
            <div className="text-right">
              <p className="text-sm font-semibold text-slate-800">
                {displayName}
              </p>
              <p className="text-xs capitalize text-slate-500">
                {user?.role || "Candidate"}
              </p>
            </div>
            <div className="grid h-9 w-9 place-items-center rounded-full bg-blue-100 text-sm font-bold text-brand">
              {(user?.fullName || user?.name || "U").slice(0, 1).toUpperCase()}
            </div>
          </div>
        </header>
        <main className="mx-auto max-w-7xl p-5 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
