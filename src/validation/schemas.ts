import { z } from "zod";

// Esquemas de Autenticação
export const loginSchema = z.object({
  email: z.string().email("E-mail inválido"),
  senha: z.string().min(1, "Senha é obrigatória"),
});

// Esquemas de Utilizadores
export const createUserSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório"),
  email: z.string().email("E-mail inválido"),
  cpf: z
    .string()
    .regex(
      /^\d{3}\.\d{3}\.\d{3}-\d{2}$/,
      "CPF deve estar no formato XXX.XXX.XXX-XX"
    ),
  setor: z.string().min(1, "Setor é obrigatório"),
  senha: z.string().min(8, "Senha deve ter pelo menos 8 caracteres"),
  admin: z.boolean().optional().default(false),
});

export const updateUserSchema = z.object({
  name: z.string().min(1, "Nome é obrigatório").optional(),
  email: z.string().email("E-mail inválido").optional(),
  cpf: z
    .string()
    .regex(
      /^\d{3}\.\d{3}\.\d{3}-\d{2}$/,
      "CPF deve estar no formato XXX.XXX.XXX-XX"
    )
    .optional(),
  setor: z.string().min(1, "Setor é obrigatório").optional(),
  status: z
    .enum(["ativo", "inativo"], {
      errorMap: () => ({ message: 'Status deve ser "ativo" ou "inativo"' }),
    })
    .optional(),
  admin: z.boolean().optional(),
});

// Esquemas de Provas
export const createEvidenceSchema = z.object({
  name: z.string().min(1, "Nome da prova é obrigatório"),
  description: z.string().min(1, "Descrição da prova é obrigatória"),
  report_id: z
    .string()
    .uuid("ID do relatório deve ser um UUID válido")
    .optional(),
  safekeeping_id: z.string().uuid("ID da custódia deve ser um UUID válido"),
});

// Esquemas de Safekeepings (Custódias)
export const createSafekeepingSchema = z.object({
  name: z.string().min(1, "Nome da custódia é obrigatório"),
  manager_id: z
    .string()
    .uuid("ID do gestor deve ser um UUID válido")
    .optional(),
});

export const updateSafekeepingSchema = z.object({
  name: z.string().min(1, "Nome da custódia é obrigatório").optional(),
  manager_id: z
    .string()
    .uuid("ID do gestor deve ser um UUID válido")
    .optional(),
});

// Esquemas de Tags
export const linkTagToEvidenceSchema = z.object({
  evidence_id: z.string().uuid("ID da prova deve ser um UUID válido"),
});

// Esquemas de Scanners
export const tagReadSchema = z.object({
  tag_id: z.string(),
  read_time: z.string().datetime(),
  rssi: z.number().optional(),
  phase: z.number().optional(),
  channel: z.number().optional(),
  ant_id: z.number().optional(),
});

export const scannerReportSchema = z
  .object({
    mac_address: z
      .string()
      .regex(
        /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/,
        "MAC Address inválido"
      ),
    tag_reads: z
      .array(tagReadSchema)
      .min(1, "Pelo menos uma tag deve ser fornecida")
      .optional(),
    // Manter compatibilidade com formato antigo
    tags: z.array(z.string()).optional(),
  })
  .refine(
    (data) => data.tag_reads || data.tags,
    "Deve fornecer tag_reads ou tags"
  );

// Esquemas de Scanners
export const createScannerSchema = z.object({
  name: z.string().min(1, "Nome do scanner é obrigatório"),
  mac_address: z
    .string()
    .regex(
      /^([0-9A-Fa-f]{2}[:-]){5}([0-9A-Fa-f]{2})$/,
      "MAC address deve estar no formato XX:XX:XX:XX:XX:XX ou XX-XX-XX-XX-XX-XX"
    ),
  safekeeping_id: z
    .string()
    .uuid("ID da custódia deve ser um UUID válido")
    .optional(),
  description: z.string().optional(),
});

export const updateScannerSchema = z.object({
  name: z.string().min(1, "Nome do scanner é obrigatório").optional(),
  safekeeping_id: z
    .string()
    .uuid("ID da custódia deve ser um UUID válido")
    .optional(),
  description: z.string().optional(),
  status: z
    .enum(["ONLINE", "OFFLINE", "MAINTENANCE", "ERROR"], {
      errorMap: () => ({
        message: "Status deve ser ONLINE, OFFLINE, MAINTENANCE ou ERROR",
      }),
    })
    .optional(),
});

export const scannerFiltersSchema = z.object({
  status: z.enum(["ONLINE", "OFFLINE", "MAINTENANCE", "ERROR"]).optional(),
  safekeeping_id: z
    .string()
    .uuid("ID da custódia deve ser um UUID válido")
    .optional(),
  include_stats: z.enum(["true", "false"]).optional(),
});

// Esquemas de parâmetros
export const uuidParamSchema = z.object({
  id: z.string().uuid("ID deve ser um UUID válido"),
});

export type LoginData = z.infer<typeof loginSchema>;
export type CreateUserData = z.infer<typeof createUserSchema>;
export type UpdateUserData = z.infer<typeof updateUserSchema>;
export type CreateEvidenceData = z.infer<typeof createEvidenceSchema>;
export type CreateSafekeepingData = z.infer<typeof createSafekeepingSchema>;
export type UpdateSafekeepingData = z.infer<typeof updateSafekeepingSchema>;
export type LinkTagToEvidenceData = z.infer<typeof linkTagToEvidenceSchema>;
export type TagReadData = z.infer<typeof tagReadSchema>;
export type ScannerReportData = z.infer<typeof scannerReportSchema>;
export type CreateScannerData = z.infer<typeof createScannerSchema>;
export type UpdateScannerData = z.infer<typeof updateScannerSchema>;
export type ScannerFiltersData = z.infer<typeof scannerFiltersSchema>;
export type UuidParam = z.infer<typeof uuidParamSchema>;
