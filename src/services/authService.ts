import { db } from "../config/database";
import { PasswordUtils } from "../utils/password";
import { JwtUtils } from "../utils/jwt";
import { LoginCredentials, TokenPayload } from "../types";
import { ActivityLogger } from "./activityLogService";

export class AuthService {
  async login(credentials: LoginCredentials) {
    const { email, senha } = credentials;

    // Buscar utilizador por email
    const user = await db.users.findUnique({
      where: { email },
    });

    if (!user) {
      throw new Error("E-mail ou senha incorretos");
    }

    if (user.status !== "ativo") {
      throw new Error("Utilizador inativo");
    }

    // Verificar senha
    const isPasswordValid = await PasswordUtils.comparePassword(
      senha,
      user.senha
    );
    if (!isPasswordValid) {
      throw new Error("E-mail ou senha incorretos");
    }

    // Gerar tokens
    const tokenPayload: TokenPayload = {
      userId: user.id,
      email: user.email,
      admin: user.admin || false,
    };

    const accessToken = JwtUtils.generateAccessToken(tokenPayload);
    const refreshToken = JwtUtils.generateRefreshToken(tokenPayload);

    // Salvar refresh token na base de dados
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 dias

    await db.refresh_tokens.create({
      data: {
        user_id: user.id,
        refresh_token: refreshToken,
        created_at: new Date(),
        expires_at: expiresAt,
      },
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        admin: user.admin || false,
      },
    };
  }

  async getCurrentUser(userId: string) {
    const user = await db.users.findUnique({
      where: { id: userId },
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

  async refreshToken(refreshToken: string) {
    // Verificar se o refresh token existe na base de dados
    const tokenRecord = await db.refresh_tokens.findUnique({
      where: { refresh_token: refreshToken },
      include: {
        users: true,
      },
    });

    if (!tokenRecord) {
      throw new Error("Refresh token inválido");
    }

    // Verificar se não expirou
    if (tokenRecord.expires_at < new Date()) {
      // Remover token expirado
      await db.refresh_tokens.delete({
        where: { id: tokenRecord.id },
      });
      throw new Error("Refresh token expirado");
    }

    // Verificar se o utilizador ainda está ativo
    if (tokenRecord.users.status !== "ativo") {
      throw new Error("Utilizador inativo");
    }

    // Gerar novo access token
    const tokenPayload: TokenPayload = {
      userId: tokenRecord.users.id,
      email: tokenRecord.users.email,
      admin: tokenRecord.users.admin || false,
    };

    const newAccessToken = JwtUtils.generateAccessToken(tokenPayload);

    return {
      accessToken: newAccessToken,
    };
  }

  async logout(refreshToken: string) {
    // Remover refresh token da base de dados
    await db.refresh_tokens.deleteMany({
      where: { refresh_token: refreshToken },
    });
  }
}
