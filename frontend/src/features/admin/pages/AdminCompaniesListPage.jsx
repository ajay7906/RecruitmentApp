import { useState, useEffect, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Eye, CheckCircle2, XCircle, Ban, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { adminApi } from "../api/adminApi";
import { AdminSearch } from "../components/AdminSearch";
import { AdminFilters } from "../components/AdminFilters";
import { AdminDataTable } from "../components/AdminDataTable";
import { CompanyStatusBadge } from "../components/CompanyStatusBadge";
import { ApprovalDialog } from "../components/ApprovalDialog";
import { RejectionDialog } from "../components/RejectionDialog";
import { SuspensionDialog } from "../components/SuspensionDialog";

export function AdminCompaniesListPage({ approvalsOnly = false }) {
  const [searchParams] = useSearchParams();
  const [q, setQ] = useState(searchParams.get("q") || "");
  const [statusFilter, setStatusFilter] = useState(
    approvalsOnly ? "PENDING_APPROVAL" : searchParams.get("status") || ""
  );
  const [industry, setIndustry] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ companies: [], counts: {}, pagination: null });
  const [loading, setLoading] = useState(true);

  const [approveModal, setApproveModal] = useState({ open: false, company: null });
  const [rejectModal, setRejectModal] = useState({ open: false, company: null });
  const [suspendModal, setSuspendModal] = useState({ open: false, company: null });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (approvalsOnly) {
      setStatusFilter("PENDING_APPROVAL");
      setPage(1);
    }
  }, [approvalsOnly]);

  const fetchCompanies = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.listCompanies({
        q: q || undefined,
        status: statusFilter || undefined,
        industry: industry || undefined,
        page,
        limit: 20,
      });
      setData(res);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to load companies");
    } finally {
      setLoading(false);
    }
  }, [q, statusFilter, industry, page]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

  async function handleApprove({ reason }) {
    if (!approveModal.company) return;
    setSubmitting(true);
    try {
      await adminApi.approveCompany(approveModal.company.id, { reason });
      toast.success(`Approved ${approveModal.company.name}`);
      setApproveModal({ open: false, company: null });
      fetchCompanies();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Approval failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReject({ reason }) {
    if (!rejectModal.company) return;
    setSubmitting(true);
    try {
      await adminApi.rejectCompany(rejectModal.company.id, { reason });
      toast.success(`Rejected ${rejectModal.company.name}`);
      setRejectModal({ open: false, company: null });
      fetchCompanies();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Rejection failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleSuspend({ reason }) {
    if (!suspendModal.company) return;
    setSubmitting(true);
    try {
      await adminApi.suspendCompany(suspendModal.company.id, { reason });
      toast.success(`Suspended ${suspendModal.company.name}`);
      setSuspendModal({ open: false, company: null });
      fetchCompanies();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Suspension failed");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReactivate(company) {
    try {
      await adminApi.activateCompany(company.id, {
        reason: "Reactivated by platform administrator",
      });
      toast.success(`Reactivated ${company.name}`);
      fetchCompanies();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to reactivate company");
    }
  }

  const columns = [
    {
      key: "name",
      header: "Company",
      render: (row) => (
        <div>
          <p className="font-semibold text-slate-900">{row.name}</p>
          <p className="text-xs text-slate-500">
            {row.industry || "Industry N/A"} • {row.companySize || "Size N/A"}
          </p>
        </div>
      ),
    },
    {
      key: "owner",
      header: "Owner / Contact",
      render: (row) => (
        <div>
          <p className="text-xs font-medium text-slate-800">
            {row.owner?.fullName || "—"}
          </p>
          <p className="text-xs text-slate-500">{row.owner?.email || row.email}</p>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => <CompanyStatusBadge status={row.status} />,
    },
    {
      key: "metrics",
      header: "Team & Jobs",
      render: (row) => (
        <span className="text-xs text-slate-600">
          {row.recruiterCount ?? 1} recruiters • {row.jobsCount ?? 0} jobs
        </span>
      ),
    },
    {
      key: "createdAt",
      header: "Registered",
      render: (row) => (
        <span className="text-xs text-slate-500">
          {new Date(row.createdAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Actions",
      render: (row) => (
        <div className="flex flex-wrap items-center gap-1.5">
          <Link
            to={`/admin/companies/${row.id}`}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Eye size={13} /> Inspect
          </Link>
          {row.status === "PENDING_APPROVAL" && (
            <>
              <button
                type="button"
                onClick={() => setApproveModal({ open: true, company: row })}
                className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700"
              >
                <CheckCircle2 size={13} /> Approve
              </button>
              <button
                type="button"
                onClick={() => setRejectModal({ open: true, company: row })}
                className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-rose-700"
              >
                <XCircle size={13} /> Reject
              </button>
            </>
          )}
          {row.status === "APPROVED" && (
            <button
              type="button"
              onClick={() => setSuspendModal({ open: true, company: row })}
              className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100"
            >
              <Ban size={13} /> Suspend
            </button>
          )}
          {row.status === "SUSPENDED" && (
            <button
              type="button"
              onClick={() => handleReactivate(row)}
              className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
            >
              <RotateCcw size={13} /> Reactivate
            </button>
          )}
        </div>
      ),
    },
  ];

  const counts = data.counts || {};

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          {approvalsOnly ? "Company Registration Approvals" : "Company Management"}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {approvalsOnly
            ? "Verify and approve pending company registrations submitted by recruiters."
            : "Oversee all registered organizations, approval states, recruiters, and job listings."}
        </p>
      </div>

      {/* Status Quick Filter Pills */}
      <div className="flex flex-wrap gap-2">
        {[
          { key: "", label: `All (${counts.ALL ?? 0})` },
          { key: "PENDING_APPROVAL", label: `Pending Approval (${counts.PENDING_APPROVAL ?? 0})` },
          { key: "APPROVED", label: `Approved (${counts.APPROVED ?? 0})` },
          { key: "REJECTED", label: `Rejected (${counts.REJECTED ?? 0})` },
          { key: "SUSPENDED", label: `Suspended (${counts.SUSPENDED ?? 0})` },
          { key: "DRAFT", label: `Draft (${counts.DRAFT ?? 0})` },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => {
              setStatusFilter(tab.key);
              setPage(1);
            }}
            className={`rounded-xl border px-3.5 py-1.5 text-xs font-semibold transition ${
              statusFilter === tab.key
                ? "border-brand bg-brand text-white"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <AdminSearch
          value={q}
          onChange={(val) => {
            setQ(val);
            setPage(1);
          }}
          placeholder="Search company name, email, GSTIN, CIN, city..."
        />
        <AdminFilters
          values={{ industry }}
          onChange={(_, val) => {
            setIndustry(val);
            setPage(1);
          }}
          onReset={() => {
            setQ("");
            setIndustry("");
            if (!approvalsOnly) setStatusFilter("");
            setPage(1);
          }}
          filters={[
            {
              key: "industry",
              label: "Industry",
              options: [
                "Information Technology",
                "Finance & Banking",
                "Healthcare",
                "E-Commerce",
                "Manufacturing",
                "Education",
                "Consulting",
              ],
            },
          ]}
        />
      </div>

      <AdminDataTable
        columns={columns}
        rows={data.companies || []}
        loading={loading}
        pagination={data.pagination}
        onPageChange={setPage}
      />

      <ApprovalDialog
        open={approveModal.open}
        title={`Approve ${approveModal.company?.name || "Company"}`}
        description="Approving this company enables its associated recruiters to publish job openings on the platform."
        confirmLabel="Approve Company"
        loading={submitting}
        onClose={() => setApproveModal({ open: false, company: null })}
        onConfirm={handleApprove}
      />

      <RejectionDialog
        open={rejectModal.open}
        title={`Reject ${rejectModal.company?.name || "Company"}`}
        description="Provide the reason why this company registration cannot be approved. The company owner will see this feedback."
        confirmLabel="Reject Company"
        loading={submitting}
        onClose={() => setRejectModal({ open: false, company: null })}
        onConfirm={handleReject}
      />

      <SuspensionDialog
        open={suspendModal.open}
        title={`Suspend ${suspendModal.company?.name || "Company"}`}
        description="Suspending this company blocks new job publications until reactivated by an administrator."
        confirmLabel="Suspend Company"
        loading={submitting}
        onClose={() => setSuspendModal({ open: false, company: null })}
        onConfirm={handleSuspend}
      />
    </div>
  );
}
