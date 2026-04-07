import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  const email    = process.argv[2]
  const password = process.argv[3]
  const name     = process.argv[4] ?? 'Super Admin'

  if (!email || !password) {
    console.error('Uso: npx ts-node scripts/create-super-admin.ts <email> <senha> [nome]')
    process.exit(1)
  }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    console.error('Erro: já existe um usuário com este email.')
    process.exit(1)
  }

  const hashed = await bcrypt.hash(password, 12)
  const user = await prisma.user.create({
    data: { name, email, passwordHash: hashed, role: 'SUPER_ADMIN' }
  })

  console.log(`✅ Super Admin criado: ${user.name} (${user.email})`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
