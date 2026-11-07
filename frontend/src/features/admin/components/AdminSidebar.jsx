import { NavLink, Link } from "react-router-dom";
import {
  LayoutDashboard,
  Users,
  Building2,
  CheckSquare,
  BriefcaseBusiness,
  ShieldCheck,
  FileText,
  Activity,
  FileSearch,
  Flag,
  BarChart3,
  UserCog,
  KeyRound,
  Settings,
  LogOut,
  ArrowLeftRight,
} from "lucide-react";

const NAV_SECTIONS = [
  {
    title: "Overview",
    items: [
      { to: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { to: "/admin/analytics", label: "Reports & Analytics", icon: BarChart3, perm: "analytics.read" },
      { to: "/admin/activities", label: "Platform Activities", icon: Activity, perm: "activities.read" },
    ],
  },
  {
    title: "Directory & Moderation",
    items: [
      { to: "/admin/users", label: "Users", icon: Users, perm: "users.read" },
      { to: "/admin/companies", label: "Companies", icon: Building2, perm: "companies.read", end: true },
      { to: "/admin/companies/approvals", label: "Company Approvals", icon: CheckSquare, perm: "companies.read" },
      { to: "/admin/jobs", label: "Jobs", icon: BriefcaseBusiness, perm: "jobs.read", end: true },
      { to: "/admin/jobs/approvals", label: "Job Approvals", icon: ShieldCheck, perm: "jobs.read" },
      { to: "/admin/applications", label: "Applications", icon: FileText, perm: "applications.read" },
      { to: "/admin/reports", label: "Flagged Content", icon: Flag, perm: "reports.read" },
    ],
  },
  {
    title: "Governance & Security",
    items: [
      { to: "/admin/audit-logs", label: "Audit Logs", icon: FileSearch, perm: "audit_logs.read" },
      { to: "/admin/administrators", label: "Administrators", icon: UserCog, perm: "admins.read" },
      { to: "/admin/permissions", label: "Roles & Permissions", icon: KeyRound, perm: "admins.read" },
      { to: "/admin/settings", label: "Platform Settings", icon: Settings },
    ],
  },
];

export function AdminSidebar({ user, onNavigate, onLogout }) {
  const isSuperAdmin = user?.adminRole === "SUPER_ADMIN";
  const perms = Array.isArray(user?.permissions) ? user.permissions : null;

  const canAccess = (perm) => {
    if (!perm || isSuperAdmin || !perms) return true;
    return perms.includes(perm);
  };

  return (
    <aside className="flex h-full flex-col border-r border-slate-200 bg-slate-950 text-slate-200">
      <div className="flex h-16 items-center justify-between border-b border-slate-800 px-5">
        <div className="flex items-center gap-2.5 text-base font-bold text-white">
          <div className="grid h-8 w-8 place-items-center rounded-lg bg-brand text-white">
            <ShieldCheck size={18} />
          </div>
          <span>Recruitro Admin</span>
        </div>
        <span className="rounded-md bg-slate-800 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-300">
          {user?.adminRole?.replace("_", " ") || "ADMIN"}
        </span>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto px-3.5 py-5">
        {NAV_SECTIONS.map((section) => {
          const visibleItems = section.items.filter((item) => canAccess(item.perm));
          if (visibleItems.length === 0) return null;
          return (
            <div key={section.title}>
              <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                {section.title}
              </p>
              <nav className="space-y-1">
                {visibleItems.map(({ to, label, icon: Icon, end }) => (
                  <NavLink
                    key={to}
                    to={to}
                    end={end}
                    onClick={onNavigate}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                        isActive
                          ? "bg-brand text-white shadow-xs"
                          : "text-slate-400 hover:bg-slate-900 hover:text-white"
                      }`
                    }
                  >
                    <Icon size={16} />
                    <span>{label}</span>
                  </NavLink>
                ))}
              </nav>
            </div>
          );
        })}
      </div>

      <div className="border-t border-slate-800 p-4 space-y-2">
        <Link
          to="/app/dashboard"
          className="flex w-full items-center gap-2.5 rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white"
        >
          <ArrowLeftRight size={15} /> Switch to User Workspace
        </Link>
        <button
          type="button"
          onClick={onLogout}
          className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-rose-400 hover:bg-slate-900 hover:text-rose-300"
        >
          <LogOut size={15} /> Sign out
        </button>
      </div>
    </aside>
  );
}
