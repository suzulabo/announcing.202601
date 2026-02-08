<script lang='ts'>
  import { startAuthentication, startRegistration } from '@simplewebauthn/browser'

  let username = $state('')
  let message = $state('')

  async function register() {
    message = 'Starting registration...'
    try {
      // 1. Get options from server
      const resp = await fetch('/api/auth/registration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      })
      const options: any = await resp.json()

      if (options.error) {
        throw new Error(options.error)
      }

      // 2. Pass options to browser authenticator
      const attResp = await startRegistration({ optionsJSON: options })

      // 3. Send response to server
      const verificationResp = await fetch('/api/auth/registration', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(attResp),
      })

      const verificationJSON: any = await verificationResp.json()

      if (verificationJSON.verified) {
        message = 'Registration successful! You can now sign in.'
      }
      else {
        message = `Registration failed: ${JSON.stringify(verificationJSON)}`
      }
    }
    catch (error: any) {
      console.error(error)
      message = error.message || 'An error occurred during registration'
    }
  }

  async function login() {
    message = 'Starting authentication...'
    try {
      // 1. Get options from server
      const resp = await fetch('/api/auth/authentication', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username }),
      })

      const options: any = await resp.json()

      if (options.error) {
        throw new Error(options.error)
      }

      // 2. Pass options to browser authenticator
      const asseResp = await startAuthentication({ optionsJSON: options })

      // 3. Send response to server
      const verificationResp = await fetch('/api/auth/authentication', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(asseResp),
      })

      const verificationJSON: any = await verificationResp.json()

      if (verificationJSON.verified) {
        message = 'Authentication successful! Refreshing page...'
        window.location.reload()
      }
      else {
        message = `Authentication failed: ${JSON.stringify(verificationJSON)}`
      }
    }
    catch (error: any) {
      console.error(error)
      message = error.message || 'An error occurred during authentication'
    }
  }
</script>

<div style='font-family: sans-serif; max-width: 400px; margin: 2rem auto;'>
  <h1>Passkey Demo</h1>

  <div style='margin-bottom: 1rem;'>
    <label for='username'>Username:</label>
    <input id='username' type='text' bind:value={username} placeholder='Enter username' />
  </div>

  <div style='display: flex; gap: 1rem; margin-bottom: 1rem;'>
    <button onclick={register} disabled={!username}>Register Passkey</button>
    <button onclick={login} disabled={!username}>Sign In with Passkey</button>
  </div>

  {#if message}
    <p style='padding: 1rem; background: #f0f0f0; border-radius: 4px;'>{message}</p>
  {/if}
</div>
