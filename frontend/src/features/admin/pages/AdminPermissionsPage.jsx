import { useState, useEffect, useCallback } from "react";
import { Save, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { adminApi } from "../api/adminApi";
import { PermissionManager } from "../components/PermissionManager";
import { useAuthStore } from "../../../stores/authStore";

export function AdminPermissionsPage() {
  const user = useAuthStore((s) => s.user);
  const canEditRoles =
    user?.adminRole === "SUPER_ADMIN" ||
    (Array.isArray(user?.permissions) && user.permissions.includes("platform_settings.manage"));

  const [roles, setRoles] = useState([]);
  const [selectedRole, setSelectedRole] = useState("ADMIN");
  const [catalog, setCatalog] = useState([]);
  const [roleMatrix, setRoleMatrix] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadPermissions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getPermissionsCatalog();
      setRoles(res?.roles || []);
      setCatalog(res?.catalog || []);
      setRoleMatrix(res?.roleMatrix || {});
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to load role permissions matrix");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPermissions();
  }, [loadPermissions]);

  function handleTogglePermission(permKey) {
    if (selectedRole === "SUPER_ADMIN") return;
    setRoleMatrix((prev) => {
      const current = new Set(prev[selectedRole] || []);
      if (current.has(permKey)) {
        current.delete(permKey);
      } else {
        current.add(permKey);
      }
      return {
        ...prev,
        [selectedRole]: Array.from(current),
      };
    });
  }

  async function handleSaveRolePermissions() {
    if (selectedRole === "SUPER_ADMIN") return;
    setSaving(true);
    try {
      const res = await adminApi.updateRolePermissions(selectedRole, {
        permissions: roleMatrix[selectedRole] || [],
        reason: `Updated default permissions for role ${selectedRole}`,
      });
      setRoleMatrix(res.roleMatrix || roleMatrix);
      toast.success(`Saved permissions for ${selectedRole}`);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to update role permissions");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Role & Permission Matrix
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Configure fine-grained RBAC capabilities for each administrative role.
          </p>
        </div>

        {canEditRoles && selectedRole !== "SUPER_ADMIN" && (
          <button
            type="button"
            disabled={saving}
            onClick={handleSaveRolePermissions}
            className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            <Save size={15} /> {saving ? "Saving..." : `Save ${selectedRole} Permissions`}
          </button>
        )}
      </div>

      {/* Role Selector Tabs */}
      <div className="flex flex-wrap gap-2">
        {roles.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setSelectedRole(r)}
            className={`rounded-xl border px-4 py-2 text-xs font-bold transition ${
              selectedRole === r
                ? "border-brand bg-brand text-white"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            {r.replace(/_/g, " ")} ({(roleMatrix[r] || []).length})
          </button>
        ))}
      </div>

      {selectedRole === "SUPER_ADMIN" && (
        <div className="flex items-center gap-2 rounded-2xl border border-purple-200 bg-purple-50/70 p-4 text-xs text-purple-900">
          <ShieldCheck size={16} className="shrink-0 text-purple-600" />
          <span>
            <strong>SUPER_ADMIN</strong> permanently holds all platform permissions and cannot be restricted.
          </span>
        </div>
      )}

      {loading ? (
        <div className="p-8 text-center text-sm text-slate-500">Loading permission catalog...</div>
      ) : (
        <PermissionManager
          catalog={catalog}
          selectedPermissions={roleMatrix[selectedRole] || []}
          onToggle={handleTogglePermission}
          readOnly={!canEditRoles || selectedRole === "SUPER_ADMIN"}
        />
      )}
    </div>
  );
}
