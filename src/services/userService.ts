import { db } from "../config/database";
import { PasswordUtils } from "../utils/password";
import { CreateUserData, UpdateUserData } from "../types";

export class UserService {
  async createUser(userData: CreateUserData) {
    const { senha, ...otherData } = userData;

    // Verificar se email ou CPF já existem
    const existingUser = await db.users.findFirst({
      where: {
        OR: [{ email: userData.email }, { cpf: userData.cpf }],
      },
    });

    if (existingUser) {
      if (existingUser.email === userData.email) {
        throw new Error("E-mail já está em uso");
      }
      if (existingUser.cpf === userData.cpf) {
        throw new Error("CPF já está em uso");
      }
    }

    // Hash da senha
    const hashedPassword = await PasswordUtils.hashPassword(senha);

    // Criar utilizador
    const user = await db.users.create({
      data: {
        ...otherData,
        senha: hashedPassword,
      },
      select: {
        id: true,
        name: true,
        email: true,
        cpf: true,
        setor: true,
        admin: true,
        status: true,
        tag_id: true,
      },
    });

    return user;
  }

  async getAllUsers() {
    const users = await db.users.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        cpf: true,
        setor: true,
        admin: true,
        status: true,
        tag_id: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    return users;
  }

  async getUserById(id: string) {
    const user = await db.users.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        cpf: true,
        setor: true,
        admin: true,
        status: true,
        tag_id: true,
      },
    });

    if (!user) {
      throw new Error("Utilizador não encontrado");
    }

    return user;
  }

  async updateUser(id: string, userData: UpdateUserData) {
    // Verificar se o utilizador existe
    const existingUser = await db.users.findUnique({
      where: { id },
    });

    if (!existingUser) {
      throw new Error("Utilizador não encontrado");
    }

    // Verificar conflitos de email ou CPF se estão sendo atualizados
    if (userData.email || userData.cpf) {
      const conflicts = await db.users.findFirst({
        where: {
          AND: [
            { id: { not: id } }, // Excluir o próprio utilizador
            {
              OR: [
                ...(userData.email ? [{ email: userData.email }] : []),
                ...(userData.cpf ? [{ cpf: userData.cpf }] : []),
              ],
            },
          ],
        },
      });

      if (conflicts) {
        if (conflicts.email === userData.email) {
          throw new Error("E-mail já está em uso");
        }
        if (conflicts.cpf === userData.cpf) {
          throw new Error("CPF já está em uso");
        }
      }
    }

    // Atualizar utilizador
    const updatedUser = await db.users.update({
      where: { id },
      data: userData,
      select: {
        id: true,
        name: true,
        email: true,
        cpf: true,
        setor: true,
        admin: true,
        status: true,
        tag_id: true,
      },
    });

    return updatedUser;
  }

  async deactivateUser(id: string) {
    const user = await db.users.findUnique({
      where: { id },
    });

    if (!user) {
      throw new Error("Utilizador não encontrado");
    }

    await db.users.update({
      where: { id },
      data: { status: "inativo" },
    });

    // Remover todos os refresh tokens do utilizador
    await db.refresh_tokens.deleteMany({
      where: { user_id: id },
    });
  }
}
