import { useState, useEffect, useCallback } from 'react'
import { getResources } from '../api/client'

type StakeholderRole = 'student' | 'parent' | 'teacher' | 'coordinator'

type ResourceCategory =
  | 'helpline'
  | 'reporting_portal'
  | 'support_organization'
  | 'government_body'
  | 'school_internal'
  | 'legal_aid'
  | 'counseling'

interface RoutedResource {
  id: string
  profileId: string
  name: string
  description: string
  url?: string
  phone?: string
  email?: string
  targetAudience: StakeholderRole[]
  category: ResourceCategory
  source: string
  confidence: number
  isKnownResource: boolean
  verifiedByTeacher: boolean
  actionLabel: string
  actionUrl?: string
  contextNote?: string
}

interface ResourceViewerProps {
  jurisdictionId: string
}

const ROLES: { value: StakeholderRole; label: string }[] = [
  { value: 'student', label: 'Leerling' },
  { value: 'parent', label: 'Ouder' },
  { value: 'teacher', label: 'Docent' },
  { value: 'coordinator', label: 'Coördinator' },
]

const CATEGORY_LABELS: Record<ResourceCategory, string> = {
  helpline: 'Hulplijn',
  reporting_portal: 'Meldportaal',
  support_organization: 'Ondersteuning',
  government_body: 'Overheid',
  school_internal: 'School intern',
  legal_aid: 'Juridisch',
  counseling: 'Begeleiding',
}

const CATEGORY_COLORS: Record<ResourceCategory, string> = {
  helpline: '#e8f5e9',
  reporting_portal: '#e3f2fd',
  support_organization: '#fff3e0',
  government_body: '#f3e5f5',
  school_internal: '#e0f2f1',
  legal_aid: '#fce4ec',
  counseling: '#f1f8e9',
}

const styles = {
  container: {
    maxWidth: '800px',
    margin: '0 auto',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  } as React.CSSProperties,
  roleSelector: {
    display: 'flex',
    gap: '8px',
    marginBottom: '24px',
    flexWrap: 'wrap' as const,
  } as React.CSSProperties,
  roleButton: {
    padding: '10px 20px',
    border: '2px solid #e0e0e0',
    borderRadius: '8px',
    background: '#fff',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 500,
    transition: 'all 0.2s ease',
    color: '#555',
  } as React.CSSProperties,
  roleButtonActive: {
    padding: '10px 20px',
    border: '2px solid #1976d2',
    borderRadius: '8px',
    background: '#e3f2fd',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: 600,
    transition: 'all 0.2s ease',
    color: '#1976d2',
  } as React.CSSProperties,
  resourceList: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '16px',
  } as React.CSSProperties,
  card: {
    border: '1px solid #e0e0e0',
    borderRadius: '12px',
    padding: '20px',
    background: '#fff',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  } as React.CSSProperties,
  cardKnown: {
    border: '1px solid #a5d6a7',
    borderRadius: '12px',
    padding: '20px',
    background: '#f9fdf9',
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  } as React.CSSProperties,
  cardHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: '8px',
    flexWrap: 'wrap' as const,
    gap: '8px',
  } as React.CSSProperties,
  cardName: {
    fontSize: '16px',
    fontWeight: 600,
    color: '#212121',
    margin: 0,
  } as React.CSSProperties,
  badges: {
    display: 'flex',
    gap: '6px',
    alignItems: 'center',
    flexWrap: 'wrap' as const,
  } as React.CSSProperties,
  categoryBadge: (category: ResourceCategory) => ({
    padding: '3px 10px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 500,
    background: CATEGORY_COLORS[category] || '#f5f5f5',
    color: '#555',
  }) as React.CSSProperties,
  verifiedBadge: {
    padding: '3px 10px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: 600,
    background: '#c8e6c9',
    color: '#2e7d32',
  } as React.CSSProperties,
  description: {
    fontSize: '14px',
    color: '#616161',
    lineHeight: 1.5,
    margin: '8px 0 12px',
  } as React.CSSProperties,
  cardFooter: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: '12px',
    flexWrap: 'wrap' as const,
    gap: '8px',
  } as React.CSSProperties,
  confidenceBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  } as React.CSSProperties,
  confidenceTrack: {
    width: '60px',
    height: '6px',
    background: '#e0e0e0',
    borderRadius: '3px',
    overflow: 'hidden',
  } as React.CSSProperties,
  confidenceFill: (confidence: number) => ({
    width: `${Math.round(confidence * 100)}%`,
    height: '100%',
    background: confidence >= 0.8 ? '#4caf50' : confidence >= 0.5 ? '#ff9800' : '#f44336',
    borderRadius: '3px',
    transition: 'width 0.3s ease',
  }) as React.CSSProperties,
  confidenceLabel: {
    fontSize: '12px',
    color: '#9e9e9e',
  } as React.CSSProperties,
  actionButton: {
    padding: '8px 16px',
    borderRadius: '8px',
    border: 'none',
    background: '#1976d2',
    color: '#fff',
    fontSize: '13px',
    fontWeight: 600,
    cursor: 'pointer',
    textDecoration: 'none',
    display: 'inline-block',
  } as React.CSSProperties,
  emptyState: {
    textAlign: 'center' as const,
    padding: '48px 24px',
    color: '#9e9e9e',
  } as React.CSSProperties,
  emptyIcon: {
    fontSize: '48px',
    marginBottom: '12px',
  } as React.CSSProperties,
  emptyText: {
    fontSize: '16px',
    margin: 0,
  } as React.CSSProperties,
  loading: {
    textAlign: 'center' as const,
    padding: '32px',
    color: '#757575',
    fontSize: '14px',
  } as React.CSSProperties,
  error: {
    padding: '16px',
    background: '#fce4ec',
    borderRadius: '8px',
    color: '#c62828',
    fontSize: '14px',
  } as React.CSSProperties,
}

export default function ResourceViewer({ jurisdictionId }: ResourceViewerProps) {
  const [selectedRole, setSelectedRole] = useState<StakeholderRole>('student')
  const [resources, setResources] = useState<RoutedResource[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchResources = useCallback(async (role: StakeholderRole) => {
    if (!jurisdictionId) return

    setLoading(true)
    setError(null)

    try {
      const response = await getResources(role, jurisdictionId)
      if (response.ok) {
        setResources(response.data as RoutedResource[])
      } else {
        setError('Kon hulpbronnen niet ophalen. Probeer het opnieuw.')
      }
    } catch {
      setError('Netwerkfout. Controleer je verbinding.')
    } finally {
      setLoading(false)
    }
  }, [jurisdictionId])

  useEffect(() => {
    fetchResources(selectedRole)
  }, [selectedRole, fetchResources])

  function handleRoleChange(role: StakeholderRole) {
    setSelectedRole(role)
  }

  function getActionHref(resource: RoutedResource): string | undefined {
    if (resource.category === 'helpline' && resource.phone) {
      return `tel:${resource.phone}`
    }
    if (resource.url) {
      return resource.url
    }
    return undefined
  }

  function getActionLabel(resource: RoutedResource): string {
    if (resource.actionLabel) return resource.actionLabel
    switch (resource.category) {
      case 'helpline': return 'Bel nu'
      case 'reporting_portal': return 'Meld hier'
      case 'support_organization': return 'Bekijk info'
      case 'government_body': return 'Contact'
      case 'school_internal': return 'Intern contact'
      case 'legal_aid': return 'Juridisch advies'
      case 'counseling': return 'Maak afspraak'
      default: return 'Bekijk'
    }
  }

  return (
    <div style={styles.container}>
      {/* Role Selector */}
      <div style={styles.roleSelector} role="tablist" aria-label="Selecteer rol">
        {ROLES.map((role) => (
          <button
            key={role.value}
            role="tab"
            aria-selected={selectedRole === role.value}
            style={selectedRole === role.value ? styles.roleButtonActive : styles.roleButton}
            onClick={() => handleRoleChange(role.value)}
          >
            {role.label}
          </button>
        ))}
      </div>

      {/* Loading State */}
      {loading && (
        <div style={styles.loading}>
          <p>Hulpbronnen laden...</p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div style={styles.error} role="alert">
          {error}
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && resources.length === 0 && (
        <div style={styles.emptyState}>
          <div style={styles.emptyIcon}>📭</div>
          <p style={styles.emptyText}>
            Geen hulpbronnen gevonden voor deze rol.
          </p>
        </div>
      )}

      {/* Resource List */}
      {!loading && !error && resources.length > 0 && (
        <div style={styles.resourceList} role="tabpanel">
          {resources.map((resource) => (
            <div
              key={resource.id}
              style={resource.isKnownResource ? styles.cardKnown : styles.card}
            >
              <div style={styles.cardHeader}>
                <h3 style={styles.cardName}>{resource.name}</h3>
                <div style={styles.badges}>
                  <span style={styles.categoryBadge(resource.category)}>
                    {CATEGORY_LABELS[resource.category] || resource.category}
                  </span>
                  {resource.isKnownResource && (
                    <span style={styles.verifiedBadge}>✓ Geverifieerd</span>
                  )}
                </div>
              </div>

              <p style={styles.description}>{resource.description}</p>

              <div style={styles.cardFooter}>
                {/* Confidence Indicator */}
                <div style={styles.confidenceBar}>
                  <div style={styles.confidenceTrack}>
                    <div style={styles.confidenceFill(resource.confidence)} />
                  </div>
                  <span style={styles.confidenceLabel}>
                    {Math.round(resource.confidence * 100)}% betrouwbaar
                  </span>
                </div>

                {/* Action Button */}
                {getActionHref(resource) ? (
                  <a
                    href={getActionHref(resource)}
                    target={resource.category !== 'helpline' ? '_blank' : undefined}
                    rel={resource.category !== 'helpline' ? 'noopener noreferrer' : undefined}
                    style={styles.actionButton}
                  >
                    {getActionLabel(resource)}
                  </a>
                ) : (
                  <span style={{ ...styles.actionButton, opacity: 0.5, cursor: 'default' }}>
                    {getActionLabel(resource)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
