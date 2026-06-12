export interface ValidationResult<T> {
  accepted: T[];
  rejected: Array<{
    record: T;
    reason: string;
    severity: "warning" | "error";
  }>;
}

