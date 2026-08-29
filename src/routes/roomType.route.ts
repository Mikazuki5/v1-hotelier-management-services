import { Hono } from 'hono'
import {
  getAllRoomTypes,
  getRoomTypeById,
  createRoomType,
  updateRoomType,
  deleteRoomType,
} from '../controllers/roomType.controller'
import { authMiddleware, requireRole } from '../middlewares/auth'

const roomTypeRouter = new Hono()

roomTypeRouter.use('*', authMiddleware)
roomTypeRouter.get('/', getAllRoomTypes)
roomTypeRouter.get('/:id', getRoomTypeById)

const manageRoomType = requireRole(['ADMIN', 'MANAGER'])
roomTypeRouter.post('/', manageRoomType, createRoomType)
roomTypeRouter.put('/:id', manageRoomType, updateRoomType)
roomTypeRouter.delete('/:id', manageRoomType, deleteRoomType)

export default roomTypeRouter
