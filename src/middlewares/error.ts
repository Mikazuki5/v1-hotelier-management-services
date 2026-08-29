import type { ErrorHandler } from 'hono'

export const errorHandler: ErrorHandler = (err, c) => {
  console.error(`[Error] ${err.message}`)
  
  return c.json(
    {
      success: false,
      message: err.message || 'Internal Server Error',
    },
    500
  )
}
