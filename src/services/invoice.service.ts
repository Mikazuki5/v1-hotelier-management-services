import prisma from '../config/db'
import { InvoiceItemType } from '@prisma/client'

interface AddInvoiceItemDTO {
  itemType: InvoiceItemType
  description: string
  amount: number
  quantity?: number
}

export class InvoiceService {
  async getAllInvoices(skip: number, take: number) {
    const [data, totalItems] = await Promise.all([
      prisma.invoice.findMany({
        skip,
        take,
        include: {
          reservation: {
            include: { guest: true, room: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.invoice.count()
    ])
    return { data, totalItems }
  }

  async getInvoiceById(id: string) {
    return await prisma.invoice.findUnique({
      where: { id },
      include: {
        items: true,
        payments: true,
        reservation: {
          include: { guest: true, room: true }
        }
      }
    })
  }

  async addInvoiceItem(invoiceId: string, data: AddInvoiceItemDTO) {
    const qty = data.quantity || 1
    const itemTotal = data.amount * qty

    return await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findUnique({ where: { id: invoiceId } })
      if (!invoice) throw new Error('Invoice not found')

      const newItem = await tx.invoiceItem.create({
        data: {
          invoiceId,
          itemType: data.itemType,
          description: data.description,
          amount: data.amount,
          quantity: qty
        }
      })

      const newSubtotal = Number(invoice.subtotalAmount) + itemTotal
      const newTax = newSubtotal * 0.11 
      const newTotal = newSubtotal + newTax

      let newStatus = invoice.status
      if (newStatus === 'PAID') {
        newStatus = 'PARTIAL'
      }

      await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          subtotalAmount: newSubtotal,
          taxAmount: newTax,
          totalAmount: newTotal,
          status: newStatus
        }
      })

      return newItem
    }, { maxWait: 10000, timeout: 20000 })
  }

  async removeInvoiceItem(invoiceId: string, itemId: string) {
    return await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findUnique({ where: { id: invoiceId } })
      if (!invoice) throw new Error('Invoice not found')

      const item = await tx.invoiceItem.findUnique({ where: { id: itemId } })
      if (!item) throw new Error('Invoice item not found')
      
      if (item.invoiceId !== invoiceId) {
        throw new Error('Item does not belong to this invoice')
      }

      await tx.invoiceItem.delete({ where: { id: itemId } })

      const itemTotal = Number(item.amount) * item.quantity
      const newSubtotal = Number(invoice.subtotalAmount) - itemTotal
      const newTax = newSubtotal * 0.11
      const newTotal = newSubtotal + newTax

      let newStatus = invoice.status
      if (Number(invoice.paidAmount) >= newTotal && newTotal > 0) {
        newStatus = 'PAID'
      }

      await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          subtotalAmount: newSubtotal,
          taxAmount: newTax,
          totalAmount: newTotal,
          status: newStatus
        }
      })

      return true
    }, { maxWait: 10000, timeout: 20000 })
  }
}

export const invoiceService = new InvoiceService()
