import React, { useState, useEffect } from 'react'
import { Button } from '../../../components/ui/Button'
import { EDUCATION_LEVELS } from '../schema/profileSchema'

function toDateInput(val) {
  if (!val) return ''
  try {
    return new Date(val).toISOString().split('T')[0]
  } catch {
    return ''
  }
}

export function EducationForm({ initialData = null, onSubmit, onCancel, isSubmitting = false }) {
  const [form, setForm] = useState({
    educationLevel: 'Undergraduate',
    degree: '',
    fieldOfStudy: '',
    institutionName: '',
    universityName: '',
    startDate: '',
    endDate: '',
    currentlyStudying: false,
    grade: '',
    description: '',
  })
  const [error, setError] = useState('')

  useEffect(() => {
    if (initialData) {
      setForm({
        educationLevel: initialData.educationLevel || 'Undergraduate',
        degree: initialData.degree || '',
        fieldOfStudy: initialData.fieldOfStudy || '',
        institutionName: initialData.institutionName || '',
        universityName: initialData.universityName || '',
        startDate: toDateInput(initialData.startDate),
        endDate: toDateInput(initialData.endDate),
        currentlyStudying: Boolean(initialData.currentlyStudying),
        grade: initialData.grade || '',
        description: initialData.description || '',
      })
    }
  }, [initialData])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.degree.trim() || !form.institutionName.trim()) {
      setError('Degree and Institution Name are required')
      return
    }
    if (!form.currentlyStudying && form.startDate && form.endDate && form.endDate < form.startDate) {
      setError('End date cannot be earlier than start date')
      return
    }

    await onSubmit({
      ...form,
      degree: form.degree.trim(),
      institutionName: form.institutionName.trim(),
      fieldOfStudy: form.fieldOfStudy.trim() || null,
      universityName: form.universityName.trim() || null,
      startDate: form.startDate || null,
      endDate: form.currentlyStudying ? null : form.endDate || null,
      grade: form.grade.trim() || null,
      description: form.description.trim() || null,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Education Level</label>
          <select
            value={form.educationLevel}
            onChange={(e) => setForm((f) => ({ ...f, educationLevel: e.target.value }))}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          >
            {EDUCATION_LEVELS.map((lvl) => (
              <option key={lvl} value={lvl}>
                {lvl}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Degree / Course *</label>
          <input
            type="text"
            value={form.degree}
            onChange={(e) => setForm((f) => ({ ...f, degree: e.target.value }))}
            placeholder="e.g. B.Tech, MBA, B.Sc"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Specialization / Field</label>
          <input
            type="text"
            value={form.fieldOfStudy}
            onChange={(e) => setForm((f) => ({ ...f, fieldOfStudy: e.target.value }))}
            placeholder="e.g. Computer Science"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Institution / College *</label>
          <input
            type="text"
            value={form.institutionName}
            onChange={(e) => setForm((f) => ({ ...f, institutionName: e.target.value }))}
            placeholder="e.g. IIT Delhi"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">University / Board</label>
          <input
            type="text"
            value={form.universityName}
            onChange={(e) => setForm((f) => ({ ...f, universityName: e.target.value }))}
            placeholder="e.g. Delhi University"
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-slate-700">Percentage / CGPA / Grade</label>
          <input
            type="text"
            value={form.grade}
            onChange={(e) => setForm((f) => ({ ...f, grade: e.target.value }))}
            placeholder="e.g. 8.7 CGPA or 85%"
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
            disabled={form.currentlyStudying}
            value={form.endDate}
            onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:bg-slate-100"
          />
        </div>

        <div className="flex items-center pt-5">
          <label className="inline-flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
            <input
              type="checkbox"
              checked={form.currentlyStudying}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  currentlyStudying: e.target.checked,
                  endDate: e.target.checked ? '' : f.endDate,
                }))
              }
              className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            Currently Studying Here
          </label>
        </div>
      </div>

      <div>
        <label className="mb-1 block text-xs font-medium text-slate-700">Description / Coursework</label>
        <textarea
          rows={2}
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          placeholder="Key coursework, honors, or societies..."
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
          {initialData ? 'Update Education' : 'Save Education'}
        </Button>
      </div>
    </form>
  )
}
