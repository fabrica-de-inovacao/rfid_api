import { Request, Response } from "express";
import { SafekeepingService } from "../services/safekeepingService";
import { AuthenticatedRequest } from "../types";
import {
  createSafekeepingSchema,
  updateSafekeepingSchema,
  uuidParamSchema,
} from "../validation/schemas";
import { z } from "zod";

const safekeepingService = new SafekeepingService();

export class SafekeepingController {
  /**
   * @swagger
   * /api/v1/safekeepings:
   *   post:
   *     tags:
   *       - Safekeepings
   *     summary: Criar nova custódia
   *     security:
   *       - bearerAuth: []
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required:
   *               - name
   *             properties:
   *               name:
   *                 type: string
   *                 description: Nome da custódia
   *               manager_id:
   *                 type: string
   *                 format: uuid
   *                 description: ID do gestor da custódia
   *     responses:
   *       201:
   *         description: Custódia criada com sucesso
   *       400:
   *         description: Dados inválidos
   *       401:
   *         description: Não autorizado
   *       403:
   *         description: Acesso negado - apenas administradores
   */
  async createSafekeeping(req: AuthenticatedRequest, res: Response) {
    try {
      const validatedData = createSafekeepingSchema.parse(req.body);
      const safekeeping = await safekeepingService.createSafekeeping(
        validatedData
      );

      return res.status(201).json({
        success: true,
        message: "Custódia criada com sucesso",
        data: safekeeping,
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: "Dados inválidos",
          errors: error.errors.map((err) => ({
            field: err.path.join("."),
            message: err.message,
          })),
        });
      }

      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * @swagger
   * /api/v1/safekeepings:
   *   get:
   *     tags:
   *       - Safekeepings
   *     summary: Listar todas as custódias
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: query
   *         name: page
   *         schema:
   *           type: integer
   *           minimum: 1
   *           default: 1
   *         description: Número da página
   *       - in: query
   *         name: limit
   *         schema:
   *           type: integer
   *           minimum: 1
   *           maximum: 100
   *           default: 10
   *         description: Itens por página
   *       - in: query
   *         name: search
   *         schema:
   *           type: string
   *         description: Termo de busca para filtrar por nome
   *     responses:
   *       200:
   *         description: Lista de custódias
   *       401:
   *         description: Não autorizado
   */
  async getAllSafekeepings(req: Request, res: Response) {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const search = req.query.search as string;

      const result = await safekeepingService.getAllSafekeepings(
        page,
        limit,
        search
      );

      return res.json({
        success: true,
        data: result.safekeepings,
        pagination: result.pagination,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * @swagger
   * /api/v1/safekeepings/{id}:
   *   get:
   *     tags:
   *       - Safekeepings
   *     summary: Obter custódia por ID
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: ID da custódia
   *     responses:
   *       200:
   *         description: Detalhes da custódia
   *       401:
   *         description: Não autorizado
   *       404:
   *         description: Custódia não encontrada
   */
  async getSafekeepingById(req: Request, res: Response) {
    try {
      const { id } = uuidParamSchema.parse(req.params);
      const safekeeping = await safekeepingService.getSafekeepingById(id);

      return res.json({
        success: true,
        data: safekeeping,
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: "ID inválido",
          errors: error.errors.map((err) => ({
            field: err.path.join("."),
            message: err.message,
          })),
        });
      }

      return res.status(404).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * @swagger
   * /api/v1/safekeepings/{id}:
   *   put:
   *     tags:
   *       - Safekeepings
   *     summary: Atualizar custódia
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: ID da custódia
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               name:
   *                 type: string
   *                 description: Nome da custódia
   *               manager_id:
   *                 type: string
   *                 format: uuid
   *                 description: ID do gestor da custódia
   *     responses:
   *       200:
   *         description: Custódia atualizada com sucesso
   *       400:
   *         description: Dados inválidos
   *       401:
   *         description: Não autorizado
   *       403:
   *         description: Acesso negado - apenas administradores
   *       404:
   *         description: Custódia não encontrada
   */
  async updateSafekeeping(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = uuidParamSchema.parse(req.params);
      const validatedData = updateSafekeepingSchema.parse(req.body);

      const safekeeping = await safekeepingService.updateSafekeeping(
        id,
        validatedData
      );

      return res.json({
        success: true,
        message: "Custódia atualizada com sucesso",
        data: safekeeping,
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: "Dados inválidos",
          errors: error.errors.map((err) => ({
            field: err.path.join("."),
            message: err.message,
          })),
        });
      }

      if (error.message.includes("não encontrada")) {
        return res.status(404).json({
          success: false,
          message: error.message,
        });
      }

      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * @swagger
   * /api/v1/safekeepings/{id}:
   *   delete:
   *     tags:
   *       - Safekeepings
   *     summary: Deletar custódia
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: ID da custódia
   *     responses:
   *       200:
   *         description: Custódia deletada com sucesso
   *       400:
   *         description: Não é possível deletar custódia com dados vinculados
   *       401:
   *         description: Não autorizado
   *       403:
   *         description: Acesso negado - apenas administradores
   *       404:
   *         description: Custódia não encontrada
   */
  async deleteSafekeeping(req: AuthenticatedRequest, res: Response) {
    try {
      const { id } = uuidParamSchema.parse(req.params);
      const result = await safekeepingService.deleteSafekeeping(id);

      return res.json({
        success: true,
        message: result.message,
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: "ID inválido",
          errors: error.errors.map((err) => ({
            field: err.path.join("."),
            message: err.message,
          })),
        });
      }

      if (error.message.includes("não encontrada")) {
        return res.status(404).json({
          success: false,
          message: error.message,
        });
      }

      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * @swagger
   * /api/v1/safekeepings/{id}/users/{userId}:
   *   post:
   *     tags:
   *       - Safekeepings
   *     summary: Adicionar usuário à custódia
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: ID da custódia
   *       - in: path
   *         name: userId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: ID do usuário
   *     responses:
   *       201:
   *         description: Usuário adicionado à custódia com sucesso
   *       400:
   *         description: Dados inválidos
   *       401:
   *         description: Não autorizado
   *       403:
   *         description: Acesso negado - apenas administradores
   *       404:
   *         description: Custódia ou usuário não encontrado
   */
  async addUserToSafekeeping(req: AuthenticatedRequest, res: Response) {
    try {
      const safekeepingId = uuidParamSchema.parse({ id: req.params.id }).id;
      const userId = uuidParamSchema.parse({ id: req.params.userId }).id;

      const result = await safekeepingService.addUserToSafekeeping(
        safekeepingId,
        userId
      );

      return res.status(201).json({
        success: true,
        message: "Usuário adicionado à custódia com sucesso",
        data: result,
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: "IDs inválidos",
          errors: error.errors.map((err) => ({
            field: err.path.join("."),
            message: err.message,
          })),
        });
      }

      if (
        error.message.includes("não encontrada") ||
        error.message.includes("não encontrado")
      ) {
        return res.status(404).json({
          success: false,
          message: error.message,
        });
      }

      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * @swagger
   * /api/v1/safekeepings/{id}/users/{userId}:
   *   delete:
   *     tags:
   *       - Safekeepings
   *     summary: Remover usuário da custódia
   *     security:
   *       - bearerAuth: []
   *     parameters:
   *       - in: path
   *         name: id
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: ID da custódia
   *       - in: path
   *         name: userId
   *         required: true
   *         schema:
   *           type: string
   *           format: uuid
   *         description: ID do usuário
   *     responses:
   *       200:
   *         description: Usuário removido da custódia com sucesso
   *       400:
   *         description: Dados inválidos
   *       401:
   *         description: Não autorizado
   *       403:
   *         description: Acesso negado - apenas administradores
   *       404:
   *         description: Usuário não está vinculado à custódia
   */
  async removeUserFromSafekeeping(req: AuthenticatedRequest, res: Response) {
    try {
      const safekeepingId = uuidParamSchema.parse({ id: req.params.id }).id;
      const userId = uuidParamSchema.parse({ id: req.params.userId }).id;

      const result = await safekeepingService.removeUserFromSafekeeping(
        safekeepingId,
        userId
      );

      return res.json({
        success: true,
        message: result.message,
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          message: "IDs inválidos",
          errors: error.errors.map((err) => ({
            field: err.path.join("."),
            message: err.message,
          })),
        });
      }

      if (error.message.includes("não está vinculado")) {
        return res.status(404).json({
          success: false,
          message: error.message,
        });
      }

      return res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * @swagger
   * /api/v1/safekeepings/users/available:
   *   get:
   *     tags:
   *       - Safekeepings
   *     summary: Listar usuários disponíveis para vincular
   *     security:
   *       - bearerAuth: []
   *     responses:
   *       200:
   *         description: Lista de usuários disponíveis
   *       401:
   *         description: Não autorizado
   *       403:
   *         description: Acesso negado - apenas administradores
   */
  async getAvailableUsers(req: AuthenticatedRequest, res: Response) {
    try {
      const users = await safekeepingService.getAvailableUsers();

      return res.json({
        success: true,
        data: users,
      });
    } catch (error: any) {
      return res.status(500).json({
        success: false,
        message: error.message,
      });
    }
  }
}
