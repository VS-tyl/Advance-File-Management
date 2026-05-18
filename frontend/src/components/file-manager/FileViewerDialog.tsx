"use client";

import { useEffect, useState, useCallback } from "react";
import { fetchFileBlob, buildFileUrl } from "@/lib/api";
import type { FileRecord } from "@/types";
import { DialogShell } from "./DialogShell";
import { formatSize } from "./utils";

export interface FileViewerHighlight {
  text: string;
  similarity?: number;
}

export interface FileViewerDialogProps {
  file: FileRecord;
  highlight?: FileViewerHighlight | null;
  onClose: () => void;
}

type ViewerState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ready"; blobUrl: string; mimeType: string; textContent?: string };

function isTextMime(mime: string): boolean {
  if (mime.startsWith("text/")) return true;
  if (mime === "application/json" || mime === "application/xml") return true;
  return false;
}

export default function FileViewerDialog({
  file,
  highlight,
  onClose,
}: FileViewerDialogProps) {
  const [state, setState] = useState<ViewerState>({ status: "loading" });

  const load = useCallback(async () => {
    setState({ status: "loading" });
    try {
      const { blob, mimeType } = await fetchFileBlob(file.id);

      let textContent: string | undefined;
      if (isTextMime(mimeType)) {
        textContent = await blob.text();
      }

      const blobUrl = URL.createObjectURL(blob);
      setState({ status: "ready", blobUrl, mimeType, textContent });
    } catch (err) {
      setState({
        status: "error",
        message: err instanceof Error ? err.message : "Failed to load file.",
      });
    }
  }, [file.id]);

  useEffect(() => {
    load();
    return () => {
      setState((prev) => {
        if (prev.status === "ready") URL.revokeObjectURL(prev.blobUrl);
        return prev;
      });
    };
  }, [load]);

  const handleClose = () => {
    if (state.status === "ready") URL.revokeObjectURL(state.blobUrl);
    onClose();
  };

  return (
    <DialogShell
      title="File viewer"
      onClose={handleClose}
      widthClass="w-full max-w-4xl"
    >
      {/* File info bar */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-[#f5f5f7]">
            {file.name}
          </div>
          <div className="text-[11px] text-[#636366]">
            {file.file_type ?? "Uncategorized"} &middot; {formatSize(file.file_size)}
          </div>
        </div>
        <a
          href={buildFileUrl(file.id, false)}
          download
          className="inline-flex items-center gap-1.5 rounded-full border border-white/[0.08] bg-[rgba(28,28,30,0.9)] px-3 py-1.5 text-[11px] font-medium text-[#a1a1a6] transition-all duration-200 hover:border-[#22c55e]/30 hover:text-[#f5f5f7]"
        >
          <span className="text-[13px] leading-none">↓</span>
          Download
        </a>
      </div>

      {/* Semantic search highlight */}
      {highlight && (
        <div className="mb-3 rounded-xl border border-[#22c55e]/20 bg-[#22c55e]/5 px-3 py-2.5">
          <div className="mb-1 flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-[#22c55e] shadow-[0_0_6px_rgba(34,197,94,0.5)]" />
            <span className="text-[11px] font-medium uppercase tracking-widest text-[#22c55e]">
              Matched chunk
              {highlight.similarity != null && (
                <span className="ml-2 normal-case tracking-normal text-[#22c55e]/70">
                  {(highlight.similarity * 100).toFixed(1)}% similar
                </span>
              )}
            </span>
          </div>
          <div className="text-[12px] leading-relaxed text-[#d1d1d6]">
            {highlight.text}
          </div>
        </div>
      )}

      {/* Content area */}
      <div className="overflow-hidden rounded-xl border border-white/[0.06] bg-[rgba(20,20,22,0.9)]">
        {state.status === "loading" && (
          <div className="flex h-72 items-center justify-center text-[12px] text-[#636366]">
            <span className="animate-pulse">Loading file content...</span>
          </div>
        )}

        {state.status === "error" && (
          <div className="flex h-72 flex-col items-center justify-center gap-2 px-4 text-center">
            <div className="text-[13px] font-medium text-red-400">
              {state.message}
            </div>
            <button
              type="button"
              onClick={load}
              className="mt-1 rounded-full border border-white/[0.08] px-3 py-1 text-[11px] text-[#a1a1a6] transition hover:text-[#f5f5f7]"
            >
              Retry
            </button>
          </div>
        )}

        {state.status === "ready" && (
          <ContentRenderer
            blobUrl={state.blobUrl}
            mimeType={state.mimeType}
            textContent={state.textContent}
            fileName={file.name}
            fileId={file.id}
          />
        )}
      </div>
    </DialogShell>
  );
}

function ContentRenderer(props: {
  blobUrl: string;
  mimeType: string;
  textContent?: string;
  fileName: string;
  fileId: string;
}) {
  const { blobUrl, mimeType, textContent, fileName, fileId } = props;

  if (mimeType === "application/pdf") {
    return (
      <iframe
        src={blobUrl}
        title={fileName}
        className="h-[60vh] w-full border-0"
      />
    );
  }

  if (mimeType.startsWith("image/")) {
    return (
      <div className="flex max-h-[60vh] items-center justify-center overflow-auto p-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={blobUrl}
          alt={fileName}
          className="max-h-full max-w-full rounded-lg object-contain"
        />
      </div>
    );
  }

  if (textContent != null) {
    return (
      <pre className="max-h-[60vh] overflow-auto whitespace-pre-wrap break-words p-4 text-[12px] leading-relaxed text-[#d1d1d6] font-mono">
        {textContent}
      </pre>
    );
  }

  return (
    <div className="flex h-56 flex-col items-center justify-center gap-3 px-4 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#22c55e]/10 text-lg text-[#22c55e]">
        {fileName.split(".").pop()?.toUpperCase().slice(0, 4) ?? "FILE"}
      </div>
      <div className="text-[13px] text-[#a1a1a6]">
        Preview not available for this file type.
      </div>
      <a
        href={buildFileUrl(fileId, false)}
        download
        className="inline-flex items-center gap-1.5 rounded-full bg-[#22c55e] px-4 py-1.5 text-[12px] font-semibold text-[#0a0a0a] shadow-[0_4px_20px_rgba(34,197,94,0.3)] transition-all duration-200 hover:bg-[#16a34a]"
      >
        <span className="text-sm leading-none">↓</span>
        Download file
      </a>
    </div>
  );
}
