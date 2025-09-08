import { Request, Response, NextFunction } from "express";
import { ApiError } from "../types";

export const errorHandler = (
  error: Error | ApiError,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  console.error("Error:", error);

  // Se já foi enviada uma resposta, passar para o próximo handler
  if (res.headersSent) {
    return next(error);
  }

  // Se é um erro da nossa API
  if ("status" in error) {
    const apiError = error as ApiError;
    res.status(apiError.status).json({
      message: apiError.message,
      ...(apiError.errors && { errors: apiError.errors }),
    });
    return;
  }

  // Erros do Prisma
  if (error.name === "PrismaClientKnownRequestError") {
    const prismaError = error as any;

    switch (prismaError.code) {
      case "P2002":
        res.status(409).json({
          message: "Já existe um registo com estes dados únicos",
        });
        return;
      case "P2025":
        res.status(404).json({
          message: "Registo não encontrado",
        });
        return;
      default:
        res.status(400).json({
          message: "Erro na base de dados",
        });
        return;
    }
  }

  // Erros de validação do Zod
  if (error.name === "ZodError") {
    res.status(400).json({
      message: "Erro de validação",
      errors: (error as any).errors.map((err: any) => ({
        field: err.path.join("."),
        message: err.message,
      })),
    });
    return;
  }

  // Erro genérico
  res.status(500).json({
    message:
      process.env.NODE_ENV === "production"
        ? "Erro interno do servidor"
        : error.message,
  });
};
