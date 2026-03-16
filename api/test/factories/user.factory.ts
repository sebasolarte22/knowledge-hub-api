import { prisma } from '../utils/prisma-test-client'
import bcrypt from 'bcrypt'

export async function createTestUser() {

  const password = await bcrypt.hash('123456', 10)

  return prisma.user.create({
    data: {
      email: `test-${Date.now()}@test.com`,
      password,
    }
  })

}