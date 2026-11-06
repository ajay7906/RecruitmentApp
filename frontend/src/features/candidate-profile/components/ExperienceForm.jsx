import React, { useState, useEffect } from 'react'
import { Button } from '../../../components/ui/Button'
import { PREFERRED_EMPLOYMENT_TYPES } from '../schema/profileSchema'

function toDateInput(val) {
  if (!val) return ''
  try {
    return new Date(val).toISOString().split('T')[0]
  } catch {
    return ''
  }
}

export function ExperienceForm({ initialData = null, onSubmit, onCancel, isSubmitting = false }) {
  const [form, setForm] = useState({
    jobTitle: '',
    companyName: '',
    employmentType: 'Full Time',
    workLocation: '',
    startDate: '',
    endDate: '',
    currentlyWorking: false,
    description: '',
    responsibilities: '',
    skillsUsedText: '',
  })
  const [error, setError] = useState('')

  useEffect(() => {
    if (initialData) {
      setForm({
        jobTitle: initialData.jobTitle || '',
        companyName: initialData.companyName || '',
        employmentType: initialData.employmentType || 'Full Time',
        workLocation: initialData.workLocation || '',
        startDate: toDateInput(initialData.startDate),
        endDate: toDateInput(initialData.endDate),
        currentlyWorking: Boolean(initialData.currentlyWorking),
        description: initialData.description || '',
        responsibilities: initialData.responsibilities || '',
        skillsUsedText: Array.isArray(initialData.skillsUsed) ? initialData.skillsUsed.join(', ') : '',
      })
    }
  }, [initialData])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.jobTitle.trim() || !form.companyName.trim() || !form.startDate) {
      setError('Job Title, Company Name, and Start Date are required')
      return
    }
    if (!form.currentlyWorking && !form.endDate) {
      setError('Please provide an End Date or mark Currently Working Here')
      return
    }
    if (!form.currentlyWorking && form.endDate && form.endDate < form.startDate) {
      setError('End Date cannot be earlier than Start Date')
      return
    }

    const skillsUsed = form.skillsUsedText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)

    await onSubmit({
      jobTitle: form.jobTitle.trim(),
      companyName: form.companyName.trim(),
      employmentType: form.employmentType || null,
      workLocation: form.workLocation.trim() || null,
      startDate: form.startDate,
      endDate: form.currentlyWorking ? null : form.endDate || null,
      currentlyWorking: form.currentlyWorking,
      description: form.description.trim() || null,
      responsibilities: form.responsibilities.trim() || null,
      skillsUsed,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Job Title / Designation *</label>
          <input
            type="text"
            value={form.jobTitle}
            onChange={(e) => setForm((f) => ({ ...f, jobTitle: e.target.value }))}
            placeholder="e.g. Senior Frontend Engineer"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Company Name *</label>
          <input
            type="text"
            value={form.companyName}
            onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))}
            placeholder="e.g. Acme Tech Pvt Ltd"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Employment Type</label>
          <select
            value={form.employmentType}
            onChange={(e) => setForm((f) => ({ ...f, employmentType: e.target.value }))}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            {PREFERRED_EMPLOYMENT_TYPES.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Work Location</label>
          <input
            type="text"
            value={form.workLocation}
            onChange={(e) => setForm((f) => ({ ...f, workLocation: e.target.value }))}
            placeholder="e.g. Bengaluru, India (Hybrid)"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Start Date *</label>
          <input
            type="date"
            value={form.startDate}
            onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">End Date</label>
          <input
            type="date"
            disabled={form.currentlyWorking}
            value={form.endDate}
            onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:bg-slate-100"
          />
        </div>
      </div>

      <div className="flex items-center">
        <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
          <input
            type="checkbox"
            checked={form.currentlyWorking}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                currentlyWorking: e.target.checked,
                endDate: e.target.checked ? '' : f.endDate,
              }))
            }
            className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
          />
          I currently work here
        </label>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Role Description</label>
          <textarea
            rows={2}
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Overview of your role and team..."
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Responsibilities & Achievements</label>
          <textarea
            rows={2}
            value={form.responsibilities}
            onChange={(e) => setForm((f) => ({ ...f, responsibilities: e.target.value }))}
            placeholder="Key deliverables, metrics improved..."
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-700">Skills Used (comma-separated)</label>
        <input
          type="text"
          value={form.skillsUsedText}
          onChange={(e) => setForm((f) => ({ ...f, skillsUsedText: e.target.value }))}
          placeholder="e.g. React, TypeScript, Node.js, PostgreSQL"
          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
        />
      </div>

      {error ? <p className="text-xs font-medium text-rose-600">{error}</p> : null}

      <div className="flex justify-end gap-2">
        {onCancel ? (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
        <Button type="submit" isLoading={isSubmitting}>
          {initialData ? 'Update Experience' : 'Save Experience'}
        </Button>
      </div>
    </form>
  )
}
