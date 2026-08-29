import prisma from '../config/db'
import { HousekeepingTaskType, HousekeepingTaskStatus, RoomStatus } from '@prisma/client'

interface CreateTaskDTO {
  roomId: string
  assignedTo: string
  taskType: HousekeepingTaskType
  notes?: string
}

export class HousekeepingService {
  async getAllTasks(skip: number, take: number) {
    const [data, totalItems] = await Promise.all([
      prisma.housekeepingTask.findMany({
        skip,
        take,
        include: {
          room: true,
          user: { select: { firstName: true, lastName: true, email: true } }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.housekeepingTask.count()
    ])
    return { data, totalItems }
  }

  async getTaskById(id: string) {
    return await prisma.housekeepingTask.findUnique({
      where: { id },
      include: {
        room: true,
        user: { select: { firstName: true, lastName: true, email: true } }
      }
    })
  }

  async createTask(data: CreateTaskDTO) {
    const room = await prisma.room.findUnique({ where: { id: data.roomId } })
    if (!room) throw new Error('Room not found')

    const user = await prisma.user.findUnique({ where: { id: data.assignedTo } })
    if (!user) throw new Error('User not found')

    return await prisma.housekeepingTask.create({
      data: {
        roomId: data.roomId,
        assignedTo: data.assignedTo,
        taskType: data.taskType,
        notes: data.notes
      }
    })
  }

  async updateTaskStatus(id: string, status: HousekeepingTaskStatus, notes?: string) {
    return await prisma.$transaction(async (tx) => {
      const task = await tx.housekeepingTask.findUnique({ 
        where: { id },
        include: { room: true }
      })
      if (!task) throw new Error('Task not found')

      const updateData: any = { status }
      if (notes) updateData.notes = notes

      if (status === 'IN_PROGRESS' && task.status !== 'IN_PROGRESS') {
        updateData.startedAt = new Date()
      }

      if (status === 'COMPLETED' && task.status !== 'COMPLETED') {
        updateData.completedAt = new Date()

        if (task.room.status === 'DIRTY' || task.room.status === 'MAINTENANCE') {
          await tx.room.update({
            where: { id: task.roomId },
            data: { status: 'AVAILABLE' }
          })
        }
      }

      return await tx.housekeepingTask.update({
        where: { id },
        data: updateData,
        include: { room: true }
      })
    })
  }
}

export const housekeepingService = new HousekeepingService()
