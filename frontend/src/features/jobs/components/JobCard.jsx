import { Link } from "react-router-dom";
import {
  Building2,
  MapPin,
  BriefcaseBusiness,
  Clock,
  Wallet,
  Calendar,
  ArrowUpRight,
} from "lucide-react";
import { formatSalaryRange, formatExperienceRange } from "../schema/jobSchemas";
import { formatDate } from "../../../utils/formatters";
import { JobStatusBadge } from "./JobStatusBadge";
import { JobActionMenu } from "./JobActionMenu";

export function JobCard({
  job,
  mode = "public", // "public" | "recruiter"
  linkPrefix = "/app/jobs",
  onAction,
}) {
  const detailsUrl =
    mode === "recruiter"
      ? `/app/jobs/${job.id}/manage`
      : `${linkPrefix}/${job.id}`;

  const locationDisplay =
    [job.city, job.state, job.country].filter(Boolean).join(", ") ||
    job.location ||
    job.workMode;

  return (
    <article className="group flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-300 hover:shadow-soft">
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 text-brand">
              {job.company?.logoUrl ? (
                <img
                  src={job.company.logoUrl}
                  alt={job.company.name}
                  className="h-full w-full object-contain p-1"
                />
              ) : (
                <Building2 size={22} />
              )}
            </div>
            <div className="min-w-0">
              <Link
                to={detailsUrl}
                className="truncate text-lg font-bold text-slate-900 group-hover:text-brand block"
              >
                {job.title || job.jobTitle}
              </Link>
              <p className="truncate text-sm font-medium text-slate-600">
                {job.company?.name || "Company"}
                {job.department ? ` · ${job.department}` : ""}
              </p>
            </div>
          </div>

          {mode === "recruiter" ? (
            <JobStatusBadge status={job.status} size="sm" />
          ) : (
            <span className="shrink-0 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-semibold text-brand">
              {job.workMode}
            </span>
          )}
        </div>

        {/* Meta tags */}
        <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 text-xs text-slate-600">
          <span className="inline-flex items-center gap-1.5">
            <MapPin size={14} className="text-slate-400" />
            {locationDisplay}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <BriefcaseBusiness size={14} className="text-slate-400" />
            {job.employmentType}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Clock size={14} className="text-slate-400" />
            {formatExperienceRange(job)}
          </span>
          {job.discloseSalary && (job.minSalary != null || job.maxSalary != null) && (
            <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700">
              <Wallet size={14} className="text-emerald-600" />
              {formatSalaryRange(job)}
            </span>
          )}
        </div>

        {/* Summary or Description snippet */}
        {(job.summary || job.description) && (
          <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-600">
            {job.summary || job.description}
          </p>
        )}

        {/* Skills preview */}
        {job.requiredSkills?.length > 0 && (
          <div className="mt-3.5 flex flex-wrap gap-1.5">
            {job.requiredSkills.slice(0, 5).map((skill) => (
              <span
                key={skill}
                className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-medium text-slate-700"
              >
                {skill}
              </span>
            ))}
            {job.requiredSkills.length > 5 && (
              <span className="rounded-lg bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                +{job.requiredSkills.length - 5} more
              </span>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3.5 text-xs text-slate-500">
        <span className="inline-flex items-center gap-1">
          <Calendar size={13} className="text-slate-400" />
          {job.publishedAt
            ? `Published ${formatDate(job.publishedAt)}`
            : `Created ${formatDate(job.createdAt)}`}
        </span>

        {mode === "recruiter" && onAction ? (
          <JobActionMenu job={job} onAction={onAction} />
        ) : (
          <Link
            to={detailsUrl}
            className="inline-flex items-center gap-1 font-semibold text-brand hover:underline"
          >
            View details <ArrowUpRight size={14} />
          </Link>
        )}
      </div>
    </article>
  );
}
