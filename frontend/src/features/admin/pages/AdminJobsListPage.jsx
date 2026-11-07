import { useState, useEffect, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Eye, CheckCircle2, XCircle, Ban, Lock } from "lucide-react";
import { toast } from "sonner";
import { adminApi } from "../api/adminApi";
import { AdminSearch } from "../components/AdminSearch";
import { AdminFilters } from "../components/AdminFilters";
import { AdminDataTable } from "../components/AdminDataTable";
import { JobStatusBadge } from "../components/JobStatusBadge";
import { ApprovalDialog } from "../components/ApprovalDialog";
import { RejectionDialog } from "../components/RejectionDialog";
import { SuspensionDialog } from "../components/SuspensionDialog";

export function AdminJobsListPage({ approvalsOnly = false }) {
  const [searchParams] = useSearchParams();
  const [q, setQ] = useState(searchParams.get("q") || "");
  const [statusFilter, setStatusFilter] = useState(searchParams.get("status") || "");
  const [pendingOnly, setPendingOnly] = useState(approvalsOnly);
  const [filters, setFilters] = useState({
    employmentType: "",
    workMode: "",
  });
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ jobs: [], counts: {}, pagination: null });
  const [loading, setLoading] = useState(true);

  const [approveModal, setApproveModal] = useState({ open: false, job: null });
  const [rejectModal, setRejectModal] = useState({ open: false, job: null });
  const [closeModal, setCloseModal] = useState({ open: false, job: null });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setPendingOnly(approvalsOnly);
    setPage(1);
  }, [approvalsOnly]);

  const fetchJobs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.listJobs({
        q: q || undefined,
        status: statusFilter || undefined,
        pendingOnly: pendingOnly || undefined,
        employmentType: filters.employmentType || undefined,
        workMode: filters.workMode || undefined,
        page,
        limit: 20,
      });
      setData(res);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to load jobs");
    } finally {
      setLoading(false);
    }
  }, [q, statusFilter, pendingOnly, filters, page]);

  useEffect(() => {
    fetchJobs();
  }, [fetchJobs]);

  async function handleApprove({ notes, reason }) {
    if (!approveModal.job) return;
    setSubmitting(true);
    try {
      await adminApi.approveJob(approveModal.job.id, { notes, reason });
      toast.success(`Approved & published "${approveModal.job.title}"`);
      setApproveModal({ open: false, job: null });
      fetchJobs();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to approve job");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleReject({ reason, category }) {
    if (!rejectModal.job) return;
    setSubmitting(true);
    try {
      await adminApi.rejectJob(rejectModal.job.id, { reason, category });
      toast.success(`Rejected "${rejectModal.job.title}"`);
      setRejectModal({ open: false, job: null });
      fetchJobs();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to reject job");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCloseJob({ reason }) {
    if (!closeModal.job) return;
    setSubmitting(true);
    try {
      await adminApi.closeJob(closeModal.job.id, { reason });
      toast.success(`Closed "${closeModal.job.title}"`);
      setCloseModal({ open: false, job: null });
      fetchJobs();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to close job");
    } finally {
      setSubmitting(false);
    }
  }

  const columns = [
    {
      key: "title",
      header: "Job Vacancy",
      render: (row) => (
        <div>
          <p className="font-semibold text-slate-900">{row.title}</p>
          <p className="text-xs text-slate-500">
            {row.company?.name} • {row.employmentType?.replace("_", " ")} • {row.workMode}
          </p>
        </div>
      ),
    },
    {
      key: "creator",
      header: "Recruiter",
      render: (row) => (
        <div className="text-xs">
          <p className="font-medium text-slate-800">{row.createdBy?.fullName || "—"}</p>
          <p className="text-slate-500">{row.createdBy?.email}</p>
        </div>
      ),
    },
    {
      key: "status",
      header: "Status & Moderation",
      render: (row) => (
        <JobStatusBadge status={row.status} moderationStatus={row.moderationStatus} />
      ),
    },
    {
      key: "applications",
      header: "Apps / Reports",
      render: (row) => (
        <div className="text-xs text-slate-600">
          <span>{row.applicationsCount ?? 0} apps</span>
          {row.reportCount > 0 && (
            <span className="ml-2 rounded bg-rose-50 px-1.5 py-0.5 font-semibold text-rose-700">
              {row.reportCount} reports
            </span>
          )}
        </div>
      ),
    },
    {
      key: "createdAt",
      header: "Created",
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
            to={`/admin/jobs/${row.id}`}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Eye size={13} /> Review
          </Link>
          {row.status !== "PUBLISHED" && row.status !== "CLOSED" && (
            <button
              type="button"
              onClick={() => setApproveModal({ open: true, job: row })}
              className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700"
            >
              <CheckCircle2 size={13} /> Approve
            </button>
          )}
          {row.status !== "REJECTED" && (
            <button
              type="button"
              onClick={() => setRejectModal({ open: true, job: row })}
              className="inline-flex items-center gap-1 rounded-lg bg-rose-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-rose-700"
            >
              <XCircle size={13} /> Reject
            </button>
          )}
          {row.status === "PUBLISHED" && (
            <button
              type="button"
              onClick={() => setCloseModal({ open: true, job: row })}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Lock size={13} /> Close
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
          {approvalsOnly ? "Job Approvals & Moderation Queue" : "Job Management"}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {approvalsOnly
            ? "Review pending, flagged, or under-review job postings and enforce platform quality standards."
            : "Monitor all job vacancies across companies, approve publications, or restrict policy-violating listings."}
        </p>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            setPendingOnly(false);
            setStatusFilter("");
            setPage(1);
          }}
          className={`rounded-xl border px-3.5 py-1.5 text-xs font-semibold transition ${
            !pendingOnly && statusFilter === ""
              ? "border-brand bg-brand text-white"
              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
          }`}
        >
          All Jobs ({counts.ALL ?? 0})
        </button>
        <button
          type="button"
          onClick={() => {
            setPendingOnly(true);
            setStatusFilter("");
            setPage(1);
          }}
          className={`rounded-xl border px-3.5 py-1.5 text-xs font-semibold transition ${
            pendingOnly
              ? "border-brand bg-brand text-white"
              : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
          }`}
        >
          Moderation Queue ({(counts.PENDING_APPROVAL ?? 0) + (counts.UNDER_REVIEW ?? 0) + (counts.FLAGGED ?? 0)})
        </button>
        {[
          { key: "PUBLISHED", label: `Published (${counts.PUBLISHED ?? 0})` },
          { key: "PAUSED", label: `Paused (${counts.PAUSED ?? 0})` },
          { key: "CLOSED", label: `Closed (${counts.CLOSED ?? 0})` },
          { key: "REJECTED", label: `Rejected (${counts.REJECTED ?? 0})` },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => {
              setPendingOnly(false);
              setStatusFilter(tab.key);
              setPage(1);
            }}
            className={`rounded-xl border px-3.5 py-1.5 text-xs font-semibold transition ${
              !pendingOnly && statusFilter === tab.key
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
          placeholder="Search job title, company, department, category..."
        />
        <AdminFilters
          values={filters}
          onChange={(k, v) => {
            setFilters((p) => ({ ...p, [k]: v }));
            setPage(1);
          }}
          onReset={() => {
            setQ("");
            setFilters({ employmentType: "", workMode: "" });
            setPage(1);
          }}
          filters={[
            {
              key: "employmentType",
              label: "Type",
              options: ["FULL_TIME", "PART_TIME", "INTERNSHIP", "CONTRACT", "FREELANCE"],
            },
            {
              key: "workMode",
              label: "Work Mode",
              options: ["ON_SITE", "REMOTE", "HYBRID"],
            },
          ]}
        />
      </div>

      <AdminDataTable
        columns={columns}
        rows={data.jobs || []}
        loading={loading}
        pagination={data.pagination}
        onPageChange={setPage}
      />

      <ApprovalDialog
        open={approveModal.open}
        title={`Approve & Publish "${approveModal.job?.title || "Job"}"`}
        description="This job will be cleared of flags and published immediately to candidate search."
        confirmLabel="Approve & Publish"
        loading={submitting}
        onClose={() => setApproveModal({ open: false, job: null })}
        onConfirm={handleApprove}
      />

      <RejectionDialog
        open={rejectModal.open}
        title={`Reject "${rejectModal.job?.title || "Job"}"`}
        description="Select a moderation category and provide a reason for rejecting this job vacancy."
        confirmLabel="Reject Job"
        showCategory
        loading={submitting}
        onClose={() => setRejectModal({ open: false, job: null })}
        onConfirm={handleReject}
      />

      <SuspensionDialog
        open={closeModal.open}
        title={`Close "${closeModal.job?.title || "Job"}"`}
        description="Closing this job stops new applications while preserving all existing candidate applications."
        confirmLabel="Close Job"
        loading={submitting}
        onClose={() => setCloseModal({ open: false, job: null })}
        onConfirm={handleCloseJob}
      />
    </div>
  );
}
