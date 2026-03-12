import { Injectable, Logger, NotFoundException } from '@nestjs/common'
import { CreateUserDto } from './dto/create-user.dto'
import { UpdateUserDto } from './dto/update-user.dto'
import { PrismaService } from '../prisma/prisma.service'

@Injectable()
export class UsersService {

  private readonly logger = new Logger(UsersService.name)

  constructor(private prisma: PrismaService) {}

  create(createUserDto: CreateUserDto) {

    this.logger.log(`Creating user with email ${createUserDto.email}`)

    return this.prisma.user.create({
      data: {
        email: createUserDto.email,
        password: createUserDto.password
      }
    })

  }

  findAll() {

    this.logger.log('Fetching all users')

    return this.prisma.user.findMany()

  }

  findOne(id: number) {

    this.logger.log(`Fetching user ${id}`)

    const user = this.prisma.user.findUnique({
      where: { id }
    })

    if (!user) {
      this.logger.warn(`User ${id} not found`)
      throw new NotFoundException('User not found')
    }

    return user

  }

  update(id: number, updateUserDto: UpdateUserDto) {

    this.logger.log(`Updating user ${id}`)

    return this.prisma.user.update({
      where: { id },
      data: updateUserDto
    })

  }

  remove(id: number) {

    this.logger.warn(`Deleting user ${id}`)

    return this.prisma.user.delete({
      where: { id }
    })

  }

}