import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  Mail,
  Phone,
  Calendar,
  Ban,
  CheckCircle2,
  UserX,
  Building2,
  BriefcaseBusiness,
  FileText,
  Save,
} from "lucide-react";
import { toast } from "sonner";
import { adminApi } from "../api/adminApi";
import { UserStatusBadge, AdminRoleBadge } from "../components/UserStatusBadge";
import { SuspensionDialog } from "../components/SuspensionDialog";

export function AdminUserDetailsPage() {
  const { id } = useParams();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editForm, setEditForm] = useState({ fullName: "", emailVerified: false });
  const [savingEdit, setSavingEdit] = useState(false);
  const [statusModal, setStatusModal] = useState({ open: false, targetStatus: null });
  const [statusSaving, setStatusSaving] = useState(false);

  const loadUser = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getUserDetails(id);
      setUser(res);
      setEditForm({
        fullName: res.fullName || "",
        emailVerified: Boolean(res.emailVerified),
      });
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to load user details");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  async function handleSaveProfile(e) {
    e.preventDefault();
    setSavingEdit(true);
    try {
      const updated = await adminApi.updateUser(id, editForm);
      setUser(updated);
      toast.success("User profile updated");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to update user");
    } finally {
      setSavingEdit(false);
    }
  }

  async function handleActivateUser() {
    setStatusSaving(true);
    try {
      const updated = await adminApi.updateUserStatus(id, {
        status: "ACTIVE",
        reason: "Account activated by administrator",
      });
      setUser(updated);
      toast.success("User account activated");
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to activate user");
    } finally {
      setStatusSaving(false);
    }
  }

  async function handleConfirmStatus({ reason }) {
    setStatusSaving(true);
    try {
      const updated = await adminApi.updateUserStatus(id, {
        status: statusModal.targetStatus,
        reason,
      });
      setUser(updated);
      setStatusModal({ open: false, targetStatus: null });
      toast.success(`User marked as ${statusModal.targetStatus}`);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to update status");
    } finally {
      setStatusSaving(false);
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-sm text-slate-500">Loading user profile...</div>;
  }

  if (!user) {
    return <div className="p-8 text-center text-sm text-slate-500">User not found.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/admin/users"
            className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
          >
            <ArrowLeft size={16} />
          </Link>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-2xl font-bold text-slate-900">{user.fullName}</h1>
              <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-bold uppercase text-slate-700">
                {user.role}
              </span>
              {user.adminRole && <AdminRoleBadge role={user.adminRole} />}
              <UserStatusBadge status={user.statusBadge} />
            </div>
            <p className="mt-0.5 text-xs text-slate-500">User ID: {user.id}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {user.status !== "active" && (
            <button
              type="button"
              disabled={statusSaving}
              onClick={handleActivateUser}
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-emerald-700"
            >
              <CheckCircle2 size={14} /> Activate Account
            </button>
          )}
          {user.status !== "suspended" && (
            <button
              type="button"
              disabled={statusSaving}
              onClick={() => setStatusModal({ open: true, targetStatus: "SUSPENDED" })}
              className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-rose-700"
            >
              <Ban size={14} /> Suspend Account
            </button>
          )}
          {user.status !== "inactive" && (
            <button
              type="button"
              disabled={statusSaving}
              onClick={() => setStatusModal({ open: true, targetStatus: "INACTIVE" })}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <UserX size={14} /> Deactivate
            </button>
          )}
        </div>
      </div>

      {user.status === "suspended" && user.suspensionReason && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800">
          <p className="font-bold">Account Suspended</p>
          <p className="mt-1 text-xs">
            Reason: {user.suspensionReason} • Suspended at:{" "}
            {user.suspendedAt ? new Date(user.suspendedAt).toLocaleString() : "N/A"}
          </p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Account Overview & Edit Form */}
        <div className="space-y-6 lg:col-span-1">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <h2 className="text-sm font-bold text-slate-900">Account Information</h2>
            <div className="mt-4 space-y-3 text-xs text-slate-600">
              <div className="flex items-center gap-2">
                <Mail size={14} className="text-slate-400" />
                <span>{user.email}</span>
              </div>
              {user.phone && (
                <div className="flex items-center gap-2">
                  <Phone size={14} className="text-slate-400" />
                  <span>{user.phone}</span>
                </div>
              )}
              <div className="flex items-center gap-2">
                <Calendar size={14} className="text-slate-400" />
                <span>Registered {new Date(user.createdAt).toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2">
                <Calendar size={14} className="text-slate-400" />
                <span>
                  Last Login:{" "}
                  {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : "Never"}
                </span>
              </div>
            </div>

            <form onSubmit={handleSaveProfile} className="mt-5 space-y-3 border-t border-slate-100 pt-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700">Full Name</label>
                <input
                  type="text"
                  value={editForm.fullName}
                  onChange={(e) => setEditForm((p) => ({ ...p, fullName: e.target.value }))}
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-900"
                />
              </div>
              <label className="flex items-center gap-2 text-xs font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={editForm.emailVerified}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, emailVerified: e.target.checked }))
                  }
                  className="h-4 w-4 rounded border-slate-300 text-brand"
                />
                Email Verified
              </label>
              <button
                type="submit"
                disabled={savingEdit}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-brand px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                <Save size={14} /> {savingEdit ? "Saving..." : "Save Profile Changes"}
              </button>
            </form>
          </div>

          {/* Role-Specific Profile Summary */}
          {user.candidateProfile && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <h2 className="text-sm font-bold text-slate-900">Candidate Profile</h2>
              <p className="mt-2 text-xs text-slate-700">
                <span className="font-semibold">Headline:</span>{" "}
                {user.candidateProfile.headline || "—"}
              </p>
              <p className="mt-1 text-xs text-slate-700">
                <span className="font-semibold">Experience:</span>{" "}
                {user.candidateProfile.yearsOfExperience ?? 0} yrs
              </p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {(user.candidateProfile.skills || []).map((sk) => (
                  <span
                    key={sk}
                    className="rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-medium text-brand"
                  >
                    {sk}
                  </span>
                ))}
              </div>
            </div>
          )}

          {user.recruiterProfile && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <h2 className="text-sm font-bold text-slate-900">Recruiter Profile</h2>
              <p className="mt-2 text-xs text-slate-700">
                <span className="font-semibold">Designation:</span>{" "}
                {user.recruiterProfile.designation || "—"}
              </p>
              <p className="mt-1 text-xs text-slate-700">
                <span className="font-semibold">Department:</span>{" "}
                {user.recruiterProfile.department || "—"}
              </p>
            </div>
          )}
        </div>

        {/* Associated Entities & History */}
        <div className="space-y-6 lg:col-span-2">
          {/* Associated Companies */}
          {(user.companyMemberships?.length > 0 || user.ownedCompanies?.length > 0) && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <Building2 size={16} className="text-brand" /> Associated Companies
              </h2>
              <div className="mt-3 divide-y divide-slate-100">
                {(user.companyMemberships || []).map((m) => (
                  <div key={m.id} className="flex items-center justify-between py-2.5 text-xs">
                    <div>
                      <p className="font-semibold text-slate-900">{m.company?.name}</p>
                      <p className="text-slate-500">
                        Company Role: {m.role} • Status: {m.company?.status}
                      </p>
                    </div>
                    <Link
                      to={`/admin/companies/${m.companyId}`}
                      className="font-semibold text-brand hover:underline"
                    >
                      View Company
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Jobs Created (for Recruiters) */}
          {user.recentJobs?.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <BriefcaseBusiness size={16} className="text-indigo-600" /> Jobs Created ({user._count?.createdJobs || user.recentJobs.length})
              </h2>
              <div className="mt-3 divide-y divide-slate-100">
                {user.recentJobs.map((j) => (
                  <div key={j.id} className="flex items-center justify-between py-2.5 text-xs">
                    <div>
                      <p className="font-semibold text-slate-900">{j.title}</p>
                      <p className="text-slate-500">
                        {j.company?.name} • {j.status}
                      </p>
                    </div>
                    <Link
                      to={`/admin/jobs/${j.id}`}
                      className="font-semibold text-brand hover:underline"
                    >
                      Inspect Job
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Applications (for Candidates) */}
          {user.recentApplications?.length > 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <FileText size={16} className="text-amber-600" /> Recent Applications ({user._count?.jobApplications || user.recentApplications.length})
              </h2>
              <div className="mt-3 divide-y divide-slate-100">
                {user.recentApplications.map((app) => (
                  <div key={app.id} className="flex items-center justify-between py-2.5 text-xs">
                    <div>
                      <p className="font-semibold text-slate-900">{app.job?.title}</p>
                      <p className="text-slate-500">
                        {app.company?.name} • Stage: {app.status}
                      </p>
                    </div>
                    <span className="text-slate-400">
                      {new Date(app.appliedAt).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Account Status History */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <h2 className="text-sm font-bold text-slate-900">Account Status History</h2>
            <div className="mt-3 divide-y divide-slate-100">
              {(user.accountStatusHistory || []).length === 0 ? (
                <p className="py-4 text-xs text-slate-400">No status changes recorded.</p>
              ) : (
                user.accountStatusHistory.map((h) => (
                  <div key={h.id} className="py-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-800">
                        {h.previousStatus || "INITIAL"} → {h.newStatus.toUpperCase()}
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

      <SuspensionDialog
        open={statusModal.open}
        title={`${statusModal.targetStatus === "SUSPENDED" ? "Suspend" : "Deactivate"} ${user.fullName}`}
        description="Please provide a reason for this account status change. Active sessions will be revoked immediately."
        confirmLabel={statusModal.targetStatus === "SUSPENDED" ? "Suspend Account" : "Deactivate Account"}
        loading={statusSaving}
        onClose={() => setStatusModal({ open: false, targetStatus: null })}
        onConfirm={handleConfirmStatus}
      />
    </div>
  );
}
