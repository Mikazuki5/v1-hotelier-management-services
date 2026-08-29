import prisma from '../config/db'
import { RoomStatus } from '@prisma/client'

interface CreateRoomDTO {
  roomNumber: string
  roomTypeId: string
  floorNumber: number
  status?: RoomStatus
  isSmoking?: boolean
  facilities?: string[]
}

interface UpdateRoomDTO {
  roomNumber?: string
  roomTypeId?: string
  floorNumber?: number
  status?: RoomStatus
  isSmoking?: boolean
  facilities?: string[]
}

export class RoomService {
  async getAllRooms(skip: number, take: number) {
    const [data, totalItems] = await Promise.all([
      prisma.room.findMany({
        skip,
        take,
        include: {
          roomType: true
        },
        orderBy: { roomNumber: 'asc' }
      }),
      prisma.room.count()
    ])
    return { data, totalItems }
  }

  async getRoomById(id: string) {
    return await prisma.room.findUnique({
      where: { id },
      include: {
        roomType: true,
      },
    })
  }

  async createRoom(data: CreateRoomDTO) {
    
    const existing = await prisma.room.findUnique({
      where: { roomNumber: data.roomNumber },
    })
    
    if (existing) {
      throw new Error(`Room number ${data.roomNumber} already exists`)
    }

    return await prisma.room.create({
      data,
      include: {
        roomType: true,
      }
    })
  }

  async updateRoom(id: string, data: UpdateRoomDTO) {
    if (data.roomNumber) {
      const existing = await prisma.room.findUnique({
        where: { roomNumber: data.roomNumber },
      })
      
      if (existing && existing.id !== id) {
        throw new Error(`Room number ${data.roomNumber} already exists`)
      }
    }

    return await prisma.room.update({
      where: { id },
      data,
      include: {
        roomType: true,
      }
    })
  }

  async deleteRoom(id: string) {
    
    const reservationsCount = await prisma.reservation.count({
      where: { roomId: id },
    })

    if (reservationsCount > 0) {
      throw new Error('Cannot delete room because it has reservations associated with it.')
    }

    return await prisma.room.delete({
      where: { id },
    })
  }
}

export const roomService = new RoomService()
