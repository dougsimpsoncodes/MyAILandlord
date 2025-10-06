import { restGet, TokenProvider } from './rest'
import log from './log'

export type MaintenanceRequest = {
  id: string
  tenant_id: string
  property_id: string
  title: string
  description: string
  priority: 'low' | 'medium' | 'high' | 'urgent'
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled'
  area: string
  asset: string
  issue_type: string
  images?: string[]
  voice_notes?: string[]
  created_at: string
  updated_at: string
  profiles?: {
    name?: string
    email?: string
  }
  properties?: {
    name?: string
    address?: string
  }
}

export async function getMaintenanceRequests(
  tokenProvider?: TokenProvider,
  opts: { limit?: number; offset?: number } = {}
): Promise<MaintenanceRequest[]> {
  try {
    const limit = opts.limit ?? 50;
    const offset = opts.offset ?? 0;
    // Fetch maintenance requests using REST API with Clerk auth
    const requests = await restGet('maintenance_requests', {
      select: '*,profiles!tenant_id(name,email),properties(name,address)',
      order: 'created_at.desc',
      limit: String(limit),
      offset: String(offset)
    }, tokenProvider)
    
    return Array.isArray(requests) ? requests : []
  } catch (error) {
    log.error('Failed to fetch maintenance requests', { error: String(error) })
    return []
  }
}

export async function getMaintenanceRequestById(id: string, tokenProvider?: TokenProvider): Promise<MaintenanceRequest | null> {
  try {
    const requests = await restGet('maintenance_requests', {
      id: `eq.${id}`,
      select: '*,profiles!tenant_id(name,email),properties(name,address)'
    }, tokenProvider)
    
    return Array.isArray(requests) && requests.length > 0 ? requests[0] : null
  } catch (error) {
    log.error('Failed to fetch maintenance request', { error: String(error) })
    return null
  }
}
