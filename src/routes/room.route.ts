import { Hono } from 'hono'
import {
  getAllRooms,
  getRoomById,
  createRoom,
  updateRoom,
  deleteRoom,
} from '../controllers/room.controller'
import { authMiddleware, requireRole } from '../middlewares/auth'

const roomRouter = new Hono()

roomRouter.use('*', authMiddleware)
roomRouter.get('/', getAllRooms)
roomRouter.get('/:id', getRoomById)

const manageRoom = requireRole(['ADMIN', 'MANAGER'])
roomRouter.post('/', manageRoom, createRoom)
roomRouter.put('/:id', manageRoom, updateRoom)
roomRouter.delete('/:id', manageRoom, deleteRoom)

export default roomRouter
