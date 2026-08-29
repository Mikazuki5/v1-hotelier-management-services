import { Hono } from 'hono'
import { getAllPayments, processPayment } from '../controllers/payment.controller'
import { authMiddleware, requireRole } from '../middlewares/auth'

const paymentRouter = new Hono()

paymentRouter.use('*', authMiddleware, requireRole(['ADMIN', 'MANAGER', 'RECEPTIONIST', 'ACCOUNTANT']))

paymentRouter.get('/', getAllPayments)
paymentRouter.post('/', processPayment)

export default paymentRouter
