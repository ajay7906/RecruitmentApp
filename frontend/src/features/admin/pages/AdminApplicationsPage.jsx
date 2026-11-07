import { useState, useEffect, useCallback } from "react";
import { Eye, Lock, X, FileText, CalendarClock, Award } from "lucide-react";
import { toast } from "sonner";
import { adminApi } from "../api/adminApi";
import { AdminSearch } from "../components/AdminSearch";
import { AdminFilters } from "../components/AdminFilters";
import { AdminDataTable } from "../components/AdminDataTable";

const STAGE_STYLES = {
  SUBMITTED: "bg-slate-100 text-slate-700 border-slate-200",
  UNDER_REVIEW: "bg-blue-50 text-blue-700 border-blue-200",
  SHORTLISTED: "bg-indigo-50 text-indigo-700 border-indigo-200",
  INTERVIEW_SCHEDULED: "bg-purple-50 text-purple-700 border-purple-200",
  OFFERED: "bg-amber-50 text-amber-800 border-amber-200",
  HIRED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  REJECTED: "bg-rose-50 text-rose-700 border-rose-200",
  WITHDRAWN: "bg-slate-100 text-slate-500 border-slate-200",
};

export function AdminApplicationsPage() {
  const [q, setQ] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ applications: [], counts: {}, pagination: null });
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  const fetchApplications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.listApplications({
        q: q || undefined,
        status: statusFilter || undefined,
        page,
        limit: 20,
      });
      setData(res);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to load applications");
    } finally {
      setLoading(false);
    }
  }, [q, statusFilter, page]);

  useEffect(() => {
    fetchApplications();
  }, [fetchApplications]);

  async function inspectApplication(appId) {
    setLoadingDetails(true);
    try {
      const details = await adminApi.getApplicationDetails(appId);
      setSelectedApp(details);
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to load application details");
    } finally {
      setLoadingDetails(false);
    }
  }

  const columns = [
    {
      key: "candidate",
      header: "Candidate",
      render: (row) => (
        <div>
          <p className="font-semibold text-slate-900">{row.candidate?.fullName}</p>
          <p className="text-xs text-slate-500">{row.candidate?.email}</p>
        </div>
      ),
    },
    {
      key: "job",
      header: "Job & Company",
      render: (row) => (
        <div>
          <p className="font-medium text-slate-900">{row.job?.title}</p>
          <p className="text-xs text-slate-500">{row.company?.name}</p>
        </div>
      ),
    },
    {
      key: "status",
      header: "Stage",
      render: (row) => (
        <span
          className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
            STAGE_STYLES[row.status] || STAGE_STYLES.SUBMITTED
          }`}
        >
          {row.status.replace(/_/g, " ")}
        </span>
      ),
    },
    {
      key: "interviews",
      header: "Interviews / Offer",
      render: (row) => (
        <div className="text-xs text-slate-600">
          <span>{row.interviews?.length ?? 0} interviews</span>
          {row.offer && (
            <span className="ml-1.5 rounded bg-amber-50 px-1.5 py-0.5 font-semibold text-amber-800">
              Offer: {row.offer.status}
            </span>
          )}
          {row.hiringDecision && (
            <span className="ml-1.5 rounded bg-emerald-50 px-1.5 py-0.5 font-semibold text-emerald-700">
              {row.hiringDecision.finalDecision}
            </span>
          )}
        </div>
      ),
    },
    {
      key: "appliedAt",
      header: "Applied",
      render: (row) => (
        <span className="text-xs text-slate-500">
          {new Date(row.appliedAt).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: "actions",
      header: "Inspect",
      render: (row) => (
        <button
          type="button"
          onClick={() => inspectApplication(row.id)}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          <Eye size={13} /> Details
        </button>
      ),
    },
  ];

  const counts = data.counts || {};

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Application & Hiring Pipeline Monitoring
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Monitor candidate applications, interview progression, and hiring decisions across all companies.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {[
          { key: "", label: `All (${counts.ALL ?? 0})` },
          { key: "SUBMITTED", label: `Submitted (${counts.SUBMITTED ?? 0})` },
          { key: "SHORTLISTED", label: `Shortlisted (${counts.SHORTLISTED ?? 0})` },
          { key: "INTERVIEW_SCHEDULED", label: `Interview (${counts.INTERVIEW_SCHEDULED ?? 0})` },
          { key: "OFFERED", label: `Offered (${counts.OFFERED ?? 0})` },
          { key: "HIRED", label: `Hired (${counts.HIRED ?? 0})` },
          { key: "REJECTED", label: `Rejected (${counts.REJECTED ?? 0})` },
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
          placeholder="Search candidate name, email, job title, company..."
        />
        <AdminFilters
          values={{ status: statusFilter }}
          onChange={(_, val) => {
            setStatusFilter(val);
            setPage(1);
          }}
          onReset={() => {
            setQ("");
            setStatusFilter("");
            setPage(1);
          }}
          filters={[]}
        />
      </div>

      <AdminDataTable
        columns={columns}
        rows={data.applications || []}
        loading={loading}
        pagination={data.pagination}
        onPageChange={setPage}
      />

      {/* Application Detail Drawer / Modal */}
      {(selectedApp || loadingDetails) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            {loadingDetails ? (
              <p className="py-8 text-center text-sm text-slate-500">Loading application details...</p>
            ) : (
              <>
                <div className="flex items-start justify-between">
                  <div>
                    <span
                      className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                        STAGE_STYLES[selectedApp.status] || STAGE_STYLES.SUBMITTED
                      }`}
                    >
                      {selectedApp.status}
                    </span>
                    <h3 className="mt-2 text-lg font-bold text-slate-900">
                      {selectedApp.candidate?.fullName} → {selectedApp.job?.title}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Company: {selectedApp.company?.name} • Applied{" "}
                      {new Date(selectedApp.appliedAt).toLocaleString()}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedApp(null)}
                    className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Resume Privacy Section */}
                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-1.5 font-bold text-slate-800">
                      <FileText size={14} className="text-brand" /> Candidate Resume & Cover Letter
                    </span>
                    {selectedApp.resumeProtected ? (
                      <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                        <Lock size={11} /> Requires applications.read_resume
                      </span>
                    ) : (
                      <span className="text-slate-600">
                        {selectedApp.resumeFileName || "No resume file attached"}
                      </span>
                    )}
                  </div>
                  {!selectedApp.resumeProtected && selectedApp.coverLetter && (
                    <p className="mt-2 whitespace-pre-line text-slate-600">
                      {selectedApp.coverLetter}
                    </p>
                  )}
                </div>

                {/* Interviews */}
                <div className="mt-4 rounded-xl border border-slate-200 p-3.5 text-xs">
                  <h4 className="flex items-center gap-1.5 font-bold text-slate-800">
                    <CalendarClock size={14} className="text-purple-600" /> Interviews (
                    {selectedApp.interviews?.length || 0})
                  </h4>
                  {(selectedApp.interviews || []).length === 0 ? (
                    <p className="mt-1.5 text-slate-400">No interviews scheduled yet.</p>
                  ) : (
                    <div className="mt-2 space-y-2">
                      {selectedApp.interviews.map((iv) => (
                        <div key={iv.id} className="rounded-lg bg-slate-50 p-2.5">
                          <div className="flex justify-between font-semibold text-slate-800">
                            <span>
                              Round {iv.roundNumber}: {iv.title} ({iv.roundType})
                            </span>
                            <span>{iv.status}</span>
                          </div>
                          <p className="text-slate-500">
                            Scheduled: {new Date(iv.scheduledAt).toLocaleString()}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Hiring Decision & Offer */}
                {(selectedApp.offer || selectedApp.hiringDecision) && (
                  <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5 text-xs">
                    <h4 className="flex items-center gap-1.5 font-bold text-emerald-900">
                      <Award size={14} /> Offer & Hiring Decision
                    </h4>
                    {selectedApp.offer && (
                      <p className="mt-1 text-emerald-800">
                        Offer Status: <span className="font-bold">{selectedApp.offer.status}</span> • Role:{" "}
                        {selectedApp.offer.offeredRole}
                      </p>
                    )}
                    {selectedApp.hiringDecision && (
                      <p className="mt-1 text-emerald-800">
                        Final Decision:{" "}
                        <span className="font-bold">{selectedApp.hiringDecision.finalDecision}</span>
                      </p>
                    )}
                  </div>
                )}

                {/* Internal Recruiter Notes (Permission Guarded) */}
                <div className="mt-4 rounded-xl border border-slate-200 p-3.5 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800">Internal Recruiter Notes</span>
                    {selectedApp.notesProtected && (
                      <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">
                        <Lock size={11} /> Requires applications.read_notes
                      </span>
                    )}
                  </div>
                  {!selectedApp.notesProtected && (
                    <div className="mt-2 space-y-1.5">
                      {(selectedApp.recruiterNotes || []).length === 0 ? (
                        <p className="text-slate-400">No internal notes recorded.</p>
                      ) : (
                        selectedApp.recruiterNotes.map((n) => (
                          <div key={n.id} className="rounded bg-slate-50 p-2 text-slate-700">
                            {n.note}
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>

                {/* Status Timeline */}
                <div className="mt-4">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                    Stage Progression History
                  </h4>
                  <div className="mt-2 divide-y divide-slate-100">
                    {(selectedApp.statusHistory || []).map((h) => (
                      <div key={h.id} className="py-2 text-xs">
                        <div className="flex justify-between font-semibold text-slate-800">
                          <span>
                            {h.previousStatus || "INITIAL"} → {h.newStatus}
                          </span>
                          <span className="text-slate-400">
                            {new Date(h.changedAt).toLocaleString()}
                          </span>
                        </div>
                        {h.reason && <p className="text-slate-600">{h.reason}</p>}
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
