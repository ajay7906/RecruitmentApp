import { createBrowserRouter, Navigate } from "react-router-dom";
import { PublicLayout } from "./layouts/PublicLayout";
import { DashboardLayout } from "./layouts/DashboardLayout";
import { ProtectedRoute } from "./routes/ProtectedRoute";
import { HomePage } from "../features/home/pages/HomePage";
import { LoginPage } from "../features/auth/pages/LoginPage";
import { RegisterPage } from "../features/auth/pages/RegisterPage";
import { VerifyEmailPage } from "../features/auth/pages/VerifyEmailPage";
import { DashboardPage } from "../features/dashboard/pages/DashboardPage";
import { ProfilePage } from "../features/candidate-profile/pages/ProfilePage";
import { RecruiterProfilePage } from "../features/recruiter/pages/RecruiterProfilePage";
import { MyCompaniesPage } from "../features/companies/pages/MyCompaniesPage";
import { CompanyRegistrationPage } from "../features/companies/pages/CompanyRegistrationPage";
import { CompanyDashboardPage } from "../features/companies/pages/CompanyDashboardPage";
import { CompanyDetailsPage } from "../features/companies/pages/CompanyDetailsPage";
import { EditCompanyPage } from "../features/companies/pages/EditCompanyPage";
import { CompanyApprovalPage } from "../features/companies/pages/CompanyApprovalPage";
import { AdminCompaniesPage } from "../features/companies/pages/AdminCompaniesPage";
import { JobsPage } from "../features/jobs/pages/JobsPage";
import { ApplicationsPage } from "../features/applications/pages/ApplicationsPage";
import { NotFoundPage } from "../features/misc/pages/NotFoundPage";
import { useAuthStore } from "../stores/authStore";

function RoleBasedProfilePage() {
  const user = useAuthStore((state) => state.user);
  if (user?.role === "recruiter") {
    return <RecruiterProfilePage />;
  }
  return <ProfilePage />;
}

export const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    children: [
      { path: "/", element: <HomePage /> },
      { path: "/login", element: <LoginPage /> },
      { path: "/register", element: <RegisterPage /> },
      { path: "/verify-email", element: <VerifyEmailPage /> },
    ],
  },
  {
    path: "/app",
    element: (
      <ProtectedRoute>
        <DashboardLayout />
      </ProtectedRoute>
    ),
    children: [
      { index: true, element: <Navigate to="dashboard" replace /> },
      { path: "dashboard", element: <DashboardPage /> },
      { path: "profile", element: <RoleBasedProfilePage /> },
      {
        path: "companies",
        element: (
          <ProtectedRoute allowedRoles={["recruiter", "admin"]}>
            <MyCompaniesPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "companies/new",
        element: (
          <ProtectedRoute allowedRoles={["recruiter", "admin"]}>
            <CompanyRegistrationPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "companies/:id",
        element: <CompanyDetailsPage />,
      },
      {
        path: "companies/:id/dashboard",
        element: (
          <ProtectedRoute allowedRoles={["recruiter", "admin"]}>
            <CompanyDashboardPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "companies/:id/edit",
        element: (
          <ProtectedRoute allowedRoles={["recruiter", "admin"]}>
            <EditCompanyPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "companies/:id/approval",
        element: (
          <ProtectedRoute allowedRoles={["recruiter", "admin"]}>
            <CompanyApprovalPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "admin/companies",
        element: (
          <ProtectedRoute allowedRoles={["admin"]}>
            <AdminCompaniesPage />
          </ProtectedRoute>
        ),
      },
      { path: "jobs", element: <JobsPage /> },
      { path: "applications", element: <ApplicationsPage /> },
    ],
  },
  { path: "*", element: <NotFoundPage /> },
]);
