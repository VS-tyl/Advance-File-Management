import type { FileRecord } from "@/types";

export interface FolderNode {
  name: string;
  path: string;
  children: FolderNode[];
}

export function normalizeFolderPath(path: string): string {
  if (!path) return "/";
  let p = path.trim();
  if (!p.startsWith("/")) {
    p = "/" + p;
  }
  p = p.replace(/\/+/g, "/");
  if (p.length > 1 && p.endsWith("/")) {
    p = p.slice(0, -1);
  }
  return p || "/";
}

export function buildFolderTree(files: FileRecord[]): FolderNode[] {
  const rootMap = new Map<string, FolderNode>();

  const ensureNode = (segments: string[]): FolderNode => {
    if (segments.length === 1 && segments[0] === "/") {
      const key = "/";
      if (rootMap.has(key)) {
        return rootMap.get(key)!;
      }
      const node: FolderNode = {
        name: "Root",
        path: "/",
        children: [],
      };
      rootMap.set(key, node);
      return node;
    }
    const key = segments.join("/");
    if (rootMap.has(key)) {
      return rootMap.get(key)!;
    }
    const name = segments[segments.length - 1] || "/";
    const node: FolderNode = {
      name,
      path: normalizeFolderPath("/" + segments.filter(Boolean).join("/")),
      children: [],
    };
    rootMap.set(key, node);
    return node;
  };

  for (const file of files) {
    const folderPath = normalizeFolderPath(file.folder_path || "/");
    const cleaned = folderPath === "/" ? "" : folderPath.slice(1);
    const segments = cleaned.split("/").filter(Boolean);
    if (segments.length === 0) {
      ensureNode(["/"]);
      continue;
    }

    let currentSegments: string[] = [];
    for (const segment of segments) {
      currentSegments.push(segment);
      const currentNode = ensureNode(currentSegments);
      const parentKey =
        currentSegments.length === 1
          ? "/"
          : currentSegments.slice(0, -1).join("/");
      if (!rootMap.has(parentKey) && parentKey !== "/") {
        ensureNode(currentSegments.slice(0, -1));
      }
      const parent =
        currentSegments.length === 1
          ? rootMap.get("/") ?? ensureNode(["/"])
          : rootMap.get(parentKey);
      if (parent && !parent.children.find((c) => c.path === currentNode.path)) {
        parent.children.push(currentNode);
      }
    }
  }

  const root = rootMap.get("/") ?? {
    name: "/",
    path: "/",
    children: [],
  };

  return [root];
}

export function formatSize(bytes: number): string {
  if (!bytes || bytes <= 0) return "—";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

export function formatMetadataValue(value: unknown): string {
  if (value === null || value === undefined) return "—";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) {
    return value.join(", ");
  }
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

