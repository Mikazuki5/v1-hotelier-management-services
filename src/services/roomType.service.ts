import prisma from '../config/db'

interface CreateRoomTypeDTO {
  name: string
  description?: string
  basePrice: number
  capacity: number
  maxExtraBeds: number
}

interface UpdateRoomTypeDTO {
  name?: string
  description?: string
  basePrice?: number
  capacity?: number
  maxExtraBeds?: number
}

export class RoomTypeService {
  async getAllRoomTypes(skip: number, take: number) {
    const [data, totalItems] = await Promise.all([
      prisma.roomType.findMany({
        skip,
        take,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.roomType.count()
    ])
    return { data, totalItems }
  }

  async getRoomTypeById(id: string) {
    return await prisma.roomType.findUnique({
      where: { id },
    })
  }

  async createRoomType(data: CreateRoomTypeDTO) {
    return await prisma.roomType.create({
      data,
    })
  }

  async updateRoomType(id: string, data: UpdateRoomTypeDTO) {
    return await prisma.roomType.update({
      where: { id },
      data,
    })
  }

  async deleteRoomType(id: string) {
    
    const roomsCount = await prisma.room.count({
      where: { roomTypeId: id },
    })

    if (roomsCount > 0) {
      throw new Error('Cannot delete room type because it is being used by one or more rooms.')
    }

    return await prisma.roomType.delete({
      where: { id },
    })
  }
}

export const roomTypeService = new RoomTypeService()
