const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function main() {
  console.log('관리자 비밀번호 업데이트 시작...')
  
  const username = 'cyjkyle'
  const password = 'cyjkyle1234'
  
  const hashedPassword = await bcrypt.hash(password, 10)
  console.log('비밀번호 해시 생성 완료')
  
  const user = await prisma.user.upsert({
    where: { username },
    update: {
      password: hashedPassword,
      isActive: true,
    },
    create: {
      username,
      password: hashedPassword,
      name: '관리자',
      role: 'SUPER_ADMIN',
      isActive: true,
    },
  })
  
  console.log('관리자 계정 업데이트 완료:', {
    id: user.id,
    username: user.username,
    role: user.role,
    isActive: user.isActive,
  })
}

main()
  .catch((e) => {
    console.error('오류 발생:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
