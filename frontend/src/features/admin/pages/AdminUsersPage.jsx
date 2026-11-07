import { useState, useEffect, useCallback } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Eye, ShieldAlert, CheckCircle2, Ban } from "lucide-react";
import { toast } from "sonner";
import { adminApi } from "../api/adminApi";
import { AdminSearch } from "../components/AdminSearch";
import { AdminFilters } from "../components/AdminFilters";
import { AdminDataTable } from "../components/AdminDataTable";
import { UserStatusBadge, AdminRoleBadge } from "../components/UserStatusBadge";
import { SuspensionDialog } from "../components/SuspensionDialog";

export function AdminUsersPage() {
  const [searchParams] = useSearchParams();
  const [q, setQ] = useState(searchParams.get("q") || "");
  const [filters, setFilters] = useState({
    role: searchParams.get("role") || "",
    status: searchParams.get("status") || "",
    sortBy: "createdAt",
    sortOrder: "desc",
  });
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ users: [], pagination: null });
  const [loading, setLoading] = useState(true);
  const [statusDialog, setStatusDialog] = useState({ open: false, user: null, targetStatus: null });
  const [submitting, setSubmitting] = useState(false);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.listUsers({
        q: q || undefined,
        role: filters.role || undefined,
        status: filters.status || undefined,
        sortBy: filters.sortBy,
        sortOrder: filters.sortOrder,
        page,
        limit: 20,
      });
      setData(res);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to load users");
    } finally {
      setLoading(false);
    }
  }, [q, filters, page]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  async function handleQuickActivate(user) {
    try {
      await adminApi.updateUserStatus(user.id, {
        status: "ACTIVE",
        reason: "Reactivated by platform administrator",
      });
      toast.success(`Activated ${user.fullName}`);
      fetchUsers();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to activate user");
    }
  }

  async function handleConfirmStatusChange({ reason }) {
    if (!statusDialog.user) return;
    setSubmitting(true);
    try {
      await adminApi.updateUserStatus(statusDialog.user.id, {
        status: statusDialog.targetStatus,
        reason,
      });
      toast.success(`User status updated to ${statusDialog.targetStatus}`);
      setStatusDialog({ open: false, user: null, targetStatus: null });
      fetchUsers();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to update user status");
    } finally {
      setSubmitting(false);
    }
  }

  const columns = [
    {
      key: "user",
      header: "User",
      render: (row) => (
        <div>
          <p className="font-semibold text-slate-900">{row.fullName}</p>
          <p className="text-xs text-slate-500">{row.email}</p>
          {row.phone && <p className="text-[11px] text-slate-400">{row.phone}</p>}
        </div>
      ),
    },
    {
      key: "role",
      header: "Role",
      render: (row) => (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-bold uppercase text-slate-700">
            {row.role}
          </span>
          {row.adminRole && <AdminRoleBadge role={row.adminRole} />}
        </div>
      ),
    },
    {
      key: "status",
      header: "Account Status",
      render: (row) => <UserStatusBadge status={row.statusBadge} />,
    },
    {
      key: "activity",
      header: "Platform Activity",
      render: (row) => (
        <div className="text-xs text-slate-600">
          {row.role === "candidate" ? (
            <span>{row._count?.jobApplications ?? 0} applications</span>
          ) : row.role === "recruiter" ? (
            <span>
              {row.recruiterProfile?.company?.name || `${row._count?.ownedCompanies ?? 0} companies`} •{" "}
              {row._count?.createdJobs ?? 0} jobs
            </span>
          ) : (
            <span>Platform Administration</span>
          )}
        </div>
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
        <div className="flex items-center gap-2">
          <Link
            to={`/admin/users/${row.id}`}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
          >
            <Eye size={13} /> Details
          </Link>
          {row.status === "active" ? (
            <button
              type="button"
              onClick={() =>
                setStatusDialog({ open: true, user: row, targetStatus: "SUSPENDED" })
              }
              className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100"
            >
              <Ban size={13} /> Suspend
            </button>
          ) : (
            <button
              type="button"
              onClick={() => handleQuickActivate(row)}
              className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
            >
              <CheckCircle2 size={13} /> Activate
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          User Management
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Search, inspect, verify, suspend, or reactivate candidate, recruiter, and admin accounts.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <AdminSearch
          value={q}
          onChange={(val) => {
            setQ(val);
            setPage(1);
          }}
          placeholder="Search by full name, email, or phone..."
        />
        <AdminFilters
          values={filters}
          onChange={(key, val) => {
            setFilters((prev) => ({ ...prev, [key]: val }));
            setPage(1);
          }}
          onReset={() => {
            setQ("");
            setFilters({ role: "", status: "", sortBy: "createdAt", sortOrder: "desc" });
            setPage(1);
          }}
          filters={[
            {
              key: "role",
              label: "Role",
              options: [
                { value: "CANDIDATE", label: "Candidate" },
                { value: "RECRUITER", label: "Recruiter" },
                { value: "ADMIN", label: "Admin" },
              ],
            },
            {
              key: "status",
              label: "Status",
              options: [
                { value: "ACTIVE", label: "Active" },
                { value: "SUSPENDED", label: "Suspended" },
                { value: "INACTIVE", label: "Inactive" },
                { value: "PENDING_VERIFICATION", label: "Pending Verification" },
              ],
            },
            {
              key: "sortBy",
              label: "Sort",
              options: [
                { value: "createdAt", label: "Registration Date" },
                { value: "fullName", label: "Name" },
                { value: "email", label: "Email" },
                { value: "lastLoginAt", label: "Last Login" },
              ],
            },
          ]}
        />
      </div>

      <AdminDataTable
        columns={columns}
        rows={data.users || []}
        loading={loading}
        pagination={data.pagination}
        onPageChange={setPage}
      />

      <SuspensionDialog
        open={statusDialog.open}
        title={`Suspend ${statusDialog.user?.fullName || "User"}`}
        description="Suspending this user immediately invalidates their active login sessions and prevents access until reactivated."
        confirmLabel="Suspend User"
        loading={submitting}
        onClose={() => setStatusDialog({ open: false, user: null, targetStatus: null })}
        onConfirm={handleConfirmStatusChange}
      />
    </div>
  );
}
