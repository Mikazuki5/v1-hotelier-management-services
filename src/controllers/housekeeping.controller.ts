import { Context } from 'hono'
import { housekeepingService } from '../services/housekeeping.service'
import { getPaginationParams, formatPaginatedResponse } from '../utils/pagination'

export const getAllTasks = async (c: Context) => {
  try {
    const { page, limit, skip, take } = getPaginationParams(c)
    const { data, totalItems } = await housekeepingService.getAllTasks(skip, take)
    return c.json(formatPaginatedResponse(data, totalItems, page, limit))
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500)
  }
}

export const getTaskById = async (c: Context) => {
  try {
    const id = c.req.param('id') as string
    const task = await housekeepingService.getTaskById(id)
    if (!task) {
      return c.json({ success: false, message: 'Task not found' }, 404)
    }
    return c.json({ success: true, data: task })
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500)
  }
}

export const createTask = async (c: Context) => {
  try {
    const body = await c.req.json()

    if (!body.roomId || !body.assignedTo || !body.taskType) {
      return c.json({ success: false, message: 'Missing required fields' }, 400)
    }

    const task = await housekeepingService.createTask(body)
    return c.json({ success: true, data: task }, 201)
  } catch (error: any) {
    if (error.message.includes('not found')) {
      return c.json({ success: false, message: error.message }, 404)
    }
    return c.json({ success: false, message: error.message }, 500)
  }
}

export const updateTaskStatus = async (c: Context) => {
  try {
    const id = c.req.param('id') as string
    const body = await c.req.json()

    if (!body.status) {
      return c.json({ success: false, message: 'Missing status field' }, 400)
    }

    const task = await housekeepingService.updateTaskStatus(id, body.status, body.notes)
    return c.json({ success: true, data: task })
  } catch (error: any) {
    if (error.message === 'Task not found') {
      return c.json({ success: false, message: error.message }, 404)
    }
    return c.json({ success: false, message: error.message }, 500)
  }
}
