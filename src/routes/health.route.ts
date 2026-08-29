import { Hono } from 'hono'
import { checkHealth } from '../controllers/health.controller'

const healthRouter = new Hono()

healthRouter.get('/', checkHealth)

export default healthRouter
