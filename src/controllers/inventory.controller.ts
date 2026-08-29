import { Context } from 'hono'
import { inventoryService } from '../services/inventory.service'
import { getPaginationParams, formatPaginatedResponse } from '../utils/pagination'

export const getAllItems = async (c: Context) => {
  try {
    const { page, limit, skip, take } = getPaginationParams(c)
    const { data, totalItems } = await inventoryService.getAllItems(skip, take)
    return c.json(formatPaginatedResponse(data, totalItems, page, limit))
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500)
  }
}

export const getItemById = async (c: Context) => {
  try {
    const id = c.req.param('id') as string
    const item = await inventoryService.getItemById(id)
    if (!item) {
      return c.json({ success: false, message: 'Item not found' }, 404)
    }
    return c.json({ success: true, data: item })
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500)
  }
}

export const createItem = async (c: Context) => {
  try {
    const body = await c.req.json()

    if (!body.skuCode || !body.name || !body.category || !body.unitType) {
      return c.json({ success: false, message: 'Missing required fields' }, 400)
    }

    const item = await inventoryService.createItem(body)
    return c.json({ success: true, data: item }, 201)
  } catch (error: any) {
    if (error.message.includes('already exists')) {
      return c.json({ success: false, message: error.message }, 409)
    }
    return c.json({ success: false, message: error.message }, 500)
  }
}

export const addInventoryLog = async (c: Context) => {
  try {
    const itemId = c.req.param('id') as string
    const body = await c.req.json()
    const user = c.get('user')

    if (!user || !user.sub) {
      return c.json({ success: false, message: 'Unauthorized' }, 401)
    }

    if (!body.actionType || body.quantity === undefined) {
      return c.json({ success: false, message: 'Missing actionType or quantity' }, 400)
    }

    const log = await inventoryService.addInventoryLog({
      itemId,
      actionType: body.actionType,
      quantity: body.quantity,
      notes: body.notes,
      handledBy: user.sub
    })

    return c.json({ success: true, data: log }, 201)
  } catch (error: any) {
    if (error.message === 'Inventory item not found') {
      return c.json({ success: false, message: error.message }, 404)
    }
    if (error.message.includes('Insufficient stock') || error.message.includes('greater than zero')) {
      return c.json({ success: false, message: error.message }, 400)
    }
    return c.json({ success: false, message: error.message }, 500)
  }
}
