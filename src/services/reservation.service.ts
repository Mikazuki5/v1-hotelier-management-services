import prisma from '../config/db'
import { BookingSource, ReservationStatus, IdentityType } from '@prisma/client'

interface GuestInfo {
  identityType: IdentityType
  identityNumber: string
  firstName: string
  lastName: string
  email: string
  phoneNumber: string
  address?: string
}

interface CreateReservationDTO {
  guestId?: string
  guestInfo?: GuestInfo
  roomId: string
  expectedCheckIn: string | Date
  expectedCheckOut: string | Date
  adultCount: number
  childCount: number
  bookingSource: BookingSource
  specialRequests?: string
  
  createdBy: string 
}

export class ReservationService {
  async getAllReservations(skip: number, take: number) {
    const [data, totalItems] = await Promise.all([
      prisma.reservation.findMany({
        skip,
        take,
        include: {
          guest: true,
          room: true,
          user: {
            select: { firstName: true, lastName: true, email: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        where: { deletedAt: null }
      }),
      prisma.reservation.count({ where: { deletedAt: null } })
    ])
    return { data, totalItems }
  }

  async getReservationById(id: string) {
    return await prisma.reservation.findFirst({
      where: { id, deletedAt: null },
      include: {
        guest: true,
        room: true,
        invoice: true
      }
    })
  }

  async createReservation(data: CreateReservationDTO) {
    
    let finalGuestId = data.guestId

    if (!finalGuestId && data.guestInfo) {
      
      const existingGuest = await prisma.guest.findFirst({
        where: {
          OR: [
            { email: data.guestInfo.email },
            { identityNumber: data.guestInfo.identityNumber }
          ]
        }
      })

      if (existingGuest) {
        finalGuestId = existingGuest.id
      } else {
        const newGuest = await prisma.guest.create({
          data: data.guestInfo
        })
        finalGuestId = newGuest.id
      }
    }

    if (!finalGuestId) {
      throw new Error('Either guestId or complete guestInfo must be provided')
    }

    const checkIn = new Date(data.expectedCheckIn)
    const checkOut = new Date(data.expectedCheckOut)
    const timeDiff = checkOut.getTime() - checkIn.getTime()
    const nights = Math.ceil(timeDiff / (1000 * 3600 * 24))
    
    if (nights <= 0) {
      throw new Error('Check-out date must be after check-in date')
    }

    const room = await prisma.room.findUnique({ 
      where: { id: data.roomId },
      include: { roomType: true }
    })
    if (!room) {
      throw new Error('Room not found')
    }

    const overlapping = await prisma.reservation.findFirst({
      where: {
        roomId: data.roomId,
        status: {
          in: ['PENDING', 'CONFIRMED', 'CHECKED_IN']
        },
        deletedAt: null,
        AND: [
          { expectedCheckIn: { lt: checkOut } },
          { expectedCheckOut: { gt: checkIn } }
        ]
      }
    })

    if (overlapping) {
      throw new Error('Room is not available for the selected dates')
    }

    const roomPrice = Number(room.roomType.basePrice)
    const subtotal = roomPrice * nights
    const tax = subtotal * 0.11 
    const total = subtotal + tax

    const now = new Date()
    const dd = String(now.getDate()).padStart(2, '0')
    const mm = String(now.getMonth() + 1).padStart(2, '0')
    const yyyy = now.getFullYear()
    const todayStr = `${dd}${mm}${yyyy}`

    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)

    const todaysReservations = await prisma.reservation.count({
      where: {
        createdAt: {
          gte: startOfToday,
          lte: endOfToday
        }
      }
    })

    const sequence = String(todaysReservations + 1).padStart(4, '0')
    const bookingNumber = `YH${todayStr}${sequence}`

    const reservation = await prisma.reservation.create({
      data: {
        bookingNumber,
        guestId: finalGuestId,
        roomId: data.roomId,
        expectedCheckIn: checkIn,
        expectedCheckOut: checkOut,
        adultCount: data.adultCount,
        childCount: data.childCount,
        bookingSource: data.bookingSource,
        specialRequests: data.specialRequests,
        createdBy: data.createdBy,
        status: 'PENDING',
        invoice: {
          create: {
            subtotalAmount: subtotal,
            taxAmount: tax,
            totalAmount: total,
            status: 'UNPAID',
            items: {
              create: [
                {
                  itemType: 'ROOM_CHARGE',
                  description: `Room Charge (${nights} nights x ${roomPrice})`,
                  amount: roomPrice,
                  quantity: nights
                }
              ]
            }
          }
        }
      },
      include: {
        guest: true,
        room: true,
        invoice: {
          include: { items: true }
        }
      }
    })

    return reservation
  }

  async updateStatus(id: string, status: ReservationStatus) {
    const reservation = await prisma.reservation.findUnique({
      where: { id }
    })

    if (!reservation || reservation.deletedAt) {
      throw new Error('Reservation not found')
    }

    const updateData: any = { status }

    if (status === 'CHECKED_IN' && reservation.status !== 'CHECKED_IN') {
      updateData.actualCheckIn = new Date()
      await prisma.room.update({
        where: { id: reservation.roomId },
        data: { status: 'OCCUPIED' }
      })
    }

    if (status === 'CHECKED_OUT' && reservation.status === 'CHECKED_IN') {
      updateData.actualCheckOut = new Date()
      await prisma.room.update({
        where: { id: reservation.roomId },
        data: { status: 'DIRTY' }
      })
    }

    if (status === 'CANCELLED' && reservation.status === 'CHECKED_IN') {
      await prisma.room.update({
        where: { id: reservation.roomId },
        data: { status: 'DIRTY' }
      })
    }

    return await prisma.reservation.update({
      where: { id },
      data: updateData,
      include: { room: true }
    })
  }

  async deleteReservation(id: string) {
    
    const reservation = await prisma.reservation.findUnique({ where: { id } })
    if (!reservation) {
      throw new Error('Reservation not found')
    }

    return await prisma.reservation.update({
      where: { id },
      data: { deletedAt: new Date(), status: 'CANCELLED' }
    })
  }
}

export const reservationService = new ReservationService()
