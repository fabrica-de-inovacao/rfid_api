import { Request, Response, NextFunction } from "express";
import { z } from "zod";

export const validateRequest = (schema: {
  body?: z.ZodSchema;
  params?: z.ZodSchema;
  query?: z.ZodSchema;
}) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const validationErrors: Array<{ field: string; message: string }> = [];

      // Validar body
      if (schema.body) {
        const result = schema.body.safeParse(req.body);
        if (!result.success) {
          result.error.errors.forEach((error) => {
            validationErrors.push({
              field: error.path.join("."),
              message: error.message,
            });
          });
        } else {
          req.body = result.data;
        }
      }

      // Validar params
      if (schema.params) {
        const result = schema.params.safeParse(req.params);
        if (!result.success) {
          result.error.errors.forEach((error) => {
            validationErrors.push({
              field: `params.${error.path.join(".")}`,
              message: error.message,
            });
          });
        } else {
          req.params = result.data;
        }
      }

      // Validar query
      if (schema.query) {
        const result = schema.query.safeParse(req.query);
        if (!result.success) {
          result.error.errors.forEach((error) => {
            validationErrors.push({
              field: `query.${error.path.join(".")}`,
              message: error.message,
            });
          });
        } else {
          req.query = result.data;
        }
      }

      if (validationErrors.length > 0) {
        res.status(400).json({
          message: "Erro de validação",
          errors: validationErrors,
        });
        return;
      }

      next();
    } catch (error) {
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  };
};
