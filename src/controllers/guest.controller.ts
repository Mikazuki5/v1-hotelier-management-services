import { Context } from 'hono'
import { guestService } from '../services/guest.service'
import { getPaginationParams, formatPaginatedResponse } from '../utils/pagination'

export const getAllGuests = async (c: Context) => {
  try {
    const { page, limit, skip, take } = getPaginationParams(c)
    const { data, totalItems } = await guestService.getAllGuests(skip, take)
    return c.json(formatPaginatedResponse(data, totalItems, page, limit))
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500)
  }
}

export const getGuestById = async (c: Context) => {
  try {
    const id = c.req.param('id') as string
    const guest = await guestService.getGuestById(id)
    if (!guest) {
      return c.json({ success: false, message: 'Guest not found' }, 404)
    }
    return c.json({ success: true, data: guest })
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500)
  }
}

export const createGuest = async (c: Context) => {
  try {
    const body = await c.req.json()
    if (!body.identityType || !body.identityNumber || !body.firstName || !body.lastName || !body.email || !body.phoneNumber) {
      return c.json({ success: false, message: 'Missing required fields' }, 400)
    }
    
    const guest = await guestService.createGuest(body)
    return c.json({ success: true, data: guest }, 201)
  } catch (error: any) {
    if (error.message.includes('already exists')) {
      return c.json({ success: false, message: error.message }, 409)
    }
    return c.json({ success: false, message: error.message }, 500)
  }
}

export const updateGuest = async (c: Context) => {
  try {
    const id = c.req.param('id') as string
    const body = await c.req.json()
    const guest = await guestService.updateGuest(id, body)
    return c.json({ success: true, data: guest })
  } catch (error: any) {
    if (error.code === 'P2025') {
      return c.json({ success: false, message: 'Guest not found' }, 404)
    }
    if (error.message.includes('already exists')) {
      return c.json({ success: false, message: error.message }, 409)
    }
    return c.json({ success: false, message: error.message }, 500)
  }
}

export const deleteGuest = async (c: Context) => {
  try {
    const id = c.req.param('id') as string
    await guestService.deleteGuest(id)
    return c.json({ success: true, message: 'Guest deleted successfully' })
  } catch (error: any) {
    if (error.code === 'P2025') {
      return c.json({ success: false, message: 'Guest not found' }, 404)
    }
    if (error.message.includes('Cannot delete')) {
      return c.json({ success: false, message: error.message }, 400)
    }
    return c.json({ success: false, message: error.message }, 500)
  }
}
