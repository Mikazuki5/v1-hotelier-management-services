import { Context } from 'hono'
import { userService, UpdateUserDTO } from '../services/user.service'
import { getPaginationParams, formatPaginatedResponse } from '../utils/pagination'

export const getAllUsers = async (c: Context) => {
  try {
    const { page, limit, skip, take } = getPaginationParams(c)
    const { data, totalItems } = await userService.getAllUsers(skip, take)
    return c.json(formatPaginatedResponse(data, totalItems, page, limit))
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500)
  }
}

export const getUserById = async (c: Context) => {
  try {
    const id = c.req.param('id') as string;
    const user = await userService.getUserById(id)
    if (!user) {
      return c.json({ success: false, message: 'User not found' }, 404)
    }
    return c.json({ success: true, data: user })
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500)
  }
}

export const updateUser = async (c: Context) => {
  try {
    const id = c.req.param('id') as string;
    const body = c.req.valid('json' as never) as UpdateUserDTO
    const updatedUser = await userService.updateUser(id, body)
    return c.json({ success: true, data: updatedUser })
  } catch (error: any) {
    if (error.message === 'User not found') {
      return c.json({ success: false, message: error.message }, 404)
    }
    return c.json({ success: false, message: error.message }, 500)
  }
}

export const deleteUser = async (c: Context) => {
  try {
    const id = c.req.param('id') as string;
    await userService.deleteUser(id)
    return c.json({ success: true, message: 'User deleted successfully' })
  } catch (error: any) {
    if (error.message === 'User not found') {
      return c.json({ success: false, message: error.message }, 404)
    }
    return c.json({ success: false, message: error.message }, 500)
  }
}
