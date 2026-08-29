import { Hono } from 'hono'
import {
  getAllGuests,
  getGuestById,
  createGuest,
  updateGuest,
  deleteGuest,
} from '../controllers/guest.controller'
import { authMiddleware, requireRole } from '../middlewares/auth'

const guestRouter = new Hono()

guestRouter.use('*', authMiddleware, requireRole(['ADMIN', 'MANAGER', 'RECEPTIONIST']))

guestRouter.get('/', getAllGuests)
guestRouter.get('/:id', getGuestById)
guestRouter.post('/', createGuest)
guestRouter.put('/:id', updateGuest)
guestRouter.delete('/:id', deleteGuest)

export default guestRouter
