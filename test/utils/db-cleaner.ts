import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

export async function cleanDatabase() {

  await prisma.favorite.deleteMany()

  await prisma.resource.deleteMany()

  await prisma.category.deleteMany()

  await prisma.refreshToken.deleteMany()

  await prisma.session.deleteMany()

  await prisma.user.deleteMany()

}