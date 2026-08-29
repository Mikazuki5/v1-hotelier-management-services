import { Context } from 'hono'
import { dashboardService, TimeFilter } from '../services/dashboard.service'

export const getDashboardMetrics = async (c: Context) => {
  try {
    const filter = c.req.query('filter') as TimeFilter | undefined
    const validFilters: TimeFilter[] = ['day', 'week', 'month', 'year', 'all']

    const selectedFilter = filter && validFilters.includes(filter) ? filter : 'month'

    const user = c.get('user')
    if (!user) {
      return c.json({ success: false, message: 'Unauthorized' }, 401)
    }

    const metrics = await dashboardService.getDashboardMetrics(selectedFilter, user.role)
    
    return c.json({ success: true, data: metrics })
  } catch (error: any) {
    return c.json({ success: false, message: error.message }, 500)
  }
}
