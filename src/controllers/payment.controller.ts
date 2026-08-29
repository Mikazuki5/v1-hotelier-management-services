import { Context } from 'hono'
import { paymentService } from '../services/payment.service'
import { getPaginationParams, formatPaginatedResponse } from '../utils/pagination'

export const getAllPayments = async (c: Context) => {
  try {
    const { page, limit, skip, take } = getPaginationParams(c)
    const { data, totalItems } = await paymentService.getAllPayments(skip, take)
    return c.json(formatPaginatedResponse(data, totalItems, page, limit))
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500)
  }
}

export const processPayment = async (c: Context) => {
  try {
    const body = await c.req.json()
    const user = c.get('user')
    
    if (!user || !user.sub) {
      return c.json({ success: false, message: 'Unauthorized, missing user info' }, 401)
    }

    if (!body.invoiceId || !body.paymentMethod || body.amount === undefined) {
      return c.json({ success: false, message: 'Missing required fields' }, 400)
    }

    const data = {
      ...body,
      handledBy: user.sub
    }

    const payment = await paymentService.processPayment(data)
    return c.json({ success: true, data: payment }, 201)
  } catch (error: any) {
    if (error.message.includes('not found')) {
      return c.json({ success: false, message: error.message }, 404)
    }
    if (error.message.includes('exceeds') || error.message.includes('greater than zero') || error.message.includes('already fully paid')) {
      return c.json({ success: false, message: error.message }, 400)
    }
    return c.json({ success: false, message: error.message }, 500)
  }
}
