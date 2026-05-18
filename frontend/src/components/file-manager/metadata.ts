import type { FileType } from "@/types";

export type NormalizedMetadataSchemaField = {
  type: string;
  required?: boolean;
  default?: unknown;
};

export type NormalizedMetadataSchema = Record<
  string,
  NormalizedMetadataSchemaField
>;

export function normalizeMetadataSchema(
  schema: FileType["metadata_schema"] | undefined,
): NormalizedMetadataSchema {
  if (!schema) return {};
  const result: NormalizedMetadataSchema = {};
  for (const [key, value] of Object.entries(schema)) {
    if (typeof value === "string") {
      result[key] = { type: value };
    } else if (value && typeof value === "object") {
      result[key] = {
        type: value.type,
        required: value.required,
        default: value.default,
      };
    }
  }
  return result;
}

export function buildMetadataFromSchema(
  schema: NormalizedMetadataSchema,
  rawValues: Record<string, any>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [field, def] of Object.entries(schema)) {
    let raw = rawValues[field];
    if (raw === undefined || raw === null || raw === "") {
      if (def.default !== undefined) {
        result[field] = def.default;
        continue;
      }
      if (def.required) {
        continue;
      }
    }
    switch (def.type) {
      case "int": {
        const n = typeof raw === "number" ? raw : Number(raw);
        if (!Number.isNaN(n)) {
          result[field] = Math.trunc(n);
        }
        break;
      }
      case "float": {
        const n = typeof raw === "number" ? raw : Number(raw);
        if (!Number.isNaN(n)) {
          result[field] = n;
        }
        break;
      }
      case "bool": {
        result[field] = Boolean(raw);
        break;
      }
      case "list": {
        if (Array.isArray(raw)) {
          result[field] = raw;
        } else if (typeof raw === "string") {
          result[field] = raw
            .split(",")
            .map((v) => v.trim())
            .filter(Boolean);
        } else if (raw !== undefined && raw !== null) {
          result[field] = [raw];
        }
        break;
      }
      case "datetime": {
        if (typeof raw === "string" && raw) {
          result[field] = raw;
        }
        break;
      }
      case "str":
      default: {
        if (raw !== undefined && raw !== null) {
          result[field] = String(raw);
        }
        break;
      }
    }
  }
  return result;
}

