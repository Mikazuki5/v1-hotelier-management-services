import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { getAllUsers, getUserById, updateUser, deleteUser } from '../controllers/user.controller'
import { authMiddleware, requireRole } from '../middlewares/auth'

const userRouter = new Hono()

userRouter.use('*', authMiddleware)
userRouter.use('*', requireRole(['ADMIN']))

const updateUserSchema = z.object({
  employeeId: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  phoneNumber: z.string().optional(),
  department: z.string().optional(),
  shift: z.enum(['MORNING', 'EVENING', 'NIGHT']).optional(),
  role: z.enum(['ADMIN', 'MANAGER', 'RECEPTIONIST', 'HOUSEKEEPER', 'ACCOUNTANT']).optional(),
  isActive: z.boolean().optional()
})

userRouter.get('/', getAllUsers)
userRouter.get('/:id', getUserById)
userRouter.put('/:id', zValidator('json', updateUserSchema), updateUser)
userRouter.delete('/:id', deleteUser)

export default userRouter
