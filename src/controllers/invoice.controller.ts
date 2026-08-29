import { Context } from 'hono'
import { invoiceService } from '../services/invoice.service'
import { getPaginationParams, formatPaginatedResponse } from '../utils/pagination'

export const getAllInvoices = async (c: Context) => {
  try {
    const { page, limit, skip, take } = getPaginationParams(c)
    const { data, totalItems } = await invoiceService.getAllInvoices(skip, take)
    return c.json(formatPaginatedResponse(data, totalItems, page, limit))
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500)
  }
}

export const getInvoiceById = async (c: Context) => {
  try {
    const id = c.req.param('id') as string
    const invoice = await invoiceService.getInvoiceById(id)
    if (!invoice) {
      return c.json({ success: false, message: 'Invoice not found' }, 404)
    }
    return c.json({ success: true, data: invoice })
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500)
  }
}

export const addInvoiceItem = async (c: Context) => {
  try {
    const invoiceId = c.req.param('id') as string
    const body = await c.req.json()

    if (!body.itemType || !body.description || body.amount === undefined) {
      return c.json({ success: false, message: 'Missing required fields' }, 400)
    }

    const item = await invoiceService.addInvoiceItem(invoiceId, body)
    return c.json({ success: true, data: item }, 201)
  } catch (error: any) {
    if (error.message === 'Invoice not found') {
      return c.json({ success: false, message: error.message }, 404)
    }
    return c.json({ success: false, message: error.message }, 500)
  }
}

export const removeInvoiceItem = async (c: Context) => {
  try {
    const invoiceId = c.req.param('id') as string
    const itemId = c.req.param('itemId') as string

    await invoiceService.removeInvoiceItem(invoiceId, itemId)
    return c.json({ success: true, message: 'Item removed successfully' })
  } catch (error: any) {
    if (error.message.includes('not found')) {
      return c.json({ success: false, message: error.message }, 404)
    }
    if (error.message.includes('not belong')) {
      return c.json({ success: false, message: error.message }, 400)
    }
    return c.json({ success: false, message: error.message }, 500)
  }
}
