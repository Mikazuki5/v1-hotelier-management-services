import { Hono } from 'hono'
import {
  getAllInvoices,
  getInvoiceById,
  addInvoiceItem,
  removeInvoiceItem,
} from '../controllers/invoice.controller'
import { authMiddleware, requireRole } from '../middlewares/auth'

const invoiceRouter = new Hono()

invoiceRouter.use('*', authMiddleware, requireRole(['ADMIN', 'MANAGER', 'RECEPTIONIST', 'ACCOUNTANT']))

invoiceRouter.get('/', getAllInvoices)
invoiceRouter.get('/:id', getInvoiceById)
invoiceRouter.post('/:id/items', addInvoiceItem)
invoiceRouter.delete('/:id/items/:itemId', removeInvoiceItem)

export default invoiceRouter
