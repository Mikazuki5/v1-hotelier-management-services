import 'dotenv/config'
import { Hono } from 'hono'
import { logger } from 'hono/logger'
import { cors } from 'hono/cors'
import { secureHeaders } from 'hono/secure-headers'
import { swaggerUI } from '@hono/swagger-ui'
import { readFileSync } from 'fs'
import { errorHandler } from './middlewares/error'
import prisma from './config/db'

import authRouter from './routes/auth.route'
import guestRouter from './routes/guest.route'
import housekeepingRouter from './routes/housekeeping.route'
import inventoryRouter from './routes/inventory.route'
import invoiceRouter from './routes/invoice.route'
import paymentRouter from './routes/payment.route'
import reservationRouter from './routes/reservation.route'
import roomTypeRouter from './routes/roomType.route'
import roomRouter from './routes/room.route'
import dashboardRouter from './routes/dashboard.route'
import userRouter from './routes/user.route'

const app = new Hono()

app.use('*', logger())
app.use('*', cors())
app.use('*', secureHeaders())

const swaggerFile = readFileSync('./docs/swagger.yaml', 'utf8')
app.get('/api/docs/swagger.yaml', (c) => {
  c.header('Content-Type', 'text/yaml')
  return c.text(swaggerFile)
})
app.get('/api/docs', swaggerUI({ url: '/api/docs/swagger.yaml' }))

const apiRoutes = new Hono()
apiRoutes.route('/auth', authRouter)
apiRoutes.route('/guests', guestRouter)
apiRoutes.route('/housekeeping', housekeepingRouter)
apiRoutes.route('/inventory', inventoryRouter)
apiRoutes.route('/invoices', invoiceRouter)
apiRoutes.route('/payments', paymentRouter)
apiRoutes.route('/reservations', reservationRouter)
apiRoutes.route('/room-types', roomTypeRouter)
apiRoutes.route('/rooms', roomRouter)
apiRoutes.route('/dashboard', dashboardRouter)
apiRoutes.route('/users', userRouter)

app.route('/api', apiRoutes)

app.get('/health', async (c) => {
  try {
    await prisma.$queryRaw`SELECT 1`
    
    return c.json({ status: 'ok', service: 'hotelier-management-system-service' })
  } catch (error) {
    return c.json({ status: 'degraded', service: 'hotelier-management-system-service', error }, 503)
  }
})

app.onError(errorHandler)

export default {
  port: process.env.PORT || 3000,
  fetch: app.fetch,
}
