import { Context } from 'hono'
import { reservationService } from '../services/reservation.service'
import { getPaginationParams, formatPaginatedResponse } from '../utils/pagination'

export const getAllReservations = async (c: Context) => {
  try {
    const { page, limit, skip, take } = getPaginationParams(c)
    const { data, totalItems } = await reservationService.getAllReservations(skip, take)
    return c.json(formatPaginatedResponse(data, totalItems, page, limit))
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500)
  }
}

export const getReservationById = async (c: Context) => {
  try {
    const id = c.req.param('id') as string
    const reservation = await reservationService.getReservationById(id)
    if (!reservation) {
      return c.json({ success: false, message: 'Reservation not found' }, 404)
    }
    return c.json({ success: true, data: reservation })
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500)
  }
}

export const createReservation = async (c: Context) => {
  try {
    const body = await c.req.json()
    
    const user = c.get('user')
    
    if (!user || !user.sub) {
      return c.json({ success: false, message: 'Unauthorized, missing user info' }, 401)
    }

    if (!body.roomId || !body.expectedCheckIn || !body.expectedCheckOut || body.adultCount === undefined || !body.bookingSource) {
      return c.json({ success: false, message: 'Missing required fields' }, 400)
    }

    const data = {
      ...body,
      createdBy: user.sub
    }

    const reservation = await reservationService.createReservation(data)
    return c.json({ success: true, data: reservation }, 201)
  } catch (error: any) {
    if (error.message.includes('not available') || error.message.includes('must be provided')) {
      return c.json({ success: false, message: error.message }, 400)
    }
    if (error.code === 'P2003') { 
      return c.json({ success: false, message: 'Invalid room or guest reference' }, 400)
    }
    return c.json({ success: false, message: error.message }, 500)
  }
}

export const updateReservationStatus = async (c: Context) => {
  try {
    const id = c.req.param('id') as string
    const body = await c.req.json()

    if (!body.status) {
      return c.json({ success: false, message: 'Missing status field' }, 400)
    }

    const reservation = await reservationService.updateStatus(id, body.status)
    return c.json({ success: true, data: reservation })
  } catch (error: any) {
    if (error.message === 'Reservation not found') {
      return c.json({ success: false, message: error.message }, 404)
    }
    return c.json({ success: false, message: error.message }, 500)
  }
}

export const deleteReservation = async (c: Context) => {
  try {
    const id = c.req.param('id') as string
    await reservationService.deleteReservation(id)
    return c.json({ success: true, message: 'Reservation cancelled and deleted successfully' })
  } catch (error: any) {
    if (error.message === 'Reservation not found') {
      return c.json({ success: false, message: error.message }, 404)
    }
    return c.json({ success: false, message: error.message }, 500)
  }
}
