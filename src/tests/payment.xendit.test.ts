import { describe, it, expect, mock, beforeEach } from 'bun:test'
import { paymentService } from '../services/payment.service'
import { xenditService } from '../services/xendit.service'
import prisma from '../config/db'

// Mock dependencies
mock.module('../services/xendit.service', () => ({
  xenditService: {
    createInvoice: mock().mockResolvedValue({ id: 'xnd_test_invoice_123' }),
    verifyWebhookToken: mock().mockReturnValue(true)
  }
}))

mock.module('../config/db', () => ({
  default: {
    invoice: {
      findUnique: mock(),
      update: mock()
    },
    payment: {
      create: mock(),
      findFirst: mock(),
      update: mock(),
      updateMany: mock()
    },
    $transaction: mock(async (callback) => {
      // Execute the callback passing the mocked prisma as the transaction context
      return callback({
        invoice: {
          findUnique: mock(),
          update: mock()
        },
        payment: {
          findFirst: mock(),
          update: mock()
        }
      })
    })
  }
}))

describe('Payment Service - Xendit Reservation Flow', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    mock.restore()
  })

  it('should generate a Xendit payment link and create a PENDING payment', async () => {
    // 1. Arrange: Mock the invoice found in the database
    const mockInvoiceId = 'inv_123'
    const mockUserId = 'usr_123'
    
    // Typecast prisma mock to setup return values
    ;(prisma.invoice.findUnique as any).mockResolvedValue({
      id: mockInvoiceId,
      status: 'UNPAID',
      totalAmount: 1500000,
      paidAmount: 0,
      reservation: {
        guest: { email: 'guest@example.com' }
      }
    })

    ;(prisma.payment.create as any).mockResolvedValue({
      id: 'pay_123',
      invoiceId: mockInvoiceId,
      status: 'PENDING'
    })

    // 2. Act
    const result = await paymentService.generateXenditPayment(mockInvoiceId, mockUserId)

    // 3. Assert
    expect(prisma.invoice.findUnique).toHaveBeenCalled()
    expect(xenditService.createInvoice).toHaveBeenCalledWith({
      externalId: mockInvoiceId,
      amount: 1500000, // 1500000 - 0
      description: `Payment for Invoice ${mockInvoiceId}`,
      customerEmail: 'guest@example.com'
    })
    
    expect(prisma.payment.create).toHaveBeenCalledWith({
      data: {
        invoiceId: mockInvoiceId,
        paymentMethod: 'OTA_VIRTUAL',
        amount: 1500000,
        referenceCode: 'xnd_test_invoice_123', // From the mocked Xendit response
        handledBy: mockUserId,
        status: 'PENDING'
      }
    })
    expect(result.id).toBe('xnd_test_invoice_123')
  })

  it('should process webhook and update Invoice and Payment to PAID/SUCCESS', async () => {
    // 1. Arrange
    const mockExternalId = 'inv_123'
    const webhookPayload = {
      external_id: mockExternalId,
      status: 'PAID'
    }

    // Mock the transaction callback internals
    ;(prisma.$transaction as any).mockImplementation(async (callback: any) => {
      const txMock = {
        invoice: {
          findUnique: mock().mockResolvedValue({ id: mockExternalId, totalAmount: 1500000 }),
          update: mock().mockResolvedValue({})
        },
        payment: {
          findFirst: mock().mockResolvedValue({ id: 'pay_123', status: 'PENDING' }),
          update: mock().mockResolvedValue({})
        }
      }
      await callback(txMock)
      
      // Assert inside the mock implementation since txMock is local here
      expect(txMock.payment.update).toHaveBeenCalledWith({
        where: { id: 'pay_123' },
        data: { status: 'SUCCESS' }
      })
      
      expect(txMock.invoice.update).toHaveBeenCalledWith({
        where: { id: mockExternalId },
        data: {
          status: 'PAID',
          paidAmount: 1500000
        }
      })
    })

    // 2. Act
    await paymentService.handleXenditWebhook(webhookPayload)

    // 3. Assert
    expect(prisma.$transaction).toHaveBeenCalled()
  })

  it('should process webhook and set Payment to FAILED if status is EXPIRED', async () => {
    // 1. Arrange
    const mockExternalId = 'inv_123'
    const webhookPayload = {
      external_id: mockExternalId,
      status: 'EXPIRED'
    }

    // 2. Act
    await paymentService.handleXenditWebhook(webhookPayload)

    // 3. Assert
    expect(prisma.payment.updateMany).toHaveBeenCalledWith({
      where: { invoiceId: mockExternalId, status: 'PENDING' },
      data: { status: 'FAILED' }
    })
  })
})
