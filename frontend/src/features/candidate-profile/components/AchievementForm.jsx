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

export function AchievementForm({ initialData = null, onSubmit, onCancel, isSubmitting = false }) {
  const [form, setForm] = useState({
    title: '',
    issuer: '',
    date: '',
    description: '',
  })
  const [error, setError] = useState('')

  useEffect(() => {
    if (initialData) {
      setForm({
        title: initialData.title || '',
        issuer: initialData.issuer || '',
        date: toDateInput(initialData.date),
        description: initialData.description || '',
      })
    }
  }, [initialData])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.title.trim()) {
      setError('Achievement Title is required')
      return
    }
    await onSubmit({
      title: form.title.trim(),
      issuer: form.issuer.trim() || null,
      date: form.date || null,
      description: form.description.trim() || null,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Title *</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="e.g. Winner - Smart India Hackathon"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Issuer / Organization</label>
          <input
            type="text"
            value={form.issuer}
            onChange={(e) => setForm((f) => ({ ...f, issuer: e.target.value }))}
            placeholder="e.g. Ministry of Education"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Date</label>
          <input
            type="date"
            value={form.date}
            onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          />
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-700">Description</label>
        <textarea
          rows={2}
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          placeholder="Details about the recognition..."
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
          {initialData ? 'Update Achievement' : 'Save Achievement'}
        </Button>
      </div>
    </form>
  )
}
