import prisma from '../config/db'
import { PaymentMethod, PaymentStatus } from '@prisma/client'
import { xenditService } from './xendit.service'

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
    }, { maxWait: 10000, timeout: 20000 })
  }

  async generateXenditPayment(invoiceId: string, handledBy: string) {
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        reservation: {
          include: { guest: true }
        }
      }
    })

    if (!invoice) throw new Error('Invoice not found')
    if (invoice.status === 'PAID') throw new Error('Invoice is already paid')

    const remainingAmount = Number(invoice.totalAmount) - Number(invoice.paidAmount)
    
    // Check if there's already a pending payment to avoid duplicates? We will just create a new one.
    
    // Call Xendit
    const xenditResponse = await xenditService.createInvoice({
      externalId: invoice.id,
      amount: remainingAmount,
      description: `Payment for Invoice ${invoice.id}`,
      customerEmail: invoice.reservation.guest.email,
    })

    // Create a pending payment record
    await prisma.payment.create({
      data: {
        invoiceId: invoice.id,
        paymentMethod: 'OTA_VIRTUAL',
        amount: remainingAmount,
        referenceCode: xenditResponse.id, // We store the Xendit invoice ID here
        handledBy: handledBy,
        status: 'PENDING'
      }
    })

    return xenditResponse
  }

  async handleXenditWebhook(payload: any) {
    // The payload contains external_id (our invoice.id), status (PAID, EXPIRED, etc)
    const externalId = payload.external_id;
    const status = payload.status;

    if (status === 'PAID' || status === 'SETTLED') {
      await prisma.$transaction(async (tx) => {
        const invoice = await tx.invoice.findUnique({ where: { id: externalId } });
        if (!invoice) return; // Silent ignore or log

        const pendingPayment = await tx.payment.findFirst({
          where: { invoiceId: externalId, status: 'PENDING' },
          orderBy: { createdAt: 'desc' }
        });

        if (pendingPayment) {
          await tx.payment.update({
            where: { id: pendingPayment.id },
            data: { status: 'SUCCESS' }
          });
        }

        await tx.invoice.update({
          where: { id: externalId },
          data: { 
            status: 'PAID',
            paidAmount: invoice.totalAmount
          }
        });
      }, { maxWait: 10000, timeout: 20000 });
    } else if (status === 'EXPIRED') {
      // Just mark pending payments as FAILED
      await prisma.payment.updateMany({
        where: { invoiceId: externalId, status: 'PENDING' },
        data: { status: 'FAILED' }
      });
    }
  }
}

export const paymentService = new PaymentService()
