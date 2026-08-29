import { Context } from 'hono'

export interface PaginationParams {
  page: number
  limit: number
  skip: number
  take: number
}

export interface PaginatedResult<T> {
  success: boolean
  message?: string
  data: T[]
  meta: {
    page: number
    limit: number
    totalItems: number
    totalPages: number
  }
}

export const getPaginationParams = (c: Context): PaginationParams => {
  const pageParam = c.req.query('page')
  const limitParam = c.req.query('limit')

  const page = pageParam ? Math.max(1, parseInt(pageParam, 10) || 1) : 1
  const limit = limitParam ? Math.max(1, parseInt(limitParam, 10) || 10) : 10

  const skip = (page - 1) * limit
  const take = limit

  return { page, limit, skip, take }
}

export const formatPaginatedResponse = <T>(
  data: T[],
  totalItems: number,
  page: number,
  limit: number,
  message: string = 'Data retrieved successfully'
): PaginatedResult<T> => {
  return {
    success: true,
    message,
    data,
    meta: {
      page,
      limit,
      totalItems,
      totalPages: Math.ceil(totalItems / limit)
    }
  }
}
