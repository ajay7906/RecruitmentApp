import React, { useState, useEffect } from 'react'
import { Button } from '../../../components/ui/Button'
import { LANGUAGE_PROFICIENCIES } from '../schema/profileSchema'

export function LanguageForm({ initialData = null, onSubmit, onCancel, isSubmitting = false }) {
  const [form, setForm] = useState({
    language: '',
    proficiency: 'Fluent',
    canRead: true,
    canWrite: true,
    canSpeak: true,
  })
  const [error, setError] = useState('')

  useEffect(() => {
    if (initialData) {
      setForm({
        language: initialData.language || '',
        proficiency: initialData.proficiency || 'Fluent',
        canRead: initialData.canRead ?? true,
        canWrite: initialData.canWrite ?? true,
        canSpeak: initialData.canSpeak ?? true,
      })
    }
  }, [initialData])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.language.trim()) {
      setError('Language name is required')
      return
    }
    await onSubmit({
      language: form.language.trim(),
      proficiency: form.proficiency,
      canRead: Boolean(form.canRead),
      canWrite: Boolean(form.canWrite),
      canSpeak: Boolean(form.canSpeak),
    })
    if (!initialData) {
      setForm({
        language: '',
        proficiency: 'Fluent',
        canRead: true,
        canWrite: true,
        canSpeak: true,
      })
    }
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Language *</label>
          <input
            type="text"
            value={form.language}
            onChange={(e) => setForm((f) => ({ ...f, language: e.target.value }))}
            placeholder="e.g. English, Hindi, German"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Proficiency *</label>
          <select
            value={form.proficiency}
            onChange={(e) => setForm((f) => ({ ...f, proficiency: e.target.value }))}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            {LANGUAGE_PROFICIENCIES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-4 pt-5">
          <label className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={form.canRead}
              onChange={(e) => setForm((f) => ({ ...f, canRead: e.target.checked }))}
              className="rounded border-slate-300 text-indigo-600"
            />
            Read
          </label>
          <label className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={form.canWrite}
              onChange={(e) => setForm((f) => ({ ...f, canWrite: e.target.checked }))}
              className="rounded border-slate-300 text-indigo-600"
            />
            Write
          </label>
          <label className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={form.canSpeak}
              onChange={(e) => setForm((f) => ({ ...f, canSpeak: e.target.checked }))}
              className="rounded border-slate-300 text-indigo-600"
            />
            Speak
          </label>
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
          {initialData ? 'Update Language' : 'Add Language'}
        </Button>
      </div>
    </form>
  )
}
