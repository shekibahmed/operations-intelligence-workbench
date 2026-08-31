import { z } from "zod";

export type JsonValue =
  | boolean
  | null
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };

export const JsonValueSchema: z.ZodType<JsonValue> = z.lazy(() =>
  z.union([
    z.string(),
    z.number().finite(),
    z.boolean(),
    z.null(),
    z.array(JsonValueSchema),
    z.record(z.string(), JsonValueSchema),
  ]),
);

export const IdSchema = z.string().uuid();
export const TimestampSchema = z.string().datetime({ offset: true });
export const ChecksumSchema = z.string().regex(
  /^[a-f0-9]{64}$/u,
  "Expected a lowercase SHA-256 checksum",
);
export const SlugSchema = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/u, "Expected a kebab-case identifier");
export const VersionSchema = z
  .string()
  .regex(/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/u, "Expected a semantic version");

export type SchemaType<T extends z.ZodType> = z.infer<T>;
