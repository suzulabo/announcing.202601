/// <reference types="@cloudflare/workers-types" />
import type { CredentialDeviceType } from '@simplewebauthn/types'

export interface User {
  id: string
  username: string
}

export interface Authenticator {
  id: string
  credential_id: string
  credential_public_key: string
  counter: number
  credential_device_type: CredentialDeviceType
  user_id: string
}

export class DB {
  constructor(private db: D1Database) {}

  async getUser(username: string): Promise<User | null> {
    return this.db
      .prepare('SELECT * FROM users WHERE username = ?')
      .bind(username)
      .first<User>()
  }

  async getUserById(id: string): Promise<User | null> {
    return this.db
      .prepare('SELECT * FROM users WHERE id = ?')
      .bind(id)
      .first<User>()
  }

  async createUser(id: string, username: string): Promise<void> {
    await this.db
      .prepare('INSERT INTO users (id, username) VALUES (?, ?)')
      .bind(id, username)
      .run()
  }

  async getUserAuthenticators(userId: string): Promise<Authenticator[]> {
    interface AuthenticatorRow {
      id: string
      credential_id: string
      credential_public_key: string
      counter: number
      credential_device_type: CredentialDeviceType
      user_id: string
      created_at: number
    }

    const results = await this.db
      .prepare('SELECT * FROM authenticators WHERE user_id = ?')
      .bind(userId)
      .all<AuthenticatorRow>()

    return results.results.map((row: AuthenticatorRow) => ({
      ...row,
    }))
  }

  async saveAuthenticator(auth: Omit<Authenticator, 'created_at'>): Promise<void> {
    await this.db
      .prepare(
        `INSERT INTO authenticators (
          id, credential_id, credential_public_key, counter, 
          credential_device_type, user_id
        ) VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        auth.id,
        auth.credential_id,
        auth.credential_public_key,
        auth.counter,
        auth.credential_device_type,
        auth.user_id,
      )
      .run()
  }

  async updateAuthenticatorCounter(credentialId: string, counter: number): Promise<void> {
    await this.db
      .prepare('UPDATE authenticators SET counter = ? WHERE credential_id = ?')
      .bind(counter, credentialId)
      .run()
  }
}
