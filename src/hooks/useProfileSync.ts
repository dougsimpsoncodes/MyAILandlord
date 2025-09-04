import { useEffect, useState, useContext } from 'react'
import { useAuth, useUser } from '@clerk/clerk-expo'
import { upsertProfile, getProfileByClerkId } from '../clients/ClerkSupabaseClient'
import { RoleContext } from '../context/RoleContext'

export function useProfileSync() {
  const { isSignedIn, isLoaded, getToken } = useAuth()
  const { user } = useUser()
  const { setUserRole } = useContext(RoleContext)
  const [ready, setReady] = useState(false)
  useEffect(() => {
    let cancelled = false
    async function run() {
      try {
        console.log('🔄 useProfileSync starting...', { isLoaded, isSignedIn, userId: user?.id });
        
        if (!isLoaded || !isSignedIn || !user) {
          console.log('🔄 useProfileSync: waiting for auth...', { isLoaded, isSignedIn, hasUser: !!user });
          return;
        }
        
        const t = await getToken() // Use native Clerk token
        if (!t) {
          console.log('🔄 useProfileSync: no token available');
          return;
        }
        
        const clerkId = user.id
        const email = user.primaryEmailAddress?.emailAddress || ''
        const name = user.fullName || user.username || ''
        const avatar_url = user.imageUrl || ''
        
        console.log('🔄 useProfileSync: creating profile for', { clerkId, email, name });
        
        const tokenProvider = { getToken: async () => t }
        const ex = await getProfileByClerkId(clerkId, tokenProvider)
        
        console.log('🔄 useProfileSync: existing profile:', ex);
        
        const finalRole = ex?.role || 'landlord'; // Default to landlord for new users
        
        await upsertProfile({ 
          id: ex?.id || '', 
          clerk_user_id: clerkId, 
          email, 
          name, 
          avatar_url,
          role: finalRole
        }, tokenProvider)
        
        console.log('🔄 useProfileSync: profile upserted successfully with role:', finalRole);
        
        // CRITICAL: Set the role in context so navigation works
        if (!cancelled) {
          await setUserRole(finalRole as 'landlord' | 'tenant');
          console.log('🔄 useProfileSync: role set in context:', finalRole);
          setReady(true);
          console.log('🔄 useProfileSync: ready = true');
        }
      } catch (error) {
        console.error('🔄 useProfileSync error:', error);
        // Don't set ready to true on error, but also don't throw
      }
    }
    run()
    return () => { cancelled = true }
  }, [isLoaded, isSignedIn, user])
  return { ready }
}
