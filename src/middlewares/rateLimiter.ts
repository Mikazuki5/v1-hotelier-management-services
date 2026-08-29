import { createMiddleware } from 'hono/factory'

const rateLimitCache = new Map<string, { count: number, resetTime: number }>()

const cleanupTimer = setInterval(() => {
  const now = Date.now()
  for (const [k, v] of rateLimitCache.entries()) {
    if (now > v.resetTime) {
      rateLimitCache.delete(k)
    }
  }
}, 60 * 1000)

if (cleanupTimer.unref) {
  cleanupTimer.unref()
}

export const rateLimiter = (limit: number, windowSec: number) => {
  return createMiddleware(async (c, next) => {
    
    const forwardedFor = c.req.header('x-forwarded-for')
    const ip = forwardedFor ? forwardedFor.split(',')[0].trim() : '127.0.0.1'

    const key = `rate_limit:${ip}:${c.req.path}`
    const now = Date.now()

    let record = rateLimitCache.get(key)

    if (!record) {
      record = { count: 1, resetTime: now + (windowSec * 1000) }
      rateLimitCache.set(key, record)
    } else {
      if (now > record.resetTime) {
        
        record.count = 1
        record.resetTime = now + (windowSec * 1000)
      } else {
        record.count++
      }
    }

    if (record.count > limit) {
      return c.json({ 
        success: false, 
        message: 'Too many requests, please try again later.' 
      }, 429)
    }

    await next()
  })
}
