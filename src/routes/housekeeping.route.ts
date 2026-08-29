import { Hono } from 'hono'
import {
  getAllTasks,
  getTaskById,
  createTask,
  updateTaskStatus,
} from '../controllers/housekeeping.controller'
import { authMiddleware, requireRole } from '../middlewares/auth'

const housekeepingRouter = new Hono()

housekeepingRouter.use('*', authMiddleware)

const viewAndUpdateTask = requireRole(['ADMIN', 'MANAGER', 'RECEPTIONIST', 'HOUSEKEEPER'])
const assignTask = requireRole(['ADMIN', 'MANAGER', 'RECEPTIONIST'])

housekeepingRouter.get('/', viewAndUpdateTask, getAllTasks)
housekeepingRouter.get('/:id', viewAndUpdateTask, getTaskById)
housekeepingRouter.post('/', assignTask, createTask)
housekeepingRouter.put('/:id/status', viewAndUpdateTask, updateTaskStatus)

export default housekeepingRouter
