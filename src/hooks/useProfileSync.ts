import { useEffect, useState, useContext } from 'react'
import { useAppAuth } from '../context/SupabaseAuthContext'
import { RoleContext } from '../context/RoleContext'
import { useProfile } from '../context/ProfileContext'
import { log } from '../lib/log'
import { useApiClient } from '../services/api/client'

export function useProfileSync() {
  const authDisabled = process.env.EXPO_PUBLIC_AUTH_DISABLED === '1'
  const { isSignedIn, isLoading, user } = useAppAuth()
  const { setUserRole, userRole } = useContext(RoleContext)
  const { profile, isLoading: profileLoading, refreshProfile } = useProfile()
  const [ready, setReady] = useState(false)
  const api = useApiClient()

  useEffect(() => {
    let cancelled = false

    async function run() {
      try {
        // In auth-disabled mode, set a default role and exit
        if (authDisabled) {
          const finalRole = userRole || 'landlord'
          await setUserRole(finalRole as 'landlord' | 'tenant')
          if (!cancelled) {
            setReady(true)
          }
          return
        }

        log.info('useProfileSync: starting...', { isLoading, isSignedIn, userId: user?.id })

        if (isLoading || profileLoading || !isSignedIn || !user) {
          return
        }

        if (!api) {
          log.warn('useProfileSync: API not ready yet')
          return
        }

        const userId = user.id
        const email = user.email || ''
        const name = user.name || ''
        const avatarUrl = user.avatar || ''

        // Use cached profile from ProfileContext instead of calling API directly
        const existingProfile = profile

        // Database role is the source of truth. Only use context role for new users without a DB role.
        // Check auth metadata for role before defaulting to 'landlord'
        const metadataRole = user?.user_metadata?.role as 'landlord' | 'tenant' | undefined
        const finalRole = existingProfile?.role || userRole || metadataRole || 'landlord'
        log.info('useProfileSync: role determination:', {
          existingRole: existingProfile?.role,
          contextRole: userRole,
          metadataRole,
          finalRole
        })

        if (!existingProfile) {
          // Create new profile
          await api.createUserProfile({ email, name, avatarUrl, role: finalRole })
          // Refresh the profile cache after creation
          await refreshProfile()
        } else if (!existingProfile.role) {
          // Only update role if user doesn't have one set yet
          await api.updateUserProfile({ role: finalRole, name, avatarUrl, email })
          // Refresh the profile cache after update
          await refreshProfile()
        }
        // If profile exists with a role, don't overwrite it - database is source of truth

        log.info('useProfileSync: profile synced with role:', finalRole)

        // Set the role in context so navigation works
        if (!cancelled) {
          await setUserRole(finalRole as 'landlord' | 'tenant')
          setReady(true)
        }
      } catch (error) {
        log.error('useProfileSync error:', error as any)
        // Don't set ready to true on error
      }
    }

    run()
    return () => { cancelled = true }
  }, [isLoading, profileLoading, isSignedIn, user, userRole, api, profile, refreshProfile, setUserRole, authDisabled])

  return { ready }
}
