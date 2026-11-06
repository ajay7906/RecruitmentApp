import { Link } from "react-router-dom";
import {
  Building2,
  MapPin,
  BriefcaseBusiness,
  Calendar,
  Eye,
  ExternalLink,
  RotateCcw,
} from "lucide-react";
import { ApplicationStatusBadge } from "./ApplicationStatusBadge";
import { formatDate } from "../../../utils/formatters";

export function ApplicationCard({ application, onWithdrawClick }) {
  const job = application.job || {};
  const company = application.company || {};
  const jobTitle = job.title || application.jobSnapshot?.title || "Job Vacancy";
  const companyName =
    company.name || application.jobSnapshot?.companyName || "Company";
  const companyLogo =
    company.logoUrl || application.jobSnapshot?.companyLogoUrl || null;
  const locationDisplay =
    [job.city, job.state, job.country].filter(Boolean).join(", ") ||
    job.location ||
    application.jobSnapshot?.location ||
    job.workMode ||
    "Location not specified";
  const employmentType =
    job.employmentType || application.jobSnapshot?.employmentType || "Full Time";

  return (
    <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-200">
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3.5">
            <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 text-brand">
              {companyLogo ? (
                <img
                  src={companyLogo}
                  alt={companyName}
                  className="h-full w-full object-contain p-1"
                />
              ) : (
                <Building2 size={22} />
              )}
            </div>
            <div>
              <Link
                to={`/app/applications/${application.id}`}
                className="text-base font-bold text-slate-900 hover:text-brand"
              >
                {jobTitle}
              </Link>
              <p className="mt-0.5 text-sm font-medium text-slate-600">
                {companyName}
              </p>
            </div>
          </div>

          <ApplicationStatusBadge status={application.status} />
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1">
            <MapPin size={13} className="text-slate-400" />
            {locationDisplay}
          </span>
          <span className="inline-flex items-center gap-1">
            <BriefcaseBusiness size={13} className="text-slate-400" />
            {employmentType}
          </span>
          <span className="inline-flex items-center gap-1">
            <Calendar size={13} className="text-slate-400" />
            Applied {formatDate(application.appliedAt)}
          </span>
          {application.lastStatusUpdatedAt && (
            <span className="text-slate-400">
              · Updated {formatDate(application.lastStatusUpdatedAt)}
            </span>
          )}
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3.5">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to={`/app/applications/${application.id}`}
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-50 px-3.5 py-2 text-xs font-semibold text-brand hover:bg-blue-100"
          >
            <Eye size={14} />
            View Application
          </Link>

          <Link
            to={`/app/jobs/${application.jobId}`}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <ExternalLink size={13} />
            View Job
          </Link>
        </div>

        {application.canWithdraw && onWithdrawClick && (
          <button
            type="button"
            onClick={() => onWithdrawClick(application)}
            className="inline-flex items-center gap-1 rounded-xl border border-red-200 bg-white px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
          >
            <RotateCcw size={13} />
            Withdraw
          </button>
        )}
      </div>
    </div>
  );
}
