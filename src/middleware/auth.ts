import { Request, Response, NextFunction } from "express";
import { JwtUtils } from "../utils/jwt";
import { db } from "../config/database";
import { AuthenticatedRequest } from "../types";

export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const token = JwtUtils.extractTokenFromHeader(req.headers.authorization);
    const payload = JwtUtils.verifyAccessToken(token);

    // Buscar dados completos do utilizador
    const user = await db.users.findUnique({
      where: { id: payload.userId },
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
      res.status(401).json({ message: "Utilizador não encontrado" });
      return;
    }

    if (user.status !== "ativo") {
      res.status(401).json({ message: "Utilizador inativo" });
      return;
    }

    req.user = {
      ...user,
      admin: user.admin || false,
    };
    next();
  } catch (error) {
    res.status(401).json({ message: "Token inválido ou expirado" });
  }
};

export const requireAdmin = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!req.user?.admin) {
    res.status(403).json({
      message: "Acesso negado. Privilégios de administrador necessários.",
    });
    return;
  }
  next();
};
