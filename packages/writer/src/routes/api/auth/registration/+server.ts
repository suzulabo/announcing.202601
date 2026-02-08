import type { RequestHandler } from './$types'
import { Buffer } from 'node:buffer'
import { DB } from '$lib/server/db'
import { generateRegistrationOptions, verifyRegistrationResponse } from '@simplewebauthn/server'
import { json } from '@sveltejs/kit'

const rpName = 'SvelteKit Passkey App'
const rpID = 'localhost'
const origin = 'http://localhost:5173'

export const POST: RequestHandler = async ({ request, platform, cookies }) => {
  const { username } = await request.json() as any

  if (!platform?.env?.DB) {
    return json({ error: 'Database not available' }, { status: 500 })
  }

  const db = new DB(platform.env.DB)
  let user = await db.getUser(username)

  // If user does not exist, create a new one (Simplified for this demo)
  if (!user) {
    const newUserId = crypto.randomUUID()
    await db.createUser(newUserId, username)
    user = { id: newUserId, username }
  }

  // const userAuthenticators = await db.getUserAuthenticators(user.id)

  const options = await generateRegistrationOptions({
    rpName,
    rpID,
    userID: new TextEncoder().encode(user.id),
    userName: user.username,
    // Don't exclude credentials we want to register (unless you want to prevent duplicate reg on same device)
    // excludeCredentials: userAuthenticators.map(authenticator => ({
    //   id: authenticator.credentialID,
    //   type: 'public-key',
    //   transports: authenticator.transports,
    // })),
    attestationType: 'none',
    authenticatorSelection: {
      residentKey: 'preferred',
      userVerification: 'preferred',
      authenticatorAttachment: 'platform',
    },
  })

  // Store challenge in cookie or proper session (using cookie for simplicity here, but signed/encrypted recommended)
  // For production, use a server-side session store or signed cookie.
  cookies.set('regChallenge', options.challenge, { path: '/' })
  cookies.set('regUserId', user.id, { path: '/' })

  return json(options)
}

export const PUT: RequestHandler = async ({ request, platform, cookies }) => {
  const response = await request.json() as any
  const challenge = cookies.get('regChallenge')
  const userId = cookies.get('regUserId')

  if (!challenge || !userId) {
    return json({ error: 'Registration session expired' }, { status: 400 })
  }

  if (!platform?.env?.DB) {
    return json({ error: 'Database not available' }, { status: 500 })
  }

  const verification = await verifyRegistrationResponse({
    response,
    expectedChallenge: challenge,
    expectedOrigin: origin,
    expectedRPID: rpID,
  })

  if (verification.verified && verification.registrationInfo) {
    const { registrationInfo } = verification
    const db = new DB(platform.env.DB)

    await db.saveAuthenticator({
      id: crypto.randomUUID(),
      credential_id: registrationInfo.credential.id,
      credential_public_key: Buffer.from(registrationInfo.credential.publicKey).toString('base64'),
      counter: registrationInfo.credential.counter,
      credential_device_type: registrationInfo.credentialDeviceType,
      user_id: userId,
    })

    cookies.delete('regChallenge', { path: '/' })
    cookies.delete('regUserId', { path: '/' })

    return json({ verified: true })
  }

  return json({ verified: false, error: 'Verification failed' }, { status: 400 })
}
