const BASE_URL = '/api'

interface ApiResponse<T> {
  data: T
  ok: boolean
  status: number
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown
): Promise<ApiResponse<T>> {
  const options: RequestInit = {
    method,
    headers: {
      'Content-Type': 'application/json',
    },
  }

  if (body !== undefined) {
    options.body = JSON.stringify(body)
  }

  const response = await fetch(`${BASE_URL}${path}`, options)
  const data = (await response.json()) as T

  return {
    data,
    ok: response.ok,
    status: response.status,
  }
}

// Jurisdiction Discovery
export function discoverJurisdiction(schoolName: string) {
  return request<unknown>('POST', '/jurisdiction/discover', { schoolName })
}

export function getProfile(profileId: string) {
  return request<unknown>('GET', `/jurisdiction/${profileId}`)
}

export function approveProfile(profileId: string, teacherId: string) {
  return request<unknown>('POST', `/jurisdiction/${profileId}/approve`, {
    teacherId,
  })
}

export function rejectProfile(
  profileId: string,
  teacherId: string,
  reason: string
) {
  return request<unknown>('POST', `/jurisdiction/${profileId}/reject`, {
    teacherId,
    reason,
  })
}

export function refreshProfile(profileId: string) {
  return request<unknown>('POST', `/jurisdiction/${profileId}/refresh`)
}

export function editResource(
  profileId: string,
  resourceId: string,
  edits: object
) {
  return request<unknown>(
    'PATCH',
    `/jurisdiction/${profileId}/resources/${resourceId}`,
    edits
  )
}

// Resources
export function getResources(role: string, jurisdictionId: string) {
  return request<unknown>(
    'GET',
    `/resources?role=${encodeURIComponent(role)}&jurisdictionId=${encodeURIComponent(jurisdictionId)}`
  )
}

export function getAllResources(jurisdictionId: string) {
  return request<unknown>(
    'GET',
    `/resources?jurisdictionId=${encodeURIComponent(jurisdictionId)}`
  )
}

// Cases
export function createCase(data: object) {
  return request<unknown>('POST', '/cases', data)
}

export function getCase(caseId: string) {
  return request<unknown>('GET', `/cases/${caseId}`)
}

export function getCases(teacherId: string) {
  return request<unknown>(
    'GET',
    `/cases?teacherId=${encodeURIComponent(teacherId)}`
  )
}

export function updateCaseStage(
  caseId: string,
  stage: string,
  teacherId: string
) {
  return request<unknown>('PATCH', `/cases/${caseId}/stage`, {
    stage,
    teacherId,
  })
}

export function getLegalGuidance(caseId: string) {
  return request<unknown>('GET', `/cases/${caseId}/legal-guidance`)
}
