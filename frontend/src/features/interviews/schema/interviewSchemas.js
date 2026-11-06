export const INTERVIEW_TYPES = [
  'Technical Interview',
  'HR Interview',
  'Managerial Interview',
  'Coding Assessment',
  'System Design Interview',
  'Behavioral Interview',
  'Final Interview',
  'Other',
]

export const INTERVIEW_MODES = [
  { value: 'ONLINE', label: 'Online (Video Call)' },
  { value: 'IN_PERSON', label: 'In Person (Office)' },
  { value: 'TELEPHONIC', label: 'Telephonic' },
]

export const INTERVIEWER_ROLES = [
  { value: 'PRIMARY_INTERVIEWER', label: 'Primary Interviewer' },
  { value: 'TECHNICAL_INTERVIEWER', label: 'Technical Interviewer' },
  { value: 'HR_INTERVIEWER', label: 'HR Interviewer' },
  { value: 'OBSERVER', label: 'Observer' },
]

export const INTERVIEW_STATUS_META = {
  DRAFT: {
    label: 'Draft',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200',
  },
  SCHEDULED: {
    label: 'Scheduled',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  RESCHEDULED: {
    label: 'Rescheduled',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  CONFIRMED: {
    label: 'Confirmed',
    badgeClass: 'bg-indigo-50 text-indigo-700 border-indigo-200',
  },
  IN_PROGRESS: {
    label: 'In Progress',
    badgeClass: 'bg-purple-50 text-purple-700 border-purple-200',
  },
  COMPLETED: {
    label: 'Completed',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  CANCELLED: {
    label: 'Cancelled',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
  },
  NO_SHOW: {
    label: 'No Show',
    badgeClass: 'bg-orange-50 text-orange-700 border-orange-200',
  },
}

export const RATING_LABELS = {
  1: '1 - Poor',
  2: '2 - Below Average',
  3: '3 - Average',
  4: '4 - Good',
  5: '5 - Excellent',
}

export const FEEDBACK_RECOMMENDATIONS = [
  {
    value: 'STRONG_HIRE',
    label: 'Strong Hire',
    badgeClass: 'bg-emerald-100 text-emerald-800 border-emerald-300',
  },
  {
    value: 'HIRE',
    label: 'Hire',
    badgeClass: 'bg-blue-50 text-blue-700 border-blue-200',
  },
  {
    value: 'HOLD',
    label: 'Hold / Undecided',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  {
    value: 'REJECT',
    label: 'Reject / No Hire',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
  },
]

export const HIRING_DECISION_OPTIONS = [
  {
    value: 'SELECTED',
    label: 'Select Candidate (Move to Offered / Hired)',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  {
    value: 'ON_HOLD',
    label: 'Keep Candidate On Hold',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  {
    value: 'REJECTED',
    label: 'Reject Candidate',
    badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
  },
]

export const COMMON_TIMEZONES = [
  'Asia/Kolkata',
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Los_Angeles',
  'Europe/London',
  'Europe/Berlin',
  'Asia/Singapore',
  'Asia/Dubai',
  'Australia/Sydney',
]

export function formatInterviewDateTime(isoString, timeZone = 'Asia/Kolkata') {
  if (!isoString) return '—'
  try {
    return new Intl.DateTimeFormat('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: timeZone || 'Asia/Kolkata',
    }).format(new Date(isoString))
  } catch {
    return new Date(isoString).toLocaleString()
  }
}

export function formatInterviewTimeRange(startIso, endIso, timeZone = 'Asia/Kolkata') {
  if (!startIso || !endIso) return '—'
  try {
    const datePart = new Intl.DateTimeFormat('en-IN', {
      weekday: 'short',
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: timeZone || 'Asia/Kolkata',
    }).format(new Date(startIso))

    const timeFormatter = new Intl.DateTimeFormat('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: timeZone || 'Asia/Kolkata',
    })

    return `${datePart} • ${timeFormatter.format(new Date(startIso))} – ${timeFormatter.format(new Date(endIso))} (${timeZone})`
  } catch {
    return `${new Date(startIso).toLocaleString()} - ${new Date(endIso).toLocaleTimeString()}`
  }
}
