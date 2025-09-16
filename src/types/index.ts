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
    | "connection_established"
    | "custody_status_requested"
    | "custody_alerts"
    | "custody_monitoring_update";
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

export interface AntennaReadingData {
  reading_reader_ip: string;
  reading_epc_hex: string;
  reading_reader_mac: string;
  reading_company_id: string;
  reading_antenna: string;
  reading_movement_type: string;
  reading_created_at: string;
  reading_reader_name: string;
  reading_rpm: string;
}

export interface AntennaSDCardResponse {
  message: string;
  count_files: number;
  count_readings: number;
  data: AntennaReadingData[];
}

export interface AntennaCurrentStatusData {
  antenna_ip: string;
  antenna_mac: string;
  antenna_name: string;
  total_readings: number;
  unique_tags: string[];
  readings: AntennaReadingData[];
  last_update: string;
  status: "online" | "offline";
}

export interface SafekeepingRealtimeStatus {
  safekeeping_id: string;
  safekeeping_name: string;
  scanner: {
    id: string;
    name: string;
    mac_address: string;
    antenna_ip?: string;
    status: string;
    last_scan?: Date;
  };
  evidences: {
    id: string;
    name: string;
    tag_id: string | null;
    expected_present: boolean;
    currently_present: boolean;
    last_seen_at: Date | null;
    status_changed_at: Date;
  }[];
  summary: {
    total_evidences: number;
    expected_present: number;
    currently_present: number;
    missing: number;
    unexpected: number;
  };
  last_updated: Date;
}
