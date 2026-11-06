import { Link } from "react-router-dom";
import {
  Building2,
  MapPin,
  Users2,
  Layers,
  Calendar,
  LayoutDashboard,
  Eye,
  Pencil,
  Send,
  UserRound,
} from "lucide-react";
import { CompanyStatusBadge, CompanyRoleBadge } from "./CompanyStatusBadge";
import { formatDate } from "../../../utils/formatters";
import { Button } from "../../../components/ui/Button";

export function CompanyCard({ company, onSubmitForApproval, isSubmitting }) {
  const canEdit = company.canManage;
  const canSubmit =
    canEdit && (company.status === "DRAFT" || company.status === "REJECTED");
  const locationText =
    [company.city, company.state, company.country].filter(Boolean).join(", ") ||
    company.location ||
    "Location not set";

  return (
    <article className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-300">
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className="grid h-14 w-14 shrink-0 place-items-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 text-brand">
              {company.logoUrl ? (
                <img
                  src={company.logoUrl}
                  alt={company.name}
                  className="h-full w-full object-contain p-1"
                />
              ) : (
                <Building2 size={24} />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Link
                  to={`/app/companies/${company.id}/dashboard`}
                  className="truncate text-lg font-bold text-slate-900 hover:text-brand"
                >
                  {company.name}
                </Link>
                <CompanyRoleBadge role={company.myRole} />
              </div>
              <p className="mt-0.5 truncate text-xs text-slate-500">
                {company.companyType || "Company"} · Registered{" "}
                {formatDate(company.createdAt)}
              </p>
            </div>
          </div>

          <CompanyStatusBadge status={company.status} size="sm" />
        </div>

        <div className="mt-4 grid grid-cols-2 gap-2.5 text-xs text-slate-600 sm:grid-cols-3">
          <div className="flex items-center gap-1.5 truncate">
            <Layers size={14} className="shrink-0 text-slate-400" />
            <span className="truncate">{company.industry || "Industry N/A"}</span>
          </div>
          <div className="flex items-center gap-1.5 truncate">
            <Users2 size={14} className="shrink-0 text-slate-400" />
            <span className="truncate">
              {company.companySize ? `${company.companySize} employees` : "Size N/A"}
            </span>
          </div>
          <div className="flex items-center gap-1.5 truncate">
            <MapPin size={14} className="shrink-0 text-slate-400" />
            <span className="truncate">{locationText}</span>
          </div>
          <div className="flex items-center gap-1.5 truncate">
            <UserRound size={14} className="shrink-0 text-slate-400" />
            <span className="truncate">
              Owner: {company.owner?.fullName || "Unassigned"}
            </span>
          </div>
          <div className="flex items-center gap-1.5 truncate">
            <Users2 size={14} className="shrink-0 text-slate-400" />
            <span>
              {company.recruiterCount ?? 1}{" "}
              {(company.recruiterCount ?? 1) === 1 ? "Recruiter" : "Recruiters"}
            </span>
          </div>
          {company.foundedYear && (
            <div className="flex items-center gap-1.5 truncate">
              <Calendar size={14} className="shrink-0 text-slate-400" />
              <span>Founded {company.foundedYear}</span>
            </div>
          )}
        </div>

        {company.status === "REJECTED" && company.rejectionReason && (
          <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            <span className="font-semibold">Rejection reason:</span>{" "}
            {company.rejectionReason}
          </div>
        )}

        {company.status === "SUSPENDED" && company.suspensionReason && (
          <div className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-800">
            <span className="font-semibold">Suspension reason:</span>{" "}
            {company.suspensionReason}
          </div>
        )}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-4">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to={`/app/companies/${company.id}/dashboard`}
            className="inline-flex items-center gap-1.5 rounded-xl bg-blue-50 px-3 py-2 text-xs font-semibold text-brand hover:bg-blue-100"
          >
            <LayoutDashboard size={14} />
            Dashboard
          </Link>
          <Link
            to={`/app/companies/${company.id}`}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Eye size={14} />
            View
          </Link>
          {canEdit && (
            <Link
              to={`/app/companies/${company.id}/edit`}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Pencil size={14} />
              Edit
            </Link>
          )}
        </div>

        {canSubmit && onSubmitForApproval && (
          <Button
            type="button"
            className="gap-1.5 px-3 py-2 text-xs"
            disabled={isSubmitting}
            onClick={() => onSubmitForApproval(company)}
          >
            <Send size={13} />
            {company.status === "REJECTED" ? "Resubmit" : "Submit for Approval"}
          </Button>
        )}
      </div>
    </article>
  );
}
