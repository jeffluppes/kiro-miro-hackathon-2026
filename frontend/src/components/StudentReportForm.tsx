import { useState, useCallback } from 'react'
import { createCase } from '../api/client'

type IncidentType =
  | 'verbal_bullying'
  | 'physical_bullying'
  | 'cyberbullying'
  | 'social_exclusion'
  | 'other'

type FormState = 'idle' | 'submitting' | 'success' | 'error'

const INCIDENT_TYPES: { value: IncidentType; label: string }[] = [
  { value: 'verbal_bullying', label: 'Verbal bullying (name-calling, threats)' },
  { value: 'physical_bullying', label: 'Physical bullying (hitting, pushing)' },
  { value: 'cyberbullying', label: 'Cyberbullying (online harassment)' },
  { value: 'social_exclusion', label: 'Social exclusion (being left out)' },
  { value: 'other', label: 'Other' },
]

function getTodayString(): string {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const styles = {
  container: {
    maxWidth: '520px',
    margin: '0 auto',
    padding: '2rem',
  } as React.CSSProperties,
  confidentialityNotice: {
    padding: '1rem 1.25rem',
    backgroundColor: '#ecfdf5',
    border: '1px solid #a7f3d0',
    borderRadius: '8px',
    marginBottom: '1.5rem',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '0.75rem',
  } as React.CSSProperties,
  confidentialityIcon: {
    fontSize: '1.25rem',
    flexShrink: 0,
    marginTop: '1px',
  } as React.CSSProperties,
  confidentialityText: {
    fontSize: '0.9rem',
    color: '#065f46',
    lineHeight: 1.5,
    margin: 0,
  } as React.CSSProperties,
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.25rem',
  } as React.CSSProperties,
  fieldGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.4rem',
  } as React.CSSProperties,
  label: {
    fontSize: '0.9rem',
    fontWeight: 500,
    color: '#374151',
  } as React.CSSProperties,
  select: {
    padding: '0.7rem 0.9rem',
    fontSize: '0.95rem',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    backgroundColor: '#fff',
    color: '#1f2937',
    outline: 'none',
    transition: 'border-color 0.2s',
    appearance: 'auto',
  } as React.CSSProperties,
  textarea: {
    padding: '0.75rem 1rem',
    fontSize: '0.95rem',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    minHeight: '120px',
    resize: 'vertical',
    outline: 'none',
    fontFamily: 'inherit',
    lineHeight: 1.5,
    transition: 'border-color 0.2s',
  } as React.CSSProperties,
  dateInput: {
    padding: '0.7rem 0.9rem',
    fontSize: '0.95rem',
    border: '1px solid #d1d5db',
    borderRadius: '6px',
    outline: 'none',
    transition: 'border-color 0.2s',
  } as React.CSSProperties,
  attachButton: {
    padding: '0.6rem 1rem',
    fontSize: '0.85rem',
    backgroundColor: '#f3f4f6',
    color: '#9ca3af',
    border: '1px dashed #d1d5db',
    borderRadius: '6px',
    cursor: 'not-allowed',
    alignSelf: 'flex-start',
  } as React.CSSProperties,
  submitButton: {
    padding: '0.85rem 1.5rem',
    fontSize: '1rem',
    fontWeight: 500,
    backgroundColor: '#7c3aed',
    color: '#fff',
    border: 'none',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    marginTop: '0.5rem',
  } as React.CSSProperties,
  submitButtonDisabled: {
    backgroundColor: '#c4b5fd',
    cursor: 'not-allowed',
  } as React.CSSProperties,
  successContainer: {
    textAlign: 'center',
    padding: '2.5rem 1.5rem',
    backgroundColor: '#f0fdf4',
    border: '1px solid #bbf7d0',
    borderRadius: '12px',
  } as React.CSSProperties,
  successIcon: {
    fontSize: '3rem',
    marginBottom: '1rem',
  } as React.CSSProperties,
  successTitle: {
    fontSize: '1.25rem',
    fontWeight: 600,
    color: '#166534',
    marginBottom: '0.75rem',
  } as React.CSSProperties,
  successMessage: {
    fontSize: '0.95rem',
    color: '#15803d',
    lineHeight: 1.6,
    margin: 0,
  } as React.CSSProperties,
  errorContainer: {
    padding: '1rem 1.25rem',
    backgroundColor: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    marginBottom: '1rem',
  } as React.CSSProperties,
  errorText: {
    fontSize: '0.9rem',
    color: '#991b1b',
    margin: 0,
  } as React.CSSProperties,
  hint: {
    fontSize: '0.8rem',
    color: '#6b7280',
    marginTop: '0.2rem',
  } as React.CSSProperties,
}

export default function StudentReportForm() {
  const [description, setDescription] = useState('')
  const [incidentDate, setIncidentDate] = useState(getTodayString())
  const [incidentType, setIncidentType] = useState<IncidentType>('verbal_bullying')
  const [formState, setFormState] = useState<FormState>('idle')
  const [errorMessage, setErrorMessage] = useState('')

  const canSubmit = description.trim().length > 0 && formState !== 'submitting'

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      if (!canSubmit) return

      setFormState('submitting')
      setErrorMessage('')

      const jurisdictionProfileId = localStorage.getItem('jurisdictionProfileId') || ''

      if (!jurisdictionProfileId) {
        setErrorMessage('No school profile found. Please ask your teacher to discover and approve a school profile first.')
        setFormState('error')
        return
      }

      try {
        const response = await createCase({
          teacherId: 'teacher-1',
          jurisdictionProfileId,
          incidentType,
          description: description.trim(),
          incidentDate,
        })

        if (response.ok) {
          setFormState('success')
        } else {
          const data = response.data as { error?: string }
          setErrorMessage(data.error || 'Something went wrong. Please try again.')
          setFormState('error')
        }
      } catch (err) {
        setErrorMessage(
          err instanceof Error ? err.message : 'Could not connect. Please try again later.'
        )
        setFormState('error')
      }
    },
    [canSubmit, description, incidentDate, incidentType]
  )

  if (formState === 'success') {
    return (
      <div style={styles.container}>
        <div style={styles.successContainer}>
          <div style={styles.successIcon}>✓</div>
          <h3 style={styles.successTitle}>Report submitted</h3>
          <p style={styles.successMessage}>
            Your report has been submitted. A teacher will review it soon.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div style={styles.container}>
      <div style={styles.confidentialityNotice}>
        <span style={styles.confidentialityIcon}>🔒</span>
        <p style={styles.confidentialityText}>
          Your report is confidential. Only your teacher will see it.
        </p>
      </div>

      {formState === 'error' && (
        <div style={styles.errorContainer}>
          <p style={styles.errorText}>{errorMessage}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} style={styles.form}>
        <div style={styles.fieldGroup}>
          <label htmlFor="incident-type" style={styles.label}>
            What happened?
          </label>
          <select
            id="incident-type"
            value={incidentType}
            onChange={(e) => setIncidentType(e.target.value as IncidentType)}
            style={styles.select}
            aria-label="Incident type"
          >
            {INCIDENT_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>

        <div style={styles.fieldGroup}>
          <label htmlFor="description" style={styles.label}>
            Tell us more about what happened
          </label>
          <textarea
            id="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Describe what happened. Take your time — you're safe here."
            style={styles.textarea}
            required
            aria-label="Description of incident"
          />
          <span style={styles.hint}>This field is required</span>
        </div>

        <div style={styles.fieldGroup}>
          <label htmlFor="incident-date" style={styles.label}>
            When did it happen?
          </label>
          <input
            id="incident-date"
            type="date"
            value={incidentDate}
            onChange={(e) => setIncidentDate(e.target.value)}
            max={getTodayString()}
            style={styles.dateInput}
            aria-label="Date of incident"
          />
        </div>

        <div style={styles.fieldGroup}>
          <label style={styles.label}>Attachments</label>
          <button type="button" disabled style={styles.attachButton}>
            📎 Attach file (coming soon)
          </button>
        </div>

        <button
          type="submit"
          disabled={!canSubmit}
          style={{
            ...styles.submitButton,
            ...(!canSubmit ? styles.submitButtonDisabled : {}),
          }}
        >
          {formState === 'submitting' ? 'Submitting...' : 'Submit report'}
        </button>
      </form>
    </div>
  )
}
