"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import { getFiles, getFileTypes, deleteFile } from "@/lib/api";
import type { FileRecord, FileType } from "@/types";
import type { FileViewerHighlight } from "./FileViewerDialog";
import {
  buildFolderTree,
  FolderNode,
  formatMetadataValue,
  formatSize,
  normalizeFolderPath,
} from "./utils";
import { LiquidShell } from "@/components/ui/liquid-shell";

const TypesDialog = dynamic(() => import("./TypesDialog"));
const UploadDialog = dynamic(() => import("./UploadDialog"));
const SearchDialog = dynamic(() => import("./SearchDialog"));
const FileViewerDialog = dynamic(() => import("./FileViewerDialog"));

export function FileManagerShell() {
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<string>("/");
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [fileTypes, setFileTypes] = useState<FileType[]>([]);
  const [typesOpen, setTypesOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [viewerOpen, setViewerOpen] = useState(false);
  const [viewerHighlight, setViewerHighlight] = useState<FileViewerHighlight | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const anyDialogOpen = typesOpen || uploadOpen || searchOpen || viewerOpen;

  useEffect(() => {
    if (anyDialogOpen) {
      const original = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = original;
      };
    }
    return;
  }, [anyDialogOpen]);

  useEffect(() => {
    async function load() {
      try {
        setLoading(true);
        const data = await getFiles();
        setFiles(data.files ?? []);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load files");
      } finally {
        setLoading(false);
      }
    }
    async function loadTypes() {
      try {
        const data = await getFileTypes();
        setFileTypes(data);
      } catch {
        // ignore for initial render; surfaced in types dialog if needed
      } finally {
        // no-op
      }
    }
    load();
    loadTypes();
  }, []);

  const folderTree = useMemo(() => buildFolderTree(files), [files]);

  const visibleFiles = useMemo(
    () =>
      files.filter((f) => {
        const fileFolder = normalizeFolderPath(f.folder_path || "/");
        const selected = normalizeFolderPath(selectedFolder);
        if (selected === "/") {
          return fileFolder === "/";
        }
        return fileFolder === selected;
      }),
    [files, selectedFolder],
  );

  const selectedFile = useMemo(
    () => files.find((f) => f.id === selectedFileId) ?? null,
    [files, selectedFileId],
  );

  useEffect(() => {
    setConfirmingDelete(false);
  }, [selectedFileId]);

  const handleDelete = useCallback(async () => {
    if (!selectedFileId) return;
    try {
      setDeleting(true);
      await deleteFile(selectedFileId);
      setFiles((prev) => prev.filter((f) => f.id !== selectedFileId));
      setSelectedFileId(null);
      setConfirmingDelete(false);
      setToast("File deleted");
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeleting(false);
    }
  }, [selectedFileId]);

  return (
    <LiquidShell>
      {/* Sidebar */}
      <aside className="hidden w-60 flex-shrink-0 border-r border-white/[0.06] bg-[rgba(22,22,24,0.85)] backdrop-blur-2xl p-4 sm:flex sm:flex-col">
        <div className="mb-4 text-[13px] font-semibold uppercase tracking-[0.18em] text-[#a1a1a6]">
          Folders
        </div>
        <div className="flex-1 space-y-0.5 overflow-y-auto pr-1 text-[13px]">
          {folderTree.map((node) => (
            <FolderItem
              key={node.path}
              node={node}
              depth={0}
              selected={selectedFolder}
              onSelect={setSelectedFolder}
            />
          ))}
        </div>
      </aside>

      {/* Main content */}
      <main className="flex min-w-0 flex-1 flex-col bg-transparent">
        {/* Top bar */}
        <header className="flex items-center justify-between border-b border-white/[0.06] px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#22c55e]/15 ring-1 ring-[#22c55e]/20">
              <span className="text-xs font-bold text-[#22c55e]">
                FM
              </span>
            </div>
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#a1a1a6]">
                Document Studio
              </div>
              <div className="text-sm font-medium text-[#f5f5f7]">
                Intelligent File Manager
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="hidden items-center gap-2 rounded-full border border-white/[0.08] bg-[rgba(28,28,30,0.9)] px-3.5 py-1.5 text-xs text-[#a1a1a6] backdrop-blur-2xl transition-all duration-200 hover:border-[#22c55e]/30 hover:text-[#f5f5f7] sm:flex"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-[#22c55e] shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-[pulseGreen_3s_ease-in-out_infinite]" />
              Semantic search
            </button>
            <button
              type="button"
              onClick={() => setTypesOpen(true)}
              className="hidden rounded-full border border-white/[0.08] bg-[rgba(28,28,30,0.9)] px-3.5 py-1.5 text-xs font-medium text-[#a1a1a6] backdrop-blur-2xl transition-all duration-200 hover:border-[#22c55e]/30 hover:text-[#f5f5f7] sm:inline-flex"
            >
              File types
            </button>
            <button
              type="button"
              onClick={() => setUploadOpen(true)}
              className="inline-flex items-center gap-2 rounded-full bg-[#22c55e] px-4 py-1.5 text-xs font-semibold text-[#0a0a0a] shadow-[0_4px_20px_rgba(34,197,94,0.3)] transition-all duration-200 hover:bg-[#16a34a] hover:shadow-[0_4px_24px_rgba(34,197,94,0.45)]"
            >
              <span className="text-sm leading-none">+</span>
              Upload
            </button>
          </div>
        </header>

        {/* Content body */}
        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          {/* Files grid */}
          <section className="flex min-w-0 flex-1 flex-col border-b border-white/[0.06] md:border-b-0 md:border-r px-3 py-3 sm:px-4 sm:py-4">
            <div className="mb-3 flex items-center justify-between gap-2">
              <div className="flex flex-col">
                <div className="text-[12px] font-medium uppercase tracking-[0.18em] text-[#a1a1a6]">
                  {selectedFolder === "/" ? "Root" : selectedFolder}
                </div>
                <div className="text-sm text-[#636366]">
                  {loading
                    ? "Loading files..."
                    : `${visibleFiles.length} item${
                        visibleFiles.length === 1 ? "" : "s"
                      }`}
                </div>
              </div>
            </div>

            <div className="relative flex-1 overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.03] p-3 shadow-[0_8px_40px_rgba(0,0,0,0.4)] backdrop-blur-3xl sm:p-4">
              {error && (
                <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-red-500/5 px-4 text-center text-sm text-red-300">
                  {error}
                </div>
              )}
              {loading ? (
                <div className="grid h-full grid-cols-2 gap-3 xs:grid-cols-3 sm:grid-cols-3 md:grid-cols-4">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div
                      key={i}
                      className="animate-pulse rounded-2xl border border-white/[0.06] bg-[rgba(28,28,30,0.8)] p-3"
                    >
                      <div className="mb-6 h-7 w-7 rounded-xl bg-[#2c2c2e]" />
                      <div className="mb-1.5 h-3 w-3/4 rounded-full bg-[#2c2c2e]" />
                      <div className="mb-1 h-2.5 w-1/2 rounded-full bg-[#1c1c1e]" />
                      <div className="h-2.5 w-2/3 rounded-full bg-[#1c1c1e]" />
                    </div>
                  ))}
                </div>
              ) : visibleFiles.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center text-sm text-[#a1a1a6]">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#22c55e]/10">
                    <span className="text-2xl">📁</span>
                  </div>
                  <div className="mb-1 font-medium text-[#f5f5f7]">
                    No files in this space yet
                  </div>
                  <p className="max-w-xs text-[13px] text-[#636366]">
                    Upload a document from the toolbar to populate this smart
                    file manager. Folders are inferred from your uploads.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-3 xs:grid-cols-3 sm:grid-cols-3 md:grid-cols-4">
                  {visibleFiles.map((file) => {
                    const isActive = selectedFileId === file.id;
                    return (
                      <button
                        key={file.id}
                        type="button"
                        onClick={() => setSelectedFileId(file.id)}
                        className={[
                          "group flex flex-col items-start rounded-2xl border px-3 py-3 text-left text-xs backdrop-blur-3xl transition-all duration-200",
                          isActive
                            ? "border-[#22c55e]/30 bg-[rgba(28,28,30,0.95)] ring-1 ring-[#22c55e]/40 shadow-[0_0_20px_rgba(34,197,94,0.1)]"
                            : "border-white/[0.06] bg-[rgba(28,28,30,0.8)] hover:border-white/[0.12] hover:bg-[rgba(34,34,36,0.9)]",
                        ].join(" ")}
                      >
                        <div className={[
                          "mb-3 flex h-8 w-8 items-center justify-center rounded-xl text-[11px] font-bold transition-colors duration-200",
                          isActive
                            ? "bg-[#22c55e]/20 text-[#22c55e]"
                            : "bg-[#22c55e]/10 text-[#22c55e]/80 group-hover:bg-[#22c55e]/15 group-hover:text-[#22c55e]",
                        ].join(" ")}>
                          {file.file_type?.[0]?.toUpperCase() ??
                            file.name[0]?.toUpperCase() ??
                            "F"}
                        </div>
                        <div className="mb-1 line-clamp-2 w-full text-[12px] font-medium text-[#f5f5f7]">
                          {file.name}
                        </div>
                        <div className="flex w-full items-center justify-between text-[11px] text-[#636366]">
                          <span className="truncate">
                            {file.file_type ?? "Uncategorized"}
                          </span>
                          <span className="ml-1 flex-shrink-0 text-[10px] text-[#636366]">
                            {formatSize(file.file_size)}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </section>

          {/* Details panel */}
          <section className="w-full flex-shrink-0 flex-col bg-[rgba(22,22,24,0.4)] backdrop-blur-xl px-3 py-3 sm:px-4 sm:py-4 md:flex md:w-80">
            <div className="mb-3 flex items-center gap-2">
              <div className="text-[12px] font-semibold uppercase tracking-[0.18em] text-[#a1a1a6]">
                Details
              </div>
              <div className="h-px flex-1 bg-[#22c55e]/10" />
            </div>
            <div className="flex-1 overflow-hidden rounded-2xl border border-white/[0.06] bg-white/[0.03] p-3 text-xs text-[#a1a1a6] shadow-[0_8px_40px_rgba(0,0,0,0.3)] backdrop-blur-3xl sm:p-4">
              {selectedFile ? (
                <div className="flex h-full flex-col gap-3">
                  <div>
                    <div className="mb-1 text-[11px] font-medium uppercase tracking-[0.18em] text-[#636366]">
                      File
                    </div>
                    <div className="text-sm font-semibold text-[#f5f5f7]">
                      {selectedFile.name}
                    </div>
                    <div className="mt-1 text-[12px] text-[#636366]">
                      {selectedFile.file_type ?? "Uncategorized"} &middot;{" "}
                      {formatSize(selectedFile.file_size)}
                    </div>
                    <div className="mt-1 text-[12px] text-[#636366]">
                      {selectedFile.folder_path || "/"}
                    </div>
                  </div>

                  <div className="mt-1 border-t border-white/[0.06] pt-3">
                    <div className="mb-2 flex items-center gap-2">
                      <div className="text-[11px] font-medium uppercase tracking-[0.18em] text-[#636366]">
                        Metadata
                      </div>
                      <div className="h-px flex-1 bg-[#22c55e]/10" />
                    </div>
                    {Object.keys(selectedFile.metadata_value || {}).length ===
                    0 ? (
                      <div className="rounded-xl border border-dashed border-white/[0.08] bg-[rgba(28,28,30,0.6)] px-3 py-2 text-[12px] text-[#636366]">
                        No metadata captured for this file.
                      </div>
                    ) : (
                      <div className="space-y-1.5">
                        {Object.entries(
                          selectedFile.metadata_value || {},
                        ).map(([key, value]) => (
                          <div
                            key={key}
                            className="flex items-start justify-between gap-2 rounded-xl bg-[rgba(28,28,30,0.9)] px-3 py-2"
                          >
                            <div className="text-[12px] font-medium text-[#f5f5f7]">
                              {key}
                            </div>
                            <div className="max-w-[55%] text-right text-[12px] text-[#a1a1a6]">
                              {formatMetadataValue(value)}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="mt-3 flex gap-2 border-t border-white/[0.06] pt-3">
                    <button
                      type="button"
                      onClick={() => {
                        setViewerHighlight(null);
                        setViewerOpen(true);
                      }}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-full bg-[#22c55e] px-4 py-2 text-[12px] font-semibold text-[#0a0a0a] shadow-[0_4px_20px_rgba(34,197,94,0.3)] transition-all duration-200 hover:bg-[#16a34a] hover:shadow-[0_4px_24px_rgba(34,197,94,0.45)]"
                    >
                      View file
                    </button>
                    {!confirmingDelete ? (
                      <button
                        type="button"
                        onClick={() => setConfirmingDelete(true)}
                        title="Delete file"
                        className="flex h-[34px] w-[34px] flex-shrink-0 items-center justify-center rounded-full border border-red-500/20 bg-red-500/10 text-red-400 transition-all duration-200 hover:border-red-500/40 hover:bg-red-500/20 hover:text-red-300"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                      </button>
                    ) : (
                      <div className="flex flex-shrink-0 items-center gap-1">
                        <button
                          type="button"
                          disabled={deleting}
                          onClick={handleDelete}
                          className="rounded-full bg-red-500 px-3 py-1.5 text-[11px] font-semibold text-white transition-all duration-200 hover:bg-red-600 disabled:opacity-60"
                        >
                          {deleting ? "..." : "Yes"}
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmingDelete(false)}
                          className="rounded-full border border-white/[0.08] px-3 py-1.5 text-[11px] text-[#a1a1a6] transition hover:text-[#f5f5f7]"
                        >
                          No
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex h-full flex-col items-center justify-center text-center text-[#636366]">
                  <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#22c55e]/10">
                    <span className="text-2xl">✦</span>
                  </div>
                  <div className="mb-1 text-[13px] font-medium text-[#f5f5f7]">
                    Select a file
                  </div>
                  <p className="max-w-xs text-[12px]">
                    Choose a document from the grid to see its rich metadata
                    and placement in your knowledge space.
                  </p>
                </div>
              )}
            </div>
          </section>
        </div>
      </main>

      {typesOpen && (
        <TypesDialog
          fileTypes={fileTypes}
          onClose={() => setTypesOpen(false)}
          onRegistered={(t) => {
            setFileTypes((prev) => [...prev, t]);
            setToast("File type registered");
          }}
        />
      )}

      {uploadOpen && (
        <UploadDialog
          fileTypes={fileTypes}
          defaultFolder={selectedFolder}
          onClose={() => setUploadOpen(false)}
          onUploaded={(newFile) => {
            setFiles((prev) => [...prev, newFile]);
            setSelectedFileId(newFile.id);
            setToast("File uploaded");
          }}
        />
      )}

      {searchOpen && (
        <SearchDialog
          fileTypes={fileTypes}
          files={files}
          onClose={() => setSearchOpen(false)}
          onOpenFile={(fileId, context) => {
            setSelectedFileId(fileId);
            setSearchOpen(false);
            if (context) {
              setViewerHighlight({ text: context.chunkText, similarity: context.similarity });
            } else {
              setViewerHighlight(null);
            }
            setViewerOpen(true);
          }}
        />
      )}

      {viewerOpen && selectedFile && (
        <FileViewerDialog
          file={selectedFile}
          highlight={viewerHighlight}
          onClose={() => {
            setViewerOpen(false);
            setViewerHighlight(null);
          }}
        />
      )}

      {toast && (
        <div className="pointer-events-none fixed inset-x-0 bottom-6 flex justify-center animate-[fadeInUp_0.3s_ease-out]">
          <div className="pointer-events-auto rounded-full border border-[#22c55e]/20 bg-[rgba(28,28,30,0.95)] px-4 py-2 text-xs text-[#f5f5f7] shadow-[0_8px_30px_rgba(0,0,0,0.4),0_0_15px_rgba(34,197,94,0.15)] backdrop-blur-2xl">
            <span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-[#22c55e]" />
            {toast}
          </div>
        </div>
      )}
    </LiquidShell>
  );
}

function FolderItem(props: {
  node: FolderNode;
  depth: number;
  selected: string;
  onSelect: (path: string) => void;
}) {
  const { node, depth, selected, onSelect } = props;
  const isRoot = node.path === "/";
  const isActive = selected === node.path;

  return (
    <div>
      <button
        type="button"
        onClick={() => onSelect(node.path)}
        className={[
          "group flex w-full items-center rounded-lg px-2 py-1.5 text-left text-[13px] transition-all duration-200",
          isActive
            ? "bg-[#22c55e]/15 text-[#22c55e] border-l-2 border-[#22c55e]"
            : "text-[#a1a1a6] hover:bg-white/[0.04] hover:text-[#f5f5f7]",
        ].join(" ")}
        style={{ paddingLeft: 8 + depth * 14 }}
      >
        <span className={[
          "mr-2 text-[11px] transition-transform duration-200",
          isActive ? "text-[#22c55e]" : "text-[#636366] group-hover:text-[#a1a1a6]",
        ].join(" ")}>
          {isRoot ? "⌂" : "›"}
        </span>
        <span className="truncate">{isRoot ? "Root" : node.name}</span>
      </button>
      {node.children.length > 0 && (
        <div className="mt-0.5 space-y-0.5">
          {node.children.map((child) => (
            <FolderItem
              key={child.path}
              node={child}
              depth={depth + 1}
              selected={selected}
              onSelect={onSelect}
            />
          ))}
        </div>
      )}
    </div>
  );
}
