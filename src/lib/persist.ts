import { z } from "zod";

export function tolerantArray<T>(schema: z.ZodType<T>) {
  return z
    .unknown()
    .transform((raw) => {
      if (!Array.isArray(raw)) return [] as T[];
      const kept: T[] = [];
      for (const entry of raw) {
        const parsed = schema.safeParse(entry);
        if (parsed.success) kept.push(parsed.data);
      }
      return kept;
    })
    .default([] as T[]);
}

export function tolerantRecord<T>(schema: z.ZodType<T>, normalise?: (value: unknown) => unknown) {
  return z
    .unknown()
    .transform((raw) => {
      const kept: Record<string, T> = {};
      if (!raw || typeof raw !== "object" || Array.isArray(raw)) return kept;
      for (const [key, value] of Object.entries(raw)) {
        const parsed = schema.safeParse(normalise ? normalise(value) : value);
        if (parsed.success) kept[key] = parsed.data;
      }
      return kept;
    })
    .default({} as Record<string, T>);
}

export function keepPersisted(persisted: unknown): unknown {
  return persisted;
}

export function mergePersisted<P, S>(
  name: string,
  schema: z.ZodType<P>,
  persisted: unknown,
  current: S,
  build: (parsed: P) => S,
): S {
  if (persisted === undefined || persisted === null) return current;

  const result = schema.safeParse(persisted);
  if (!result.success) {
    const detail = result.error.issues
      .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("; ");
    console.warn(`Resetting "${name}" — stored data could not be read. ${detail}`);
    return current;
  }
  return build(result.data);
}
