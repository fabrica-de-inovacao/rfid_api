import { Request, Response, NextFunction } from "express";

/**
 * Middleware para converter formato do ESP32 para o formato esperado pela API
 */
export const convertESP32Format = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.log("\n🔄 ========== ESP32 FORMAT CONVERTER ==========");
  console.log("📥 Original body:", JSON.stringify(req.body, null, 2));

  // Verificar se é o formato do ESP32 (array de readings)
  if (
    Array.isArray(req.body) &&
    req.body.length > 0 &&
    req.body[0].reading_reader_mac
  ) {
    console.log("🎯 Detectado formato ESP32, convertendo...");

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
      // Dados adicionais do scanner
      reader_ip: firstReading.reading_reader_ip,
      reader_name: firstReading.reading_reader_name || "",
      readings_count: req.body.length,
      unique_tags_count: uniqueEPCs.length,
      first_reading_time: req.body[0]?.reading_created_at,
      last_reading_time: req.body[req.body.length - 1]?.reading_created_at,
    };

    console.log("✅ Formato convertido:");
    console.log("   MAC Address:", macAddress);
    console.log("   Total readings:", req.body.length);
    console.log("   Unique EPCs:", uniqueEPCs.length);
    console.log("   EPCs:", uniqueEPCs);

    // Substituir o body
    req.body = convertedBody;
    console.log("📤 New body:", JSON.stringify(req.body, null, 2));
  } else {
    console.log("ℹ️ Formato padrão detectado, mantendo original");
  }

  console.log("==============================================\n");
  next();
};
