import { Request, Response } from "express";
import { UserService } from "../services/userService";
import { AuthenticatedRequest } from "../types";

export class UserController {
  private userService = new UserService();

  createUser = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const user = await this.userService.createUser(req.body);
      res.status(201).json(user);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes("já está em uso")) {
          res.status(409).json({ message: error.message });
          return;
        }
      }
      res.status(400).json({
        message:
          error instanceof Error ? error.message : "Erro ao criar utilizador",
      });
    }
  };

  getAllUsers = async (
    req: AuthenticatedRequest,
    res: Response
  ): Promise<void> => {
    try {
      const users = await this.userService.getAllUsers();
      res.status(200).json(users);
    } catch (error) {
      res.status(500).json({
        message:
          error instanceof Error ? error.message : "Erro interno do servidor",
      });
    }
  };

  getUserById = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const user = await this.userService.getUserById(id);
      res.status(200).json(user);
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "Utilizador não encontrado"
      ) {
        res.status(404).json({ message: error.message });
        return;
      }
      res.status(500).json({
        message:
          error instanceof Error ? error.message : "Erro interno do servidor",
      });
    }
  };

  updateUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const user = await this.userService.updateUser(id, req.body);
      res.status(200).json(user);
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === "Utilizador não encontrado") {
          res.status(404).json({ message: error.message });
          return;
        }
        if (error.message.includes("já está em uso")) {
          res.status(409).json({ message: error.message });
          return;
        }
      }
      res.status(400).json({
        message:
          error instanceof Error
            ? error.message
            : "Erro ao atualizar utilizador",
      });
    }
  };

  deactivateUser = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      await this.userService.deactivateUser(id);
      res.status(204).send();
    } catch (error) {
      if (
        error instanceof Error &&
        error.message === "Utilizador não encontrado"
      ) {
        res.status(404).json({ message: error.message });
        return;
      }
      res.status(500).json({
        message:
          error instanceof Error ? error.message : "Erro interno do servidor",
      });
    }
  };
}
