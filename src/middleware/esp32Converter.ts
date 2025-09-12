import { Request, Response, NextFunction } from "express";

/**
 * Middleware para converter formato do ESP32 para o formato esperado pela API
 */
export const convertESP32Format = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Verificar se é o formato do ESP32 (array de readings)
  if (
    Array.isArray(req.body) &&
    req.body.length > 0 &&
    req.body[0].reading_reader_mac
  ) {
    const firstReading = req.body[0];
    const macAddress = firstReading.reading_reader_mac;

    // Extrair todos os EPCs únicos
    const uniqueEPCs = [
      ...new Set(req.body.map((reading: any) => reading.reading_epc_hex)),
    ];

    // Converter para o formato esperado
    const convertedBody = {
      mac_address: macAddress,
      tags: uniqueEPCs,
      reader_ip: firstReading.reading_reader_ip,
      reader_name: firstReading.reading_reader_name || "",
      readings_count: req.body.length,
      unique_tags_count: uniqueEPCs.length,
      first_reading_time: req.body[0]?.reading_created_at,
      last_reading_time: req.body[req.body.length - 1]?.reading_created_at,
    };

    // Substituir o body
    req.body = convertedBody;
  }

  next();
};
