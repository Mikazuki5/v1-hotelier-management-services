import prisma from '../config/db'
import { sign, verify } from 'hono/jwt'

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-for-development-only'
const REFRESH_JWT_SECRET = process.env.REFRESH_JWT_SECRET || 'refresh-super-secret-key'

export class AuthService {
  async register(data: any) {
    const existing = await prisma.user.findUnique({
      where: { email: data.email },
    })

    if (existing) {
      throw new Error('Email already registered')
    }

    const hashedPassword = await Bun.password.hash(data.password)

    const user = await prisma.user.create({
      data: {
        employeeId: data.employeeId,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phoneNumber: data.phoneNumber,
        passwordHash: hashedPassword,
        department: data.department,
        shift: data.shift,
        role: data.role || 'RECEPTIONIST',
      },
      select: {
        id: true,
        employeeId: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        department: true,
        shift: true,
        createdAt: true,
      }
    })

    return user
  }

  async login(data: any) {
    const user = await prisma.user.findUnique({
      where: { email: data.email },
    })

    if (!user || !user.isActive || user.deletedAt) {
      throw new Error('Invalid email or password')
    }

    const isMatch = await Bun.password.verify(data.password, user.passwordHash)
    if (!isMatch) {
      throw new Error('Invalid email or password')
    }

    const token = await sign({
      sub: user.id,
      email: user.email,
      role: user.role,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 
    }, JWT_SECRET)

    const refreshToken = await sign({
      sub: user.id,
      exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7 
    }, REFRESH_JWT_SECRET)

    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() }
    })

    return {
      user: {
        id: user.id,
        employeeId: user.employeeId,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        department: user.department,
      },
      token,
      refreshToken
    }
  }

  async refreshToken(refreshTokenString: string) {
    try {
      const payload = await verify(refreshTokenString, REFRESH_JWT_SECRET, 'HS256')
      const userId = payload.sub as string
      
      const user = await prisma.user.findUnique({
        where: { id: userId }
      })

      if (!user || !user.isActive || user.deletedAt) {
        throw new Error('User not found or inactive')
      }

      const token = await sign({
        sub: user.id,
        email: user.email,
        role: user.role,
        exp: Math.floor(Date.now() / 1000) + 60 * 60 
      }, JWT_SECRET)

      const newRefreshToken = await sign({
        sub: user.id,
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7 
      }, REFRESH_JWT_SECRET)

      return {
        token,
        refreshToken: newRefreshToken
      }
    } catch (error) {
      throw new Error('Invalid or expired refresh token')
    }
  }
}

export const authService = new AuthService()
