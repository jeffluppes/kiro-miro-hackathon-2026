import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { getCases } from '../api/client'

type CaseStage = 'report' | 'triage' | 'review' | 'action' | 'resolve'
type CasePriority = 'critical' | 'high' | 'medium' | 'low'

interface CaseItem {
  id: string
  teacherId: string
  studentId?: string
  jurisdictionProfileId: string
  status: CaseStage
  priority: CasePriority
  incidentType: string
  description: string
  createdAt: string
  updatedAt: string
}

const STAGE_COLORS: Record<CaseStage, string> = {
  report: '#3b82f6',
  triage: '#eab308',
  review: '#f97316',
  action: '#ef4444',
  resolve: '#22c55e',
}

const STAGE_LABELS: Record<CaseStage, string> = {
  report: 'Report',
  triage: 'Triage',
  review: 'Review',
  action: 'Action',
  resolve: 'Resolved',
}

const PRIORITY_INDICATORS: Record<CasePriority, { color: string; label: string }> = {
  critical: { color: '#dc2626', label: '⚠ Critical' },
  high: { color: '#ea580c', label: '↑ High' },
  medium: { color: '#ca8a04', label: '→ Medium' },
  low: { color: '#65a30d', label: '↓ Low' },
}

interface TeacherDashboardProps {
  teacherId: string
}

export default function TeacherDashboard({ teacherId }: TeacherDashboardProps) {
  const navigate = useNavigate()
  const [cases, setCases] = useState<CaseItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedCaseId, setExpandedCaseId] = useState<string | null>(null)

  useEffect(() => {
    async function fetchCases() {
      setLoading(true)
      setError(null)
      try {
        const response = await getCases(teacherId)
        if (response.ok) {
          setCases(response.data as CaseItem[])
        } else {
          setError('Failed to load cases.')
        }
      } catch {
        setError('Network error. Please try again.')
      } finally {
        setLoading(false)
      }
    }
    fetchCases()
  }, [teacherId])

  const activeCases = cases.filter((c) => c.status !== 'resolve')
  const newIncidents = cases.filter((c) => c.status === 'report')

  function formatDate(dateStr: string): string {
    const date = new Date(dateStr)
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    })
  }

  function truncateDescription(desc: string, maxLen = 80): string {
    if (desc.length <= maxLen) return desc
    return desc.slice(0, maxLen).trimEnd() + '…'
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <div>
          <h2 style={styles.title}>Teacher Dashboard</h2>
          <p style={styles.subtitle}>
            Manage bullying cases with jurisdiction-aware guidance
          </p>
        </div>
        <div style={styles.headerActions}>
          <button
            style={styles.primaryButton}
            onClick={() => navigate('/discover')}
          >
            New Discovery
          </button>
          <button
            style={styles.secondaryButton}
            onClick={() => navigate('/resources')}
          >
            View Resources
          </button>
        </div>
      </header>

      {/* New Incident Alerts */}
      {newIncidents.length > 0 && (
        <div style={styles.alertBanner}>
          <span style={styles.alertIcon}>🔔</span>
          <span>
            {newIncidents.length} new incident{newIncidents.length > 1 ? 's' : ''}{' '}
            reported — awaiting triage
          </span>
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div style={styles.emptyState}>
          <p style={styles.emptyText}>Loading cases...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div style={styles.errorBanner}>
          <p>{error}</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && cases.length === 0 && (
        <div style={styles.emptyState}>
          <p style={styles.emptyIcon}>📋</p>
          <p style={styles.emptyTitle}>No cases yet</p>
          <p style={styles.emptyText}>
            Start by discovering your school's jurisdiction profile, then create
            a case when an incident is reported.
          </p>
          <button
            style={styles.primaryButton}
            onClick={() => navigate('/discover')}
          >
            Start Discovery
          </button>
        </div>
      )}

      {/* Active Cases List */}
      {!loading && !error && cases.length > 0 && (
        <div style={styles.section}>
          <h3 style={styles.sectionTitle}>
            Active Cases ({activeCases.length})
          </h3>
          <div style={styles.caseList}>
            {cases.map((caseItem) => (
              <div
                key={caseItem.id}
                style={{
                  ...styles.caseCard,
                  borderLeftColor: STAGE_COLORS[caseItem.status],
                }}
              >
                <div
                  style={styles.caseCardHeader}
                  onClick={() =>
                    setExpandedCaseId(
                      expandedCaseId === caseItem.id ? null : caseItem.id
                    )
                  }
                >
                  <div style={styles.caseCardLeft}>
                    <span
                      style={{
                        ...styles.stageBadge,
                        backgroundColor: STAGE_COLORS[caseItem.status],
                      }}
                    >
                      {STAGE_LABELS[caseItem.status]}
                    </span>
                    <span style={styles.incidentType}>
                      {caseItem.incidentType.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <div style={styles.caseCardRight}>
                    <span
                      style={{
                        ...styles.priorityBadge,
                        color: PRIORITY_INDICATORS[caseItem.priority].color,
                      }}
                    >
                      {PRIORITY_INDICATORS[caseItem.priority].label}
                    </span>
                    <span style={styles.dateText}>
                      {formatDate(caseItem.createdAt)}
                    </span>
                  </div>
                </div>

                <p style={styles.descriptionPreview}>
                  {truncateDescription(caseItem.description)}
                </p>

                {/* Expanded detail view */}
                {expandedCaseId === caseItem.id && (
                  <div style={styles.expandedDetail}>
                    <p style={styles.fullDescription}>{caseItem.description}</p>
                    <div style={styles.detailRow}>
                      <span style={styles.detailLabel}>Case ID:</span>
                      <span style={styles.detailValue}>{caseItem.id}</span>
                    </div>
                    <div style={styles.detailRow}>
                      <span style={styles.detailLabel}>Created:</span>
                      <span style={styles.detailValue}>
                        {formatDate(caseItem.createdAt)}
                      </span>
                    </div>
                    <div style={styles.detailRow}>
                      <span style={styles.detailLabel}>Last Updated:</span>
                      <span style={styles.detailValue}>
                        {formatDate(caseItem.updatedAt)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    maxWidth: 800,
    margin: '0 auto',
    padding: '24px 16px',
    fontFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
    flexWrap: 'wrap',
    gap: 16,
  },
  title: {
    margin: 0,
    fontSize: 24,
    fontWeight: 600,
    color: '#1e293b',
  },
  subtitle: {
    margin: '4px 0 0',
    fontSize: 14,
    color: '#64748b',
  },
  headerActions: {
    display: 'flex',
    gap: 8,
  },
  primaryButton: {
    padding: '10px 18px',
    backgroundColor: '#2563eb',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
  },
  secondaryButton: {
    padding: '10px 18px',
    backgroundColor: '#f1f5f9',
    color: '#334155',
    border: '1px solid #e2e8f0',
    borderRadius: 6,
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
  },
  alertBanner: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '12px 16px',
    backgroundColor: '#fef3c7',
    border: '1px solid #fbbf24',
    borderRadius: 8,
    marginBottom: 20,
    fontSize: 14,
    color: '#92400e',
  },
  alertIcon: {
    fontSize: 18,
  },
  errorBanner: {
    padding: '12px 16px',
    backgroundColor: '#fef2f2',
    border: '1px solid #fca5a5',
    borderRadius: 8,
    marginBottom: 20,
    fontSize: 14,
    color: '#991b1b',
  },
  emptyState: {
    textAlign: 'center' as const,
    padding: '48px 24px',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    border: '1px dashed #cbd5e1',
  },
  emptyIcon: {
    fontSize: 40,
    margin: '0 0 8px',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 600,
    color: '#334155',
    margin: '0 0 8px',
  },
  emptyText: {
    fontSize: 14,
    color: '#64748b',
    margin: '0 0 16px',
    maxWidth: 400,
    marginLeft: 'auto',
    marginRight: 'auto',
  },
  section: {
    marginTop: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: '#334155',
    margin: '0 0 12px',
  },
  caseList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: 12,
  },
  caseCard: {
    padding: '14px 16px',
    backgroundColor: '#fff',
    border: '1px solid #e2e8f0',
    borderLeft: '4px solid',
    borderRadius: 8,
    transition: 'box-shadow 0.15s',
  },
  caseCardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    cursor: 'pointer',
    flexWrap: 'wrap' as const,
    gap: 8,
  },
  caseCardLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  caseCardRight: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  stageBadge: {
    display: 'inline-block',
    padding: '3px 8px',
    borderRadius: 4,
    fontSize: 12,
    fontWeight: 600,
    color: '#fff',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  },
  incidentType: {
    fontSize: 14,
    fontWeight: 500,
    color: '#1e293b',
    textTransform: 'capitalize' as const,
  },
  priorityBadge: {
    fontSize: 12,
    fontWeight: 600,
  },
  dateText: {
    fontSize: 12,
    color: '#94a3b8',
  },
  descriptionPreview: {
    margin: '8px 0 0',
    fontSize: 13,
    color: '#64748b',
    lineHeight: 1.4,
  },
  expandedDetail: {
    marginTop: 12,
    paddingTop: 12,
    borderTop: '1px solid #e2e8f0',
  },
  fullDescription: {
    fontSize: 14,
    color: '#334155',
    lineHeight: 1.5,
    margin: '0 0 12px',
  },
  detailRow: {
    display: 'flex',
    gap: 8,
    marginBottom: 4,
    fontSize: 13,
  },
  detailLabel: {
    color: '#64748b',
    fontWeight: 500,
  },
  detailValue: {
    color: '#334155',
  },
}
