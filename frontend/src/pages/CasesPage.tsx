import { useState, useEffect } from 'react'
import { getCases } from '../api/client'
import CaseLifecycle from '../components/CaseLifecycle'

type CaseStage = 'report' | 'triage' | 'review' | 'action' | 'resolve'
type CasePriority = 'critical' | 'high' | 'medium' | 'low'

interface CaseSummary {
  id: string
  incidentType: string
  description: string
  status: CaseStage
  priority: CasePriority
  createdAt: string
}

const PRIORITY_COLORS: Record<CasePriority, string> = {
  critical: '#dc2626',
  high: '#ea580c',
  medium: '#ca8a04',
  low: '#16a34a',
}

const STAGE_LABELS: Record<CaseStage, string> = {
  report: 'Report',
  triage: 'Triage',
  review: 'Review',
  action: 'Action',
  resolve: 'Resolved',
}

// Hardcoded teacher ID for hackathon demo
const DEMO_TEACHER_ID = 'teacher-001'

export default function CasesPage() {
  const [cases, setCases] = useState<CaseSummary[]>([])
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchCases() {
      setLoading(true)
      try {
        const res = await getCases(DEMO_TEACHER_ID)
        if (res.ok) {
          setCases(res.data as CaseSummary[])
        } else {
          setError('Failed to load cases')
        }
      } catch {
        setError('Network error loading cases')
      } finally {
        setLoading(false)
      }
    }
    fetchCases()
  }, [])

  // Show CaseLifecycle when a case is selected
  if (selectedCaseId) {
    return (
      <CaseLifecycle
        caseId={selectedCaseId}
        onBack={() => setSelectedCaseId(null)}
      />
    )
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>Cases</h2>
      <p style={styles.subtitle}>Manage bullying cases with jurisdiction-aware guidance.</p>

      {loading && <p style={styles.loadingText}>Loading cases...</p>}
      {error && <p style={styles.errorText}>{error}</p>}

      {!loading && !error && cases.length === 0 && (
        <p style={styles.emptyText}>No cases yet. Create one from the Report page.</p>
      )}

      {!loading && cases.length > 0 && (
        <div style={styles.caseList}>
          {cases.map((c) => (
            <button
              key={c.id}
              onClick={() => setSelectedCaseId(c.id)}
              style={styles.caseCard}
              aria-label={`Open case: ${c.incidentType.replace(/_/g, ' ')}`}
            >
              <div style={styles.cardTop}>
                <span style={styles.incidentType}>
                  {c.incidentType.replace(/_/g, ' ')}
                </span>
                <span style={{
                  ...styles.priorityBadge,
                  backgroundColor: PRIORITY_COLORS[c.priority],
                }}>
                  {c.priority}
                </span>
              </div>
              <p style={styles.cardDescription}>{c.description}</p>
              <div style={styles.cardBottom}>
                <span style={styles.stageBadge}>{STAGE_LABELS[c.status]}</span>
                <span style={styles.dateText}>
                  {new Date(c.createdAt).toLocaleDateString()}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: 800,
    margin: '0 auto',
    padding: '24px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  heading: {
    fontSize: 22,
    fontWeight: 600,
    color: '#111827',
    margin: '0 0 4px',
  },
  subtitle: {
    fontSize: 14,
    color: '#6b7280',
    margin: '0 0 24px',
  },
  loadingText: {
    color: '#6b7280',
    fontSize: 14,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
  },
  emptyText: {
    color: '#9ca3af',
    fontSize: 14,
    fontStyle: 'italic',
  },
  caseList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 12,
  },
  caseCard: {
    display: 'block',
    width: '100%',
    textAlign: 'left' as const,
    backgroundColor: '#f9fafb',
    border: '1px solid #e5e7eb',
    borderRadius: 8,
    padding: '16px 20px',
    cursor: 'pointer',
    transition: 'border-color 0.15s',
    fontFamily: 'inherit',
    fontSize: 'inherit',
  },
  cardTop: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  incidentType: {
    fontSize: 15,
    fontWeight: 600,
    color: '#111827',
    textTransform: 'capitalize' as const,
  },
  priorityBadge: {
    padding: '2px 8px',
    borderRadius: 10,
    color: '#fff',
    fontSize: 11,
    fontWeight: 600,
    textTransform: 'uppercase' as const,
  },
  cardDescription: {
    fontSize: 13,
    color: '#4b5563',
    margin: '0 0 8px',
    lineHeight: 1.4,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap' as const,
  },
  cardBottom: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  stageBadge: {
    fontSize: 11,
    padding: '2px 8px',
    borderRadius: 4,
    backgroundColor: '#e0e7ff',
    color: '#3730a3',
    fontWeight: 500,
  },
  dateText: {
    fontSize: 11,
    color: '#9ca3af',
  },
}
