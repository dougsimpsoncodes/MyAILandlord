import { useEffect, useState } from 'react'
import { useAuth, useUser } from '@clerk/clerk-expo'
import { upsertProfile, getProfileByClerkId } from '../clients/ClerkSupabaseClient'
export function useProfileSync() {
  const { isSignedIn, isLoaded, getToken } = useAuth()
  const { user } = useUser()
  const [ready, setReady] = useState(false)
  useEffect(() => {
    let cancelled = false
    async function run() {
      if (!isLoaded || !isSignedIn || !user) return
      const t = await getToken()
      if (!t) return
      const clerkId = user.id
      const email = user.primaryEmailAddress?.emailAddress || ''
      const name = user.fullName || user.username || ''
      const avatar_url = user.imageUrl || ''
      const ex = await getProfileByClerkId(clerkId)
      await upsertProfile({ id: ex?.id || '', clerk_user_id: clerkId, email, name, avatar_url })
      if (!cancelled) setReady(true)
    }
    run()
    return () => { cancelled = true }
  }, [isLoaded, isSignedIn, user])
  return { ready }
}
