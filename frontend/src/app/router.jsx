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
import { CandidateResumesPage } from "../features/candidate-profile/pages/CandidateResumesPage";
import { RecruiterProfilePage } from "../features/recruiter/pages/RecruiterProfilePage";
import { MyCompaniesPage } from "../features/companies/pages/MyCompaniesPage";
import { CompanyRegistrationPage } from "../features/companies/pages/CompanyRegistrationPage";
import { CompanyDashboardPage } from "../features/companies/pages/CompanyDashboardPage";
import { CompanyDetailsPage } from "../features/companies/pages/CompanyDetailsPage";
import { EditCompanyPage } from "../features/companies/pages/EditCompanyPage";
import { CompanyApprovalPage } from "../features/companies/pages/CompanyApprovalPage";
import { AdminCompaniesPage } from "../features/companies/pages/AdminCompaniesPage";
import { JobsPage } from "../features/jobs/pages/JobsPage";
import { PublicJobDetailsPage } from "../features/jobs/pages/PublicJobDetailsPage";
import { JobDashboardPage } from "../features/jobs/pages/JobDashboardPage";
import { MyJobsPage } from "../features/jobs/pages/MyJobsPage";
import { CreateJobPage } from "../features/jobs/pages/CreateJobPage";
import { EditJobPage } from "../features/jobs/pages/EditJobPage";
import { RecruiterJobDetailsPage } from "../features/jobs/pages/RecruiterJobDetailsPage";
import { JobApprovalStatusPage } from "../features/jobs/pages/JobApprovalStatusPage";
import { AdminJobModerationPage } from "../features/jobs/pages/AdminJobModerationPage";
import { ApplicationsPage } from "../features/applications/pages/ApplicationsPage";
import { MyApplicationsPage } from "../features/applications/pages/MyApplicationsPage";
import { JobApplicationPage } from "../features/applications/pages/JobApplicationPage";
import { CandidateApplicationDetailsPage } from "../features/applications/pages/CandidateApplicationDetailsPage";
import { RecruiterApplicationsDashboardPage } from "../features/applications/pages/RecruiterApplicationsDashboardPage";
import { RecruiterApplicationReviewPage } from "../features/applications/pages/RecruiterApplicationReviewPage";
import { InterviewDashboardPage } from "../features/interviews/pages/InterviewDashboardPage";
import { ScheduleInterviewPage } from "../features/interviews/pages/ScheduleInterviewPage";
import { EditInterviewPage } from "../features/interviews/pages/EditInterviewPage";
import { RecruiterInterviewDetailsPage } from "../features/interviews/pages/RecruiterInterviewDetailsPage";
import { HiringDashboardPage } from "../features/interviews/pages/HiringDashboardPage";
import { MyInterviewsPage } from "../features/interviews/pages/MyInterviewsPage";
import { CandidateInterviewDetailsPage } from "../features/interviews/pages/CandidateInterviewDetailsPage";
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
      { path: "/jobs", element: <JobsPage /> },
      { path: "/jobs/:id", element: <PublicJobDetailsPage /> },
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
        path: "resumes",
        element: (
          <ProtectedRoute allowedRoles={["candidate"]}>
            <CandidateResumesPage />
          </ProtectedRoute>
        ),
      },
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
      {
        path: "admin/jobs",
        element: (
          <ProtectedRoute allowedRoles={["admin"]}>
            <AdminJobModerationPage />
          </ProtectedRoute>
        ),
      },
      { path: "jobs", element: <JobsPage /> },
      {
        path: "jobs/manage",
        element: (
          <ProtectedRoute allowedRoles={["recruiter", "admin"]}>
            <JobDashboardPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "jobs/my",
        element: (
          <ProtectedRoute allowedRoles={["recruiter", "admin"]}>
            <MyJobsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "jobs/new",
        element: (
          <ProtectedRoute allowedRoles={["recruiter", "admin"]}>
            <CreateJobPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "jobs/:id",
        element: <PublicJobDetailsPage />,
      },
      {
        path: "jobs/:id/apply",
        element: (
          <ProtectedRoute allowedRoles={["candidate"]}>
            <JobApplicationPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "jobs/:id/manage",
        element: (
          <ProtectedRoute allowedRoles={["recruiter", "admin"]}>
            <RecruiterJobDetailsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "jobs/:id/edit",
        element: (
          <ProtectedRoute allowedRoles={["recruiter", "admin"]}>
            <EditJobPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "jobs/:id/publishing",
        element: (
          <ProtectedRoute allowedRoles={["recruiter", "admin"]}>
            <JobApprovalStatusPage />
          </ProtectedRoute>
        ),
      },
      { path: "applications", element: <ApplicationsPage /> },
      {
        path: "applications/my",
        element: (
          <ProtectedRoute allowedRoles={["candidate"]}>
            <MyApplicationsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "applications/:id",
        element: (
          <ProtectedRoute allowedRoles={["candidate"]}>
            <CandidateApplicationDetailsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "recruiter/applications",
        element: (
          <ProtectedRoute allowedRoles={["recruiter", "admin"]}>
            <RecruiterApplicationsDashboardPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "recruiter/applications/:id",
        element: (
          <ProtectedRoute allowedRoles={["recruiter", "admin"]}>
            <RecruiterApplicationReviewPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "recruiter/interviews",
        element: (
          <ProtectedRoute allowedRoles={["recruiter", "admin"]}>
            <InterviewDashboardPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "recruiter/interviews/new",
        element: (
          <ProtectedRoute allowedRoles={["recruiter", "admin"]}>
            <ScheduleInterviewPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "recruiter/interviews/:id",
        element: (
          <ProtectedRoute allowedRoles={["recruiter", "admin"]}>
            <RecruiterInterviewDetailsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "recruiter/interviews/:id/edit",
        element: (
          <ProtectedRoute allowedRoles={["recruiter", "admin"]}>
            <EditInterviewPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "recruiter/hiring",
        element: (
          <ProtectedRoute allowedRoles={["recruiter", "admin"]}>
            <HiringDashboardPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "interviews",
        element: (
          <ProtectedRoute allowedRoles={["candidate"]}>
            <MyInterviewsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: "interviews/:id",
        element: (
          <ProtectedRoute allowedRoles={["candidate"]}>
            <CandidateInterviewDetailsPage />
          </ProtectedRoute>
        ),
      },
    ],
  },
  { path: "*", element: <NotFoundPage /> },
]);
