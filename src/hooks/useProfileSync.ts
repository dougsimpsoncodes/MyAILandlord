import { useEffect, useState, useContext } from 'react'
import { useAuth, useUser } from '@clerk/clerk-expo'
import { RoleContext } from '../context/RoleContext'
import { log } from '../lib/log'
import { useApiClient } from '../services/api/client'

export function useProfileSync() {
  const { isSignedIn, isLoaded, getToken } = useAuth()
  const { user } = useUser()
  const { setUserRole, userRole } = useContext(RoleContext)
  const [ready, setReady] = useState(false)
  const api = useApiClient()
  useEffect(() => {
    let cancelled = false
    async function run() {
      try {
        log.info('🔄 useProfileSync starting...', { isLoaded, isSignedIn, userId: user?.id });
        
        if (!isLoaded || !isSignedIn || !user) {
          log.info('🔄 useProfileSync: waiting for auth...', { isLoaded, isSignedIn, hasUser: !!user });
          return;
        }
        
        const t = await getToken() // Use native Clerk token
        if (!t) {
          log.warn('🔄 useProfileSync: no token available');
          return;
        }
        
        const clerkId = user.id
        const email = user.primaryEmailAddress?.emailAddress || ''
        const name = user.fullName || user.username || ''
        const avatarUrl = user.imageUrl || ''
        
        log.info('🔄 useProfileSync: syncing profile for', { clerkId, email, name });
        
        if (!api) {
          log.warn('🔄 useProfileSync: API not ready yet')
          return;
        }
        const ex = await api.getUserProfile()
        
        log.info('🔄 useProfileSync: existing profile:', ex);
        
        // If coming from invite (userRole = tenant), always use tenant. Otherwise use existing or default to landlord.
        const finalRole = userRole === 'tenant' ? 'tenant' : (ex?.role || 'landlord');
        log.info('🔄 useProfileSync: role determination:', { existingRole: ex?.role, contextRole: userRole, finalRole, isInviteFlow: userRole === 'tenant' });
        
        if (!ex) {
          await api.createUserProfile({ email, name, avatarUrl, role: finalRole })
        } else {
          // Update role if necessary; set avatar/name if changed
          await api.updateUserProfile({ role: finalRole, name, avatarUrl, email })
        }
        
        log.info('🔄 useProfileSync: profile upserted successfully with role:', finalRole);
        
        // CRITICAL: Set the role in context so navigation works
        if (!cancelled) {
          await setUserRole(finalRole as 'landlord' | 'tenant');
          log.info('🔄 useProfileSync: role set in context:', finalRole);
          setReady(true);
          log.info('🔄 useProfileSync: ready = true');
        }
      } catch (error) {
        log.error('🔄 useProfileSync error:', error as any);
        // Don't set ready to true on error, but also don't throw
      }
    }
    run()
    return () => { cancelled = true }
  }, [isLoaded, isSignedIn, user, userRole, api])
  return { ready }
}
