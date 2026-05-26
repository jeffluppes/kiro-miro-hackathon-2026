import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { discoverJurisdiction } from '../api/client'

type DiscoveryPhase =
  | 'idle'
  | 'locating_school'
  | 'finding_policies'
  | 'discovering_resources'
  | 'complete'
  | 'error'

interface PhaseInfo {
  label: string
  description: string
}

const PHASES: Record<Exclude<DiscoveryPhase, 'idle' | 'complete' | 'error'>, PhaseInfo> = {
  locating_school: {
    label: 'Locating school',
    description: 'Determining municipality and jurisdiction...',
  },
  finding_policies: {
    label: 'Finding policies',
    description: 'Searching for local anti-bullying policies and legal obligations...',
  },
  discovering_resources: {
    label: 'Discovering resources',
    description: 'Finding support organizations and reporting procedures...',
  },
}

const PHASE_ORDER: Array<Exclude<DiscoveryPhase, 'idle' | 'complete' | 'error'>> = [
  'locating_school',
  'finding_policies',
  'discovering_resources',
]

const LONG_DISCOVERY_THRESHOLD_MS = 10000

const styles = {
  container: {
    maxWidth: '560px',
    margin: '0 auto',
    padding: '2rem',
  } as React.CSSProperties,
  heading: {
    fontSize: '1.5rem',
    fontWeight: 600,
    color: '#1a1a2e',
    marginBottom: '0.5rem',
  } as React.CSSProperties,
  subtitle: {
    fontSize: '0.95rem',
    color: '#555',
    marginBottom: '2rem',
    lineHeight: 1.5,
  } as React.CSSProperties,
  form: {
    display: 'flex',
    gap: '0.75rem',
    marginBottom: '1.5rem',
  } as React.CSSProperties,
  input: {
    flex: 1,
    padding: '0.75rem 1rem',
    fontSize: '1rem',
    border: '1px solid #d0d0d0',
    borderRadius: '6px',
    outline: 'none',
    transition: 'border-color 0.2s',
  } as React.CSSProperties,
  button: {
    padding: '0.75rem 1.5rem',
    fontSize: '1rem',
    fontWeight: 500,
    backgroundColor: '#2563eb',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'background-color 0.2s',
    whiteSpace: 'nowrap',
  } as React.CSSProperties,
  buttonDisabled: {
    backgroundColor: '#93b4f5',
    cursor: 'not-allowed',
  } as React.CSSProperties,
  progressContainer: {
    padding: '1.5rem',
    backgroundColor: '#f8fafc',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
  } as React.CSSProperties,
  phaseItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.5rem 0',
  } as React.CSSProperties,
  phaseIndicator: {
    width: '10px',
    height: '10px',
    borderRadius: '50%',
    flexShrink: 0,
  } as React.CSSProperties,
  phaseActive: {
    backgroundColor: '#2563eb',
    animation: 'pulse 1.5s infinite',
  } as React.CSSProperties,
  phaseDone: {
    backgroundColor: '#16a34a',
  } as React.CSSProperties,
  phasePending: {
    backgroundColor: '#d0d0d0',
  } as React.CSSProperties,
  phaseLabel: {
    fontSize: '0.9rem',
    color: '#333',
  } as React.CSSProperties,
  phaseLabelActive: {
    fontWeight: 600,
    color: '#1a1a2e',
  } as React.CSSProperties,
  phaseDescription: {
    fontSize: '0.8rem',
    color: '#666',
    marginLeft: '1.6rem',
    marginTop: '-0.25rem',
    marginBottom: '0.25rem',
  } as React.CSSProperties,
  longDiscoveryBanner: {
    marginTop: '1rem',
    padding: '0.75rem 1rem',
    backgroundColor: '#fef3c7',
    border: '1px solid #f59e0b',
    borderRadius: '6px',
    fontSize: '0.85rem',
    color: '#92400e',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  } as React.CSSProperties,
  continueButton: {
    padding: '0.4rem 0.8rem',
    fontSize: '0.8rem',
    backgroundColor: '#f59e0b',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  } as React.CSSProperties,
  errorContainer: {
    padding: '1.25rem',
    backgroundColor: '#fef2f2',
    border: '1px solid #fca5a5',
    borderRadius: '8px',
  } as React.CSSProperties,
  errorTitle: {
    fontSize: '0.95rem',
    fontWeight: 600,
    color: '#991b1b',
    marginBottom: '0.5rem',
  } as React.CSSProperties,
  errorMessage: {
    fontSize: '0.85rem',
    color: '#7f1d1d',
    marginBottom: '0.75rem',
  } as React.CSSProperties,
  confidenceWarning: {
    fontSize: '0.8rem',
    color: '#92400e',
    backgroundColor: '#fef3c7',
    padding: '0.5rem 0.75rem',
    borderRadius: '4px',
    marginBottom: '0.75rem',
  } as React.CSSProperties,
  retryButton: {
    padding: '0.5rem 1rem',
    fontSize: '0.85rem',
    backgroundColor: '#dc2626',
    color: '#fff',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  } as React.CSSProperties,
}

export default function DiscoveryForm() {
  const navigate = useNavigate()
  const [schoolName, setSchoolName] = useState('')
  const [phase, setPhase] = useState<DiscoveryPhase>('idle')
  const [currentPhaseIndex, setCurrentPhaseIndex] = useState(0)
  const [showLongDiscovery, setShowLongDiscovery] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [hasPartialResults, setHasPartialResults] = useState(false)
  const [partialProfileId, setPartialProfileId] = useState<string | null>(null)

  const isDiscovering = phase !== 'idle' && phase !== 'complete' && phase !== 'error'

  // Simulate progress phases with timers during actual API call
  useEffect(() => {
    if (!isDiscovering) return

    const phaseTimers = [
      setTimeout(() => {
        setCurrentPhaseIndex(1)
        setPhase('finding_policies')
      }, 2500),
      setTimeout(() => {
        setCurrentPhaseIndex(2)
        setPhase('discovering_resources')
      }, 5500),
    ]

    const longTimer = setTimeout(() => {
      setShowLongDiscovery(true)
    }, LONG_DISCOVERY_THRESHOLD_MS)

    return () => {
      phaseTimers.forEach(clearTimeout)
      clearTimeout(longTimer)
    }
  }, [isDiscovering])

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      const trimmed = schoolName.trim()
      if (!trimmed) return

      setPhase('locating_school')
      setCurrentPhaseIndex(0)
      setShowLongDiscovery(false)
      setErrorMessage('')
      setHasPartialResults(false)
      setPartialProfileId(null)

      try {
        const response = await discoverJurisdiction(trimmed)

        if (response.ok) {
          const data = response.data as { id?: string; profileId?: string }
          const profileId = data.id || data.profileId
          setPhase('complete')
          if (profileId) {
            navigate(`/review/${profileId}`)
          }
        } else {
          const data = response.data as {
            error?: string
            profileId?: string
            partial?: boolean
          }
          setErrorMessage(data.error || 'Discovery failed. Please try again.')
          setHasPartialResults(!!data.partial)
          setPartialProfileId(data.profileId || null)
          setPhase('error')
        }
      } catch (err) {
        setErrorMessage(
          err instanceof Error ? err.message : 'Network error. Please check your connection.'
        )
        setPhase('error')
      }
    },
    [schoolName, navigate]
  )

  const handleContinueWorking = () => {
    // Allow teacher to navigate away; discovery continues in background
    navigate('/')
  }

  const handleViewPartialResults = () => {
    if (partialProfileId) {
      navigate(`/review/${partialProfileId}`)
    }
  }

  const handleRetry = () => {
    setPhase('idle')
    setErrorMessage('')
    setHasPartialResults(false)
    setPartialProfileId(null)
  }

  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>Discover Jurisdiction</h2>
      <p style={styles.subtitle}>
        Enter a school name to discover jurisdiction-specific anti-bullying resources,
        legal obligations, and reporting procedures.
      </p>

      <form onSubmit={handleSubmit} style={styles.form}>
        <input
          type="text"
          value={schoolName}
          onChange={(e) => setSchoolName(e.target.value)}
          placeholder="e.g. Basisschool De Regenboog, Amsterdam"
          disabled={isDiscovering}
          style={styles.input}
          aria-label="School name"
        />
        <button
          type="submit"
          disabled={isDiscovering || !schoolName.trim()}
          style={{
            ...styles.button,
            ...(isDiscovering || !schoolName.trim() ? styles.buttonDisabled : {}),
          }}
        >
          {isDiscovering ? 'Discovering...' : 'Discover'}
        </button>
      </form>

      {isDiscovering && (
        <div style={styles.progressContainer}>
          {PHASE_ORDER.map((phaseKey, index) => {
            const info = PHASES[phaseKey]
            const isActive = index === currentPhaseIndex
            const isDone = index < currentPhaseIndex

            return (
              <div key={phaseKey}>
                <div style={styles.phaseItem}>
                  <div
                    style={{
                      ...styles.phaseIndicator,
                      ...(isActive
                        ? styles.phaseActive
                        : isDone
                          ? styles.phaseDone
                          : styles.phasePending),
                    }}
                  />
                  <span
                    style={{
                      ...styles.phaseLabel,
                      ...(isActive ? styles.phaseLabelActive : {}),
                    }}
                  >
                    {info.label}
                    {isDone && ' ✓'}
                  </span>
                </div>
                {isActive && <p style={styles.phaseDescription}>{info.description}</p>}
              </div>
            )
          })}

          {showLongDiscovery && (
            <div style={styles.longDiscoveryBanner}>
              <span>Discovery is taking longer than expected.</span>
              <button
                type="button"
                onClick={handleContinueWorking}
                style={styles.continueButton}
              >
                Continue working
              </button>
            </div>
          )}
        </div>
      )}

      {phase === 'error' && (
        <div style={styles.errorContainer}>
          <p style={styles.errorTitle}>Discovery encountered an issue</p>
          <p style={styles.errorMessage}>{errorMessage}</p>

          {hasPartialResults && (
            <p style={styles.confidenceWarning}>
              ⚠ Partial results are available but may have lower confidence scores.
              Review carefully before approving.
            </p>
          )}

          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button type="button" onClick={handleRetry} style={styles.retryButton}>
              Try again
            </button>
            {hasPartialResults && partialProfileId && (
              <button
                type="button"
                onClick={handleViewPartialResults}
                style={{
                  ...styles.retryButton,
                  backgroundColor: '#d97706',
                }}
              >
                View partial results
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
