import { useState } from "react";
import { Link } from "react-router-dom";
import {
  FileText,
  CalendarPlus,
  Sparkles,
  ExternalLink,
  ChevronRight,
  User,
  Clock,
  Briefcase,
  MoreVertical,
  CheckCircle2,
  XCircle,
  Award,
} from "lucide-react";
import { APPLICATION_STATUS_META } from "../schema/applicationSchemas";
import { formatDate } from "../../../utils/formatters";

const KANBAN_COLUMNS = [
  {
    status: "SUBMITTED",
    title: "Applied",
    badgeClass: "bg-blue-100 text-blue-700 border-blue-200",
    headerBg: "bg-blue-50/70 border-blue-100",
  },
  {
    status: "UNDER_REVIEW",
    title: "Reviewing",
    badgeClass: "bg-amber-100 text-amber-700 border-amber-200",
    headerBg: "bg-amber-50/70 border-amber-100",
  },
  {
    status: "SHORTLISTED",
    title: "Shortlisted",
    badgeClass: "bg-indigo-100 text-indigo-700 border-indigo-200",
    headerBg: "bg-indigo-50/70 border-indigo-100",
  },
  {
    status: "INTERVIEW",
    title: "Interviewing",
    badgeClass: "bg-purple-100 text-purple-700 border-purple-200",
    headerBg: "bg-purple-50/70 border-purple-100",
  },
  {
    status: "OFFERED",
    title: "Offered",
    badgeClass: "bg-emerald-100 text-emerald-700 border-emerald-200",
    headerBg: "bg-emerald-50/70 border-emerald-100",
  },
  {
    status: "HIRED",
    title: "Hired",
    badgeClass: "bg-teal-100 text-teal-700 border-teal-200",
    headerBg: "bg-teal-50/70 border-teal-100",
  },
  {
    status: "REJECTED",
    title: "Rejected",
    badgeClass: "bg-rose-100 text-rose-700 border-rose-200",
    headerBg: "bg-rose-50/70 border-rose-100",
  },
];

export function KanbanBoard({
  applications = [],
  onStatusChange,
  onOpenInterviewKit,
  onStatusUpdateClick,
}) {
  const [draggedAppId, setDraggedAppId] = useState(null);
  const [dragOverColumn, setDragOverColumn] = useState(null);

  // Group applications by status
  const columnsMap = {};
  KANBAN_COLUMNS.forEach((col) => {
    columnsMap[col.status] = [];
  });

  applications.forEach((app) => {
    const st = app.status || "SUBMITTED";
    if (columnsMap[st]) {
      columnsMap[st].push(app);
    } else {
      // Fallback if WITHDRAWN or other
      if (!columnsMap["REJECTED"]) columnsMap["REJECTED"] = [];
      columnsMap["REJECTED"].push(app);
    }
  });

  function handleDragStart(e, app) {
    setDraggedAppId(app.id);
    e.dataTransfer.setData("application/json", JSON.stringify({ id: app.id, currentStatus: app.status }));
    e.dataTransfer.effectAllowed = "move";
  }

  function handleDragOver(e, status) {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverColumn !== status) {
      setDragOverColumn(status);
    }
  }

  function handleDragLeave(e, status) {
    if (dragOverColumn === status) {
      setDragOverColumn(null);
    }
  }

  function handleDrop(e, targetStatus) {
    e.preventDefault();
    setDragOverColumn(null);
    try {
      const raw = e.dataTransfer.getData("application/json");
      if (!raw) return;
      const { id, currentStatus } = JSON.parse(raw);
      if (id && currentStatus !== targetStatus) {
        onStatusChange?.(id, targetStatus);
      }
    } catch (_err) {
      // Ignore drop parse error
    } finally {
      setDraggedAppId(null);
    }
  }

  return (
    <div className="overflow-x-auto pb-4">
      <div className="flex gap-4 min-w-[1260px] items-start">
        {KANBAN_COLUMNS.map((col) => {
          const colApps = columnsMap[col.status] || [];
          const isOver = dragOverColumn === col.status;

          return (
            <div
              key={col.status}
              onDragOver={(e) => handleDragOver(e, col.status)}
              onDragLeave={(e) => handleDragLeave(e, col.status)}
              onDrop={(e) => handleDrop(e, col.status)}
              className={`flex-1 min-w-[280px] max-w-[320px] rounded-2xl border transition-all duration-150 flex flex-col bg-slate-50/60 ${
                isOver
                  ? "border-brand bg-brand/5 ring-2 ring-brand/20 shadow-md"
                  : "border-slate-200/80 shadow-xs"
              }`}
            >
              {/* Column Header */}
              <div
                className={`flex items-center justify-between border-b px-3.5 py-3 rounded-t-2xl ${col.headerBg}`}
              >
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    {col.title}
                  </h3>
                  <span
                    className={`inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-bold border ${col.badgeClass}`}
                  >
                    {colApps.length}
                  </span>
                </div>
              </div>

              {/* Cards Container */}
              <div className="p-2.5 space-y-2.5 flex-1 min-h-[420px] max-h-[700px] overflow-y-auto">
                {colApps.length === 0 ? (
                  <div className="flex h-36 flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 p-4 text-center">
                    <p className="text-xs text-slate-400 font-medium">
                      No candidates in {col.title}
                    </p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Drag cards here to update stage
                    </p>
                  </div>
                ) : (
                  colApps.map((app) => {
                    const candidate = app.candidate || app.candidateSnapshot || {};
                    const job = app.job || app.jobSnapshot || {};
                    const isDragging = draggedAppId === app.id;
                    const initials = (candidate.fullName || "Candidate")
                      .split(" ")
                      .map((p) => p[0])
                      .slice(0, 2)
                      .join("")
                      .toUpperCase();

                    return (
                      <div
                        key={app.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, app)}
                        className={`group relative rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs transition hover:shadow-md hover:border-slate-300 cursor-grab active:cursor-grabbing ${
                          isDragging ? "opacity-40 scale-95" : ""
                        }`}
                      >
                        {/* Top: Candidate info & Avatar */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-tr from-brand to-indigo-600 text-xs font-bold text-white shadow-xs">
                              {initials}
                            </div>
                            <div className="min-w-0">
                              <Link
                                to={`/app/recruiter/applications/${app.id}`}
                                className="block text-xs font-bold text-slate-900 hover:text-brand truncate"
                              >
                                {candidate.fullName || "Candidate"}
                              </Link>
                              <p className="text-[11px] text-slate-500 truncate">
                                {candidate.email || "No email"}
                              </p>
                            </div>
                          </div>

                          {/* Quick Stage Move Dropdown Button */}
                          <button
                            type="button"
                            title="Update status"
                            onClick={() => onStatusUpdateClick?.(app)}
                            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 shrink-0"
                          >
                            <MoreVertical size={14} />
                          </button>
                        </div>

                        {/* Job & Company */}
                        <div className="mt-2.5 rounded-lg bg-slate-50 p-2 border border-slate-100 text-[11px] text-slate-600">
                          <div className="flex items-center gap-1 font-medium text-slate-800 truncate">
                            <Briefcase size={12} className="text-slate-400 shrink-0" />
                            <span className="truncate">{job.title || "Job"}</span>
                          </div>
                          {job.company?.name && (
                            <p className="mt-0.5 text-[10px] text-slate-500 truncate pl-4">
                              {job.company.name}
                            </p>
                          )}
                        </div>

                        {/* Top Skills Tags */}
                        {candidate.candidateSkills?.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {candidate.candidateSkills.slice(0, 3).map((sk, skIdx) => (
                              <span
                                key={skIdx}
                                className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-600"
                              >
                                {sk.skillName || sk.name}
                              </span>
                            ))}
                            {candidate.candidateSkills.length > 3 && (
                              <span className="text-[10px] text-slate-400 self-center">
                                +{candidate.candidateSkills.length - 3}
                              </span>
                            )}
                          </div>
                        )}

                        {/* Bottom Actions & Applied Time */}
                        <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2 text-[11px]">
                          <span className="text-[10px] text-slate-400 flex items-center gap-1">
                            <Clock size={10} />
                            {formatDate(app.appliedAt || app.createdAt)}
                          </span>

                          <div className="flex items-center gap-1">
                            {/* AI Interview Kit Shortcut */}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenInterviewKit?.(app);
                              }}
                              title="Tailored Interview Questions"
                              className="rounded-md p-1 text-indigo-600 hover:bg-indigo-50 transition"
                            >
                              <Sparkles size={13} />
                            </button>

                            {/* Schedule Interview Shortcut */}
                            <Link
                              to={`/app/recruiter/interviews/new?applicationId=${app.id}`}
                              title="Schedule Interview"
                              className="rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition"
                            >
                              <CalendarPlus size={13} />
                            </Link>

                            {/* View Full Application */}
                            <Link
                              to={`/app/recruiter/applications/${app.id}`}
                              title="Review Application"
                              className="rounded-md p-1 text-slate-500 hover:bg-slate-100 hover:text-brand transition"
                            >
                              <ExternalLink size={13} />
                            </Link>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
