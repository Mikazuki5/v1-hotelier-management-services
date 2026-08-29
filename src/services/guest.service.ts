import prisma from '../config/db'
import { IdentityType } from '@prisma/client'

interface CreateGuestDTO {
  identityType: IdentityType
  identityNumber: string
  firstName: string
  lastName: string
  email: string
  phoneNumber: string
  address?: string
}

interface UpdateGuestDTO {
  identityType?: IdentityType
  identityNumber?: string
  firstName?: string
  lastName?: string
  email?: string
  phoneNumber?: string
  address?: string
  isBlacklisted?: boolean
}

export class GuestService {
  async getAllGuests(skip: number, take: number) {
    const [data, totalItems] = await Promise.all([
      prisma.guest.findMany({
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.guest.count()
    ])
    return { data, totalItems }
  }

  async getGuestById(id: string) {
    return await prisma.guest.findUnique({
      where: { id },
    })
  }

  async createGuest(data: CreateGuestDTO) {
    
    const existing = await prisma.guest.findFirst({
      where: {
        OR: [
          { email: data.email },
          { identityNumber: data.identityNumber }
        ]
      },
    })
    
    if (existing) {
      throw new Error('Guest with this email or identity number already exists')
    }

    return await prisma.guest.create({
      data,
    })
  }

  async updateGuest(id: string, data: UpdateGuestDTO) {
    if (data.email || data.identityNumber) {
      const existing = await prisma.guest.findFirst({
        where: {
          OR: [
            { email: data.email },
            { identityNumber: data.identityNumber }
          ]
        },
      })
      
      if (existing && existing.id !== id) {
        throw new Error('Guest with this email or identity number already exists')
      }
    }

    return await prisma.guest.update({
      where: { id },
      data,
    })
  }

  async deleteGuest(id: string) {
    const reservationsCount = await prisma.reservation.count({
      where: { guestId: id },
    })

    if (reservationsCount > 0) {
      throw new Error('Cannot delete guest because they have reservations.')
    }

    return await prisma.guest.delete({
      where: { id },
    })
  }
}

export const guestService = new GuestService()
