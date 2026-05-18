import type {
  FileType,
  FilesResponse,
  SearchResult,
  RegisterFileTypeResponse,
  UploadFileResponse,
} from "@/types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? "/api";

/** Base URL for AI fill routes (no trailing slash). Nginx exposes /api/ai-fill → service /ai-fill. */
const AI_FILL_BASE_URL =
  process.env.NEXT_PUBLIC_AI_FILL_BASE_URL ?? "/api/ai-fill";

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = `Request failed with status ${res.status}`;
    try {
      const data = await res.json();
      if (data?.detail) {
        message = Array.isArray(data.detail)
          ? data.detail.map((d: any) => d.msg ?? d).join(", ")
          : data.detail;
      } else if (data?.message) {
        message = data.message;
      }
    } catch {
      // ignore JSON parse errors and fall back to generic message
    }
    throw new Error(message);
  }
  const text = await res.text();
  return text ? (JSON.parse(text) as T) : ({} as T);
}

export async function getFiles(): Promise<FilesResponse> {
  const res = await fetch(`${API_BASE_URL}/files/`, {
    cache: "no-store",
  });
  return handleResponse<FilesResponse>(res);
}

export async function getFileTypes(): Promise<FileType[]> {
  const res = await fetch(`${API_BASE_URL}/file-types/`, {
    cache: "no-store",
  });
  return handleResponse<FileType[]>(res);
}

export async function searchFiles(params: {
  query: string;
  fileType?: string | null;
}): Promise<SearchResult[]> {
  const searchParams = new URLSearchParams({ query: params.query });
  if (params.fileType) {
    searchParams.set("file_type", params.fileType);
  }
  const res = await fetch(`${API_BASE_URL}/search/?${searchParams.toString()}`, {
    cache: "no-store",
  });
  return handleResponse<SearchResult[]>(res);
}

export async function registerFileType(params: {
  fileType: string;
  metadataSchema: Record<string, unknown>;
}): Promise<RegisterFileTypeResponse> {
  const formData = new FormData();
  formData.append("file_type", params.fileType);
  formData.append("metadata_schema", JSON.stringify(params.metadataSchema));

  const res = await fetch(`${API_BASE_URL}/register-file-type/`, {
    method: "POST",
    body: formData,
  });
  return handleResponse<RegisterFileTypeResponse>(res);
}

export function buildFileUrl(fileId: string, inline = false): string {
  const url = `${API_BASE_URL}/files/${encodeURIComponent(fileId)}/download`;
  return inline ? `${url}?inline=true` : url;
}

export async function fetchFileBlob(
  fileId: string,
): Promise<{ blob: Blob; mimeType: string }> {
  const res = await fetch(buildFileUrl(fileId, true), { cache: "no-store" });
  if (!res.ok) throw new Error(`Failed to fetch file (${res.status})`);
  const mimeType = res.headers.get("content-type") ?? "application/octet-stream";
  const blob = await res.blob();
  return { blob, mimeType };
}

export async function deleteFile(fileId: string): Promise<void> {
  const res = await fetch(
    `${API_BASE_URL}/files/${encodeURIComponent(fileId)}`,
    { method: "DELETE" },
  );
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw new Error(data?.detail ?? `Delete failed (${res.status})`);
  }
}

export async function uploadFile(params: {
  fileType: string;
  file: File;
  metadataValue: Record<string, unknown>;
  folderPath: string;
  technique: string;
}): Promise<UploadFileResponse> {
  const formData = new FormData();
  formData.append("metadata_value", JSON.stringify(params.metadataValue));
  formData.append("file", params.file);
  formData.append("folder_path", params.folderPath);
  formData.append("technique", params.technique);

  const res = await fetch(
    `${API_BASE_URL}/metadata/${encodeURIComponent(params.fileType)}/`,
    {
      method: "POST",
      body: formData,
    },
  );
  return handleResponse<UploadFileResponse>(res);
}

export interface AiFillResponse {
  metadata_value: Record<string, unknown>;
  warnings: string[];
}

export async function aiFillMetadata(params: {
  file: File;
  metadataSchema: Record<string, unknown>;
}): Promise<AiFillResponse> {
  const formData = new FormData();
  formData.append("file", params.file);
  formData.append("metadata_schema", JSON.stringify(params.metadataSchema));

  const res = await fetch(`${AI_FILL_BASE_URL}/metadata`, {
    method: "POST",
    body: formData,
  });
  return handleResponse<AiFillResponse>(res);
}
