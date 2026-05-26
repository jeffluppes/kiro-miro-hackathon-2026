import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import ReviewPanel, { JurisdictionProfile } from '../components/ReviewPanel'
import { getProfile, approveProfile, rejectProfile, refreshProfile } from '../api/client'

export default function ReviewPage() {
  const { profileId } = useParams<{ profileId: string }>()
  const navigate = useNavigate()
  const [profile, setProfile] = useState<JurisdictionProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!profileId) return

    setLoading(true)
    setError(null)

    getProfile(profileId)
      .then((res) => {
        if (res.ok) {
          setProfile(res.data as JurisdictionProfile)
        } else {
          setError('Failed to load profile.')
        }
      })
      .catch(() => {
        setError('Network error. Could not reach the server.')
      })
      .finally(() => {
        setLoading(false)
      })
  }, [profileId])

  const handleApprove = async (id: string) => {
    const teacherId = 'teacher-1' // placeholder for demo
    const res = await approveProfile(id, teacherId)
    if (res.ok) {
      setProfile(res.data as JurisdictionProfile)
      // Store for use by other pages (report form, resources)
      localStorage.setItem('jurisdictionProfileId', id)
      localStorage.setItem('schoolguard_jurisdictionId', id)
    }
  }

  const handleReject = async (id: string, reason: string) => {
    const teacherId = 'teacher-1' // placeholder for demo
    const res = await rejectProfile(id, teacherId, reason)
    if (res.ok) {
      setProfile(res.data as JurisdictionProfile)
    }
  }

  const handleRefresh = async (id: string) => {
    const res = await refreshProfile(id)
    if (res.ok) {
      const newProfile = res.data as JurisdictionProfile
      navigate(`/review/${newProfile.id}`)
    }
  }

  if (!profileId) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: '#555' }}>
        <p>No profile ID provided.</p>
      </div>
    )
  }

  if (loading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: '#555' }}>
        <p>Loading profile...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: '#dc3545' }}>
        <p>{error}</p>
      </div>
    )
  }

  if (!profile) {
    return (
      <div style={{ padding: '24px', textAlign: 'center', color: '#555' }}>
        <p>Profile not found.</p>
      </div>
    )
  }

  return (
    <ReviewPanel
      profile={profile}
      onApprove={handleApprove}
      onReject={handleReject}
      onRefresh={handleRefresh}
    />
  )
}
