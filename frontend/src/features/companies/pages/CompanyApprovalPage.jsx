import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  FileEdit,
  XCircle,
  Ban,
  Send,
  Pencil,
  ShieldCheck,
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
import { useAuthStore } from "../../../stores/authStore";
import { formatDate } from "../../../utils/formatters";

export function CompanyApprovalPage() {
  const { id } = useParams();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const isSystemAdmin = user?.role === "admin";

  const [modalAction, setModalAction] = useState(null); // "submit" | "approve" | "reject" | "suspend"

  const query = useQuery({
    queryKey: ["companies", "detail", id],
    queryFn: () => companiesApi.getCompanyById(id),
    retry: false,
  });

  const company = query.data?.data?.company ?? query.data?.company;

  function updateCachedCompany(res) {
    const updated = res?.data?.company ?? res?.company;
    if (updated) {
      queryClient.setQueryData(["companies", "detail", id], {
        success: true,
        data: { company: updated },
      });
    }
    queryClient.invalidateQueries({ queryKey: ["companies"] });
    setModalAction(null);
  }

  const submitMutation = useMutation({
    mutationFn: () => companiesApi.submitForApproval(id),
    onSuccess: (res) => {
      updateCachedCompany(res);
      toast.success("Company submitted for approval!");
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || "Submission failed.");
      setModalAction(null);
    },
  });

  const approveMutation = useMutation({
    mutationFn: () => companiesApi.approveCompany(id),
    onSuccess: (res) => {
      updateCachedCompany(res);
      toast.success("Company approved!");
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || "Approval failed.");
      setModalAction(null);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (reason) => companiesApi.rejectCompany(id, reason),
    onSuccess: (res) => {
      updateCachedCompany(res);
      toast.success("Company rejected.");
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || "Rejection failed.");
      setModalAction(null);
    },
  });

  const suspendMutation = useMutation({
    mutationFn: (reason) => companiesApi.suspendCompany(id, reason),
    onSuccess: (res) => {
      updateCachedCompany(res);
      toast.success("Company suspended.");
    },
    onError: (err) => {
      toast.error(err?.response?.data?.message || "Suspension failed.");
      setModalAction(null);
    },
  });

  if (query.isPending) return <LoadingState title="Loading approval status" />;
  if (query.isError || !company) {
    return (
      <ErrorState
        title="Could not load approval status"
        message={
          query.error?.response?.data?.message ||
          "The requested company could not be found."
        }
        onRetry={query.refetch}
      />
    );
  }

  const completion = calculateCompanyCompletion(company);
  const canEdit = company.canManage;
  const canSubmit =
    canEdit &&
    (company.status === "DRAFT" || company.status === "REJECTED");

  const steps = [
    {
      key: "DRAFT",
      title: "1. Draft & Profile Setup",
      description:
        "Company is registered and profile details are prepared by the Company Owner or Admin.",
      icon: FileEdit,
      done: true,
      active: company.status === "DRAFT",
    },
    {
      key: "PENDING_APPROVAL",
      title: "2. Submitted for Verification",
      description: company.submittedAt
        ? `Submitted on ${formatDate(company.submittedAt)}. Under review by platform administrators.`
        : "Submit your completed company profile for administrator review.",
      icon: Clock,
      done: ["PENDING_APPROVAL", "APPROVED", "REJECTED", "SUSPENDED"].includes(
        company.status
      ),
      active: company.status === "PENDING_APPROVAL",
    },
    {
      key: "DECISION",
      title:
        company.status === "REJECTED"
          ? "3. Review Outcome: Rejected"
          : company.status === "SUSPENDED"
          ? "3. Review Outcome: Suspended"
          : "3. Approved & Verified",
      description:
        company.status === "APPROVED"
          ? `Approved on ${formatDate(company.approvedAt)}${
              company.approvedBy?.fullName
                ? ` by ${company.approvedBy.fullName}`
                : ""
            }.`
          : company.status === "REJECTED"
          ? "Changes were requested before the company can be approved."
          : company.status === "SUSPENDED"
          ? "This company account is currently suspended."
          : "Once approved, your company is verified across the platform.",
      icon:
        company.status === "REJECTED"
          ? XCircle
          : company.status === "SUSPENDED"
          ? Ban
          : CheckCircle2,
      done: company.status === "APPROVED",
      active: ["APPROVED", "REJECTED", "SUSPENDED"].includes(company.status),
    },
  ];

  return (
    <div className="space-y-6">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link
            to={`/app/companies/${company.id}/dashboard`}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-900"
          >
            <ArrowLeft size={16} />
            Back to Company Dashboard
          </Link>
          <p className="mt-3 text-sm font-medium text-brand">
            APPROVAL WORKFLOW
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-bold text-slate-950">{company.name}</h1>
            <CompanyStatusBadge status={company.status} />
            <CompanyRoleBadge role={company.myRole} />
          </div>
          <p className="mt-1 text-sm text-slate-500">
            Track your company verification status and review requirements.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {canEdit && (
            <Link
              to={`/app/companies/${company.id}/edit`}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Pencil size={16} />
              Edit Profile
            </Link>
          )}
          {canSubmit && (
            <Button
              type="button"
              onClick={() => setModalAction("submit")}
              className="gap-2 py-2.5"
            >
              <Send size={15} />
              {company.status === "REJECTED"
                ? "Resubmit for Approval"
                : "Submit for Approval"}
            </Button>
          )}
        </div>
      </div>

      {/* ── Rejection / Suspension Reason Callout ── */}
      {company.status === "REJECTED" && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-900">
          <div className="flex items-start gap-3">
            <XCircle size={22} className="mt-0.5 shrink-0 text-red-600" />
            <div>
              <h2 className="font-semibold">
                Submission Rejected — Action Required
              </h2>
              <p className="mt-1 text-sm leading-6">
                {company.rejectionReason ||
                  "Please review and update your company details before resubmitting."}
              </p>
              {canEdit && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <Link
                    to={`/app/companies/${company.id}/edit`}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-red-700"
                  >
                    <Pencil size={13} /> Update Company Details
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {company.status === "SUSPENDED" && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-rose-900">
          <div className="flex items-start gap-3">
            <Ban size={22} className="mt-0.5 shrink-0 text-rose-600" />
            <div>
              <h2 className="font-semibold">Company Account Suspended</h2>
              <p className="mt-1 text-sm leading-6">
                {company.suspensionReason ||
                  "This company has been suspended by a platform administrator."}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Workflow Timeline ── */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-slate-900">
          Verification Stages
        </h2>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          {steps.map(({ key, title, description, icon: Icon, done, active }) => (
            <div
              key={key}
              className={`rounded-2xl border p-5 ${
                active
                  ? "border-brand bg-blue-50/40"
                  : done
                  ? "border-emerald-200 bg-emerald-50/30"
                  : "border-slate-200 bg-slate-50/50"
              }`}
            >
              <div className="flex items-center gap-2.5">
                <span
                  className={`grid h-9 w-9 place-items-center rounded-xl ${
                    active
                      ? "bg-brand text-white"
                      : done
                      ? "bg-emerald-600 text-white"
                      : "bg-slate-200 text-slate-600"
                  }`}
                >
                  <Icon size={18} />
                </span>
                <h3 className="font-semibold text-slate-900">{title}</h3>
              </div>
              <p className="mt-3 text-xs leading-5 text-slate-600">
                {description}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Profile Completion Check ── */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-slate-900">
              Submission Readiness ({completion.percentage}%)
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              All mandatory company fields must be filled before submitting for
              approval.
            </p>
          </div>
          <span className="text-sm font-bold text-brand">
            {completion.completed}/{completion.total} fields
          </span>
        </div>

        <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-brand transition-all"
            style={{ width: `${completion.percentage}%` }}
          />
        </div>
      </section>

      {/* ── System Admin Decision Panel (Only visible to role === 'admin') ── */}
      {isSystemAdmin && (
        <section className="rounded-2xl border border-blue-200 bg-blue-50/40 p-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-xl bg-brand text-white">
                <ShieldCheck size={20} />
              </div>
              <div>
                <h2 className="font-semibold text-slate-900">
                  Administrator Review Controls
                </h2>
                <p className="text-xs text-slate-600">
                  Approve, reject, or suspend this company registration.
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              {company.status !== "APPROVED" && company.status !== "DRAFT" && (
                <Button
                  type="button"
                  onClick={() => setModalAction("approve")}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  Approve Company
                </Button>
              )}
              {company.status === "PENDING_APPROVAL" && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setModalAction("reject")}
                  className="border-red-200 text-red-600 hover:bg-red-50"
                >
                  Reject
                </Button>
              )}
              {company.status === "APPROVED" && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setModalAction("suspend")}
                  className="border-rose-200 text-rose-700 hover:bg-rose-50"
                >
                  Suspend Company
                </Button>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Modals */}
      <ConfirmDialog
        open={modalAction === "submit"}
        title="Submit company for approval?"
        description={`Submit "${company.name}" for administrator verification?`}
        confirmLabel="Submit for Approval"
        isPending={submitMutation.isPending}
        onClose={() => setModalAction(null)}
        onConfirm={() => submitMutation.mutate()}
      />

      <ConfirmDialog
        open={modalAction === "approve"}
        title="Approve this company?"
        description={`"${company.name}" will be marked as APPROVED and verified on the platform.`}
        confirmLabel="Approve Company"
        isPending={approveMutation.isPending}
        onClose={() => setModalAction(null)}
        onConfirm={() => approveMutation.mutate()}
      />

      <ConfirmDialog
        open={modalAction === "reject"}
        title="Reject company registration"
        description={`Provide a clear rejection reason so the company owner can address the issues and resubmit.`}
        confirmLabel="Reject Company"
        variant="danger"
        requireReason
        reasonLabel="Rejection reason *"
        reasonPlaceholder="Explain what needs to be corrected..."
        isPending={rejectMutation.isPending}
        onClose={() => setModalAction(null)}
        onConfirm={(reason) => rejectMutation.mutate(reason)}
      />

      <ConfirmDialog
        open={modalAction === "suspend"}
        title="Suspend approved company"
        description={`Suspending "${company.name}" will restrict modifications and active operations.`}
        confirmLabel="Suspend Company"
        variant="danger"
        requireReason
        reasonLabel="Suspension reason *"
        reasonPlaceholder="Specify why this company is being suspended..."
        isPending={suspendMutation.isPending}
        onClose={() => setModalAction(null)}
        onConfirm={(reason) => suspendMutation.mutate(reason)}
      />
    </div>
  );
}
