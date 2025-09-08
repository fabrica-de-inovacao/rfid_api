import { Request, Response, NextFunction } from "express";
import { config } from "../config/env";

export const validateHardwareApiKey = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  // Log detalhado para debug
  console.log('=== DEBUG HARDWARE API ===');
  console.log('Headers recebidos:', JSON.stringify(req.headers, null, 2));
  console.log('Method:', req.method);
  console.log('URL:', req.url);
  
  const apiKey = req.headers["x-token"];
  const altApiKey = req.headers["x-api-key"]; // Verificar também x-api-key
  
  // Verificar se está no cabeçalho Authorization Bearer
  let bearerToken = null;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    bearerToken = authHeader.substring(7); // Remove "Bearer "
  }
  

  console.log('Authorization Bearer:', bearerToken);
  console.log('API Key esperada:', config.hardware.apiKey);

  const receivedKey = apiKey || altApiKey || bearerToken;

  if (!authHeader) {
    console.log('ERROR: Nenhuma chave de API fornecida');
    res.status(401).json({ message: "Chave de API não fornecida" });
    return;
  }

  if (bearerToken !== config.hardware.apiKey) {
    console.log('ERROR: Chave de API inválida');
    console.log('Recebida:', receivedKey);
    console.log('Esperada:', config.hardware.apiKey);
    res.status(401).json({ message: "Chave de API inválida" });
    return;
  }

  console.log('SUCCESS: Chave de API válida');
  console.log('=========================');
  next();
};
