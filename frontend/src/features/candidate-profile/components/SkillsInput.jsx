import React, { useState, useEffect } from 'react'
import { Plus, Sparkles } from 'lucide-react'
import { Button } from '../../../components/ui/Button'
import { SKILL_CATEGORIES, PROFICIENCY_LEVELS } from '../schema/profileSchema'

export function SkillsInput({
  suggestions = [],
  existingSkills = [],
  editingSkill = null,
  onCancelEdit,
  onSubmit,
  isSubmitting = false,
}) {
  const [name, setName] = useState('')
  const [category, setCategory] = useState('Programming Language')
  const [proficiencyLevel, setProficiencyLevel] = useState('Intermediate')
  const [experienceYears, setExperienceYears] = useState('')
  const [lastUsed, setLastUsed] = useState(String(new Date().getFullYear()))
  const [error, setError] = useState('')

  useEffect(() => {
    if (editingSkill) {
      setName(editingSkill.name || '')
      setCategory(editingSkill.category || 'Programming Language')
      setProficiencyLevel(editingSkill.proficiencyLevel || 'Intermediate')
      setExperienceYears(
        editingSkill.experienceYears !== null && editingSkill.experienceYears !== undefined
          ? String(editingSkill.experienceYears)
          : '',
      )
      setLastUsed(editingSkill.lastUsed ? String(editingSkill.lastUsed) : '')
      setError('')
    } else {
      setName('')
      setCategory('Programming Language')
      setProficiencyLevel('Intermediate')
      setExperienceYears('')
      setLastUsed(String(new Date().getFullYear()))
      setError('')
    }
  }, [editingSkill])

  const existingNamesSet = new Set(
    existingSkills
      .filter((s) => !editingSkill || s.id !== editingSkill.id)
      .map((s) => s.name.trim().toLowerCase()),
  )

  const handleFormSubmit = async (e) => {
    e.preventDefault()
    setError('')
    const trimmed = name.trim()
    if (!trimmed) {
      setError('Skill name is required')
      return
    }
    if (existingNamesSet.has(trimmed.toLowerCase())) {
      setError(`"${trimmed}" is already in your skill list`)
      return
    }

    await onSubmit({
      name: trimmed,
      category: category || null,
      proficiencyLevel: proficiencyLevel || null,
      experienceYears: experienceYears !== '' ? Number(experienceYears) : null,
      lastUsed: lastUsed !== '' ? Number(lastUsed) : null,
    })

    if (!editingSkill) {
      setName('')
      setExperienceYears('')
    }
  }

  const availableSuggestions = suggestions
    .filter((item) => !existingNamesSet.has(item.toLowerCase()))
    .slice(0, 12)

  return (
    <div className="space-y-4">
      <form
        onSubmit={handleFormSubmit}
        className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3"
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <label className="mb-1 block text-xs font-medium text-slate-700">Skill Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. React.js, Node.js, PostgreSQL"
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none"
            >
              {SKILL_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-slate-700">Proficiency</label>
            <select
              value={proficiencyLevel}
              onChange={(e) => setProficiencyLevel(e.target.value)}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none"
            >
              {PROFICIENCY_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Years Exp</label>
              <input
                type="number"
                step="0.5"
                min="0"
                max="50"
                value={experienceYears}
                onChange={(e) => setExperienceYears(e.target.value)}
                placeholder="2"
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Last Used</label>
              <input
                type="number"
                min="1980"
                max="2035"
                value={lastUsed}
                onChange={(e) => setLastUsed(e.target.value)}
                placeholder="2026"
                className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {error ? <p className="text-xs font-medium text-rose-600">{error}</p> : null}

        <div className="flex items-center justify-end gap-2">
          {editingSkill ? (
            <Button type="button" variant="secondary" onClick={onCancelEdit}>
              Cancel
            </Button>
          ) : null}
          <Button type="submit" isLoading={isSubmitting}>
            <Plus className="mr-1.5 h-4 w-4" />
            {editingSkill ? 'Update Skill' : 'Add Skill'}
          </Button>
        </div>
      </form>

      {!editingSkill && availableSuggestions.length > 0 ? (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 mr-1">
            <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
            Quick add:
          </span>
          {availableSuggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              disabled={isSubmitting}
              onClick={() =>
                onSubmit({
                  name: suggestion,
                  category: 'Framework / Library',
                  proficiencyLevel: 'Intermediate',
                  experienceYears: 1,
                  lastUsed: new Date().getFullYear(),
                })
              }
              className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
            >
              + {suggestion}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  )
}
