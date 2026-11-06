import { useAuthStore } from "../../../stores/authStore";
import { MyApplicationsPage } from "./MyApplicationsPage";
import { RecruiterApplicationsDashboardPage } from "./RecruiterApplicationsDashboardPage";

export function ApplicationsPage() {
  const user = useAuthStore((s) => s.user);
  if (user?.role === "recruiter" || user?.role === "admin") {
    return <RecruiterApplicationsDashboardPage />;
  }
  return <MyApplicationsPage />;
}
