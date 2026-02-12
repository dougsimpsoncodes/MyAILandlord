import { useEffect, useState, useRef } from 'react'
import { useUnifiedAuth } from '../context/UnifiedAuthContext'
import { log } from '../lib/log'
import { useApiClient } from '../services/api/client'
import { PendingInviteService } from '../services/storage/PendingInviteService'

/**
 * useProfileSync - Ensures user profile is synced with database
 *
 * Simplified to use UnifiedAuthContext exclusively (no longer uses ProfileContext or RoleContext).
 * UnifiedAuthContext already handles profile/role loading from the database.
 */
export function useProfileSync() {
  const authDisabled = process.env.EXPO_PUBLIC_AUTH_DISABLED === '1'
  const { isSignedIn, isLoading, user, processingInvite, updateRole, refreshUser } = useUnifiedAuth()
  const [ready, setReady] = useState(false)
  const api = useApiClient()
  const refreshedOnceRef = useRef(false)

  useEffect(() => {
    let cancelled = false

    async function run() {
      try {
        // In auth-disabled mode, set ready immediately
        if (authDisabled) {
          if (!cancelled) {
            setReady(true)
          }
          return
        }

        log.debug('useProfileSync: starting...', { isLoading, isSignedIn, userId: user?.id })

        if (isLoading || !isSignedIn || !user) {
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
        if (pendingInvite && !user.role) {
          log.debug('useProfileSync: Skipping profile creation - pending invite detected in AsyncStorage', {
            inviteType: pendingInvite.type,
            hasRole: !!user.role,
          })
          return
        }

        const email = user.email || ''
        const name = user.name || ''
        const avatarUrl = user.avatar || ''

        log.debug('useProfileSync: User state:', {
          hasRole: !!user.role,
          role: user.role,
          onboardingCompleted: user.onboarding_completed
        })

        // If user already has a role from UnifiedAuthContext, we're ready
        if (user.role) {
          log.debug('useProfileSync: User has role from UnifiedAuth:', user.role)
          if (!cancelled) {
            setReady(true)
          }
          return
        }

        // User doesn't have a role yet - check if we need to create profile or set role
        // Check auth metadata for role before defaulting to 'landlord'
        const metadataRole = user?.user_metadata?.role as 'landlord' | 'tenant' | undefined
        const finalRole = metadataRole || 'landlord'
        log.debug('useProfileSync: role determination for new profile:', {
          metadataRole,
          finalRole
        })

        // Refresh once to ensure we have latest data before creating
        if (!refreshedOnceRef.current) {
          refreshedOnceRef.current = true
          log.debug('useProfileSync: Refreshing user data once before profile creation')
          await refreshUser()
          return
        }

        // If user still has no role after refresh, create/update profile
        if (!user.role) {
          try {
            // Try to create profile (will fail if exists, that's ok)
            log.debug('useProfileSync: Creating new profile with role:', finalRole)
            await api.createUserProfile({ email, name, avatarUrl, role: finalRole })
          } catch {
            // Profile likely exists, try updating role
            log.debug('useProfileSync: Updating profile role to:', finalRole)
            await api.updateUserProfile({ role: finalRole, name, avatarUrl, email })
          }
          // Update role in UnifiedAuthContext
          await updateRole(finalRole)
        }

        log.debug('useProfileSync: profile synced with role:', finalRole)

        if (!cancelled) {
          setReady(true)
        }
      } catch (error) {
        log.error('useProfileSync error', { error: error instanceof Error ? error.message : String(error) })
        // Don't set ready to true on error
      }
    }

    run()
    return () => { cancelled = true }
  }, [isLoading, isSignedIn, user, api, processingInvite, updateRole, refreshUser, authDisabled])

  return { ready }
}
