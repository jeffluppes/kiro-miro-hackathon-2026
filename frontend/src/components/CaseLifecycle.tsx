import { useState, useEffect, useCallback } from 'react'
import { getCase, updateCaseStage, getLegalGuidance } from '../api/client'

// Types matching backend models
type CaseStage = 'report' | 'triage' | 'review' | 'action' | 'resolve'
type CasePriority = 'critical' | 'high' | 'medium' | 'low'

interface ChecklistItem {
  id: string
  caseId: string
  text: string
  done: boolean
  order: number
  jurisdictionSpecific: boolean
}

interface LegalObligation {
  id: string
  title: string
  description: string
  authority: string
  deadline?: string
  applicableLaw?: string
}

interface ReportingProcedure {
  id: string
  title: string
  steps: { order: number; description: string; responsible: string; deadline?: string }[]
  targetAuthority: string
}

interface CaseData {
  id: string
  teacherId: string
  studentId?: string
  jurisdictionProfileId: string
  status: CaseStage
  priority: CasePriority
  incidentType: string
  description: string
  checklist: ChecklistItem[]
  createdAt: string
  updatedAt: string
}

interface LegalGuidanceData {
  obligations: LegalObligation[]
  procedures: ReportingProcedure[]
  generatedAt: string
}

interface CaseLifecycleProps {
  caseId: string
  onBack?: () => void
}

const STAGES: CaseStage[] = ['report', 'triage', 'review', 'action', 'resolve']

const STAGE_LABELS: Record<CaseStage, string> = {
  report: 'Report',
  triage: 'Triage',
  review: 'Review',
  action: 'Action',
  resolve: 'Resolve',
}

const VALID_NEXT_STAGE: Record<CaseStage, CaseStage | null> = {
  report: 'triage',
  triage: 'review',
  review: 'action',
  action: 'resolve',
  resolve: null,
}

const PRIORITY_COLORS: Record<CasePriority, string> = {
  critical: '#dc2626',
  high: '#ea580c',
  medium: '#ca8a04',
  low: '#16a34a',
}

// Hardcoded teacher ID for hackathon demo
const DEMO_TEACHER_ID = 'teacher-001'

export default function CaseLifecycle({ caseId, onBack }: CaseLifecycleProps) {
  const [caseData, setCaseData] = useState<CaseData | null>(null)
  const [guidance, setGuidance] = useState<LegalGuidanceData | null>(null)
  const [loading, setLoading] = useState(true)
  const [guidanceLoading, setGuidanceLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [advancing, setAdvancing] = useState(false)

  const fetchCase = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await getCase(caseId)
      if (res.ok) {
        setCaseData(res.data as CaseData)
      } else {
        setError('Failed to load case')
      }
    } catch {
      setError('Network error loading case')
    } finally {
      setLoading(false)
    }
  }, [caseId])

  const fetchGuidance = useCallback(async () => {
    setGuidanceLoading(true)
    try {
      const res = await getLegalGuidance(caseId)
      if (res.ok) {
        setGuidance(res.data as LegalGuidanceData)
      }
    } catch {
      // Guidance is optional, don't block the UI
    } finally {
      setGuidanceLoading(false)
    }
  }, [caseId])

  useEffect(() => {
    fetchCase()
    fetchGuidance()
  }, [fetchCase, fetchGuidance])

  const handleAdvanceStage = async () => {
    if (!caseData) return
    const nextStage = VALID_NEXT_STAGE[caseData.status]
    if (!nextStage) return

    const confirmed = window.confirm(
      `Advance case from "${STAGE_LABELS[caseData.status]}" to "${STAGE_LABELS[nextStage]}"?`
    )
    if (!confirmed) return

    setAdvancing(true)
    try {
      const res = await updateCaseStage(caseId, nextStage, DEMO_TEACHER_ID)
      if (res.ok) {
        setCaseData(res.data as CaseData)
      } else {
        setError('Failed to advance stage')
      }
    } catch {
      setError('Network error advancing stage')
    } finally {
      setAdvancing(false)
    }
  }

  if (loading) {
    return <div style={styles.container}><p style={styles.loadingText}>Loading case...</p></div>
  }

  if (error || !caseData) {
    return (
      <div style={styles.container}>
        <p style={styles.errorText}>{error || 'Case not found'}</p>
        {onBack && <button onClick={onBack} style={styles.backButton}>← Back to cases</button>}
      </div>
    )
  }

  const nextStage = VALID_NEXT_STAGE[caseData.status]
  const currentStageIndex = STAGES.indexOf(caseData.status)

  return (
    <div style={styles.container}>
      {/* Back button */}
      {onBack && (
        <button onClick={onBack} style={styles.backButton}>← Back to cases</button>
      )}

      {/* Case Header */}
      <div style={styles.header}>
        <div style={styles.headerTop}>
          <h2 style={styles.title}>{caseData.incidentType.replace(/_/g, ' ')}</h2>
          <span style={{
            ...styles.priorityBadge,
            backgroundColor: PRIORITY_COLORS[caseData.priority],
          }}>
            {caseData.priority}
          </span>
        </div>
        <p style={styles.description}>{caseData.description}</p>
        <p style={styles.meta}>
          Created: {new Date(caseData.createdAt).toLocaleDateString()} · Case ID: {caseData.id.slice(0, 8)}
        </p>
      </div>

      {/* Stage Progression Bar */}
      <div style={styles.stageSection}>
        <h3 style={styles.sectionTitle}>Case Progress</h3>
        <div style={styles.stageBar}>
          {STAGES.map((stage, index) => {
            const isCompleted = index < currentStageIndex
            const isCurrent = index === currentStageIndex
            return (
              <div key={stage} style={styles.stageItem}>
                <div style={{
                  ...styles.stageCircle,
                  backgroundColor: isCompleted ? '#16a34a' : isCurrent ? '#2563eb' : '#e5e7eb',
                  color: isCompleted || isCurrent ? '#fff' : '#6b7280',
                }}>
                  {isCompleted ? '✓' : index + 1}
                </div>
                <span style={{
                  ...styles.stageLabel,
                  fontWeight: isCurrent ? 600 : 400,
                  color: isCurrent ? '#2563eb' : isCompleted ? '#16a34a' : '#6b7280',
                }}>
                  {STAGE_LABELS[stage]}
                </span>
                {index < STAGES.length - 1 && (
                  <div style={{
                    ...styles.stageConnector,
                    backgroundColor: isCompleted ? '#16a34a' : '#e5e7eb',
                  }} />
                )}
              </div>
            )
          })}
        </div>

        {/* Advance Stage Button */}
        {nextStage && (
          <button
            onClick={handleAdvanceStage}
            disabled={advancing}
            style={{
              ...styles.advanceButton,
              opacity: advancing ? 0.6 : 1,
            }}
          >
            {advancing ? 'Advancing...' : `Advance to ${STAGE_LABELS[nextStage]} →`}
          </button>
        )}
        {!nextStage && (
          <p style={styles.resolvedNote}>✓ This case has been resolved.</p>
        )}
      </div>

      {/* Checklist Section */}
      <div style={styles.checklistSection}>
        <h3 style={styles.sectionTitle}>Checklist</h3>
        {caseData.checklist.length === 0 ? (
          <p style={styles.emptyText}>No checklist items yet.</p>
        ) : (
          <ul style={styles.checklistList}>
            {caseData.checklist
              .sort((a, b) => a.order - b.order)
              .map((item) => (
                <li key={item.id} style={styles.checklistItem}>
                  <input
                    type="checkbox"
                    checked={item.done}
                    readOnly
                    style={styles.checkbox}
                    aria-label={item.text}
                  />
                  <span style={{
                    ...styles.checklistText,
                    textDecoration: item.done ? 'line-through' : 'none',
                    opacity: item.done ? 0.6 : 1,
                  }}>
                    {item.text}
                  </span>
                  {item.jurisdictionSpecific && (
                    <span style={styles.jurisdictionIcon} title="Jurisdiction-specific requirement">
                      ⚖️
                    </span>
                  )}
                </li>
              ))}
          </ul>
        )}
      </div>

      {/* Legal Guidance Section */}
      <div style={styles.guidanceSection}>
        <h3 style={styles.sectionTitle}>Legal Guidance</h3>
        {guidanceLoading ? (
          <p style={styles.loadingText}>Loading legal guidance...</p>
        ) : !guidance ? (
          <p style={styles.emptyText}>No legal guidance available.</p>
        ) : (
          <div>
            {/* Obligations */}
            {guidance.obligations.length > 0 && (
              <div style={styles.guidanceSubsection}>
                <h4 style={styles.subsectionTitle}>Legal Obligations</h4>
                {guidance.obligations.map((obligation) => (
                  <div key={obligation.id} style={styles.obligationCard}>
                    <strong style={styles.obligationTitle}>{obligation.title}</strong>
                    <p style={styles.obligationDesc}>{obligation.description}</p>
                    <div style={styles.obligationMeta}>
                      {obligation.authority && (
                        <span style={styles.metaTag}>Authority: {obligation.authority}</span>
                      )}
                      {obligation.deadline && (
                        <span style={{ ...styles.metaTag, backgroundColor: '#fef3c7', color: '#92400e' }}>
                          Deadline: {obligation.deadline}
                        </span>
                      )}
                      {obligation.applicableLaw && (
                        <span style={{ ...styles.metaTag, backgroundColor: '#ede9fe', color: '#5b21b6' }}>
                          {obligation.applicableLaw}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Procedures */}
            {guidance.procedures.length > 0 && (
              <div style={styles.guidanceSubsection}>
                <h4 style={styles.subsectionTitle}>Reporting Procedures</h4>
                {guidance.procedures.map((procedure) => (
                  <div key={procedure.id} style={styles.procedureCard}>
                    <strong style={styles.obligationTitle}>{procedure.title}</strong>
                    <p style={styles.obligationDesc}>
                      Target: {procedure.targetAuthority}
                    </p>
                    <ol style={styles.stepsList}>
                      {procedure.steps
                        .sort((a, b) => a.order - b.order)
                        .map((step) => (
                          <li key={step.order} style={styles.stepItem}>
                            {step.description}
                            {step.deadline && (
                              <span style={styles.stepDeadline}> ({step.deadline})</span>
                            )}
                          </li>
                        ))}
                    </ol>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
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
  loadingText: {
    color: '#6b7280',
    fontSize: 14,
  },
  errorText: {
    color: '#dc2626',
    fontSize: 14,
  },
  backButton: {
    background: 'none',
    border: 'none',
    color: '#2563eb',
    cursor: 'pointer',
    fontSize: 14,
    padding: '4px 0',
    marginBottom: 16,
  },
  header: {
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: '20px',
    marginBottom: 24,
    border: '1px solid #e5e7eb',
  },
  headerTop: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    marginBottom: 8,
  },
  title: {
    margin: 0,
    fontSize: 20,
    fontWeight: 600,
    color: '#111827',
    textTransform: 'capitalize' as const,
  },
  priorityBadge: {
    padding: '2px 10px',
    borderRadius: 12,
    color: '#fff',
    fontSize: 12,
    fontWeight: 600,
    textTransform: 'uppercase' as const,
  },
  description: {
    margin: '8px 0',
    color: '#374151',
    fontSize: 14,
    lineHeight: 1.5,
  },
  meta: {
    margin: 0,
    color: '#9ca3af',
    fontSize: 12,
  },
  stageSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 600,
    color: '#111827',
    marginBottom: 12,
    marginTop: 0,
  },
  stageBar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    position: 'relative' as const,
  },
  stageItem: {
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    position: 'relative' as const,
    flex: 1,
  },
  stageCircle: {
    width: 32,
    height: 32,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 13,
    fontWeight: 600,
    marginBottom: 4,
  },
  stageLabel: {
    fontSize: 11,
    textAlign: 'center' as const,
  },
  stageConnector: {
    position: 'absolute' as const,
    top: 16,
    left: '60%',
    width: '80%',
    height: 3,
    borderRadius: 2,
  },
  advanceButton: {
    backgroundColor: '#2563eb',
    color: '#fff',
    border: 'none',
    borderRadius: 6,
    padding: '10px 20px',
    fontSize: 14,
    fontWeight: 500,
    cursor: 'pointer',
  },
  resolvedNote: {
    color: '#16a34a',
    fontSize: 14,
    fontWeight: 500,
  },
  checklistSection: {
    marginBottom: 24,
    backgroundColor: '#f9fafb',
    borderRadius: 8,
    padding: '20px',
    border: '1px solid #e5e7eb',
  },
  emptyText: {
    color: '#9ca3af',
    fontSize: 13,
    fontStyle: 'italic',
  },
  checklistList: {
    listStyle: 'none',
    padding: 0,
    margin: 0,
  },
  checklistItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '8px 0',
    borderBottom: '1px solid #f3f4f6',
  },
  checkbox: {
    width: 16,
    height: 16,
    cursor: 'default',
  },
  checklistText: {
    fontSize: 14,
    color: '#374151',
    flex: 1,
  },
  jurisdictionIcon: {
    fontSize: 14,
    cursor: 'help',
  },
  guidanceSection: {
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    padding: '20px',
    border: '1px solid #bfdbfe',
  },
  guidanceSubsection: {
    marginBottom: 16,
  },
  subsectionTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: '#1e40af',
    marginBottom: 8,
    marginTop: 0,
  },
  obligationCard: {
    backgroundColor: '#fff',
    borderRadius: 6,
    padding: '12px 16px',
    marginBottom: 8,
    border: '1px solid #e5e7eb',
  },
  obligationTitle: {
    fontSize: 14,
    color: '#111827',
  },
  obligationDesc: {
    fontSize: 13,
    color: '#4b5563',
    margin: '4px 0 8px',
    lineHeight: 1.4,
  },
  obligationMeta: {
    display: 'flex',
    gap: 8,
    flexWrap: 'wrap' as const,
  },
  metaTag: {
    fontSize: 11,
    padding: '2px 8px',
    borderRadius: 4,
    backgroundColor: '#f3f4f6',
    color: '#374151',
  },
  procedureCard: {
    backgroundColor: '#fff',
    borderRadius: 6,
    padding: '12px 16px',
    marginBottom: 8,
    border: '1px solid #e5e7eb',
  },
  stepsList: {
    margin: '8px 0 0',
    paddingLeft: 20,
  },
  stepItem: {
    fontSize: 13,
    color: '#374151',
    marginBottom: 4,
    lineHeight: 1.4,
  },
  stepDeadline: {
    color: '#92400e',
    fontStyle: 'italic',
    fontSize: 12,
  },
}
