import { Context } from 'hono'
import { paymentService } from '../services/payment.service'
import { xenditService } from '../services/xendit.service'
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

export const generateXenditPayment = async (c: Context) => {
  try {
    const { invoiceId } = await c.req.json()
    const user = c.get('user')
    
    if (!user || !user.sub) {
      return c.json({ success: false, message: 'Unauthorized' }, 401)
    }
    if (!invoiceId) {
      return c.json({ success: false, message: 'invoiceId is required' }, 400)
    }

    const xenditInvoice = await paymentService.generateXenditPayment(invoiceId, user.sub)
    return c.json({ success: true, data: xenditInvoice }, 201)
  } catch (error: any) {
    if (error.message.includes('not found')) {
      return c.json({ success: false, message: error.message }, 404)
    }
    return c.json({ success: false, message: error.message }, 500)
  }
}

export const xenditWebhook = async (c: Context) => {
  try {
    const webhookToken = c.req.header('x-callback-token')
    
    if (!webhookToken || !xenditService.verifyWebhookToken(webhookToken)) {
      return c.json({ success: false, message: 'Forbidden' }, 403)
    }

    const payload = await c.req.json()
    await paymentService.handleXenditWebhook(payload)
    
    return c.json({ success: true, message: 'Webhook received' }, 200)
  } catch (error: any) {
    console.error('Xendit webhook error:', error.message)
    return c.json({ success: false, message: error.message }, 500)
  }
}
