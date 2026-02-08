import { jwtVerify, SignJWT } from 'jose'

const SECRET = new TextEncoder().encode('YOUR-SECRET-KEY-SHOULD-BE-IN-ENV') // TODO: Move to env var

export async function createSession(userId: string, username: string): Promise<string> {
  const jwt = await new SignJWT({ userId, username })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(SECRET)
  return jwt
}

export async function verifySession(token: string): Promise<{ userId: string, username: string } | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET)
    return {
      userId: payload.userId as string,
      username: payload.username as string,
    }
  }
  catch {
    return null
  }
}
