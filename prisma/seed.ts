import prisma from '../src/config/db'
import { authService } from '../src/services/auth.service'
import { guestService } from '../src/services/guest.service'
import { reservationService } from '../src/services/reservation.service'
import { invoiceService } from '../src/services/invoice.service'
import { paymentService } from '../src/services/payment.service'
import { housekeepingService } from '../src/services/housekeeping.service'
import { inventoryService } from '../src/services/inventory.service'

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

async function main() {
  console.log('Seeding database with 10 records...')

  // 1. Clear existing data
  console.log('Cleaning up old data...')
  await prisma.inventoryLog.deleteMany()
  await prisma.inventoryItem.deleteMany()
  await prisma.housekeepingTask.deleteMany()
  await prisma.payment.deleteMany()
  await prisma.invoiceItem.deleteMany()
  await prisma.invoice.deleteMany()
  await prisma.reservation.deleteMany()
  await prisma.room.deleteMany()
  await prisma.roomType.deleteMany()
  await prisma.guest.deleteMany()
  await prisma.user.deleteMany()

  // 2. Create Admin User
  console.log('Creating Admin User...')
  const admin = await authService.register({
    email: 'admin@hotel.com',
    password: 'SecurePassword123!',
    employeeId: 'EMP001',
    firstName: 'Super',
    lastName: 'Admin',
    phoneNumber: '081234567890',
    department: 'Management',
    shift: 'MORNING',
    role: 'ADMIN'
  })
  await delay(200)

  // 3. Create Room Types
  console.log('Creating Room Types...')
  const roomTypes = []
  for (let i = 1; i <= 2; i++) {
    const rt = await prisma.roomType.create({
      data: {
        name: `Type ${i} Suite`,
        description: `Luxurious Type ${i} Room`,
        basePrice: 500000 * i,
        capacity: 2,
        maxExtraBeds: 1
      }
    })
    roomTypes.push(rt)
  }
  await delay(200)

  // 4. Create 10 Rooms
  console.log('Creating 10 Rooms...')
  const rooms = []
  let roomCounter = 101
  for (const rt of roomTypes) {
    for (let i = 0; i < 5; i++) {
      const room = await prisma.room.create({
        data: {
          roomNumber: `${roomCounter++}`,
          floorNumber: Math.floor(roomCounter / 100),
          roomTypeId: rt.id,
          status: 'AVAILABLE'
        }
      })
      rooms.push(room)
      await delay(50)
    }
  }

  // 5. Create 10 Guests
  console.log('Creating 10 Guests...')
  const guests = []
  for (let i = 1; i <= 10; i++) {
    const guest = await guestService.createGuest({
      identityType: 'KTP',
      identityNumber: `320101${100000 + i}`,
      firstName: `GuestName${i}`,
      lastName: `LastName${i}`,
      email: `guest${i}@example.com`,
      phoneNumber: `08123456${i.toString().padStart(3, '0')}`,
      address: `Jl. Random Address No ${i}`
    })
    guests.push(guest)
    await delay(50)
  }

  // 6. Create 10 Reservations
  console.log('Creating 10 Reservations & Auto Invoices...')
  const reservations = []
  const today = new Date()
  for (let i = 0; i < 10; i++) {
    const checkIn = new Date(today)
    checkIn.setDate(today.getDate() + 1 + (i % 10))
    const checkOut = new Date(checkIn)
    checkOut.setDate(checkIn.getDate() + 2)

    const reservation = await reservationService.createReservation({
      guestId: guests[i].id,
      roomId: rooms[i].id,
      expectedCheckIn: checkIn,
      expectedCheckOut: checkOut,
      adultCount: 2,
      childCount: 0,
      bookingSource: 'WALK_IN',
      createdBy: admin.id
    })
    reservations.push(reservation)
    await delay(100)
  }

  // 7. Add extra InvoiceItems and Process Payments for 10 reservations
  console.log('Processing Payments for 10 reservations...')
  for (let i = 0; i < 10; i++) {
    const res = await reservationService.getReservationById(reservations[i].id)
    if (!res || !res.invoice) continue

    await invoiceService.addInvoiceItem(res.invoice.id, {
      itemType: 'FNB_RESTAURANT',
      description: 'Room Service Dinner',
      amount: 150000,
      quantity: 1
    })
    await delay(50)

    const updatedInvoice = await invoiceService.getInvoiceById(res.invoice.id)
    if (!updatedInvoice) continue

    // For half of them, simulate a Xendit Virtual Account payment
    if (i % 2 === 0) {
      await prisma.payment.create({
        data: {
          invoiceId: res.invoice.id,
          paymentMethod: 'OTA_VIRTUAL',
          amount: Number(updatedInvoice.totalAmount),
          referenceCode: `xnd_dummy_invoice_${i}`,
          handledBy: admin.id,
          status: 'PENDING'
        }
      })
    } else {
      await paymentService.processPayment({
        invoiceId: res.invoice.id,
        paymentMethod: 'CREDIT_CARD',
        amount: Number(updatedInvoice.totalAmount),
        referenceCode: `CC-REF-${i}`,
        handledBy: admin.id
      })
    }
    await delay(100)
  }

  // 8. Create Housekeeping Tasks for 10 rooms
  console.log('Creating 10 Housekeeping Tasks...')
  for (let i = 0; i < 10; i++) {
    await housekeepingService.createTask({
      roomId: rooms[i].id,
      assignedTo: admin.id,
      taskType: 'DAILY_CLEANING',
      notes: 'Standard daily cleaning'
    })
    await delay(50)
  }

  // 9. Create Inventory Items and Logs
  console.log('Creating Inventory Items & Logs...')
  const invItem1 = await inventoryService.createItem({
    skuCode: 'AMN-SOAP-001',
    name: 'Luxury Bath Soap',
    category: 'AMENITIES',
    unitType: 'PCS',
    minimumStock: 50
  })
  await delay(100)

  await inventoryService.addInventoryLog({
    itemId: invItem1.id,
    actionType: 'STOCK_IN',
    quantity: 500,
    notes: 'Initial stock purchase',
    handledBy: admin.id
  })
  await delay(100)

  await inventoryService.addInventoryLog({
    itemId: invItem1.id,
    actionType: 'STOCK_OUT',
    quantity: 10,
    notes: 'Distributed to floors',
    handledBy: admin.id
  })

  console.log('Seeding completed successfully! 🚀')
}

main()
  .catch((e) => {
    console.error('Seeding error:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
