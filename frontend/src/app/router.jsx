import { createBrowserRouter, Navigate } from "react-router-dom";
import { PublicLayout } from "./layouts/PublicLayout";
import { DashboardLayout } from "./layouts/DashboardLayout";
import { ProtectedRoute } from "./routes/ProtectedRoute";
import { HomePage } from "../features/home/pages/HomePage";
import { LoginPage } from "../features/auth/pages/LoginPage";
import { RegisterPage } from "../features/auth/pages/RegisterPage";
import { DashboardPage } from "../features/dashboard/pages/DashboardPage";
import { ProfilePage } from "../features/candidate-profile/pages/ProfilePage";
import { JobsPage } from "../features/jobs/pages/JobsPage";
import { ApplicationsPage } from "../features/applications/pages/ApplicationsPage";
import { NotFoundPage } from "../features/misc/pages/NotFoundPage";

export const router = createBrowserRouter([
  {
    element: <PublicLayout />,
    children: [
      { path: "/", element: <HomePage /> },
      { path: "/login", element: <LoginPage /> },
      { path: "/register", element: <RegisterPage /> },
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
      { path: "profile", element: <ProfilePage /> },
      { path: "jobs", element: <JobsPage /> },
      { path: "applications", element: <ApplicationsPage /> },
    ],
  },
  { path: "*", element: <NotFoundPage /> },
]);
