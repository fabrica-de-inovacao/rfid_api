import { Request } from "express";

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    name: string;
    email: string;
    cpf: string;
    setor: string;
    admin: boolean;
    status: string;
    tag_id: string | null;
  };
}

export interface LoginCredentials {
  email: string;
  senha: string;
}

export interface TokenPayload {
  userId: string;
  email: string;
  admin: boolean;
}

export interface CreateUserData {
  name: string;
  email: string;
  cpf: string;
  setor: string;
  senha: string;
  admin?: boolean;
}

export interface UpdateUserData {
  name?: string;
  email?: string;
  cpf?: string;
  setor?: string;
  status?: "ativo" | "inativo";
  admin?: boolean;
}

export interface CreateEvidenceData {
  name: string;
  description: string;
  report_id?: string;
  safekeeping_id: string;
}

export interface CreateSafekeepingData {
  name: string;
  manager_id?: string;
}

export interface UpdateSafekeepingData {
  name?: string;
  manager_id?: string;
}

export interface TagReadData {
  tag_id: string;
  read_time: string;
  rssi?: number;
  phase?: number;
  channel?: number;
  ant_id?: number;
}

export interface ScannerReportData {
  mac_address: string;
  tag_reads?: TagReadData[];
  tags?: string[];
}

export interface LinkTagToEvidenceData {
  evidence_id: string;
}

export interface WebSocketMessage {
  type:
    | "tag_linked"
    | "scanner_status"
    | "evidence_scan"
    | "tag_read_response"
    | "error"
    | "connection_established";
  data: any;
  timestamp: Date;
}

export interface MQTTMessage {
  topic: string;
  message: any;
}

export interface ApiError {
  message: string;
  status: number;
  errors?: Array<{
    field: string;
    message: string;
  }>;
}
