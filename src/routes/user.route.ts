import { Hono } from 'hono'
import { z } from 'zod'
import { zValidator } from '@hono/zod-validator'
import { getAllUsers, getUserById, updateUser, deleteUser } from '../controllers/user.controller'
import { authMiddleware, requireRole } from '../middlewares/auth'

const userRouter = new Hono()

userRouter.use('*', authMiddleware)

const viewUsers = requireRole(['ADMIN', 'MANAGER', 'RECEPTIONIST'])
const manageUsers = requireRole(['ADMIN'])

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

userRouter.get('/', viewUsers, getAllUsers)
userRouter.get('/:id', manageUsers, getUserById)
userRouter.put('/:id', manageUsers, zValidator('json', updateUserSchema), updateUser)
userRouter.delete('/:id', manageUsers, deleteUser)

export default userRouter
