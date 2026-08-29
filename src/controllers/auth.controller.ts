import { Context } from 'hono'
import { authService } from '../services/auth.service'

export const register = async (c: Context) => {
  try {
    
    const body = c.req.valid('json' as never) as any
    const user = await authService.register(body)
    return c.json({ success: true, data: user }, 201)
  } catch (error: any) {
    if (error.message === 'Email already registered') {
      return c.json({ success: false, message: error.message }, 409)
    }
    return c.json({ success: false, message: error.message }, 500)
  }
}

export const login = async (c: Context) => {
  try {
    
    const body = c.req.valid('json' as never) as any
    const data = await authService.login(body)
    return c.json({ success: true, data })
  } catch (error: any) {
    if (error.message === 'Invalid email or password') {
      return c.json({ success: false, message: error.message }, 401)
    }
    return c.json({ success: false, message: error.message }, 500)
  }
}

export const refreshToken = async (c: Context) => {
  try {
    const body = c.req.valid('json' as never) as any
    const data = await authService.refreshToken(body.refreshToken)
    return c.json({ success: true, data })
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 401)
  }
}
