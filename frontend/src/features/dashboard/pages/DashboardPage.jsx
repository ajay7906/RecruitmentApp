import {
  BriefcaseBusiness,
  FileCheck2,
  UserRound,
  Building2,
  ShieldCheck,
  ArrowUpRight,
  FileText,
  Sparkles,
  GraduationCap,
  FolderGit2,
  Clock,
  Upload,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "../../../stores/authStore";
import { profileApi } from "../../candidate-profile/api/profileApi";
import { ProfileCompletion } from "../../candidate-profile/components/ProfileCompletion";

function getDashboardCards(role) {
  if (role === "recruiter") {
    return [
      {
        label: "Company Management",
        value: "Manage your companies",
        icon: Building2,
        to: "/app/companies",
        note: "Register companies, manage team members, and track approval status.",
      },
      {
        label: "Job Management",
        value: "Create & publish jobs",
        icon: BriefcaseBusiness,
        to: "/app/jobs/manage",
        note: "Create, publish, pause, and monitor job postings across your companies.",
      },
      {
        label: "Candidate Applications",
        value: "Review applicants",
        icon: FileCheck2,
        to: "/app/recruiter/applications",
        note: "Screen resumes, update candidate stages, and record hiring notes.",
      },
    ];
  }

  if (role === "admin") {
    return [
      {
        label: "Company Approvals",
        value: "Review submissions",
        icon: ShieldCheck,
        to: "/app/admin/companies",
        note: "Approve, reject, or suspend company registrations.",
      },
      {
        label: "Job Management",
        value: "Platform job listings",
        icon: BriefcaseBusiness,
        to: "/app/jobs/manage",
        note: "Monitor and manage job openings across organizations.",
      },
      {
        label: "All Applications",
        value: "Platform applications",
        icon: FileCheck2,
        to: "/app/recruiter/applications",
        note: "Monitor candidate applications and status pipelines.",
      },
    ];
  }

  return [
    {
      label: "Profile & Career Data",
      value: "Structured Profile",
      icon: UserRound,
      to: "/app/profile",
      note: "Manage your skills, work experience, education, and projects.",
    },
    {
      label: "Resume Manager",
      value: "Upload & Version CVs",
      icon: FileText,
      to: "/app/resumes",
      note: "Upload PDF/DOC/DOCX resumes, set your primary CV, and preview extracted text.",
    },
    {
      label: "Explore & Apply",
      value: "Find your next step",
      icon: BriefcaseBusiness,
      to: "/app/jobs",
      note: "Browse published opportunities and apply with 1-click resume selection.",
    },
  ];
}

export function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  const isCandidate = !user?.role || user?.role === "candidate";
  const fullName = user?.fullName || user?.name;
  const cards = getDashboardCards(user?.role);

  const candidateProfileQuery = useQuery({
    queryKey: ["candidate", "profile"],
    queryFn: profileApi.getMyProfile,
    enabled: isCandidate,
    retry: false,
  });

  const profile =
    candidateProfileQuery.data?.data?.profile ??
    candidateProfileQuery.data?.profile ??
    null;

  const resumes = profile?.resumes || [];
  const primaryResume =
    profile?.primaryResume || resumes.find((r) => r.isPrimary) || resumes[0] || null;
  const skillsCount = profile?.skills?.length || 0;
  const educationCount = profile?.educations?.length || 0;
  const experienceCount = profile?.experiences?.length || 0;
  const projectsCount = profile?.projects?.length || 0;

  return (
    <div className="space-y-7">
      <div>
        <p className="text-sm font-medium text-brand">YOUR WORKSPACE</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
          Welcome{fullName ? `, ${fullName.split(" ")[0]}` : " back"}
        </h1>
        <p className="mt-2 text-slate-500">
          Here are the next steps in your recruitment journey.
        </p>
      </div>

      {/* Candidate Live Career & Resume Dashboard */}
      {isCandidate && profile ? (
        <div className="space-y-5">
          <ProfileCompletion
            completion={profile.completion}
            onSelectSection={() => navigate("/app/profile")}
          />

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <Link
              to="/app/resumes"
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs hover:border-indigo-300"
            >
              <div className="flex items-center justify-between text-slate-400">
                <FileText className="h-4 w-4 text-indigo-600" />
                <span className="text-[11px] font-semibold text-indigo-600">
                  {primaryResume ? `v${primaryResume.version || 1}` : "None"}
                </span>
              </div>
              <p className="mt-2 text-2xl font-bold text-slate-900">{resumes.length}</p>
              <p className="text-xs font-medium text-slate-500">Resumes Stored</p>
            </Link>

            <Link
              to="/app/profile"
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs hover:border-indigo-300"
            >
              <Sparkles className="h-4 w-4 text-amber-500" />
              <p className="mt-2 text-2xl font-bold text-slate-900">{skillsCount}</p>
              <p className="text-xs font-medium text-slate-500">Verified Skills</p>
            </Link>

            <Link
              to="/app/profile"
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs hover:border-indigo-300"
            >
              <BriefcaseBusiness className="h-4 w-4 text-emerald-600" />
              <p className="mt-2 text-2xl font-bold text-slate-900">{experienceCount}</p>
              <p className="text-xs font-medium text-slate-500">Work Roles</p>
            </Link>

            <Link
              to="/app/profile"
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs hover:border-indigo-300"
            >
              <GraduationCap className="h-4 w-4 text-blue-600" />
              <p className="mt-2 text-2xl font-bold text-slate-900">{educationCount}</p>
              <p className="text-xs font-medium text-slate-500">Education Entries</p>
            </Link>

            <Link
              to="/app/profile"
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs hover:border-indigo-300"
            >
              <FolderGit2 className="h-4 w-4 text-purple-600" />
              <p className="mt-2 text-2xl font-bold text-slate-900">{projectsCount}</p>
              <p className="text-xs font-medium text-slate-500">Projects</p>
            </Link>

            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
              <Clock className="h-4 w-4 text-slate-500" />
              <p className="mt-2 text-sm font-bold text-slate-900 truncate">
                {primaryResume
                  ? primaryResume.label || primaryResume.originalFileName
                  : "No Primary CV"}
              </p>
              <p className="text-[11px] text-slate-500">
                {profile.updatedAt
                  ? `Updated ${new Date(profile.updatedAt).toLocaleDateString()}`
                  : "Primary Resume"}
              </p>
            </div>
          </div>

          {/* Quick Actions Bar */}
          <div className="flex flex-wrap items-center gap-2.5 rounded-2xl border border-slate-200 bg-white p-4">
            <span className="mr-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              Quick Actions:
            </span>
            <Link
              to="/app/resumes"
              className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-50 px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
            >
              <Upload className="h-3.5 w-3.5" />
              Upload Resume
            </Link>
            <Link
              to="/app/profile"
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200"
            >
              Edit Personal & Career Info
            </Link>
            <Link
              to="/app/profile"
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200"
            >
              Manage Skills ({skillsCount})
            </Link>
            <Link
              to="/app/profile"
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200"
            >
              Manage Education & Experience
            </Link>
            <Link
              to="/app/applications"
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-200"
            >
              My Job Applications
            </Link>
          </div>
        </div>
      ) : null}

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {cards.map(({ label, value, icon: Icon, to, note }) => (
          <Link
            key={label}
            to={to}
            className="group rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:shadow-soft"
          >
            <div className="flex items-center justify-between">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-blue-50 text-brand">
                <Icon size={21} />
              </span>
              <ArrowUpRight
                className="text-slate-300 transition group-hover:text-brand"
                size={19}
              />
            </div>
            <p className="mt-6 text-sm font-medium text-slate-500">{label}</p>
            <h2 className="mt-1 text-xl font-bold text-slate-900">{value}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-500">{note}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
