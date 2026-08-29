import { Context } from 'hono'
import { roomTypeService } from '../services/roomType.service'
import { getPaginationParams, formatPaginatedResponse } from '../utils/pagination'

export const getAllRoomTypes = async (c: Context) => {
  try {
    const { page, limit, skip, take } = getPaginationParams(c)
    const { data, totalItems } = await roomTypeService.getAllRoomTypes(skip, take)
    return c.json(formatPaginatedResponse(data, totalItems, page, limit))
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500)
  }
}

export const getRoomTypeById = async (c: Context) => {
  try {
    const id = c.req.param('id') as string
    const roomType = await roomTypeService.getRoomTypeById(id)
    if (!roomType) {
      return c.json({ success: false, message: 'Room type not found' }, 404)
    }
    return c.json({ success: true, data: roomType })
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500)
  }
}

export const createRoomType = async (c: Context) => {
  try {
    const body = await c.req.json()
    
    if (!body.name || body.basePrice === undefined || body.capacity === undefined || body.maxExtraBeds === undefined) {
      return c.json({ success: false, message: 'Missing required fields: name, basePrice, capacity, maxExtraBeds' }, 400)
    }
    
    const roomType = await roomTypeService.createRoomType(body)
    return c.json({ success: true, data: roomType }, 201)
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500)
  }
}

export const updateRoomType = async (c: Context) => {
  try {
    const id = c.req.param('id') as string
    const body = await c.req.json()
    const roomType = await roomTypeService.updateRoomType(id, body)
    return c.json({ success: true, data: roomType })
  } catch (error: any) {
    if (error.code === 'P2025') {
      return c.json({ success: false, message: 'Room type not found' }, 404)
    }
    return c.json({ success: false, message: error.message }, 500)
  }
}

export const deleteRoomType = async (c: Context) => {
  try {
    const id = c.req.param('id') as string
    await roomTypeService.deleteRoomType(id)
    return c.json({ success: true, message: 'Room type deleted successfully' })
  } catch (error: any) {
    if (error.code === 'P2025') {
      return c.json({ success: false, message: 'Room type not found' }, 404)
    }
    
    if (error.message.includes('Cannot delete')) {
      return c.json({ success: false, message: error.message }, 400)
    }
    return c.json({ success: false, message: error.message }, 500)
  }
}
