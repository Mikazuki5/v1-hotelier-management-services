import prisma from '../config/db'
import { InventoryCategory, InventoryActionType } from '@prisma/client'

interface CreateItemDTO {
  skuCode: string
  name: string
  category: InventoryCategory
  unitType: string
  minimumStock?: number
}

interface AddLogDTO {
  itemId: string
  actionType: InventoryActionType
  quantity: number
  notes?: string
  handledBy: string 
}

export class InventoryService {
  async getAllItems(skip: number, take: number) {
    const [data, totalItems] = await Promise.all([
      prisma.inventoryItem.findMany({
        skip,
        take,
        orderBy: { name: 'asc' }
      }),
      prisma.inventoryItem.count()
    ])
    return { data, totalItems }
  }

  async getItemById(id: string) {
    return await prisma.inventoryItem.findUnique({
      where: { id },
      include: {
        logs: {
          include: { user: { select: { firstName: true, lastName: true, email: true } } },
          orderBy: { createdAt: 'desc' }
        }
      }
    })
  }

  async createItem(data: CreateItemDTO) {
    const existing = await prisma.inventoryItem.findUnique({
      where: { skuCode: data.skuCode }
    })
    
    if (existing) throw new Error('Item with this SKU already exists')

    return await prisma.inventoryItem.create({
      data: {
        skuCode: data.skuCode,
        name: data.name,
        category: data.category,
        unitType: data.unitType,
        minimumStock: data.minimumStock || 0,
        currentStock: 0 
      }
    })
  }

  async addInventoryLog(data: AddLogDTO) {
    if (data.quantity <= 0) {
      throw new Error('Quantity must be greater than zero')
    }

    return await prisma.$transaction(async (tx) => {
      const item = await tx.inventoryItem.findUnique({ where: { id: data.itemId } })
      if (!item) throw new Error('Inventory item not found')

      let newStock = item.currentStock

      switch (data.actionType) {
        case 'STOCK_IN':
          newStock += data.quantity
          break
        case 'STOCK_OUT':
        case 'DEFECT':
          if (newStock < data.quantity) {
            throw new Error(`Insufficient stock. Current stock is ${newStock}`)
          }
          newStock -= data.quantity
          break
        case 'ADJUSTMENT':

          newStock -= data.quantity
          break
      }

      if (newStock < 0) {
        throw new Error('Stock cannot be negative')
      }

      const log = await tx.inventoryLog.create({
        data: {
          itemId: data.itemId,
          actionType: data.actionType,
          quantity: data.quantity,
          notes: data.notes,
          handledBy: data.handledBy
        }
      })

      await tx.inventoryItem.update({
        where: { id: data.itemId },
        data: { currentStock: newStock }
      })

      return log
    })
  }
}

export const inventoryService = new InventoryService()
