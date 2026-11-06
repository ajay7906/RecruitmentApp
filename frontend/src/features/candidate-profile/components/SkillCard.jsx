import React from 'react'
import { Pencil, Trash2 } from 'lucide-react'

const PROFICIENCY_STYLES = {
  Beginner: 'bg-slate-100 text-slate-700 border-slate-200',
  Intermediate: 'bg-sky-50 text-sky-700 border-sky-200',
  Advanced: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  Expert: 'bg-emerald-50 text-emerald-700 border-emerald-200',
}

export function SkillCard({ skill, onEdit, onDelete, isMutating = false }) {
  if (!skill) return null

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 shadow-2xs transition hover:border-slate-300">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-sm text-slate-900">{skill.name}</span>
          {skill.category ? (
            <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
              {skill.category}
            </span>
          ) : null}
          {skill.proficiencyLevel ? (
            <span
              className={`rounded-md border px-2 py-0.5 text-[11px] font-medium ${
                PROFICIENCY_STYLES[skill.proficiencyLevel] || PROFICIENCY_STYLES.Intermediate
              }`}
            >
              {skill.proficiencyLevel}
            </span>
          ) : null}
        </div>
        <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-slate-500">
          {skill.experienceYears !== null && skill.experienceYears !== undefined ? (
            <span>{skill.experienceYears} yr{Number(skill.experienceYears) === 1 ? '' : 's'} exp</span>
          ) : null}
          {skill.lastUsed ? <span>Last used: {skill.lastUsed}</span> : null}
        </div>
      </div>

      {(onEdit || onDelete) ? (
        <div className="flex items-center gap-1">
          {onEdit ? (
            <button
              type="button"
              disabled={isMutating}
              onClick={() => onEdit(skill)}
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
              title="Edit skill"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
          ) : null}
          {onDelete ? (
            <button
              type="button"
              disabled={isMutating}
              onClick={() => onDelete(skill.id)}
              className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50 hover:text-rose-700 disabled:opacity-50"
              title="Delete skill"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
