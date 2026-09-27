import { Hono } from 'hono'
import { getAllPayments, processPayment, generateXenditPayment, xenditWebhook } from '../controllers/payment.controller'
import { authMiddleware, requireRole } from '../middlewares/auth'

const paymentRouter = new Hono()

// Public webhook route (must be defined before global auth middleware)
paymentRouter.post('/webhook/xendit', xenditWebhook)

// Auth Middleware for all routes below this point
paymentRouter.use('*', authMiddleware, requireRole(['ADMIN', 'MANAGER', 'RECEPTIONIST', 'ACCOUNTANT']))

paymentRouter.get('/', getAllPayments)
paymentRouter.post('/', processPayment)
paymentRouter.post('/xendit/invoice', generateXenditPayment)

export default paymentRouter
