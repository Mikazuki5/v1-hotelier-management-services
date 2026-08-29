import { Hono } from 'hono'
import {
  getAllItems,
  getItemById,
  createItem,
  addInventoryLog,
} from '../controllers/inventory.controller'
import { authMiddleware, requireRole } from '../middlewares/auth'

const inventoryRouter = new Hono()

inventoryRouter.use('*', authMiddleware, requireRole(['ADMIN', 'MANAGER', 'HOUSEKEEPER']))

inventoryRouter.get('/', getAllItems)
inventoryRouter.get('/:id', getItemById)
inventoryRouter.post('/', createItem)
inventoryRouter.post('/:id/logs', addInventoryLog)

export default inventoryRouter
