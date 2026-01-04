import { useEffect, useState, useContext, useRef } from 'react'
import { useUnifiedAuth } from '../context/UnifiedAuthContext'
import { RoleContext } from '../context/RoleContext'
import { useProfile } from '../context/ProfileContext'
import { log } from '../lib/log'
import { useApiClient } from '../services/api/client'
import { PendingInviteService } from '../services/storage/PendingInviteService'

export function useProfileSync() {
  const authDisabled = process.env.EXPO_PUBLIC_AUTH_DISABLED === '1'
  const { isSignedIn, isLoading, user, processingInvite } = useUnifiedAuth()
  const { setUserRole, userRole } = useContext(RoleContext)
  const { profile, isLoading: profileLoading, refreshProfile } = useProfile()
  const [ready, setReady] = useState(false)
  const api = useApiClient()
  const refreshedOnceRef = useRef(false)

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

        log.debug('useProfileSync: starting...', { isLoading, isSignedIn, userId: user?.id })

        if (isLoading || profileLoading || !isSignedIn || !user) {
          return
        }

        if (!api) {
          log.warn('useProfileSync: API not ready yet')
          return
        }

        // CRITICAL: If there's a pending invite being processed, skip profile creation
        // PropertyInviteAcceptScreen will handle profile creation/role setting
        if (processingInvite) {
          log.debug('useProfileSync: Skipping - pending invite is being processed')
          return
        }

        // Also check AsyncStorage directly as a backup (in case processingInvite flag isn't set yet)
        const pendingInvite = await PendingInviteService.getPendingInvite()
        if (pendingInvite && !profile) {
          log.debug('useProfileSync: Skipping profile creation - pending invite detected in AsyncStorage', {
            inviteType: pendingInvite.type,
            hasProfile: !!profile,
          })
          return
        }

        const userId = user.id
        const email = user.email || ''
        const name = user.name || ''
        const avatarUrl = user.avatar || ''

        // CRITICAL FIX: Wait for ProfileContext to provide a definitive answer
        // ProfileContext state: undefined (not checked) → null (checked, no profile) OR object (checked, profile exists)
        // profile === undefined means ProfileContext hasn't checked yet
        // profile === null means ProfileContext checked DB and found no profile
        // profile === object means ProfileContext found a profile

        // If ProfileContext is still loading, wait
        if (profileLoading) {
          log.debug('useProfileSync: ProfileContext loading, waiting...')
          return
        }

        // If profile is still undefined (initial state), ProfileContext hasn't finished yet
        // This handles both cache and non-cache scenarios
        if (profile === undefined) {
          log.debug('useProfileSync: ProfileContext not ready yet (profile still undefined)')
          return
        }

        log.debug('useProfileSync: ProfileContext ready, profile state:', {
          profileType: profile === null ? 'null' : (profile ? 'object' : 'undefined'),
          profileRole: profile?.role
        })

        // If profile exists in database, ALWAYS use its role as source of truth
        if (profile?.role) {
          const dbRole = profile.role
          log.debug('useProfileSync: Using database role (source of truth):', dbRole)

          // Set the role in context so navigation works
          if (!cancelled && userRole !== dbRole) {
            await setUserRole(dbRole)
            setReady(true)
          }
          return
        }

        // Only reach here if profile doesn't exist or has no role
        // Check auth metadata for role before defaulting to 'landlord'
        const metadataRole = user?.user_metadata?.role as 'landlord' | 'tenant' | undefined
        const finalRole = userRole || metadataRole || 'landlord'
        log.debug('useProfileSync: role determination for new profile:', {
          contextRole: userRole,
          metadataRole,
          finalRole
        })

        // If ProfileContext found no profile yet, re-check once before creating
        if (profile === null && !refreshedOnceRef.current) {
          refreshedOnceRef.current = true
          log.debug('useProfileSync: profile null, refreshing once before creation')
          await refreshProfile()
          return
        }

        if (profile === null) {
          // Create new profile
          log.debug('useProfileSync: Creating new profile with role:', finalRole)
          await api.createUserProfile({ email, name, avatarUrl, role: finalRole })
          // Refresh the profile cache after creation
          await refreshProfile()
        } else if (profile && !profile.role) {
          // Only update role if user doesn't have one set yet
          log.debug('useProfileSync: Updating profile role to:', finalRole)
          await api.updateUserProfile({ role: finalRole, name, avatarUrl, email })
          // Refresh the profile cache after update
          await refreshProfile()
        }

        log.debug('useProfileSync: profile synced with role:', finalRole)

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
