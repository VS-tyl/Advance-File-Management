export type MetadataSchemaField =
  | string
  | {
      type: string;
      required?: boolean;
      default?: unknown;
    };

export interface FileType {
  id: string;
  file_type: string;
  metadata_schema: Record<string, MetadataSchemaField>;
}

export interface FileRecord {
  id: string;
  name: string;
  file_type: string | null;
  folder_path: string;
  file_url: string;
  metadata_value: Record<string, unknown>;
  file_size: number;
  mime_type: string | null;
  created_at: string | null;
}

export interface FilesResponse {
  files: FileRecord[];
  folders: string[];
}

export interface SearchResult {
  file_id: string;
  chunk_text: string;
  similarity: number;
}

export interface RegisterFileTypeResponse {
  message: string;
  schema: Record<string, MetadataSchemaField>;
  next_endpoint?: string;
}

export interface UploadFileResponse {
  file_id: string;
  file_type: string;
  metadata: Record<string, unknown>;
  timestamp: string;
  file_name: string;
  folder_path: string;
}

