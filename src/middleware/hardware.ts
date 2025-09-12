import { Request, Response, NextFunction } from "express";
import { config } from "../config/env";

export const validateHardwareApiKey = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    console.log("🔐 [HARDWARE AUTH] API Key não fornecida");
    res.status(401).json({ message: "Chave de API não fornecida" });
    return;
  }

  let bearerToken = null;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    bearerToken = authHeader.substring(7); // Remove "Bearer "
  }

  if (bearerToken !== config.hardware.apiKey) {
    console.log("🔐 [HARDWARE AUTH] API Key inválida");
    res.status(401).json({ message: "Chave de API inválida" });
    return;
  }

  console.log("🔐 [HARDWARE AUTH] ✅ API Key válida");
  next();
};
