import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../../stores/authStore";

export function ProtectedRoute({ children, allowedRoles }) {
  const user = useAuthStore((state) => state.user);
  const location = useLocation();

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  // UI-level role routing only. The backend must enforce permissions on every API.
  if (allowedRoles?.length && !allowedRoles.includes(user.role)) {
    return <Navigate to="/app/dashboard" replace />;
  }

  return children;
}
