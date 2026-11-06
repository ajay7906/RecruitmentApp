import React, { useState, useEffect } from 'react'
import { Button } from '../../../components/ui/Button'

function toDateInput(val) {
  if (!val) return ''
  try {
    return new Date(val).toISOString().split('T')[0]
  } catch {
    return ''
  }
}

export function ProjectForm({ initialData = null, onSubmit, onCancel, isSubmitting = false }) {
  const [form, setForm] = useState({
    title: '',
    role: '',
    technologiesText: '',
    startDate: '',
    endDate: '',
    description: '',
    projectUrl: '',
    repositoryUrl: '',
  })
  const [error, setError] = useState('')

  useEffect(() => {
    if (initialData) {
      setForm({
        title: initialData.title || '',
        role: initialData.role || '',
        technologiesText: Array.isArray(initialData.technologiesUsed)
          ? initialData.technologiesUsed.join(', ')
          : '',
        startDate: toDateInput(initialData.startDate),
        endDate: toDateInput(initialData.endDate),
        description: initialData.description || '',
        projectUrl: initialData.projectUrl || '',
        repositoryUrl: initialData.repositoryUrl || '',
      })
    }
  }, [initialData])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.title.trim()) {
      setError('Project Title is required')
      return
    }
    const technologiesUsed = form.technologiesText
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)

    await onSubmit({
      title: form.title.trim(),
      role: form.role.trim() || null,
      technologiesUsed,
      startDate: form.startDate || null,
      endDate: form.endDate || null,
      description: form.description.trim() || null,
      projectUrl: form.projectUrl.trim() || null,
      repositoryUrl: form.repositoryUrl.trim() || null,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Project Title *</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="e.g. AI Resume Matcher Portal"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Your Role</label>
          <input
            type="text"
            value={form.role}
            onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
            placeholder="e.g. Lead Full-Stack Developer"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Technologies (comma-separated)</label>
          <input
            type="text"
            value={form.technologiesText}
            onChange={(e) => setForm((f) => ({ ...f, technologiesText: e.target.value }))}
            placeholder="React, Node.js, PostgreSQL"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Start Date</label>
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
            value={form.endDate}
            onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Live Project URL</label>
          <input
            type="url"
            value={form.projectUrl}
            onChange={(e) => setForm((f) => ({ ...f, projectUrl: e.target.value }))}
            placeholder="https://example.com"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">GitHub / Repository URL</label>
          <input
            type="url"
            value={form.repositoryUrl}
            onChange={(e) => setForm((f) => ({ ...f, repositoryUrl: e.target.value }))}
            placeholder="https://github.com/username/repo"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Project Description</label>
          <textarea
            rows={2}
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Architecture, problem solved, impact..."
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          />
        </div>
      </div>

      {error ? <p className="text-xs font-medium text-rose-600">{error}</p> : null}

      <div className="flex justify-end gap-2">
        {onCancel ? (
          <Button type="button" variant="secondary" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
        <Button type="submit" isLoading={isSubmitting}>
          {initialData ? 'Update Project' : 'Save Project'}
        </Button>
      </div>
    </form>
  )
}
