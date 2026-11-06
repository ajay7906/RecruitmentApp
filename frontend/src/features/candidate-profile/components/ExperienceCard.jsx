import React from 'react'
import { Briefcase, Pencil, Trash2 } from 'lucide-react'

function formatPeriod(startDate, endDate, currentlyWorking) {
  const fmt = (d) =>
    d ? new Date(d).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : ''
  const start = fmt(startDate)
  const end = currentlyWorking ? 'Present' : fmt(endDate)
  return `${start || 'N/A'} - ${end || 'N/A'}`
}

export function ExperienceCard({ experience, onEdit, onDelete, isMutating = false }) {
  if (!experience) return null

  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 shadow-2xs">
      <div className="flex items-start gap-3">
        <div className="rounded-lg bg-emerald-50 p-2.5 text-emerald-600">
          <Briefcase className="h-5 w-5" />
        </div>
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-semibold text-sm text-slate-900">{experience.jobTitle}</h4>
            {experience.currentlyWorking ? (
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
                Current
              </span>
            ) : null}
            {experience.employmentType ? (
              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                {experience.employmentType}
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 text-xs font-medium text-slate-700">
            {experience.companyName}
            {experience.workLocation ? ` • ${experience.workLocation}` : ''}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {formatPeriod(experience.startDate, experience.endDate, experience.currentlyWorking)}
          </p>
          {experience.description ? (
            <p className="mt-2 text-xs text-slate-600 whitespace-pre-line">{experience.description}</p>
          ) : null}
          {experience.responsibilities ? (
            <p className="mt-1.5 text-xs text-slate-600 whitespace-pre-line">
              <span className="font-medium text-slate-700">Achievements / Responsibilities: </span>
              {experience.responsibilities}
            </p>
          ) : null}
          {Array.isArray(experience.skillsUsed) && experience.skillsUsed.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {experience.skillsUsed.map((skill) => (
                <span
                  key={skill}
                  className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700"
                >
                  {skill}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      {(onEdit || onDelete) ? (
        <div className="flex items-center gap-1">
          {onEdit ? (
            <button
              type="button"
              disabled={isMutating}
              onClick={() => onEdit(experience)}
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              title="Edit experience"
            >
              <Pencil className="h-4 w-4" />
            </button>
          ) : null}
          {onDelete ? (
            <button
              type="button"
              disabled={isMutating}
              onClick={() => onDelete(experience.id)}
              className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50 hover:text-rose-700"
              title="Delete experience"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
