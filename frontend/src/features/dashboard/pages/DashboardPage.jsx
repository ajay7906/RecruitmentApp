import {
  BriefcaseBusiness,
  FileCheck2,
  UserRound,
  Building2,
  ShieldCheck,
  ArrowUpRight,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAuthStore } from "../../../stores/authStore";

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
      label: "Profile & Resume",
      value: "Keep it current",
      icon: UserRound,
      to: "/app/profile",
      note: "Help employers understand your skills and experience.",
    },
    {
      label: "Explore Jobs",
      value: "Find your next step",
      icon: BriefcaseBusiness,
      to: "/app/jobs",
      note: "Browse published opportunities and apply online.",
    },
    {
      label: "My Applications",
      value: "Track your progress",
      icon: FileCheck2,
      to: "/app/applications",
      note: "View application timelines, status updates, and submitted documents.",
    },
  ];
}

export function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const fullName = user?.fullName || user?.name;
  const cards = getDashboardCards(user?.role);

  return (
    <div>
      <div className="mb-8">
        <p className="text-sm font-medium text-brand">YOUR WORKSPACE</p>
        <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">
          Welcome{fullName ? `, ${fullName.split(" ")[0]}` : " back"}
        </h1>
        <p className="mt-2 text-slate-500">
          Here are the next steps in your recruitment journey.
        </p>
      </div>
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
      <div className="mt-7 rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <h2 className="font-semibold text-slate-900">
          End-to-End Recruitment Pipeline Active
        </h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
          Authentication, Candidate Profile, Recruiter Profile, Company
          Management, Job Management, and Job Application Management modules are
          connected and active.
        </p>
      </div>
    </div>
  );
}
