import { useEffect, useState, useContext } from 'react'
import { useAppAuth } from '../context/SupabaseAuthContext'
import { RoleContext } from '../context/RoleContext'
import { log } from '../lib/log'
import { useApiClient } from '../services/api/client'
import { isTestMode } from '../lib/testMode'
import { useSupabaseWithAuth } from './useSupabaseWithAuth'

export function useProfileSync() {
  const authDisabled = process.env.EXPO_PUBLIC_AUTH_DISABLED === '1'
  const { isSignedIn, isLoading, user } = useAppAuth()
  const { setUserRole, userRole } = useContext(RoleContext)
  const [ready, setReady] = useState(false)
  const api = useApiClient()
  const { supabase } = useSupabaseWithAuth()
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

        log.info('🔄 useProfileSync starting...', { isLoading, isSignedIn, userId: user?.id });

        if (isLoading || !isSignedIn || !user) {
          log.info('🔄 useProfileSync: waiting for auth...', { isLoading, isSignedIn, hasUser: !!user });
          return;
        }

        // Test mode only: Ping Supabase to verify connectivity
        if (isTestMode) {
          try {
            const ping = await supabase.from('profiles').select('id').limit(1);
            log.info('🔍 DEBUG: profiles ping:', ping.error ? { code: (ping.error as any).code, message: ping.error.message } : { count: ping.data?.length || 0 });
          } catch (e) {
            log.info('🔍 DEBUG: profiles ping threw:', (e as any)?.message || e);
          }
        }

        const userId = user.id
        const email = user.email || ''
        const name = user.name || ''
        const avatarUrl = user.avatar || ''

        log.info('🔄 useProfileSync: syncing profile for', { userId, email, name });

        log.info('🔍 DEBUG: API client status:', { hasApi: !!api, apiType: typeof api });
        if (!api) {
          log.warn('🔄 useProfileSync: API not ready yet')
          return;
        }

        log.info('🔍 DEBUG: About to call api.getUserProfile()...');
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
  }, [isLoading, isSignedIn, user, userRole, api])
  return { ready }
}
