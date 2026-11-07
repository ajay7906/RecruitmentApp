import { useState, useEffect, useCallback } from "react";
import { UserPlus, Shield, X, Settings2 } from "lucide-react";
import { toast } from "sonner";
import { adminApi } from "../api/adminApi";
import { AdminDataTable } from "../components/AdminDataTable";
import { AdminRoleBadge, UserStatusBadge } from "../components/UserStatusBadge";
import { AdminRoleSelector } from "../components/AdminRoleSelector";
import { useAuthStore } from "../../../stores/authStore";

export function AdminAdministratorsPage() {
  const currentUser = useAuthStore((s) => s.user);
  const isSuperAdmin = currentUser?.adminRole === "SUPER_ADMIN";
  const canManage =
    isSuperAdmin ||
    !Array.isArray(currentUser?.permissions) ||
    currentUser.permissions.includes("admins.manage");

  const [admins, setAdmins] = useState([]);
  const [catalog, setCatalog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    email: "",
    fullName: "",
    password: "",
    adminRole: "ADMIN",
    reason: "",
  });
  const [roleModal, setRoleModal] = useState({ open: false, admin: null, adminRole: "ADMIN", reason: "" });
  const [overrideModal, setOverrideModal] = useState({ open: false, admin: null, overrides: {} });
  const [submitting, setSubmitting] = useState(false);

  const loadAdmins = useCallback(async () => {
    setLoading(true);
    try {
      const [admRes, permRes] = await Promise.all([
        adminApi.listAdministrators(),
        adminApi.getPermissionsCatalog().catch(() => ({ catalog: [] })),
      ]);
      setAdmins(admRes?.administrators || []);
      setCatalog(permRes?.catalog || []);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to load administrators");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAdmins();
  }, [loadAdmins]);

  async function handleCreateAdmin(e) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await adminApi.createAdministrator({
        email: createForm.email.trim(),
        fullName: createForm.fullName.trim() || undefined,
        password: createForm.password || undefined,
        adminRole: createForm.adminRole,
        reason: createForm.reason.trim() || "Assigned via Admin Console",
      });
      toast.success("Administrator provisioned");
      setCreateOpen(false);
      setCreateForm({ email: "", fullName: "", password: "", adminRole: "ADMIN", reason: "" });
      loadAdmins();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to create administrator");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleRoleChange(e) {
    e.preventDefault();
    if (!roleModal.admin) return;
    if (roleModal.reason.trim().length < 5) {
      toast.error("Please provide a reason of at least 5 characters");
      return;
    }
    setSubmitting(true);
    try {
      await adminApi.updateAdministratorRole(roleModal.admin.id, {
        adminRole: roleModal.adminRole,
        reason: roleModal.reason.trim(),
      });
      toast.success("Administrative role updated");
      setRoleModal({ open: false, admin: null, adminRole: "ADMIN", reason: "" });
      loadAdmins();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to update role");
    } finally {
      setSubmitting(false);
    }
  }

  function openOverrideModal(adm) {
    const map = {};
    for (const ov of adm.adminUserPermissions || []) {
      map[ov.permission] = ov.effect;
    }
    setOverrideModal({ open: true, admin: adm, overrides: map });
  }

  async function handleSaveOverrides() {
    if (!overrideModal.admin) return;
    setSubmitting(true);
    try {
      const overridesArray = Object.entries(overrideModal.overrides)
        .filter(([, effect]) => effect === "GRANT" || effect === "DENY")
        .map(([permission, effect]) => ({ permission, effect }));

      await adminApi.updateAdministratorPermissions(overrideModal.admin.id, {
        overrides: overridesArray,
        reason: "Updated per-user permission overrides",
      });
      toast.success("Permission overrides updated");
      setOverrideModal({ open: false, admin: null, overrides: {} });
      loadAdmins();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to update permission overrides");
    } finally {
      setSubmitting(false);
    }
  }

  const columns = [
    {
      key: "name",
      header: "Administrator",
      render: (row) => (
        <div>
          <p className="font-semibold text-slate-900">{row.fullName}</p>
          <p className="text-xs text-slate-500">{row.email}</p>
        </div>
      ),
    },
    {
      key: "adminRole",
      header: "Administrative Role",
      render: (row) => <AdminRoleBadge role={row.adminRole || "ADMIN"} />,
    },
    {
      key: "status",
      header: "Status",
      render: (row) => <UserStatusBadge status={row.status?.toUpperCase()} />,
    },
    {
      key: "permissions",
      header: "Effective Permissions",
      render: (row) => (
        <span className="text-xs font-medium text-slate-600">
          {row.effectivePermissions?.length ?? 0} granted
          {row.adminUserPermissions?.length > 0 && (
            <span className="ml-1.5 rounded bg-indigo-50 px-1.5 py-0.5 text-[11px] font-semibold text-indigo-700">
              {row.adminUserPermissions.length} overrides
            </span>
          )}
        </span>
      ),
    },
    {
      key: "lastLoginAt",
      header: "Last Login",
      render: (row) => (
        <span className="text-xs text-slate-500">
          {row.lastLoginAt ? new Date(row.lastLoginAt).toLocaleString() : "Never"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Governance",
      render: (row) =>
        canManage && row.id !== currentUser?.id ? (
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() =>
                setRoleModal({
                  open: true,
                  admin: row,
                  adminRole: row.adminRole || "ADMIN",
                  reason: "",
                })
              }
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              <Shield size={13} /> Change Role
            </button>
            {row.adminRole !== "SUPER_ADMIN" && (
              <button
                type="button"
                onClick={() => openOverrideModal(row)}
                className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 hover:bg-indigo-100"
              >
                <Settings2 size={13} /> Overrides
              </button>
            )}
          </div>
        ) : (
          <span className="text-xs text-slate-400">
            {row.id === currentUser?.id ? "Current Session" : "Read-only"}
          </span>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Platform Administrators
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Assign hierarchical administrative roles and configure fine-grained permission overrides.
          </p>
        </div>

        {canManage && (
          <button
            type="button"
            onClick={() => setCreateOpen(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-700"
          >
            <UserPlus size={15} /> Provision Administrator
          </button>
        )}
      </div>

      <AdminDataTable
        columns={columns}
        rows={admins}
        loading={loading}
      />

      {/* Create / Promote Administrator Modal */}
      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between">
              <h3 className="text-lg font-bold text-slate-900">
                Provision or Promote Administrator
              </h3>
              <button
                type="button"
                onClick={() => setCreateOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Enter an existing user email to promote them, or provide a password to create a new administrator account.
            </p>

            <form onSubmit={handleCreateAdmin} className="mt-4 space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={createForm.email}
                    onChange={(e) => setCreateForm((p) => ({ ...p, email: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={createForm.fullName}
                    onChange={(e) => setCreateForm((p) => ({ ...p, fullName: e.target.value }))}
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Initial Password (required for new accounts)
                </label>
                <input
                  type="password"
                  value={createForm.password}
                  onChange={(e) => setCreateForm((p) => ({ ...p, password: e.target.value }))}
                  placeholder="Min 8 chars, upper, lower, number, symbol"
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </div>

              <div>
                <label className="mb-2 block text-xs font-semibold text-slate-700">
                  Select Administrative Role
                </label>
                <AdminRoleSelector
                  value={createForm.adminRole}
                  onChange={(role) => setCreateForm((p) => ({ ...p, adminRole: role }))}
                  allowSuperAdmin={isSuperAdmin}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Audit Reason
                </label>
                <input
                  type="text"
                  value={createForm.reason}
                  onChange={(e) => setCreateForm((p) => ({ ...p, reason: e.target.value }))}
                  placeholder="Reason for granting administrative access..."
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setCreateOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-brand px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting ? "Provisioning..." : "Save Administrator"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Change Role Modal */}
      {roleModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-xl rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between">
              <h3 className="text-lg font-bold text-slate-900">
                Update Role for {roleModal.admin?.fullName}
              </h3>
              <button
                type="button"
                onClick={() => setRoleModal({ open: false, admin: null, adminRole: "ADMIN", reason: "" })}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleRoleChange} className="mt-4 space-y-4">
              <AdminRoleSelector
                value={roleModal.adminRole}
                onChange={(role) => setRoleModal((p) => ({ ...p, adminRole: role }))}
                allowSuperAdmin={isSuperAdmin}
              />

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setRoleModal((p) => ({ ...p, adminRole: null }))}
                  className={`rounded-xl border px-3 py-1.5 text-xs font-semibold ${
                    roleModal.adminRole === null
                      ? "border-rose-600 bg-rose-600 text-white"
                      : "border-rose-200 bg-rose-50 text-rose-700"
                  }`}
                >
                  Revoke Admin Role (Demote to Candidate)
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Mandatory Audit Reason *
                </label>
                <textarea
                  rows={2}
                  required
                  value={roleModal.reason}
                  onChange={(e) => setRoleModal((p) => ({ ...p, reason: e.target.value }))}
                  placeholder="Provide justification for this role change (min 5 characters)..."
                  className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </div>

              <div className="flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setRoleModal({ open: false, admin: null, adminRole: "ADMIN", reason: "" })}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded-xl bg-brand px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitting ? "Updating..." : "Save Role Change"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Per-Admin Permission Overrides Modal */}
      {overrideModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Permission Overrides: {overrideModal.admin?.fullName}
                </h3>
                <p className="text-xs text-slate-500">
                  Base Role: {overrideModal.admin?.adminRole} • Set explicit GRANT or DENY overrides
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOverrideModal({ open: false, admin: null, overrides: {} })}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mt-4 divide-y divide-slate-100">
              {catalog.map((perm) => {
                const current = overrideModal.overrides[perm.key] || "INHERIT";
                return (
                  <div key={perm.key} className="flex items-center justify-between py-2.5 text-xs">
                    <div>
                      <p className="font-semibold text-slate-900">{perm.label}</p>
                      <code className="text-[10px] text-slate-400">{perm.key}</code>
                    </div>
                    <div className="inline-flex rounded-lg border border-slate-200 p-0.5">
                      {["INHERIT", "GRANT", "DENY"].map((eff) => (
                        <button
                          key={eff}
                          type="button"
                          onClick={() =>
                            setOverrideModal((p) => ({
                              ...p,
                              overrides: { ...p.overrides, [perm.key]: eff },
                            }))
                          }
                          className={`rounded-md px-2.5 py-1 text-[11px] font-semibold ${
                            current === eff
                              ? eff === "GRANT"
                                ? "bg-emerald-600 text-white"
                                : eff === "DENY"
                                ? "bg-rose-600 text-white"
                                : "bg-slate-800 text-white"
                              : "text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          {eff}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-5 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setOverrideModal({ open: false, admin: null, overrides: {} })}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleSaveOverrides}
                className="rounded-xl bg-brand px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? "Saving..." : "Save Overrides"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
