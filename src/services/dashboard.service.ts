import prisma from '../config/db'
import { Role } from '@prisma/client'

export type TimeFilter = 'day' | 'week' | 'month' | 'year' | 'all'

export const dashboardService = {
  getDashboardMetrics: async (filter: TimeFilter = 'month', role: Role) => {
    const now = new Date()
    let startDate: Date | undefined
    const endDate: Date = now

    if (filter !== 'all') {
      startDate = new Date(now)
      if (filter === 'day') {
        startDate.setHours(0, 0, 0, 0)
      } else if (filter === 'week') {
        const day = startDate.getDay()
        const diff = startDate.getDate() - day + (day === 0 ? -6 : 1) 
        startDate.setDate(diff)
        startDate.setHours(0, 0, 0, 0)
      } else if (filter === 'month') {
        startDate.setDate(1)
        startDate.setHours(0, 0, 0, 0)
      } else if (filter === 'year') {
        startDate.setMonth(0, 1)
        startDate.setHours(0, 0, 0, 0)
      }
    }

    const dateFilter = startDate
      ? {
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        }
      : {}

    const newGuests = await prisma.guest.count({
      where: dateFilter,
    })

    const totalGuests = await prisma.guest.count()

    const reservationsRaw = await prisma.reservation.groupBy({
      by: ['status'],
      where: dateFilter,
      _count: {
        id: true,
      },
    })

    const reservations = {
      PENDING: 0,
      CONFIRMED: 0,
      CHECKED_IN: 0,
      CHECKED_OUT: 0,
      CANCELLED: 0,
      NO_SHOW: 0,
      total: 0,
    }

    reservationsRaw.forEach((item) => {
      const status = item.status as keyof typeof reservations
      if (status !== 'total') {
        reservations[status] = item._count.id
        reservations.total += item._count.id
      }
    })

    const roomsRaw = await prisma.room.groupBy({
      by: ['status'],
      _count: {
        id: true,
      },
    })

    const rooms = {
      AVAILABLE: 0,
      OCCUPIED: 0,
      DIRTY: 0,
      MAINTENANCE: 0,
      total: 0,
    }

    roomsRaw.forEach((item) => {
      const status = item.status as keyof typeof rooms
      if (status !== 'total') {
        rooms[status] = item._count.id
        rooms.total += item._count.id
      }
    })

    const invoicesRaw = await prisma.invoice.groupBy({
      by: ['status'],
      where: dateFilter,
      _sum: {
        totalAmount: true,
        paidAmount: true,
      },
      _count: {
        id: true,
      },
    })

    const revenue = {
      PAID: { total: 0, paid: 0, count: 0 },
      UNPAID: { total: 0, paid: 0, count: 0 },
      PARTIAL: { total: 0, paid: 0, count: 0 },
      REFUNDED: { total: 0, paid: 0, count: 0 },
      summary: {
        totalCollected: 0,
        totalExpected: 0,
      },
    }

    invoicesRaw.forEach((item) => {
      const status = item.status as 'PAID' | 'UNPAID' | 'PARTIAL' | 'REFUNDED'
      const sumTotal = Number(item._sum.totalAmount || 0)
      const sumPaid = Number(item._sum.paidAmount || 0)

      revenue[status] = {
        total: sumTotal,
        paid: sumPaid,
        count: item._count.id,
      }

      revenue.summary.totalCollected += sumPaid
      revenue.summary.totalExpected += sumTotal
    })

    const result: any = {
      filter,
      period: startDate
        ? { start: startDate.toISOString(), end: endDate.toISOString() }
        : 'all-time',
    }

    if (['ADMIN', 'MANAGER', 'RECEPTIONIST'].includes(role)) {
      result.guests = {
        newInPeriod: newGuests,
        totalOverall: totalGuests,
      }
      result.reservations = reservations
    }

    if (['ADMIN', 'MANAGER', 'RECEPTIONIST', 'HOUSEKEEPER'].includes(role)) {
      result.rooms = rooms
    }

    if (['ADMIN', 'MANAGER', 'ACCOUNTANT'].includes(role)) {
      result.revenue = revenue
    }

    return result
  },
}
