import { useState } from 'react'

// Types matching the backend data models
interface DiscoveredResource {
  id: string
  profileId: string
  name: string
  description: string
  url?: string
  phone?: string
  email?: string
  targetAudience: string[]
  category: string
  source: string
  confidence: number
  isKnownResource: boolean
  verifiedByTeacher: boolean
}

interface LegalObligation {
  id: string
  profileId: string
  title: string
  description: string
  authority: string
  deadline?: string
  sourceUrl?: string
  applicableLaw?: string
  confidence: number
}

interface ProcedureStep {
  order: number
  description: string
  responsible: string
  deadline?: string
}

interface ReportingProcedure {
  id: string
  profileId: string
  title: string
  steps: ProcedureStep[]
  targetAuthority: string
  requiredDocuments?: string[]
  templateAvailable: boolean
  sourceUrl?: string
  confidence: number
}

export interface JurisdictionProfile {
  id: string
  schoolName: string
  schoolAddress?: string
  municipality: string
  province?: string
  country: string
  status: 'discovering' | 'pending_review' | 'approved' | 'rejected' | 'stale'
  discoveredAt: string
  approvedAt?: string
  approvedBy?: string
  expiresAt: string
  resources: DiscoveredResource[]
  legalObligations: LegalObligation[]
  reportingProcedures: ReportingProcedure[]
  confidenceScore: number
}

interface ReviewPanelProps {
  profile: JurisdictionProfile
  onApprove: (profileId: string) => void
  onReject: (profileId: string, reason: string) => void
  onRefresh: (profileId: string) => void
}

const styles = {
  container: {
    maxWidth: '900px',
    margin: '0 auto',
    padding: '24px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
    color: '#1a1a2e',
  } as React.CSSProperties,
  header: {
    marginBottom: '24px',
    paddingBottom: '16px',
    borderBottom: '1px solid #e0e0e0',
  } as React.CSSProperties,
  schoolName: {
    fontSize: '24px',
    fontWeight: 600,
    margin: '0 0 8px 0',
    color: '#1a1a2e',
  } as React.CSSProperties,
  headerMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    flexWrap: 'wrap' as const,
    fontSize: '14px',
    color: '#555',
  } as React.CSSProperties,
  statusBadge: (status: string) => ({
    display: 'inline-block',
    padding: '3px 10px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 600,
    textTransform: 'uppercase' as const,
    ...(status === 'approved' && { background: '#d4edda', color: '#155724' }),
    ...(status === 'pending_review' && { background: '#fff3cd', color: '#856404' }),
    ...(status === 'rejected' && { background: '#f8d7da', color: '#721c24' }),
    ...(status === 'stale' && { background: '#e2e3e5', color: '#383d41' }),
    ...(status === 'discovering' && { background: '#cce5ff', color: '#004085' }),
  }) as React.CSSProperties,
  confidenceBadge: (score: number) => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '3px 10px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 500,
    background: score >= 0.7 ? '#d4edda' : score >= 0.5 ? '#fff3cd' : '#f8d7da',
    color: score >= 0.7 ? '#155724' : score >= 0.5 ? '#856404' : '#721c24',
  }) as React.CSSProperties,
  warningBanner: {
    background: '#fff3cd',
    border: '1px solid #ffc107',
    borderRadius: '8px',
    padding: '12px 16px',
    marginBottom: '20px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '14px',
    color: '#856404',
  } as React.CSSProperties,
  staleBanner: {
    background: '#e2e3e5',
    border: '1px solid #b8b9ba',
    borderRadius: '8px',
    padding: '12px 16px',
    marginBottom: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: '14px',
    color: '#383d41',
  } as React.CSSProperties,
  section: {
    marginBottom: '28px',
  } as React.CSSProperties,
  sectionTitle: {
    fontSize: '18px',
    fontWeight: 600,
    margin: '0 0 12px 0',
    color: '#1a1a2e',
  } as React.CSSProperties,
  card: {
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    padding: '14px 16px',
    marginBottom: '10px',
    background: '#fafafa',
  } as React.CSSProperties,
  cardDeemphasized: {
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    padding: '14px 16px',
    marginBottom: '10px',
    background: '#fafafa',
    opacity: 0.5,
  } as React.CSSProperties,
  cardTitle: {
    fontSize: '15px',
    fontWeight: 600,
    margin: '0 0 4px 0',
  } as React.CSSProperties,
  cardDescription: {
    fontSize: '13px',
    color: '#555',
    margin: '0 0 8px 0',
  } as React.CSSProperties,
  cardMeta: {
    display: 'flex',
    gap: '12px',
    flexWrap: 'wrap' as const,
    fontSize: '12px',
    color: '#777',
  } as React.CSSProperties,
  tag: {
    display: 'inline-block',
    padding: '2px 8px',
    borderRadius: '4px',
    background: '#e8e8e8',
    fontSize: '11px',
    color: '#555',
  } as React.CSSProperties,
  actions: {
    display: 'flex',
    gap: '12px',
    marginTop: '24px',
    paddingTop: '16px',
    borderTop: '1px solid #e0e0e0',
    flexWrap: 'wrap' as const,
  } as React.CSSProperties,
  btnApprove: {
    padding: '10px 20px',
    borderRadius: '6px',
    border: 'none',
    background: '#28a745',
    color: '#fff',
    fontWeight: 600,
    fontSize: '14px',
    cursor: 'pointer',
  } as React.CSSProperties,
  btnReject: {
    padding: '10px 20px',
    borderRadius: '6px',
    border: '1px solid #dc3545',
    background: '#fff',
    color: '#dc3545',
    fontWeight: 600,
    fontSize: '14px',
    cursor: 'pointer',
  } as React.CSSProperties,
  btnRefresh: {
    padding: '8px 16px',
    borderRadius: '6px',
    border: '1px solid #6c757d',
    background: '#fff',
    color: '#6c757d',
    fontWeight: 500,
    fontSize: '13px',
    cursor: 'pointer',
  } as React.CSSProperties,
  rejectInput: {
    display: 'flex',
    gap: '8px',
    marginTop: '12px',
    alignItems: 'center',
  } as React.CSSProperties,
  textInput: {
    flex: 1,
    padding: '8px 12px',
    borderRadius: '6px',
    border: '1px solid #ccc',
    fontSize: '14px',
  } as React.CSSProperties,
  btnSubmitReject: {
    padding: '8px 16px',
    borderRadius: '6px',
    border: 'none',
    background: '#dc3545',
    color: '#fff',
    fontWeight: 500,
    fontSize: '13px',
    cursor: 'pointer',
  } as React.CSSProperties,
  btnCancel: {
    padding: '8px 16px',
    borderRadius: '6px',
    border: '1px solid #ccc',
    background: '#fff',
    color: '#555',
    fontWeight: 500,
    fontSize: '13px',
    cursor: 'pointer',
  } as React.CSSProperties,
  stepList: {
    listStyle: 'none',
    padding: 0,
    margin: '8px 0 0 0',
  } as React.CSSProperties,
  stepItem: {
    padding: '4px 0',
    fontSize: '13px',
    color: '#444',
    borderBottom: '1px solid #f0f0f0',
  } as React.CSSProperties,
}

export default function ReviewPanel({ profile, onApprove, onReject, onRefresh }: ReviewPanelProps) {
  const [showRejectInput, setShowRejectInput] = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  const handleReject = () => {
    if (rejectReason.trim()) {
      onReject(profile.id, rejectReason.trim())
      setShowRejectInput(false)
      setRejectReason('')
    }
  }

  const isActionable = profile.status === 'pending_review'

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <h2 style={styles.schoolName}>{profile.schoolName}</h2>
        <div style={styles.headerMeta}>
          {profile.municipality && <span>{profile.municipality}</span>}
          {profile.province && <span>• {profile.province}</span>}
          {profile.country && <span>• {profile.country}</span>}
          <span style={styles.statusBadge(profile.status)}>
            {profile.status.replace('_', ' ')}
          </span>
          <span style={styles.confidenceBadge(profile.confidenceScore)}>
            Confidence: {Math.round(profile.confidenceScore * 100)}%
          </span>
        </div>
      </div>

      {/* Warning banner for low confidence */}
      {profile.confidenceScore < 0.5 && (
        <div style={styles.warningBanner} role="alert">
          <span>⚠️</span>
          <span>
            <strong>Low confidence score.</strong> The AI agent was not highly confident in these results.
            Please review carefully before approving.
          </span>
        </div>
      )}

      {/* Stale banner */}
      {profile.status === 'stale' && (
        <div style={styles.staleBanner} role="alert">
          <span>This information may be outdated. Consider refreshing to get the latest data.</span>
          <button
            style={styles.btnRefresh}
            onClick={() => onRefresh(profile.id)}
            aria-label="Refresh profile"
          >
            🔄 Refresh
          </button>
        </div>
      )}

      {/* Resources Section */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>
          Discovered Resources ({profile.resources.length})
        </h3>
        {profile.resources.length === 0 && (
          <p style={{ fontSize: '14px', color: '#777' }}>No resources discovered.</p>
        )}
        {profile.resources.map((resource) => (
          <div
            key={resource.id}
            style={resource.confidence < 0.4 ? styles.cardDeemphasized : styles.card}
          >
            <p style={styles.cardTitle}>{resource.name}</p>
            <p style={styles.cardDescription}>{resource.description}</p>
            <div style={styles.cardMeta}>
              <span style={styles.tag}>{resource.category}</span>
              <span style={styles.confidenceBadge(resource.confidence)}>
                {Math.round(resource.confidence * 100)}%
              </span>
              {resource.targetAudience.map((audience) => (
                <span key={audience} style={styles.tag}>{audience}</span>
              ))}
              {resource.url && (
                <a href={resource.url} target="_blank" rel="noopener noreferrer" style={{ fontSize: '12px' }}>
                  🔗 Website
                </a>
              )}
              {resource.phone && (
                <span style={{ fontSize: '12px' }}>📞 {resource.phone}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Legal Obligations Section */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>
          Legal Obligations ({profile.legalObligations.length})
        </h3>
        {profile.legalObligations.length === 0 && (
          <p style={{ fontSize: '14px', color: '#777' }}>No legal obligations discovered.</p>
        )}
        {profile.legalObligations.map((obligation) => (
          <div key={obligation.id} style={styles.card}>
            <p style={styles.cardTitle}>{obligation.title}</p>
            <p style={styles.cardDescription}>{obligation.description}</p>
            <div style={styles.cardMeta}>
              <span>Authority: {obligation.authority}</span>
              {obligation.deadline && <span>Deadline: {obligation.deadline}</span>}
              {obligation.applicableLaw && (
                <span style={styles.tag}>{obligation.applicableLaw}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Reporting Procedures Section */}
      <div style={styles.section}>
        <h3 style={styles.sectionTitle}>
          Reporting Procedures ({profile.reportingProcedures.length})
        </h3>
        {profile.reportingProcedures.length === 0 && (
          <p style={{ fontSize: '14px', color: '#777' }}>No reporting procedures discovered.</p>
        )}
        {profile.reportingProcedures.map((procedure) => (
          <div key={procedure.id} style={styles.card}>
            <p style={styles.cardTitle}>{procedure.title}</p>
            <div style={styles.cardMeta}>
              <span>Target: {procedure.targetAuthority}</span>
            </div>
            {procedure.steps.length > 0 && (
              <ol style={styles.stepList}>
                {procedure.steps
                  .sort((a, b) => a.order - b.order)
                  .map((step) => (
                    <li key={step.order} style={styles.stepItem}>
                      {step.order}. {step.description}
                      {step.responsible && (
                        <span style={{ ...styles.tag, marginLeft: '6px' }}>
                          {step.responsible}
                        </span>
                      )}
                    </li>
                  ))}
              </ol>
            )}
          </div>
        ))}
      </div>

      {/* Action Buttons */}
      <div style={styles.actions}>
        {isActionable && (
          <>
            <button
              style={styles.btnApprove}
              onClick={() => onApprove(profile.id)}
              aria-label="Approve profile"
            >
              ✓ Approve Profile
            </button>
            <button
              style={styles.btnReject}
              onClick={() => setShowRejectInput(true)}
              aria-label="Reject profile"
            >
              ✗ Reject Profile
            </button>
          </>
        )}
        {profile.status === 'stale' && (
          <button
            style={styles.btnRefresh}
            onClick={() => onRefresh(profile.id)}
            aria-label="Refresh profile"
          >
            🔄 Refresh Profile
          </button>
        )}
      </div>

      {/* Reject reason input */}
      {showRejectInput && (
        <div style={styles.rejectInput}>
          <input
            type="text"
            style={styles.textInput}
            placeholder="Enter reason for rejection..."
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleReject()}
            aria-label="Rejection reason"
          />
          <button style={styles.btnSubmitReject} onClick={handleReject}>
            Submit
          </button>
          <button
            style={styles.btnCancel}
            onClick={() => {
              setShowRejectInput(false)
              setRejectReason('')
            }}
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  )
}
