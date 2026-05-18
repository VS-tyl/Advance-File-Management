"use client";

import { useMemo, useState } from "react";
import { searchFiles } from "@/lib/api";
import type { FileRecord, FileType, SearchResult } from "@/types";
import { DialogShell } from "./DialogShell";

export interface SearchDialogProps {
  fileTypes: FileType[];
  files: FileRecord[];
  onClose: () => void;
  onOpenFile: (fileId: string, context?: { chunkText: string; similarity: number }) => void;
}

export default function SearchDialog(props: SearchDialogProps) {
  const { fileTypes, files, onClose, onOpenFile } = props;
  const [query, setQuery] = useState("");
  const [fileType, setFileType] = useState<string>("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileById = useMemo(() => {
    const map = new Map<string, FileRecord>();
    for (const f of files) {
      map.set(String(f.id), f);
    }
    return map;
  }, [files]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      const data = await searchFiles({
        query,
        fileType: fileType || null,
      });
      setResults(data);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Search failed. Try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <DialogShell title="Semantic search" onClose={onClose} widthClass="w-full max-w-2xl">
      <form onSubmit={handleSearch} className="space-y-3">
        <div className="space-y-1">
          <label className="text-[12px] text-[#a1a1a6]">Query</label>
          <input
            className="w-full rounded-xl border border-white/[0.08] bg-[rgba(28,28,30,0.9)] px-3 py-2 text-[13px] text-[#f5f5f7] outline-none placeholder:text-[#636366] transition-colors duration-200 focus:border-[#22c55e]/40"
            placeholder="high budget marketing plans..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            required
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-[2fr,1fr]">
          <div className="space-y-1">
            <label className="text-[12px] text-[#a1a1a6]">File type</label>
            <select
              className="w-full rounded-xl border border-white/[0.08] bg-[rgba(28,28,30,0.9)] px-3 py-2 text-[13px] text-[#f5f5f7] outline-none transition-colors duration-200 focus:border-[#22c55e]/40"
              value={fileType}
              onChange={(e) => setFileType(e.target.value)}
            >
              <option value="">All types</option>
              {fileTypes.map((t) => (
                <option key={t.id} value={t.file_type}>
                  {t.file_type}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={loading}
              className="inline-flex w-full items-center justify-center rounded-full bg-[#22c55e] px-4 py-2 text-[13px] font-semibold text-[#0a0a0a] shadow-[0_4px_20px_rgba(34,197,94,0.3)] transition-all duration-200 hover:bg-[#16a34a] hover:shadow-[0_4px_24px_rgba(34,197,94,0.45)] disabled:opacity-60"
            >
              {loading ? "Searching..." : "Search"}
            </button>
          </div>
        </div>
      </form>
      <div className="mt-3 border-t border-white/[0.06] pt-3">
        {error && (
          <div className="mb-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-[12px] text-red-300">
            {error}
          </div>
        )}
        {loading ? (
          <div className="space-y-2 text-[12px] text-[#a1a1a6]">
            Searching your knowledge base...
          </div>
        ) : results.length === 0 ? (
          <div className="text-[12px] text-[#636366]">
            No results yet. Run a query to see the most relevant chunks across
            your documents.
          </div>
        ) : (
          <div className="space-y-2">
            {results.map((r, idx) => {
              const file = fileById.get(String(r.file_id));
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onOpenFile(String(r.file_id), { chunkText: r.chunk_text, similarity: r.similarity })}
                  className="w-full rounded-2xl border border-white/[0.06] bg-[rgba(28,28,30,0.9)] px-3 py-2.5 text-left text-[12px] text-[#f5f5f7] transition-all duration-200 hover:border-[#22c55e]/30"
                >
                  <div className="mb-1 flex items-center justify-between gap-2">
                    <div className="truncate font-medium">
                      {file?.name ?? `File ${String(r.file_id).slice(0, 8)}...`}
                    </div>
                    <div className="text-[11px] text-[#22c55e]">
                      {(r.similarity * 100).toFixed(1)}% match
                    </div>
                  </div>
                  <div className="line-clamp-2 text-[12px] text-[#a1a1a6]">
                    {r.chunk_text}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </DialogShell>
  );
}
