import type { Context } from 'hono'
import prisma from '../config/db'

export const checkHealth = async (c: Context) => {
  let dbStatus = 'disconnected'

  try {
    await prisma.$queryRaw`SELECT 1`
    dbStatus = 'connected'
  } catch (err) {
    dbStatus = 'error'
    console.error('DB Health Check Error:', err)
  }

  const isHealthy = dbStatus === 'connected'
  
  return c.json(
    {
      status: isHealthy ? 'ok' : 'degraded',
      services: {
        database: dbStatus
      },
      timestamp: new Date().toISOString(),
    },
    isHealthy ? 200 : 503
  )
}
