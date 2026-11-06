import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  Building2,
  CheckCircle2,
  Users2,
  BriefcaseBusiness,
  Calendar,
  Pencil,
  Eye,
  Send,
  ShieldCheck,
  AlertTriangle,
  ArrowUpRight,
  Crown,
  Plus,
} from "lucide-react";

import { companiesApi } from "../api/companiesApi";
import { calculateCompanyCompletion } from "../utils/companyCompletion";
import {
  CompanyStatusBadge,
  CompanyRoleBadge,
} from "../components/CompanyStatusBadge";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { LoadingState } from "../../../components/feedback/LoadingState";
import { ErrorState } from "../../../components/feedback/ErrorState";
import { Button } from "../../../components/ui/Button";
import { formatDate } from "../../../utils/formatters";

export function CompanyDashboardPage() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const [confirmSubmit, setConfirmSubmit] = useState(false);

  const query = useQuery({
    queryKey: ["companies", "detail", id],
    queryFn: () => companiesApi.getCompanyById(id),
    retry: false,
  });

  const submitMutation = useMutation({
    mutationFn: () => companiesApi.submitForApproval(id),
    onSuccess: (res) => {
      const updated = res?.data?.company ?? res?.company;
      if (updated) {
        queryClient.setQueryData(["companies", "detail", id], {
          success: true,
          data: { company: updated },
        });
      }
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      toast.success("Company submitted for approval!");
      setConfirmSubmit(false);
    },
    onError: (err) => {
      toast.error(
        err?.response?.data?.message || "Failed to submit company for approval."
      );
      setConfirmSubmit(false);
    },
  });

  if (query.isPending)
    return <LoadingState title="Loading company dashboard" />;
  if (query.isError)
    return (
      <ErrorState
        title="Could not load company dashboard"
        message={
          query.error?.response?.data?.message ||
          "The company could not be loaded."
        }
        onRetry={query.refetch}
      />
    );

  const company = query.data?.data?.company ?? query.data?.company;
  if (!company) return null;

  const completion = calculateCompanyCompletion(company);
  const canEdit = company.canManage;
  const canSubmit =
    canEdit &&
    (company.status === "DRAFT" || company.status === "REJECTED");

  return (
    <div>
      {/* ── Top Navigation ── */}
      <div className="mb-6">
        <Link
          to="/app/companies"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900"
        >
          <ArrowLeft size={16} />
          Back to My Companies
        </Link>
      </div>

      {/* ── Hero Banner ── */}
      <div className="mb-7 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 text-brand">
              {company.logoUrl ? (
                <img
                  src={company.logoUrl}
                  alt={company.name}
                  className="h-full w-full object-contain p-1.5"
                />
              ) : (
                <Building2 size={30} />
              )}
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-brand">
                COMPANY DASHBOARD
              </p>
              <div className="mt-1 flex flex-wrap items-center gap-2.5">
                <h1 className="text-2xl font-bold text-slate-950 sm:text-3xl">
                  {company.name}
                </h1>
                <CompanyStatusBadge status={company.status} />
                <CompanyRoleBadge role={company.myRole} />
              </div>
              <p className="mt-1 text-sm text-slate-500">
                {company.industry || "Industry not specified"} ·{" "}
                {[company.city, company.state, company.country]
                  .filter(Boolean)
                  .join(", ") ||
                  company.location ||
                  "Location not specified"}
              </p>
            </div>
          </div>

          {/* ── Quick Actions ── */}
          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              to={`/app/companies/${company.id}`}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Eye size={16} />
              View Details
            </Link>

            <Link
              to={`/app/companies/${company.id}/approval`}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <ShieldCheck size={16} />
              Approval Status
            </Link>

            {canEdit && (
              <Link
                to={`/app/companies/${company.id}/edit`}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                <Pencil size={16} />
                Edit Company
              </Link>
            )}

            {canSubmit && (
              <Button
                type="button"
                className="gap-2 py-2.5"
                onClick={() => setConfirmSubmit(true)}
                disabled={submitMutation.isPending}
              >
                <Send size={15} />
                {company.status === "REJECTED"
                  ? "Resubmit for Approval"
                  : "Submit for Approval"}
              </Button>
            )}
          </div>
        </div>

        {/* ── Status Reason Alerts ── */}
        {company.status === "REJECTED" && company.rejectionReason && (
          <div className="mt-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <AlertTriangle size={18} className="mt-0.5 shrink-0 text-red-600" />
            <div>
              <p className="font-semibold">Company Approval Rejected</p>
              <p className="mt-0.5">{company.rejectionReason}</p>
            </div>
          </div>
        )}

        {company.status === "SUSPENDED" && company.suspensionReason && (
          <div className="mt-5 flex items-start gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
            <AlertTriangle size={18} className="mt-0.5 shrink-0 text-rose-600" />
            <div>
              <p className="font-semibold">Company Account Suspended</p>
              <p className="mt-0.5">{company.suspensionReason}</p>
            </div>
          </div>
        )}
      </div>

      {/* ── KPI Summary Cards ── */}
      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {/* Profile Completion */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-brand">
              <CheckCircle2 size={20} />
            </span>
            <span className="text-xs font-semibold text-brand">
              {completion.completed}/{completion.total} fields
            </span>
          </div>
          <p className="mt-4 text-sm font-medium text-slate-500">
            Profile Completion
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {completion.percentage}%
          </p>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-brand transition-all"
              style={{ width: `${completion.percentage}%` }}
            />
          </div>
        </div>

        {/* Approval Status */}
        <Link
          to={`/app/companies/${company.id}/approval`}
          className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-300"
        >
          <div className="flex items-center justify-between">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
              <ShieldCheck size={20} />
            </span>
            <ArrowUpRight
              size={18}
              className="text-slate-300 transition group-hover:text-brand"
            />
          </div>
          <p className="mt-4 text-sm font-medium text-slate-500">
            Approval Status
          </p>
          <div className="mt-2">
            <CompanyStatusBadge status={company.status} />
          </div>
          <p className="mt-2 text-xs text-slate-500">
            {company.approvedAt
              ? `Approved on ${formatDate(company.approvedAt)}`
              : company.submittedAt
              ? `Submitted on ${formatDate(company.submittedAt)}`
              : "Click to view workflow details"}
          </p>
        </Link>

        {/* Associated Recruiters */}
        <Link
          to={`/app/companies/${company.id}`}
          className="group rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-blue-300"
        >
          <div className="flex items-center justify-between">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-purple-50 text-purple-600">
              <Users2 size={20} />
            </span>
            <ArrowUpRight
              size={18}
              className="text-slate-300 transition group-hover:text-brand"
            />
          </div>
          <p className="mt-4 text-sm font-medium text-slate-500">
            Associated Recruiters
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {company.recruiterCount ?? 1}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Owner: {company.owner?.fullName || "Assigned"}
          </p>
        </Link>

        {/* Registration Date */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-amber-50 text-amber-600">
              <Calendar size={20} />
            </span>
          </div>
          <p className="mt-4 text-sm font-medium text-slate-500">
            Registration Date
          </p>
          <p className="mt-1 text-2xl font-bold text-slate-900">
            {formatDate(company.createdAt)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {company.companyType || "Registered entity"}
          </p>
        </div>
      </div>

      {/* ── Secondary Grid: Missing Completion Checklist & Active Jobs ── */}
      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        {/* Profile Completion & Ownership Summary */}
        <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-slate-900">
            Company Readiness & Ownership
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Ensure your company profile is complete for verification and candidate
            trust.
          </p>

          <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 p-4">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-purple-100 text-purple-700">
                <Crown size={18} />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">
                  Company Owner
                </p>
                <p className="font-semibold text-slate-900">
                  {company.owner?.fullName || "Unassigned"}
                </p>
                <p className="text-xs text-slate-500">
                  {company.owner?.email || ""}
                </p>
              </div>
            </div>
            <CompanyRoleBadge role={company.myRole} />
          </div>

          {completion.missingFields?.length > 0 ? (
            <div className="mt-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                Remaining profile fields ({completion.missingFields.length})
              </p>
              <div className="mt-2.5 flex flex-wrap gap-2">
                {completion.missingFields.map((field) => (
                  <span
                    key={field}
                    className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-800"
                  >
                    + {field}
                  </span>
                ))}
              </div>
              {canEdit && (
                <div className="mt-4">
                  <Link
                    to={`/app/companies/${company.id}/edit`}
                    className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand hover:underline"
                  >
                    Complete missing fields <ArrowUpRight size={15} />
                  </Link>
                </div>
              )}
            </div>
          ) : (
            <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-sm text-emerald-800">
              <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />
              All core company profile fields are complete!
            </div>
          )}
        </section>

        {/* Active Jobs Integration Section */}
        <section className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-brand">
                  <BriefcaseBusiness size={20} />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    Active Jobs
                  </h2>
                  <p className="text-xs text-slate-500">
                    Published openings for {company.name}
                  </p>
                </div>
              </div>
              <span className="rounded-xl bg-emerald-50 px-3.5 py-1.5 text-lg font-bold text-emerald-700">
                {company.activeJobsCount ?? 0}
              </span>
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-600">
              Create, publish, pause, or manage job openings associated with{" "}
              <span className="font-semibold text-slate-800">{company.name}</span>. Only{" "}
              <span className="font-semibold text-slate-800">APPROVED</span>{" "}
              companies are eligible to publish live vacancies to candidates.
            </p>
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4 text-xs text-slate-500">
            <span>
              Eligibility:{" "}
              {company.status === "APPROVED" ? (
                <strong className="text-emerald-700">Ready for job posting</strong>
              ) : (
                <strong className="text-amber-700">
                  Requires company approval ({company.status.replace("_", " ")})
                </strong>
              )}
            </span>
            <div className="flex items-center gap-3">
              <Link
                to={`/app/jobs/new?companyId=${company.id}`}
                className="inline-flex items-center gap-1 rounded-lg bg-brand px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
              >
                <Plus size={13} /> Post Job
              </Link>
              <Link
                to="/app/jobs/manage"
                className="font-semibold text-brand hover:underline"
              >
                Manage Jobs →
              </Link>
            </div>
          </div>
        </section>
      </div>

      <ConfirmDialog
        open={confirmSubmit}
        title="Submit company for approval?"
        description={`"${company.name}" will transition from ${company.status} to PENDING_APPROVAL for administrator review.`}
        confirmLabel="Submit for Approval"
        isPending={submitMutation.isPending}
        onClose={() => setConfirmSubmit(false)}
        onConfirm={() => submitMutation.mutate()}
      />
    </div>
  );
}
