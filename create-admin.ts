import { PrismaClient } from "@prisma/client";
import { PasswordUtils } from "./src/utils/password";

const prisma = new PrismaClient();

async function createAdminUser() {
  try {
    // Verificar se já existe um usuário admin
    const existingAdmin = await prisma.users.findFirst({
      where: { email: "master@exemplo.com" },
    });

    if (existingAdmin) {
      console.log("Usuário admin já existe, atualizando senha...");
      // Atualizar a senha com o hash correto
      const hashedPassword = await PasswordUtils.hashPassword("teste1234");
      await prisma.users.update({
        where: { email: "master@exemplo.com" },
        data: { senha: hashedPassword },
      });
      console.log("Senha atualizada com sucesso!");
      return;
    }

    // Hash da senha usando a utility correta
    const hashedPassword = await PasswordUtils.hashPassword("teste1234");

    // Criar usuário admin
    const admin = await prisma.users.create({
      data: {
        name: "Administrador do Sistema",
        email: "master@exemplo.com",
        cpf: "00000000000",
        setor: "TI",
        admin: true,
        senha: hashedPassword,
        status: "ativo",
      },
    });

    console.log("Usuário admin criado com sucesso:");
    console.log({
      email: admin.email,
      name: admin.name,
      admin: admin.admin,
    });
  } catch (error) {
    console.error("Erro ao criar usuário admin:", error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdminUser();
