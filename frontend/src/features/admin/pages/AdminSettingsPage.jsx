import { Link } from "react-router-dom";
import { ShieldCheck, Lock, Database, Activity, Cpu, ExternalLink } from "lucide-react";
import { useAuthStore } from "../../../stores/authStore";
import { AdminRoleBadge } from "../components/UserStatusBadge";

export function AdminSettingsPage() {
  const user = useAuthStore((s) => s.user);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Platform Governance & Settings
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          System security policies, audit posture, and extensible service integration status.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Active Session Security */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-blue-50 text-brand">
              <ShieldCheck size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Your Administrative Profile
              </h2>
              <p className="text-xs text-slate-500">Active authenticated session</p>
            </div>
          </div>

          <div className="mt-4 space-y-2.5 text-xs text-slate-700">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="font-semibold text-slate-500">Full Name</span>
              <span className="font-bold text-slate-900">{user?.fullName}</span>
            </div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="font-semibold text-slate-500">Email</span>
              <span>{user?.email}</span>
            </div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="font-semibold text-slate-500">Administrative Role</span>
              <AdminRoleBadge role={user?.adminRole || "ADMIN"} />
            </div>
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-500">Granted Permissions</span>
              <span className="font-bold text-slate-900">
                {user?.permissions?.length ?? "All"} capabilities
              </span>
            </div>
          </div>

          <div className="mt-5 flex gap-2.5">
            <Link
              to="/admin/permissions"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Inspect Permission Matrix <ExternalLink size={13} />
            </Link>
            <Link
              to="/admin/administrators"
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Manage Administrators <ExternalLink size={13} />
            </Link>
          </div>
        </div>

        {/* Security & Compliance Posture */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-emerald-50 text-emerald-600">
              <Lock size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Security & Audit Controls
              </h2>
              <p className="text-xs text-slate-500">Active platform enforcement</p>
            </div>
          </div>

          <ul className="mt-4 space-y-2.5 text-xs text-slate-600">
            <li className="flex items-center justify-between rounded-xl bg-slate-50 p-2.5">
              <span>Append-Only Audit Log Trigger (`trg_audit_logs_immutable`)</span>
              <span className="rounded bg-emerald-100 px-2 py-0.5 font-bold text-emerald-800">
                ACTIVE
              </span>
            </li>
            <li className="flex items-center justify-between rounded-xl bg-slate-50 p-2.5">
              <span>Sensitive Credential & Token Redaction</span>
              <span className="rounded bg-emerald-100 px-2 py-0.5 font-bold text-emerald-800">
                ACTIVE
              </span>
            </li>
            <li className="flex items-center justify-between rounded-xl bg-slate-50 p-2.5">
              <span>Immediate Session Revocation on Account Suspension</span>
              <span className="rounded bg-emerald-100 px-2 py-0.5 font-bold text-emerald-800">
                ACTIVE
              </span>
            </li>
            <li className="flex items-center justify-between rounded-xl bg-slate-50 p-2.5">
              <span>Last Active SUPER_ADMIN Lockout Protection</span>
              <span className="rounded bg-emerald-100 px-2 py-0.5 font-bold text-emerald-800">
                ACTIVE
              </span>
            </li>
          </ul>
        </div>

        {/* Future AI / Python Service Integration Readiness */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs lg:col-span-2">
          <div className="flex items-center gap-2.5">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-50 text-indigo-600">
              <Cpu size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                External Intelligence & Moderation Service Readiness
              </h2>
              <p className="text-xs text-slate-500">
                Node.js core governance active • Ready for future Python AI service webhook/worker integration
              </p>
            </div>
          </div>

          <div className="mt-4 grid gap-4 sm:grid-cols-3 text-xs">
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3.5">
              <div className="flex items-center gap-1.5 font-bold text-slate-800">
                <Database size={14} className="text-brand" /> Job Moderation Hooks
              </div>
              <p className="mt-1 text-slate-600">
                `jobs.moderation_score`, `moderation_flags`, and `job_moderation_logs` (`actor_type = SYSTEM`) are ready to ingest external fraud/quality scores.
              </p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3.5">
              <div className="flex items-center gap-1.5 font-bold text-slate-800">
                <Activity size={14} className="text-emerald-600" /> Unified Reports Queue
              </div>
              <p className="mt-1 text-slate-600">
                `reports` and `report_notes` support automated triage, priority scoring, and anomaly escalation across `USER`, `COMPANY`, and `JOB` entities.
              </p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3.5">
              <div className="flex items-center gap-1.5 font-bold text-slate-800">
                <Lock size={14} className="text-purple-600" /> Resume & Candidate Privacy
              </div>
              <p className="mt-1 text-slate-600">
                Candidate resumes (`extracted_text_reference`) and internal notes remain strictly gated behind `applications.read_resume` and `applications.read_notes`.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
