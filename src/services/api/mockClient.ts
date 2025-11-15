import {
  CreateProfileData,
  UpdateProfileData,
  CreateMaintenanceRequestData,
  UpdateMaintenanceRequestData,
  CreateMessageData,
  StorageBucket,
  UseApiClientReturn,
  UserRole,
  Priority,
  RealtimePayload,
  MaintenanceRequest,
  Message,
  Profile,
  Property
} from '../../types/api'
import AsyncStorage from '@react-native-async-storage/async-storage'

// Simple persisted mock store (AsyncStorage) for dev-only mode
const now = () => new Date().toISOString()

const STORAGE = {
  PROFILE: 'mock:profile',
  PROPERTIES: 'mock:properties',
  MAINTENANCE: 'mock:maintenance',
  MESSAGES: 'mock:messages',
}

let loaded = false
let profile: Profile | null = null
let properties: Property[] = []
let maintenance: MaintenanceRequest[] = []
let messages: Message[] = []

async function saveState() {
  await Promise.all([
    AsyncStorage.setItem(STORAGE.PROFILE, JSON.stringify(profile)),
    AsyncStorage.setItem(STORAGE.PROPERTIES, JSON.stringify(properties)),
    AsyncStorage.setItem(STORAGE.MAINTENANCE, JSON.stringify(maintenance)),
    AsyncStorage.setItem(STORAGE.MESSAGES, JSON.stringify(messages)),
  ])
}

async function loadState(userId: string) {
  if (loaded) return

  const [pStr, propsStr, mStr, msgsStr] = await Promise.all([
    AsyncStorage.getItem(STORAGE.PROFILE),
    AsyncStorage.getItem(STORAGE.PROPERTIES),
    AsyncStorage.getItem(STORAGE.MAINTENANCE),
    AsyncStorage.getItem(STORAGE.MESSAGES),
  ])

  profile = pStr ? JSON.parse(pStr) : null
  properties = propsStr ? JSON.parse(propsStr) : []
  maintenance = mStr ? JSON.parse(mStr) : []
  messages = msgsStr ? JSON.parse(msgsStr) : []

  // Seed data if empty
  if (!profile) {
    profile = {
      id: 'uuid-profile-1',
      clerk_user_id: userId,
      email: 'dev@example.com',
      name: 'Dev User',
      avatar_url: undefined as any,
      role: 'landlord',
      created_at: now(),
      updated_at: now(),
    }
  }

  // Secondary tenant profile (for messaging/tests)
  const tenantProfile: Profile = {
    id: 'uuid-tenant-1',
    clerk_user_id: 'tenant_user_1',
    email: 'tenant@example.com',
    name: 'Test Tenant',
    avatar_url: undefined as any,
    role: 'tenant',
    created_at: now(),
    updated_at: now(),
  }

  if (properties.length === 0) {
    properties = [
      {
        id: 'uuid-prop-1',
        landlord_id: profile.id,
        name: '123 Main St',
        address: '123 Main St, Springfield',
        property_type: 'house',
        bedrooms: 3,
        bathrooms: 2,
        property_code: 'ABC123',
        allow_tenant_signup: true,
        code_expires_at: undefined as any,
        created_at: now(),
        updated_at: now(),
      },
      {
        id: 'uuid-prop-2',
        landlord_id: profile.id,
        name: '456 Market Ave',
        address: '456 Market Ave, Metropolis',
        property_type: 'apartment',
        bedrooms: 2,
        bathrooms: 1,
        property_code: 'DEF456',
        allow_tenant_signup: true,
        code_expires_at: undefined as any,
        created_at: now(),
        updated_at: now(),
      },
      {
        id: 'uuid-prop-3',
        landlord_id: profile.id,
        name: '789 River Rd',
        address: '789 River Rd, Gotham',
        property_type: 'condo',
        bedrooms: 1,
        bathrooms: 1,
        property_code: 'GHI789',
        allow_tenant_signup: true,
        code_expires_at: undefined as any,
        created_at: now(),
        updated_at: now(),
      },
    ]
  }

  if (maintenance.length === 0) {
    maintenance = [
      {
        id: 'uuid-mr-1',
        property_id: properties[0].id,
        tenant_id: tenantProfile.id,
        title: 'Leaky faucet in kitchen',
        description: 'Drips constantly; getting worse.',
        priority: 'medium',
        status: 'pending',
        area: 'Kitchen',
        asset: 'Sink',
        issue_type: 'Plumbing',
        images: [],
        voice_notes: [],
        created_at: now(),
        updated_at: now(),
      } as MaintenanceRequest,
      {
        id: 'uuid-mr-2',
        property_id: properties[1].id,
        tenant_id: tenantProfile.id,
        title: 'No power in bedroom',
        description: 'Outlet sparks and breaker trips.',
        priority: 'high',
        status: 'in_progress',
        area: 'Bedroom',
        asset: 'Outlet',
        issue_type: 'Electrical',
        images: [],
        voice_notes: [],
        created_at: now(),
        updated_at: now(),
      } as MaintenanceRequest,
      {
        id: 'uuid-mr-3',
        property_id: properties[2].id,
        tenant_id: tenantProfile.id,
        title: 'AC not cooling',
        description: 'Blows warm air intermittently.',
        priority: 'urgent',
        status: 'completed',
        area: 'Living Room',
        asset: 'HVAC',
        issue_type: 'HVAC',
        images: [],
        voice_notes: [],
        created_at: now(),
        updated_at: now(),
        completion_notes: 'Vendor replaced capacitor',
      } as MaintenanceRequest,
    ]
  }

  if (messages.length === 0) {
    messages = [
      {
        id: 'uuid-msg-1',
        sender_id: tenantProfile.id,
        recipient_id: profile.id,
        content: 'Hi, the faucet is leaking again.',
        message_type: 'text',
        created_at: now(),
      },
      {
        id: 'uuid-msg-2',
        sender_id: profile.id,
        recipient_id: tenantProfile.id,
        content: 'Thanks, I will send a plumber tomorrow.',
        message_type: 'text',
        created_at: now(),
      },
    ]
  }

  await saveState()
  loaded = true
}

export function createMockApiClient(userId: string): UseApiClientReturn {
  // Ensure state is loaded once per app session
  // Callers (methods) also guard with loadState
  loadState(userId).catch(() => {})

  return {
    async getUserProfile() {
      await loadState(userId)
      return profile
    },
    async createUserProfile(data: Omit<CreateProfileData, 'clerkUserId'>) {
      await loadState(userId)
      profile = {
        id: profile?.id || 'uuid-profile-1',
        clerk_user_id: userId,
        email: data.email,
        name: data.name,
        avatar_url: data.avatarUrl,
        role: (data.role as UserRole) || 'landlord',
        created_at: profile?.created_at || now(),
        updated_at: now(),
      }
      await saveState()
      return profile
    },
    async updateUserProfile(updates: UpdateProfileData) {
      await loadState(userId)
      if (!profile) throw new Error('Profile not found')
      profile = { ...profile, ...{
        name: updates.name ?? profile.name,
        avatar_url: updates.avatarUrl ?? profile.avatar_url,
        role: (updates.role as UserRole) ?? profile.role,
        email: updates.email ?? profile.email,
        updated_at: now(),
      }}
      await saveState()
      return profile
    },
    async setUserRole(role: UserRole) {
      await loadState(userId)
      if (!profile) throw new Error('Profile not found')
      profile = { ...profile, role, updated_at: now() }
      await saveState()
      return profile
    },

    // Properties
    async getUserProperties() {
      await loadState(userId)
      return properties
    },

    // Maintenance
    async getMaintenanceRequests() {
      await loadState(userId)
      return maintenance
    },
    async createMaintenanceRequest(data: CreateMaintenanceRequestData) {
      await loadState(userId)
      const id = `uuid-mr-${maintenance.length + 1}`
      const mr: MaintenanceRequest = {
        id,
        property_id: data.propertyId,
        tenant_id: profile?.id || 'uuid-tenant-1',
        title: data.title,
        description: data.description,
        priority: data.priority,
        status: 'pending',
        area: data.area,
        asset: data.asset,
        issue_type: data.issueType,
        images: data.images || [],
        voice_notes: data.voiceNotes || [],
        created_at: now(),
        updated_at: now(),
      }
      maintenance = [mr, ...maintenance]
      await saveState()
      return mr
    },
    async updateMaintenanceRequest(id: string, updates: UpdateMaintenanceRequestData) {
      await loadState(userId)
      const idx = maintenance.findIndex(m => m.id === id)
      if (idx === -1) throw new Error('Maintenance request not found')
      const existing = maintenance[idx]
      const updated: MaintenanceRequest = {
        ...existing,
        ...{
          status: updates.status ?? existing.status,
          priority: updates.priority ?? existing.priority,
          assigned_vendor_email: updates.assignedVendorEmail ?? existing.assigned_vendor_email,
          vendor_notes: updates.vendorNotes ?? existing.vendor_notes,
          estimated_cost: updates.estimatedCost ?? existing.estimated_cost,
          actual_cost: updates.actualCost ?? existing.actual_cost,
          completion_notes: updates.completionNotes ?? existing.completion_notes,
          updated_at: now(),
        }
      }
      maintenance[idx] = updated
      await saveState()
      return updated
    },

    // Messaging
    async getMessages() {
      await loadState(userId)
      return messages
    },
    async sendMessage(data: Omit<CreateMessageData, 'senderClerkId'>) {
      await loadState(userId)
      const msg: Message = {
        id: `uuid-msg-${messages.length + 1}`,
        sender_id: profile?.id || 'uuid-tenant-1',
        recipient_id: data.recipientClerkId,
        content: data.content,
        message_type: (data.messageType || 'text') as any,
        attachment_url: data.attachmentUrl,
        property_id: data.propertyId,
        created_at: now(),
      }
      messages = [...messages, msg]
      await saveState()
      return msg
    },

    // AI
    async analyzeMaintenanceRequest(description: string, images?: string[]) {
      const suggested: Record<Priority, string> = {
        low: 'General',
        medium: 'Plumbing',
        high: 'Electrical',
        urgent: 'Safety',
      }
      const suggestedPriority: Priority = description.toLowerCase().includes('leak') ? 'medium' : 'low'
      return {
        suggestedPriority,
        suggestedArea: 'General',
        suggestedAsset: 'Unknown',
        suggestedIssueType: suggested[suggestedPriority],
        analysis: `Mock analysis for: ${description} (${images?.length || 0} images)`,
      }
    },

    // Storage
    async uploadFile(bucket: StorageBucket, _file: File | Blob | string, fileName: string, folder?: string) {
      await loadState(userId)
      const path = folder ? `${folder}/${fileName}` : fileName
      return { path } as any
    },
    async getSignedUrl(_bucket: StorageBucket, path: string) {
      await loadState(userId)
      return `https://example.invalid/${encodeURIComponent(path)}`
    },
    async deleteFile() {
      await loadState(userId)
      return
    },

    // Subscriptions
    subscribeToMaintenanceRequests(_cb: (payload: RealtimePayload<MaintenanceRequest>) => void) {
      return { unsubscribe: () => {} }
    },
    subscribeToMessages(_cb: (payload: RealtimePayload<Message>) => void) {
      return { unsubscribe: () => {} }
    },
  }
}
