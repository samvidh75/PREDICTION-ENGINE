/**
 * src/types/jsx-modules.d.ts
 *
 * Module declarations for .jsx files that are authored in JavaScript
 * but imported from TypeScript/TSX files.
 * These shims tell the TypeScript compiler the shape of the exports
 * without requiring the source files to be renamed to .tsx.
 */

declare module "*/AcademyContext.jsx" {
  import type React from "react";

  export interface AcademyContextValue {
    // Opaque — the .jsx file defines the full shape at runtime
    [key: string]: unknown;
  }

  export const AcademyProvider: React.FC<{ children: React.ReactNode }>;
  export function useAcademy(): AcademyContextValue;
}
