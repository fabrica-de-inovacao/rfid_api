import { PrismaClient } from "@prisma/client";
import { PasswordUtils } from "./src/utils/password";

const prisma = new PrismaClient();

async function debugUser() {
  try {
    const user = await prisma.users.findUnique({
      where: { email: "master@exemplo.com" },
    });

    if (user) {
      console.log("Usuário encontrado:");
      console.log({
        id: user.id,
        email: user.email,
        name: user.name,
        admin: user.admin,
        status: user.status,
        senha_hash: user.senha.substring(0, 20) + "...",
      });

      // Testar se a senha está correta
      const isValid = await PasswordUtils.comparePassword(
        "teste1234",
        user.senha
      );
      console.log("Senha válida:", isValid);
    } else {
      console.log("Usuário não encontrado");
    }
  } catch (error) {
    console.error("Erro:", error);
  } finally {
    await prisma.$disconnect();
  }
}

debugUser();
