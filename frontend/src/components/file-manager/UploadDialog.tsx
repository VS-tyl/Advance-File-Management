"use client";

import { useEffect, useState } from "react";
import { uploadFile, aiFillMetadata } from "@/lib/api";
import type { FileRecord, FileType } from "@/types";
import { DialogShell } from "./DialogShell";
import { normalizeFolderPath } from "./utils";
import {
  buildMetadataFromSchema,
  normalizeMetadataSchema,
} from "./metadata";

export interface UploadDialogProps {
  fileTypes: FileType[];
  defaultFolder: string;
  onClose: () => void;
  onUploaded: (file: FileRecord) => void;
}

export default function UploadDialog(props: UploadDialogProps) {
  const { fileTypes, defaultFolder, onClose, onUploaded } = props;
  const [fileType, setFileType] = useState<string>("");
  const [folder, setFolder] = useState(
    normalizeFolderPath(defaultFolder || "/"),
  );
  const [technique, setTechnique] = useState("char");
  const [metaText, setMetaText] = useState("{\n  \n}");
  const [structuredMeta, setStructuredMeta] = useState<Record<string, any>>({});
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [aiFilling, setAiFilling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!fileType) {
      setStructuredMeta({});
      return;
    }
    const schema = normalizeMetadataSchema(
      fileTypes.find((t) => t.file_type === fileType)?.metadata_schema,
    );
    if (Object.keys(schema).length === 0) {
      setStructuredMeta({});
      return;
    }
    const initial: Record<string, any> = {};
    for (const [field, def] of Object.entries(schema)) {
      if (def.default !== undefined) {
        initial[field] = def.default;
      } else {
        switch (def.type) {
          case "bool":
            initial[field] = false;
            break;
          case "list":
            initial[field] = "";
            break;
          case "int":
          case "float":
          case "datetime":
          case "str":
          default:
            initial[field] = "";
            break;
        }
      }
    }
    setStructuredMeta(initial);
  }, [fileType, fileTypes]);

  const handleAiFill = async () => {
    if (!file) {
      setError("Upload a file first to use AI Fill.");
      return;
    }
    if (!fileType) {
      setError("Select a file type first to use AI Fill.");
      return;
    }
    const rawSchema = fileTypes.find((t) => t.file_type === fileType)?.metadata_schema;
    if (!rawSchema || Object.keys(rawSchema).length === 0) {
      setError("No metadata schema defined for this file type.");
      return;
    }
    try {
      setAiFilling(true);
      setError(null);
      const res = await aiFillMetadata({ file, metadataSchema: rawSchema });
      const schema = normalizeMetadataSchema(rawSchema);
      const filled: Record<string, any> = {};
      for (const [field, def] of Object.entries(schema)) {
        const val = res.metadata_value[field];
        if (val == null) {
          filled[field] = def.type === "bool" ? false : "";
          continue;
        }
        switch (def.type) {
          case "list":
            filled[field] = Array.isArray(val) ? val.join(", ") : String(val);
            break;
          case "bool":
            filled[field] = Boolean(val);
            break;
          case "int":
          case "float":
            filled[field] = val === null ? "" : String(val);
            break;
          default:
            filled[field] = String(val);
            break;
        }
      }
      setStructuredMeta(filled);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "AI Fill failed. Try again.",
      );
    } finally {
      setAiFilling(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError("Choose a file first.");
      return;
    }
    try {
      setSubmitting(true);
      setError(null);
      const schema = normalizeMetadataSchema(
        fileTypes.find((t) => t.file_type === fileType)?.metadata_schema,
      );
      let metadata: Record<string, unknown> = {};
      if (Object.keys(schema).length > 0) {
        metadata = buildMetadataFromSchema(schema, structuredMeta);
      } else {
        metadata = metaText.trim() ? JSON.parse(metaText) : {};
      }
      const res = await uploadFile({
        fileType,
        file,
        metadataValue: metadata,
        folderPath: normalizeFolderPath(folder || "/"),
        technique,
      });
      onUploaded({
        id: res.file_id,
        name: res.file_name,
        file_type: res.file_type,
        folder_path: res.folder_path,
        file_url: `/files/${res.file_id}/download`,
        metadata_value: res.metadata,
        file_size: file.size,
        mime_type: file.type || null,
        created_at: res.timestamp,
      });
      onClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to upload file. Check your metadata JSON.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = "w-full rounded-xl border border-white/[0.08] bg-[rgba(28,28,30,0.9)] px-3 py-2 text-[13px] text-[#f5f5f7] outline-none placeholder:text-[#636366] transition-colors duration-200 focus:border-[#22c55e]/40";

  return (
    <DialogShell title="Upload document" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-[12px] text-[#a1a1a6]">File type</label>
            <select
              className={inputClass}
              value={fileType}
              onChange={(e) => setFileType(e.target.value)}
              required
            >
              <option value="">Select type...</option>
              {fileTypes.map((t) => (
                <option key={t.id} value={t.file_type}>
                  {t.file_type}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-[12px] text-[#a1a1a6]">Folder path</label>
            <input
              className={inputClass}
              value={folder}
              onChange={(e) => setFolder(e.target.value)}
              placeholder="/HR/Policies"
            />
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-[12px] text-[#a1a1a6]">Chunking</label>
          <div className="flex flex-wrap gap-1.5">
            {["char", "sentences", "rows", "semantics"].map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTechnique(t)}
                className={[
                  "rounded-full px-3 py-1 text-[12px] capitalize transition-all duration-200",
                  technique === t
                    ? "bg-[#22c55e] text-[#0a0a0a] font-semibold shadow-[0_2px_10px_rgba(34,197,94,0.3)]"
                    : "border border-white/[0.08] bg-[rgba(28,28,30,0.9)] text-[#a1a1a6] hover:border-[#22c55e]/30 hover:text-[#f5f5f7]",
                ].join(" ")}
              >
                {t}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-1">
          <label className="text-[12px] text-[#a1a1a6]">File</label>
          <input
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="w-full text-[12px] text-[#a1a1a6] file:mr-3 file:rounded-full file:border-0 file:bg-[#22c55e] file:px-3 file:py-1.5 file:text-[12px] file:font-medium file:text-[#0a0a0a] hover:file:bg-[#16a34a] file:transition-colors file:duration-200 file:cursor-pointer"
          />
        </div>
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-2">
            <label className="text-[12px] text-[#a1a1a6]">
              Metadata (matches schema)
            </label>
            {fileType && (
              <button
                type="button"
                onClick={handleAiFill}
                disabled={aiFilling || submitting}
                className="inline-flex items-center gap-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-[11px] font-medium text-purple-300 transition-all duration-200 hover:border-purple-500/50 hover:bg-purple-500/20 hover:text-purple-200 disabled:opacity-50"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3v4m0 14v-4m9-5h-4M7 12H3m15.364-6.364l-2.828 2.828M9.464 14.536l-2.828 2.828m12.728 0l-2.828-2.828M9.464 9.464L6.636 6.636"/></svg>
                {aiFilling ? "Filling..." : "AI Fill"}
              </button>
            )}
          </div>
          {(() => {
            const schema = normalizeMetadataSchema(
              fileTypes.find((t) => t.file_type === fileType)
                ?.metadata_schema,
            );
            const hasSchema = Object.keys(schema).length > 0;
            if (!hasSchema) {
              return (
                <textarea
                  className="min-h-[110px] w-full rounded-xl border border-white/[0.08] bg-[rgba(28,28,30,0.9)] px-3 py-2 text-[13px] font-mono text-[#f5f5f7] outline-none placeholder:text-[#636366] transition-colors duration-200 focus:border-[#22c55e]/40"
                  value={metaText}
                  onChange={(e) => setMetaText(e.target.value)}
                  spellCheck={false}
                  placeholder='{\n  "title": "Q1 Plan",\n  "tags": ["finance"]\n}'
                />
              );
            }
            return (
              <div className="space-y-2">
                <div className="space-y-1.5">
                  {Object.entries(schema).map(([field, def]) => {
                    const value = structuredMeta[field] ?? "";
                    const commonLabel = (
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[12px] font-medium text-[#f5f5f7]">
                          {field}
                        </span>
                        <span className="text-[11px] text-[#636366]">
                          {def.type}
                          {def.required ? " \u00b7 required" : ""}
                        </span>
                      </div>
                    );
                    switch (def.type) {
                      case "bool":
                        return (
                          <div
                            key={field}
                            className="flex items-center justify-between rounded-xl border border-white/[0.06] bg-[rgba(28,28,30,0.9)] px-3 py-2"
                          >
                            {commonLabel}
                            <input
                              type="checkbox"
                              className="h-3.5 w-3.5 rounded border-white/[0.2] bg-[#1c1c1e] accent-[#22c55e]"
                              checked={Boolean(value)}
                              onChange={(e) =>
                                setStructuredMeta((prev) => ({
                                  ...prev,
                                  [field]: e.target.checked,
                                }))
                              }
                            />
                          </div>
                        );
                      case "int":
                      case "float":
                        return (
                          <div key={field} className="space-y-1">
                            {commonLabel}
                            <input
                              type="number"
                              className={inputClass}
                              value={value}
                              onChange={(e) =>
                                setStructuredMeta((prev) => ({
                                  ...prev,
                                  [field]: e.target.value,
                                }))
                              }
                            />
                          </div>
                        );
                      case "datetime":
                        return (
                          <div key={field} className="space-y-1">
                            {commonLabel}
                            <input
                              type="datetime-local"
                              className={inputClass}
                              value={value}
                              onChange={(e) =>
                                setStructuredMeta((prev) => ({
                                  ...prev,
                                  [field]: e.target.value,
                                }))
                              }
                            />
                            <p className="text-[11px] text-[#636366]">
                              Uses your local timezone; backend may normalise to
                              UTC.
                            </p>
                          </div>
                        );
                      case "list":
                        return (
                          <div key={field} className="space-y-1">
                            {commonLabel}
                            <input
                              type="text"
                              className={inputClass}
                              value={value}
                              onChange={(e) =>
                                setStructuredMeta((prev) => ({
                                  ...prev,
                                  [field]: e.target.value,
                                }))
                              }
                              placeholder="item1, item2, item3"
                            />
                            <p className="text-[11px] text-[#636366]">
                              Comma-separated values will be stored as a list.
                            </p>
                          </div>
                        );
                      case "str":
                      default:
                        return (
                          <div key={field} className="space-y-1">
                            {commonLabel}
                            <input
                              type="text"
                              className={inputClass}
                              value={value}
                              onChange={(e) =>
                                setStructuredMeta((prev) => ({
                                  ...prev,
                                  [field]: e.target.value,
                                }))
                              }
                            />
                          </div>
                        );
                    }
                  })}
                </div>
              </div>
            );
          })()}
        </div>
        {error && (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-[12px] text-red-300">
            {error}
          </div>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-white/[0.08] bg-[rgba(44,44,46,0.9)] px-3.5 py-1.5 text-[12px] text-[#a1a1a6] transition-all duration-200 hover:border-[#22c55e]/30 hover:text-[#f5f5f7]"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-2 rounded-full bg-[#22c55e] px-4 py-1.5 text-[13px] font-semibold text-[#0a0a0a] shadow-[0_4px_20px_rgba(34,197,94,0.3)] transition-all duration-200 hover:bg-[#16a34a] hover:shadow-[0_4px_24px_rgba(34,197,94,0.45)] disabled:opacity-60"
          >
            {submitting ? "Uploading..." : "Upload"}
          </button>
        </div>
      </form>
    </DialogShell>
  );
}
