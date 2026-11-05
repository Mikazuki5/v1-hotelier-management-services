import crypto from 'node:crypto'

function parsePhcArgon2(phc: string) {
  const parts = phc.split('$')
  // Format: $argon2id$v=19$m=65536,t=2,p=1$<salt_b64>$<hash_b64>
  if (parts.length !== 6) return null
  const [, variant, versionStr, paramsStr, saltB64, hashB64] = parts
  if (variant !== 'argon2id' && variant !== 'argon2i' && variant !== 'argon2d') {
    return null
  }
  const params: Record<string, number> = {}
  for (const kv of paramsStr.split(',')) {
    const [k, v] = kv.split('=')
    params[k] = Number(v)
  }
  const versionMatch = versionStr.match(/^v=(\d+)$/)
  return {
    variant: variant as 'argon2id' | 'argon2i' | 'argon2d',
    version: versionMatch ? Number(versionMatch[1]) : 19,
    m: params.m || 65536,
    t: params.t || 2,
    p: params.p || 1,
    salt: Buffer.from(saltB64, 'base64'),
    hash: Buffer.from(hashB64, 'base64'),
  }
}

export async function hashPassword(password: string): Promise<string> {
  if (typeof Bun !== 'undefined' && Bun.password) {
    return Bun.password.hash(password)
  }

  const argon2Sync = (crypto as any).argon2Sync
  if (typeof argon2Sync === 'function') {
    const salt = crypto.randomBytes(32)
    const derived: Buffer = argon2Sync('argon2id', {
      message: password,
      nonce: salt,
      parallelism: 1,
      tagLength: 32,
      memory: 65536,
      passes: 2,
    })
    const saltB64 = salt.toString('base64').replace(/=+$/, '')
    const hashB64 = Buffer.from(derived).toString('base64').replace(/=+$/, '')
    return `$argon2id$v=19$m=65536,t=2,p=1$${saltB64}$${hashB64}`
  }

  const salt = crypto.randomBytes(16).toString('hex')
  const derivedKey = crypto.scryptSync(password, salt, 64).toString('hex')
  return `$scrypt$${salt}$${derivedKey}`
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  if (storedHash.startsWith('$scrypt$')) {
    const [, , salt, keyHex] = storedHash.split('$')
    if (!salt || !keyHex) return false
    const keyBuffer = Buffer.from(keyHex, 'hex')
    const derivedKey = crypto.scryptSync(password, salt, 64)
    return (
      keyBuffer.length === derivedKey.length &&
      crypto.timingSafeEqual(keyBuffer, derivedKey)
    )
  }

  if (typeof Bun !== 'undefined' && Bun.password) {
    return Bun.password.verify(password, storedHash)
  }

  if (storedHash.startsWith('$argon2')) {
    const argon2Sync = (crypto as any).argon2Sync
    const parsed = parsePhcArgon2(storedHash)
    if (typeof argon2Sync === 'function' && parsed) {
      const derived = Buffer.from(
        argon2Sync(parsed.variant, {
          message: password,
          nonce: parsed.salt,
          parallelism: parsed.p,
          tagLength: parsed.hash.length,
          memory: parsed.m,
          passes: parsed.t,
        })
      )
      return (
        derived.length === parsed.hash.length &&
        crypto.timingSafeEqual(derived, parsed.hash)
      )
    }
  }

  return false
}
