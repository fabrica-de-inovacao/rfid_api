import { Request, Response } from "express";
import { AuthService } from "../services/authService";
import { AuthenticatedRequest } from "../types";

export class AuthController {
  private authService = new AuthService();

  login = async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await this.authService.login(req.body);
      res.status(200).json(result);
    } catch (error) {
      res.status(401).json({
        message:
          error instanceof Error ? error.message : "Erro de autenticação",
      });
    }
  };

  me = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user) {
        res.status(401).json({ message: "Utilizador não autenticado" });
        return;
      }

      const user = await this.authService.getCurrentUser(req.user.id);
      res.status(200).json(user);
    } catch (error) {
      res.status(404).json({
        message:
          error instanceof Error ? error.message : "Utilizador não encontrado",
      });
    }
  };

  refreshToken = async (req: Request, res: Response): Promise<void> => {
    try {
      const { refreshToken } = req.body;

      if (!refreshToken) {
        res.status(400).json({ message: "Refresh token é obrigatório" });
        return;
      }

      const result = await this.authService.refreshToken(refreshToken);
      res.status(200).json(result);
    } catch (error) {
      res.status(401).json({
        message:
          error instanceof Error ? error.message : "Refresh token inválido",
      });
    }
  };

  logout = async (req: Request, res: Response): Promise<void> => {
    try {
      const { refreshToken } = req.body;

      if (refreshToken) {
        await this.authService.logout(refreshToken);
      }

      res.status(200).json({ message: "Logout realizado com sucesso" });
    } catch (error) {
      res.status(500).json({
        message:
          error instanceof Error ? error.message : "Erro interno do servidor",
      });
    }
  };
}
