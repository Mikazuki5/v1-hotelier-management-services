import prisma from '../config/db'
import { Role, Shift } from '@prisma/client'

export interface UpdateUserDTO {
  employeeId?: string
  firstName?: string
  lastName?: string
  phoneNumber?: string
  department?: string
  shift?: Shift
  role?: Role
  isActive?: boolean
}

export class UserService {
  async getAllUsers(skip: number, take: number) {
    const [data, totalItems] = await Promise.all([
      prisma.user.findMany({
        skip,
        take,
        select: {
          id: true,
          employeeId: true,
          firstName: true,
          lastName: true,
          email: true,
          phoneNumber: true,
          department: true,
          shift: true,
          role: true,
          isActive: true,
          lastLoginAt: true,
          createdAt: true,
        },
        orderBy: { createdAt: 'desc' },
        where: { deletedAt: null }
      }),
      prisma.user.count({ where: { deletedAt: null } })
    ])
    return { data, totalItems }
  }

  async getUserById(id: string) {
    return await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        employeeId: true,
        firstName: true,
        lastName: true,
        email: true,
        phoneNumber: true,
        department: true,
        shift: true,
        role: true,
        isActive: true,
        lastLoginAt: true,
        createdAt: true,
      }
    })
  }

  async updateUser(id: string, data: UpdateUserDTO) {
    const user = await prisma.user.findUnique({ where: { id } })
    if (!user || user.deletedAt) throw new Error('User not found')

    return await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        employeeId: true,
        firstName: true,
        lastName: true,
        email: true,
        phoneNumber: true,
        department: true,
        shift: true,
        role: true,
        isActive: true,
      }
    })
  }

  async deleteUser(id: string) {
    const user = await prisma.user.findUnique({ where: { id } })
    if (!user || user.deletedAt) throw new Error('User not found')

    return await prisma.user.update({
      where: { id },
      data: { 
        isActive: false,
        deletedAt: new Date()
      }
    })
  }
}

export const userService = new UserService()
