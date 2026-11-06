import { Link } from "react-router-dom";
import {
  Building2,
  Eye,
  ExternalLink,
  RotateCcw,
  FileCheck2,
  FileX2,
  SlidersHorizontal,
} from "lucide-react";
import { ApplicationStatusBadge } from "./ApplicationStatusBadge";
import { ResumeDownload } from "./ResumeDownload";
import { formatDate } from "../../../utils/formatters";

export function ApplicationTable({
  applications = [],
  mode = "candidate",
  onWithdrawClick,
  onStatusUpdateClick,
}) {
  if (mode === "candidate") {
    return (
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-5 py-3.5">Job & Company</th>
                <th className="px-4 py-3.5">Location & Type</th>
                <th className="px-4 py-3.5">Applied Date</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Last Updated</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {applications.map((app) => {
                const job = app.job || {};
                const company = app.company || {};
                const jobTitle =
                  job.title || app.jobSnapshot?.title || "Job Vacancy";
                const companyName =
                  company.name || app.jobSnapshot?.companyName || "Company";
                const companyLogo =
                  company.logoUrl || app.jobSnapshot?.companyLogoUrl || null;
                const locationDisplay =
                  [job.city, job.state, job.country]
                    .filter(Boolean)
                    .join(", ") ||
                  job.location ||
                  app.jobSnapshot?.location ||
                  job.workMode ||
                  "—";
                const employmentType =
                  job.employmentType ||
                  app.jobSnapshot?.employmentType ||
                  "Full Time";

                return (
                  <tr
                    key={app.id}
                    className="transition hover:bg-slate-50/70"
                  >
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-3">
                        <div className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 text-brand">
                          {companyLogo ? (
                            <img
                              src={companyLogo}
                              alt={companyName}
                              className="h-full w-full object-contain p-1"
                            />
                          ) : (
                            <Building2 size={18} />
                          )}
                        </div>
                        <div>
                          <Link
                            to={`/app/applications/${app.id}`}
                            className="font-semibold text-slate-900 hover:text-brand"
                          >
                            {jobTitle}
                          </Link>
                          <p className="text-xs text-slate-500">
                            {companyName}
                          </p>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-4">
                      <p className="text-xs font-medium text-slate-800">
                        {locationDisplay}
                      </p>
                      <p className="text-xs text-slate-500">
                        {employmentType}
                      </p>
                    </td>

                    <td className="px-4 py-4 text-xs text-slate-600">
                      {formatDate(app.appliedAt)}
                    </td>

                    <td className="px-4 py-4">
                      <ApplicationStatusBadge status={app.status} size="sm" />
                    </td>

                    <td className="px-4 py-4 text-xs text-slate-500">
                      {formatDate(app.lastStatusUpdatedAt)}
                    </td>

                    <td className="px-5 py-4">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/app/applications/${app.id}`}
                          className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-brand hover:bg-blue-100"
                        >
                          <Eye size={13} />
                          View
                        </Link>
                        <Link
                          to={`/app/jobs/${app.jobId}`}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          <ExternalLink size={13} />
                          Job
                        </Link>
                        {app.canWithdraw && onWithdrawClick && (
                          <button
                            type="button"
                            onClick={() => onWithdrawClick(app)}
                            className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50"
                          >
                            <RotateCcw size={13} />
                            Withdraw
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  // Recruiter Mode Table
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-500">
            <tr>
              <th className="px-5 py-3.5">Candidate</th>
              <th className="px-4 py-3.5">Job & Company</th>
              <th className="px-4 py-3.5">Experience & Skills</th>
              <th className="px-4 py-3.5">Resume</th>
              <th className="px-4 py-3.5">Applied / Updated</th>
              <th className="px-4 py-3.5">Status</th>
              <th className="px-5 py-3.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {applications.map((app) => {
              const candidateName =
                app.candidate?.fullName ||
                app.candidateSnapshot?.fullName ||
                "Candidate";
              const candidateEmail =
                app.candidate?.email || app.candidateSnapshot?.email || "";
              const candidateHeadline =
                app.candidate?.candidateProfile?.headline ||
                app.candidateSnapshot?.headline ||
                app.candidate?.candidateProfile?.currentJobTitle ||
                "";
              const expYears =
                app.candidateExperience ??
                app.candidate?.candidateProfile?.yearsOfExperience ??
                null;
              const skills = app.candidateSkills || [];

              return (
                <tr key={app.id} className="transition hover:bg-slate-50/70">
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-blue-100 text-sm font-bold text-brand">
                        {candidateName.slice(0, 1).toUpperCase()}
                      </div>
                      <div>
                        <Link
                          to={`/app/recruiter/applications/${app.id}`}
                          className="font-semibold text-slate-900 hover:text-brand"
                        >
                          {candidateName}
                        </Link>
                        <p className="text-xs text-slate-500">
                          {candidateHeadline || candidateEmail}
                        </p>
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-4">
                    <p className="font-medium text-slate-900">
                      {app.job?.title || app.jobSnapshot?.title}
                    </p>
                    <p className="text-xs text-slate-500">
                      {app.company?.name || app.jobSnapshot?.companyName}
                    </p>
                  </td>

                  <td className="px-4 py-4">
                    <p className="text-xs font-semibold text-slate-800">
                      {expYears != null ? `${expYears} yrs exp` : "Exp N/A"}
                    </p>
                    {skills.length > 0 ? (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {skills.slice(0, 3).map((sk) => (
                          <span
                            key={sk}
                            className="rounded-md bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-700"
                          >
                            {sk}
                          </span>
                        ))}
                        {skills.length > 3 && (
                          <span className="text-[11px] text-slate-400">
                            +{skills.length - 3}
                          </span>
                        )}
                      </div>
                    ) : (
                      <span className="text-xs text-slate-400">
                        No skills listed
                      </span>
                    )}
                  </td>

                  <td className="px-4 py-4">
                    {app.hasResume ? (
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                          <FileCheck2 size={12} /> Available
                        </span>
                        <ResumeDownload
                          applicationId={app.id}
                          fileName={app.resumeFileName}
                          asRecruiter
                          label="Download"
                          className="inline-flex items-center gap-1 text-xs font-semibold text-brand hover:underline"
                        />
                      </div>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs text-slate-400">
                        <FileX2 size={13} /> None
                      </span>
                    )}
                  </td>

                  <td className="px-4 py-4">
                    <p className="text-xs font-medium text-slate-700">
                      {formatDate(app.appliedAt)}
                    </p>
                    <p className="text-[11px] text-slate-400">
                      Updated {formatDate(app.lastStatusUpdatedAt)}
                    </p>
                  </td>

                  <td className="px-4 py-4">
                    <ApplicationStatusBadge status={app.status} size="sm" />
                  </td>

                  <td className="px-5 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <Link
                        to={`/app/recruiter/applications/${app.id}`}
                        className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-brand hover:bg-blue-100"
                      >
                        <Eye size={13} />
                        Review
                      </Link>
                      {app.allowedNextStatuses?.length > 0 &&
                        onStatusUpdateClick && (
                          <button
                            type="button"
                            onClick={() => onStatusUpdateClick(app)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                          >
                            <SlidersHorizontal size={13} />
                            Status
                          </button>
                        )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
