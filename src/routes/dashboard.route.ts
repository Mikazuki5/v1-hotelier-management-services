import { Hono } from 'hono'
import { getDashboardMetrics } from '../controllers/dashboard.controller'
import { authMiddleware } from '../middlewares/auth'

const dashboardRouter = new Hono()

dashboardRouter.use('*', authMiddleware)
dashboardRouter.get('/', getDashboardMetrics)

export default dashboardRouter
