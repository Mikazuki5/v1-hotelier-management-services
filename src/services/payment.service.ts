import prisma from '../config/db'
import { PaymentMethod } from '@prisma/client'

interface ProcessPaymentDTO {
  invoiceId: string
  paymentMethod: PaymentMethod
  amount: number
  referenceCode?: string
  
  handledBy: string
}

export class PaymentService {
  async getAllPayments(skip: number, take: number) {
    const [data, totalItems] = await Promise.all([
      prisma.payment.findMany({
        skip,
        take,
        include: {
          invoice: {
            include: { reservation: { include: { guest: true, room: true } } }
          },
          user: { select: { firstName: true, lastName: true, email: true } }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.payment.count()
    ])
    return { data, totalItems }
  }

  async processPayment(data: ProcessPaymentDTO) {
    if (data.amount <= 0) {
      throw new Error('Payment amount must be greater than zero')
    }

    return await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findUnique({ where: { id: data.invoiceId } })
      
      if (!invoice) {
        throw new Error('Invoice not found')
      }

      if (invoice.status === 'PAID') {
        throw new Error('Invoice is already fully paid')
      }

      const totalAmount = Number(invoice.totalAmount)
      const currentPaid = Number(invoice.paidAmount)
      const remainingAmount = totalAmount - currentPaid

      if (data.amount > remainingAmount) {
        throw new Error(`Payment amount exceeds the remaining balance (${remainingAmount})`)
      }

      const payment = await tx.payment.create({
        data: {
          invoiceId: data.invoiceId,
          paymentMethod: data.paymentMethod,
          amount: data.amount,
          referenceCode: data.referenceCode,
          handledBy: data.handledBy,
          status: 'SUCCESS'
        }
      })

      const newPaidAmount = currentPaid + data.amount
      let newStatus: import('@prisma/client').InvoiceStatus = invoice.status

      if (newPaidAmount >= totalAmount && totalAmount > 0) {
        newStatus = 'PAID'
      } else if (newPaidAmount > 0) {
        newStatus = 'PARTIAL'
      }

      await tx.invoice.update({
        where: { id: data.invoiceId },
        data: {
          paidAmount: newPaidAmount,
          status: newStatus
        }
      })

      return payment
    })
  }
}

export const paymentService = new PaymentService()
