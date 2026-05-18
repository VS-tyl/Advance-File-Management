"use client";

import { useState } from "react";
import { registerFileType } from "@/lib/api";
import type { FileType } from "@/types";
import { DialogShell } from "./DialogShell";

export interface TypesDialogProps {
  fileTypes: FileType[];
  onClose: () => void;
  onRegistered: (t: FileType) => void;
}

export default function TypesDialog(props: TypesDialogProps) {
  const { fileTypes, onClose, onRegistered } = props;
  const [name, setName] = useState("");
  const [schemaText, setSchemaText] = useState(
    '{\n  "title": {"type": "str", "required": true},\n  "tags": {"type": "list"}\n}',
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError(null);
      const parsed = JSON.parse(schemaText);
      const res = await registerFileType({
        fileType: name.trim(),
        metadataSchema: parsed,
      });
      onRegistered({
        id: crypto.randomUUID(),
        file_type: name.trim(),
        metadata_schema: res.schema,
      });
      onClose();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to register file type. Check your JSON.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DialogShell title="File types" onClose={onClose} widthClass="w-full max-w-3xl">
      <div className="grid gap-4 sm:grid-cols-[2fr,3fr]">
        <div className="space-y-3">
          <div className="text-[12px] text-[#a1a1a6]">
            Design new file categories using JSON-based schemas. These power
            validation and dynamic metadata for uploads.
          </div>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div className="space-y-1">
              <label className="text-[12px] text-[#a1a1a6]">
                File type name
              </label>
              <input
                className="w-full rounded-xl border border-white/[0.08] bg-[rgba(28,28,30,0.9)] px-3 py-2 text-[13px] text-[#f5f5f7] outline-none placeholder:text-[#636366] transition-colors duration-200 focus:border-[#22c55e]/40"
                placeholder="Invoice, HR_Document, Contract..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-[12px] text-[#a1a1a6]">
                Metadata schema (JSON)
              </label>
              <textarea
                className="min-h-[130px] w-full rounded-xl border border-white/[0.08] bg-[rgba(28,28,30,0.9)] px-3 py-2 text-[13px] font-mono text-[#f5f5f7] outline-none placeholder:text-[#636366] transition-colors duration-200 focus:border-[#22c55e]/40"
                value={schemaText}
                onChange={(e) => setSchemaText(e.target.value)}
                spellCheck={false}
              />
              <p className="text-[11px] text-[#636366]">
                Allowed types: <code className="text-[#22c55e]/80">str</code>, <code className="text-[#22c55e]/80">int</code>,{" "}
                <code className="text-[#22c55e]/80">float</code>, <code className="text-[#22c55e]/80">bool</code>, <code className="text-[#22c55e]/80">list</code>,{" "}
                <code className="text-[#22c55e]/80">datetime</code>.
              </p>
            </div>
            {error && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-[12px] text-red-300">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 rounded-full bg-[#22c55e] px-4 py-1.5 text-[13px] font-semibold text-[#0a0a0a] shadow-[0_4px_20px_rgba(34,197,94,0.3)] transition-all duration-200 hover:bg-[#16a34a] hover:shadow-[0_4px_24px_rgba(34,197,94,0.45)] disabled:opacity-60"
            >
              {submitting ? "Saving..." : "Register type"}
            </button>
          </form>
        </div>
        <div className="rounded-2xl border border-white/[0.06] bg-[rgba(28,28,30,0.8)] p-3 text-[12px] text-[#a1a1a6]">
          <div className="mb-2 text-[12px] font-semibold uppercase tracking-[0.2em] text-[#636366]">
            Existing types
          </div>
          {fileTypes.length === 0 ? (
            <div className="rounded-xl border border-dashed border-white/[0.08] bg-[rgba(28,28,30,0.6)] px-3 py-2 text-[#636366]">
              No file types registered yet.
            </div>
          ) : (
            <div className="space-y-1.5">
              {fileTypes.map((t) => (
                <div
                  key={t.id}
                  className="flex items-start justify-between gap-2 rounded-xl bg-[rgba(28,28,30,0.9)] px-3 py-2"
                >
                  <div className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-[#22c55e]/60" />
                    <div>
                      <div className="text-[12px] font-medium text-[#f5f5f7]">
                        {t.file_type}
                      </div>
                      <div className="text-[11px] text-[#636366]">
                        {Object.keys(t.metadata_schema ?? {}).length} fields
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DialogShell>
  );
}
