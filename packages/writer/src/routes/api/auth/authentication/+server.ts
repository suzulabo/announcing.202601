import type { RequestHandler } from './$types'
import { Buffer } from 'node:buffer'
import { createSession } from '$lib/server/auth'
import { DB } from '$lib/server/db'
import { generateAuthenticationOptions, verifyAuthenticationResponse } from '@simplewebauthn/server'
import { json } from '@sveltejs/kit'

const rpID = 'localhost'
const origin = 'http://localhost:5173'

export const POST: RequestHandler = async ({ request, platform, cookies }) => {
  const { username } = await request.json() as any

  if (!platform?.env?.DB) {
    return json({ error: 'Database not available' }, { status: 500 })
  }

  const db = new DB(platform.env.DB)
  const user = await db.getUser(username)

  if (!user) {
    return json({ error: 'User not found' }, { status: 404 })
  }

  const userAuthenticators = await db.getUserAuthenticators(user.id)

  const options = await generateAuthenticationOptions({
    rpID,
    allowCredentials: userAuthenticators.map(authenticator => ({
      id: authenticator.credential_id,
      type: 'public-key',
    })),
    userVerification: 'preferred',
  })

  cookies.set('authChallenge', options.challenge, { path: '/' })
  cookies.set('authUserId', user.id, { path: '/' })

  return json(options)
}

export const PUT: RequestHandler = async ({ request, platform, cookies }) => {
  const response = await request.json() as any
  const challenge = cookies.get('authChallenge')
  const userId = cookies.get('authUserId')

  if (!challenge || !userId) {
    return json({ error: 'Authentication session expired' }, { status: 400 })
  }

  if (!platform?.env?.DB) {
    return json({ error: 'Database not available' }, { status: 500 })
  }

  const db = new DB(platform.env.DB)
  const user = await db.getUserById(userId)

  if (!user) {
    return json({ error: 'User not found' }, { status: 404 })
  }

  const authenticator = (await db.getUserAuthenticators(userId)).find(
    auth => auth.credential_id === response.id,
  )

  if (!authenticator) {
    return json({ error: 'Authenticator not found' }, { status: 400 })
  }

  const verification = await verifyAuthenticationResponse({
    response,
    expectedChallenge: challenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
    credential: {
      id: authenticator.credential_id,
      publicKey: new Uint8Array(Buffer.from(authenticator.credential_public_key, 'base64')),
      counter: authenticator.counter,
    },
  })

  if (verification.verified && verification.authenticationInfo) {
    const { authenticationInfo } = verification

    await db.updateAuthenticatorCounter(authenticator.credential_id, authenticationInfo.newCounter)

    const token = await createSession(user.id, user.username)
    cookies.set('token', token, { path: '/', httpOnly: true, secure: false }) // secure: false for localhost

    cookies.delete('authChallenge', { path: '/' })
    cookies.delete('authUserId', { path: '/' })

    return json({ verified: true })
  }

  return json({ verified: false, error: 'Verification failed' }, { status: 400 })
}
