import { Context, Next } from 'hono'
import { verify } from 'hono/jwt'
import { Role } from '@prisma/client'

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-for-development-only'

export const authMiddleware = async (c: Context, next: Next) => {
  const authHeader = c.req.header('Authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ success: false, message: 'Unauthorized' }, 401)
  }

  const token = authHeader.split(' ')[1]
  
  try {
    const payload = await verify(token, JWT_SECRET, 'HS256')
    c.set('user', payload)
    await next()
  } catch (error) {
    return c.json({ success: false, message: 'Invalid or expired token' }, 401)
  }
}

export const requireRole = (allowedRoles: Role[]) => {
  return async (c: Context, next: Next) => {
    const user = c.get('user')
    if (!user || !user.role) {
      return c.json({ success: false, message: 'Forbidden' }, 403)
    }

    if (!allowedRoles.includes(user.role)) {
      return c.json({ success: false, message: 'Forbidden: Insufficient permissions' }, 403)
    }

    await next()
  }
}
