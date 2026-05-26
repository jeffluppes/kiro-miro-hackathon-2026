import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import ResourceViewer from '../components/ResourceViewer'

const styles = {
  page: {
    padding: '24px',
    maxWidth: '900px',
    margin: '0 auto',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  } as React.CSSProperties,
  header: {
    marginBottom: '24px',
  } as React.CSSProperties,
  title: {
    fontSize: '24px',
    fontWeight: 600,
    color: '#212121',
    margin: '0 0 8px',
  } as React.CSSProperties,
  subtitle: {
    fontSize: '14px',
    color: '#757575',
    margin: 0,
  } as React.CSSProperties,
  noJurisdiction: {
    textAlign: 'center' as const,
    padding: '48px 24px',
    color: '#757575',
  } as React.CSSProperties,
  noJurisdictionIcon: {
    fontSize: '48px',
    marginBottom: '12px',
  } as React.CSSProperties,
  noJurisdictionText: {
    fontSize: '16px',
    margin: '0 0 8px',
  } as React.CSSProperties,
  noJurisdictionHint: {
    fontSize: '13px',
    color: '#9e9e9e',
    margin: 0,
  } as React.CSSProperties,
}

export default function ResourcesPage() {
  const [searchParams] = useSearchParams()
  const [jurisdictionId, setJurisdictionId] = useState<string | null>(null)

  useEffect(() => {
    // Priority: URL query param > localStorage
    const paramId = searchParams.get('jurisdictionId')
    if (paramId) {
      setJurisdictionId(paramId)
      return
    }

    const storedId = localStorage.getItem('schoolguard_jurisdictionId')
    if (storedId) {
      setJurisdictionId(storedId)
    }
  }, [searchParams])

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <h2 style={styles.title}>Hulpbronnen</h2>
        <p style={styles.subtitle}>
          Anti-pest hulpbronnen gefilterd op jouw rol.
        </p>
      </div>

      {jurisdictionId ? (
        <ResourceViewer jurisdictionId={jurisdictionId} />
      ) : (
        <div style={styles.noJurisdiction}>
          <div style={styles.noJurisdictionIcon}>🏫</div>
          <p style={styles.noJurisdictionText}>
            Geen school geselecteerd.
          </p>
          <p style={styles.noJurisdictionHint}>
            Ontdek eerst een school via de Discovery-pagina, of voeg
            ?jurisdictionId=... toe aan de URL.
          </p>
        </div>
      )}
    </div>
  )
}
