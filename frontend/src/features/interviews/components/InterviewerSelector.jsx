import React, { useState } from 'react'
import { UserPlus } from 'lucide-react'
import { INTERVIEWER_ROLES } from '../schema/interviewSchemas'
import { Button } from '../../../components/ui/Button'

export function InterviewerSelector({
  eligibleMembers = [],
  selectedInterviewers = [],
  onChange,
  onSaveDirect,
  isSaving = false,
}) {
  const [selectedUserId, setSelectedUserId] = useState('')
  const [selectedRole, setSelectedRole] = useState('TECHNICAL_INTERVIEWER')

  const handleAdd = () => {
    if (!selectedUserId) return
    if (selectedInterviewers.some((i) => i.interviewerId === selectedUserId)) return

    const member = eligibleMembers.find((m) => m.userId === selectedUserId)
    const next = [
      ...selectedInterviewers,
      {
        interviewerId: selectedUserId,
        interviewerRole: selectedRole,
        fullName: member?.fullName || member?.email || 'Interviewer',
        email: member?.email || '',
      },
    ]
    if (onChange) onChange(next)
    if (onSaveDirect) {
      onSaveDirect([{ interviewerId: selectedUserId, interviewerRole: selectedRole }])
    }
    setSelectedUserId('')
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <select
          value={selectedUserId}
          onChange={(e) => setSelectedUserId(e.target.value)}
          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"
        >
          <option value="">Select company interviewer...</option>
          {eligibleMembers.map((member) => (
            <option key={member.userId} value={member.userId}>
              {member.fullName} ({member.email})
            </option>
          ))}
        </select>

        <select
          value={selectedRole}
          onChange={(e) => setSelectedRole(e.target.value)}
          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"
        >
          {INTERVIEWER_ROLES.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>

        <Button
          type="button"
          variant="secondary"
          disabled={!selectedUserId || isSaving}
          onClick={handleAdd}
          className="gap-1.5 text-xs"
        >
          <UserPlus className="h-3.5 w-3.5" />
          Assign Interviewer
        </Button>
      </div>
    </div>
  )
}
