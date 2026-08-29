import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { register, login, refreshToken } from '../controllers/auth.controller'
import { rateLimiter } from '../middlewares/rateLimiter'

const authRouter = new Hono()

authRouter.use('*', rateLimiter(5, 60))

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  employeeId: z.string().min(1, 'Employee ID is required'),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  phoneNumber: z.string().min(1, 'Phone number is required'),
  department: z.string().min(1, 'Department is required'),
  shift: z.enum(['MORNING', 'EVENING', 'NIGHT']),
  role: z.enum(['ADMIN', 'MANAGER', 'RECEPTIONIST', 'HOUSEKEEPER', 'ACCOUNTANT']).optional()
})

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required')
})

const refreshTokenSchema = z.object({
  refreshToken: z.string().min(1, 'Refresh token is required')
})

authRouter.post('/register', zValidator('json', registerSchema), register)
authRouter.post('/login', zValidator('json', loginSchema), login)
authRouter.post('/refresh', zValidator('json', refreshTokenSchema), refreshToken)

export default authRouter
