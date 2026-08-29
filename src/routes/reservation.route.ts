import { Hono } from 'hono'
import {
  getAllReservations,
  getReservationById,
  createReservation,
  updateReservationStatus,
  deleteReservation,
} from '../controllers/reservation.controller'
import { authMiddleware, requireRole } from '../middlewares/auth'

const reservationRouter = new Hono()

reservationRouter.use('*', authMiddleware, requireRole(['ADMIN', 'MANAGER', 'RECEPTIONIST']))

reservationRouter.get('/', getAllReservations)
reservationRouter.get('/:id', getReservationById)
reservationRouter.post('/', createReservation)
reservationRouter.put('/:id/status', updateReservationStatus)
reservationRouter.delete('/:id', deleteReservation)

export default reservationRouter
