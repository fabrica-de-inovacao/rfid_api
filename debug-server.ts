import express from "express";
import { validateHardwareApiKey } from "./src/middleware/hardware";

const app = express();
app.use(express.json());

// Interceptar TODAS as requisições
app.use("*", (req, res, next) => {
  console.log(`\n🌐 ========== REQUEST INTERCEPTED ==========`);
  console.log(`📅 Timestamp: ${new Date().toISOString()}`);
  console.log(`🔗 URL: ${req.method} ${req.originalUrl}`);
  console.log(`📡 Headers:`, JSON.stringify(req.headers, null, 2));
  console.log(`📦 Body:`, JSON.stringify(req.body, null, 2));
  console.log(`=========================================\n`);
  next();
});

// Endpoint específico para debugging
app.post("/api/v1/scans/report", validateHardwareApiKey, (req, res) => {
  console.log(`\n🎯 ========== REPORT ENDPOINT HIT ==========`);
  console.log(`📦 Report Data:`, JSON.stringify(req.body, null, 2));
  console.log(`🔍 MAC Address:`, req.body.mac_address);
  console.log(`📊 Tags:`, req.body.tags || req.body.tag_reads);
  console.log(`=========================================\n`);

  res.status(200).json({
    success: true,
    message: "Debug endpoint - dados recebidos",
    received: req.body,
  });
});

const PORT = 9001; // Porta diferente para não conflitar
app.listen(PORT, () => {
  console.log(`🔍 Debug server rodando na porta ${PORT}`);
  console.log(`🎯 Interceptando requisições para debug`);
  console.log(
    `📋 Endpoint de teste: http://189.90.44.226:${PORT}/api/v1/scans/report`
  );
});
