import { Navigate, useLocation } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import { useAuthStore } from "../../stores/authStore";

export function AdminRoute({ children, requiredPermission }) {
  const user = useAuthStore((state) => state.user);
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (user.role !== "admin") {
    return <Navigate to="/app/dashboard" replace />;
  }

  const isSuperAdmin = user.adminRole === "SUPER_ADMIN";
  const permissions = Array.isArray(user.permissions) ? user.permissions : null;

  if (
    requiredPermission &&
    !isSuperAdmin &&
    permissions &&
    !permissions.includes(requiredPermission)
  ) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-8 text-center">
        <ShieldAlert className="mx-auto h-10 w-10 text-amber-600" />
        <h2 className="mt-3 text-lg font-bold text-slate-900">
          Insufficient Administrative Permission
        </h2>
        <p className="mt-1 text-sm text-slate-600">
          Your role (<span className="font-semibold">{user.adminRole || "ADMIN"}</span>) does not include the{" "}
          <code className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-semibold text-amber-900">
            {requiredPermission}
          </code>{" "}
          permission required to view this section.
        </p>
      </div>
    );
  }

  return children;
}
