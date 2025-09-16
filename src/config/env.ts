import dotenv from "dotenv";

dotenv.config();

export const config = {
  port: process.env.PORT || 3000,
  nodeEnv: process.env.NODE_ENV || "development",

  database: {
    url: process.env.DATABASE_URL!,
  },

  jwt: {
    secret: process.env.JWT_SECRET!,
    refreshSecret: process.env.JWT_REFRESH_SECRET!,
    expiresIn: process.env.JWT_EXPIRES_IN || "1h",
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  },

  hardware: {
    apiKey: process.env.HARDWARE_API_KEY!,
  },

  mqtt: {
    brokerUrl: process.env.MQTT_BROKER_URL || "mqtt://localhost:1883",
    clientId: process.env.MQTT_CLIENT_ID || "rfid-api-server",
  },

  websocket: {
    port: process.env.WS_PORT || 3001,
  },

  rfid: {
    // Tempo em segundos para considerar uma tag ausente se não for detectada
    presenceTimeoutSeconds: Number(process.env.RFID_PRESENCE_TIMEOUT) || 30,
  },
};
