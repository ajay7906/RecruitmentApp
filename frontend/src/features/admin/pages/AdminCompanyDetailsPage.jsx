import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Ban,
  RotateCcw,
  Globe,
  Mail,
  Phone,
  MapPin,
  Users,
  BriefcaseBusiness,
} from "lucide-react";
import { toast } from "sonner";
import { adminApi } from "../api/adminApi";
import { CompanyStatusBadge } from "../components/CompanyStatusBadge";
import { JobStatusBadge } from "../components/JobStatusBadge";
import { ApprovalDialog } from "../components/ApprovalDialog";
import { RejectionDialog } from "../components/RejectionDialog";
import { SuspensionDialog } from "../components/SuspensionDialog";

export function AdminCompanyDetailsPage() {
  const { id } = useParams();
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [suspendOpen, setSuspendOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const loadCompany = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getCompanyDetails(id);
      setCompany(res);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to load company details");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadCompany();
  }, [loadCompany]);

  async function handleApprove({ reason }) {
    setSubmitting(true);
    try {
      await adminApi.approveCompany(id, { reason });
      toast.success("Company approved");
      setApproveOpen(false);
      loadCompany();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to approve company");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReject({ reason }) {
    setSubmitting(true);
    try {
      await adminApi.rejectCompany(id, { reason });
      toast.success("Company rejected");
      setRejectOpen(false);
      loadCompany();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to reject company");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSuspend({ reason }) {
    setSubmitting(true);
    try {
      await adminApi.suspendCompany(id, { reason });
      toast.success("Company suspended");
      setSuspendOpen(false);
      loadCompany();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to suspend company");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReactivate() {
    setSubmitting(true);
    try {
      await adminApi.activateCompany(id, {
        reason: "Reactivated by platform administrator",
      });
      toast.success("Company reactivated");
      loadCompany();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to reactivate company");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-sm text-slate-500">Loading company profile...</div>;
  }

  if (!company) {
    return <div className="p-8 text-center text-sm text-slate-500">Company not found.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/admin/companies"
            className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl font-bold text-slate-900">{company.name}</h1>
              <CompanyStatusBadge status={company.status} />
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              {company.industry || "Industry N/A"} • {company.companySize || "Size N/A"} •{" "}
              {company.companyType || "Type N/A"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {company.status === "PENDING_APPROVAL" && (
            <>
              <button
                type="button"
                onClick={() => setApproveOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
              >
                <CheckCircle2 size={14} /> Approve Registration
              </button>
              <button
                type="button"
                onClick={() => setRejectOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-rose-700"
              >
                <XCircle size={14} /> Reject Registration
              </button>
            </>
          )}
          {company.status === "APPROVED" && (
            <button
              type="button"
              onClick={() => setSuspendOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-rose-700"
            >
              <Ban size={14} /> Suspend Company
            </button>
          )}
          {company.status === "SUSPENDED" && (
            <button
              type="button"
              disabled={submitting}
              onClick={handleReactivate}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
            >
              <RotateCcw size={14} /> Reactivate Company
            </button>
          )}
        </div>
      </div>

      {(company.rejectionReason || company.suspensionReason) && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800">
          <p className="font-bold">Administrative Notice</p>
          <p className="mt-1">{company.rejectionReason || company.suspensionReason}</p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left column: registration details */}
        <div className="space-y-6 lg:col-span-1">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3 text-xs">
            <h2 className="text-sm font-bold text-slate-900">Registration & Verification</h2>
            {company.website && (
              <div className="flex items-center gap-2 text-slate-600">
                <Globe size={14} className="text-slate-400" />
                <a
                  href={company.website}
                  target="_blank"
                  rel="noreferrer"
                  className="text-brand hover:underline"
                >
                  {company.website}
                </a>
              </div>
            )}
            {company.email && (
              <div className="flex items-center gap-2 text-slate-600">
                <Mail size={14} className="text-slate-400" />
                <span>{company.email}</span>
              </div>
            )}
            {company.contactNumber && (
              <div className="flex items-center gap-2 text-slate-600">
                <Phone size={14} className="text-slate-400" />
                <span>{company.contactNumber}</span>
              </div>
            )}
            <div className="flex items-start gap-2 text-slate-600">
              <MapPin size={14} className="mt-0.5 shrink-0 text-slate-400" />
              <span>
                {[company.address, company.city, company.state, company.country, company.pincode]
                  .filter(Boolean)
                  .join(", ") || "Address not specified"}
              </span>
            </div>

            <div className="border-t border-slate-100 pt-3 space-y-1.5 text-slate-600">
              <p>
                <span className="font-semibold text-slate-800">GSTIN:</span>{" "}
                {company.gstin || "Not provided"}
              </p>
              <p>
                <span className="font-semibold text-slate-800">CIN / Reg No:</span>{" "}
                {company.registrationNumber || "Not provided"}
              </p>
              <p>
                <span className="font-semibold text-slate-800">Founded:</span>{" "}
                {company.foundedYear || "N/A"}
              </p>
              <p>
                <span className="font-semibold text-slate-800">Owner:</span>{" "}
                {company.owner ? (
                  <Link
                    to={`/admin/users/${company.owner.id}`}
                    className="font-semibold text-brand hover:underline"
                  >
                    {company.owner.fullName} ({company.owner.email})
                  </Link>
                ) : (
                  "N/A"
                )}
              </p>
            </div>
          </div>

          {/* Description */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <h2 className="text-sm font-bold text-slate-900">Company Description</h2>
            <p className="mt-2 whitespace-pre-line text-xs leading-relaxed text-slate-600">
              {company.description || "No description provided."}
            </p>
          </div>
        </div>

        {/* Right column: Members, Jobs, Approval History */}
        <div className="space-y-6 lg:col-span-2">
          {/* Associated Recruiters */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <Users size={16} className="text-brand" /> Associated Recruiters ({company.memberships?.length || 0})
            </h2>
            <div className="mt-3 divide-y divide-slate-100">
              {(company.memberships || []).map((m) => (
                <div key={m.id} className="flex items-center justify-between py-2.5 text-xs">
                  <div>
                    <p className="font-semibold text-slate-900">{m.user?.fullName}</p>
                    <p className="text-slate-500">
                      {m.user?.email} • Role: <span className="font-semibold">{m.role}</span>
                    </p>
                  </div>
                  <Link
                    to={`/admin/users/${m.userId}`}
                    className="font-semibold text-brand hover:underline"
                  >
                    Inspect User
                  </Link>
                </div>
              ))}
            </div>
          </div>

          {/* Jobs under this company */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <BriefcaseBusiness size={16} className="text-indigo-600" /> Job Postings ({company.jobsCount ?? 0})
            </h2>
            <div className="mt-3 divide-y divide-slate-100">
              {(company.jobs || []).length === 0 ? (
                <p className="py-4 text-xs text-slate-400">No job listings created yet.</p>
              ) : (
                company.jobs.map((job) => (
                  <div key={job.id} className="flex items-center justify-between py-2.5 text-xs">
                    <div>
                      <p className="font-semibold text-slate-900">{job.title}</p>
                      <p className="text-slate-500">
                        {job.employmentType} • {job.workMode} • {job._count?.applications ?? 0} applications
                      </p>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <JobStatusBadge status={job.status} moderationStatus={job.moderationStatus} />
                      <Link
                        to={`/admin/jobs/${job.id}`}
                        className="font-semibold text-brand hover:underline"
                      >
                        Review
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Approval & Status History */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <h2 className="text-sm font-bold text-slate-900">Approval & Status History</h2>
            <div className="mt-3 divide-y divide-slate-100">
              {(company.statusHistory || []).length === 0 ? (
                <p className="py-4 text-xs text-slate-400">No status transitions recorded yet.</p>
              ) : (
                company.statusHistory.map((h) => (
                  <div key={h.id} className="py-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-800">
                        {h.previousStatus || "INITIAL"} → {h.newStatus}
                      </span>
                      <span className="text-slate-400">
                        {new Date(h.createdAt).toLocaleString()}
                      </span>
                    </div>
                    {h.reason && <p className="mt-0.5 text-slate-600">Reason: {h.reason}</p>}
                    {h.changedBy && (
                      <p className="text-[11px] text-slate-400">
                        By: {h.changedBy.fullName} ({h.changedBy.email})
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      <ApprovalDialog
        open={approveOpen}
        title={`Approve ${company.name}`}
        description="Approving this company allows its recruiters to publish job listings."
        confirmLabel="Approve Company"
        loading={submitting}
        onClose={() => setApproveOpen(false)}
        onConfirm={handleApprove}
      />
      <RejectionDialog
        open={rejectOpen}
        title={`Reject ${company.name}`}
        description="Please provide the reason for rejecting this company registration."
        confirmLabel="Reject Company"
        loading={submitting}
        onClose={() => setRejectOpen(false)}
        onConfirm={handleReject}
      />
      <SuspensionDialog
        open={suspendOpen}
        title={`Suspend ${company.name}`}
        description="Please provide the reason for suspending this company."
        confirmLabel="Suspend Company"
        loading={submitting}
        onClose={() => setSuspendOpen(false)}
        onConfirm={handleSuspend}
      />
    </div>
  );
}
