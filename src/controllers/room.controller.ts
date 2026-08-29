import { Context } from 'hono'
import { roomService } from '../services/room.service'
import { getPaginationParams, formatPaginatedResponse } from '../utils/pagination'

export const getAllRooms = async (c: Context) => {
  try {
    const { page, limit, skip, take } = getPaginationParams(c)
    const { data, totalItems } = await roomService.getAllRooms(skip, take)
    return c.json(formatPaginatedResponse(data, totalItems, page, limit))
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500)
  }
}

export const getRoomById = async (c: Context) => {
  try {
    const id = c.req.param('id') as string
    const room = await roomService.getRoomById(id)
    if (!room) {
      return c.json({ success: false, message: 'Room not found' }, 404)
    }
    return c.json({ success: true, data: room })
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500)
  }
}

export const createRoom = async (c: Context) => {
  try {
    const body = await c.req.json()
    if (!body.roomNumber || !body.roomTypeId || body.floorNumber === undefined) {
      return c.json({ success: false, message: 'Missing required fields: roomNumber, roomTypeId, floorNumber' }, 400)
    }
    
    const room = await roomService.createRoom(body)
    return c.json({ success: true, data: room }, 201)
  } catch (error: any) {
    if (error.message.includes('already exists')) {
      return c.json({ success: false, message: error.message }, 409) 
    }
    if (error.code === 'P2003') { 
      return c.json({ success: false, message: 'Invalid roomTypeId' }, 400)
    }
    return c.json({ success: false, message: error.message }, 500)
  }
}

export const updateRoom = async (c: Context) => {
  try {
    const id = c.req.param('id') as string
    const body = await c.req.json()
    const room = await roomService.updateRoom(id, body)
    return c.json({ success: true, data: room })
  } catch (error: any) {
    if (error.code === 'P2025') {
      return c.json({ success: false, message: 'Room not found' }, 404)
    }
    if (error.message.includes('already exists')) {
      return c.json({ success: false, message: error.message }, 409)
    }
    if (error.code === 'P2003') {
      return c.json({ success: false, message: 'Invalid roomTypeId' }, 400)
    }
    return c.json({ success: false, message: error.message }, 500)
  }
}

export const deleteRoom = async (c: Context) => {
  try {
    const id = c.req.param('id') as string
    await roomService.deleteRoom(id)
    return c.json({ success: true, message: 'Room deleted successfully' })
  } catch (error: any) {
    if (error.code === 'P2025') {
      return c.json({ success: false, message: 'Room not found' }, 404)
    }
    if (error.message.includes('Cannot delete')) {
      return c.json({ success: false, message: error.message }, 400)
    }
    return c.json({ success: false, message: error.message }, 500)
  }
}
