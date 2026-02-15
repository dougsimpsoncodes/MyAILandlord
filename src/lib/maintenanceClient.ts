import { restGet, TokenProvider } from './rest'
import log from './log'
import { SupabaseStorageService } from '../services/supabase/storage'

const storageService = new SupabaseStorageService()

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
    address_jsonb?: {
      line1?: string
      line2?: string
      city?: string
      state?: string
      zipCode?: string
    }
  }
}

/**
 * Format address from address_jsonb (preferred) or fall back to legacy address field
 */
function formatPropertyAddress(properties?: MaintenanceRequest['properties']): string {
  if (!properties) return ''

  if (properties.address_jsonb) {
    const addr = properties.address_jsonb
    return `${addr.line1 || ''}${addr.line2 ? ', ' + addr.line2 : ''}, ${addr.city || ''}, ${addr.state || ''} ${addr.zipCode || ''}`.trim()
  }

  return properties.address || ''
}

/**
 * Extract the file path from a Supabase signed URL
 * Signed URLs look like: https://xxx.supabase.co/storage/v1/object/sign/bucket/path/to/file.jpg?token=...
 * Returns the path portion (path/to/file.jpg) or null if not a valid Supabase URL
 */
function extractPathFromSupabaseUrl(url: string): string | null {
  try {
    const parsed = new URL(url)
    // Check if it's a Supabase storage URL
    if (!parsed.hostname.includes('supabase')) return null

    // Path format: /storage/v1/object/sign/bucket-name/path/to/file.jpg
    const pathMatch = parsed.pathname.match(/\/storage\/v1\/object\/sign\/[^/]+\/(.+)$/)
    if (pathMatch && pathMatch[1]) {
      return decodeURIComponent(pathMatch[1])
    }
    return null
  } catch {
    return null
  }
}

/**
 * Convert stored file paths to fresh signed URLs
 * Handles both:
 * - File paths: "maintenance-requests/123/image-456.jpg"
 * - Legacy expired signed URLs: extracts path and generates fresh URL
 */
async function resolveImageUrls(paths: string[] | undefined): Promise<string[]> {
  if (!paths || paths.length === 0) return []

  const signedUrls: string[] = []
  for (const pathOrUrl of paths) {
    try {
      let filePath: string | null = null

      if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) {
        // It's a URL - try to extract the path from legacy Supabase signed URLs
        filePath = extractPathFromSupabaseUrl(pathOrUrl)
        if (!filePath) {
          // Not a Supabase URL or couldn't extract path, skip it
          log.warn('Skipping non-Supabase URL', { url: pathOrUrl.substring(0, 50) })
          continue
        }
      } else {
        // It's already a path
        filePath = pathOrUrl
      }

      // Generate a fresh signed URL from the path
      const signedUrl = await storageService.getSignedUrl('maintenance-images', filePath)
      signedUrls.push(signedUrl)
    } catch (error) {
      log.warn('Failed to generate signed URL for image', { path: pathOrUrl, error: String(error) })
      // Skip failed images rather than breaking the whole request
    }
  }
  return signedUrls
}

export async function getMaintenanceRequests(
  tokenProvider?: TokenProvider,
  opts: { limit?: number; offset?: number } = {}
): Promise<MaintenanceRequest[]> {
  try {
    const limit = opts.limit ?? 50;
    const offset = opts.offset ?? 0;
    // Fetch maintenance requests using REST API
    const requests = await restGet('maintenance_requests', {
      select: '*,profiles!tenant_id(name,email),properties(name,address,address_jsonb)',
      order: 'created_at.desc',
      limit: String(limit),
      offset: String(offset)
    }, tokenProvider)

    // Normalize address from address_jsonb for each request
    const normalized = Array.isArray(requests) ? requests.map((req: MaintenanceRequest) => ({
      ...req,
      properties: req.properties ? {
        ...req.properties,
        address: formatPropertyAddress(req.properties)
      } : undefined
    })) : []

    return normalized
  } catch (error) {
    log.error('Failed to fetch maintenance requests', { error: String(error) })
    return []
  }
}

export async function getMaintenanceRequestById(id: string, tokenProvider?: TokenProvider): Promise<MaintenanceRequest | null> {
  try {
    const requests = await restGet('maintenance_requests', {
      id: `eq.${id}`,
      select: '*,profiles!tenant_id(name,email),properties(name,address,address_jsonb)'
    }, tokenProvider)

    if (!Array.isArray(requests) || requests.length === 0) return null

    const request = requests[0]

    // Normalize address from address_jsonb
    if (request.properties) {
      request.properties.address = formatPropertyAddress(request.properties)
    }

    // Resolve image paths to fresh signed URLs
    if (request.images && request.images.length > 0) {
      request.images = await resolveImageUrls(request.images)
    }

    return request
  } catch (error) {
    log.error('Failed to fetch maintenance request', { error: String(error) })
    return null
  }
}
