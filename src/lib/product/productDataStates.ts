export type ProductDataState = "loading" | "ready" | "empty" | "partial" | "error";

export interface ProductViewState<T> {
  state: ProductDataState;
  data: T | null;
  message?: string;
}

export function loadingState<T>(): ProductViewState<T> {
  return { state: "loading", data: null, message: "Loading..." };
}

export function readyState<T>(data: T): ProductViewState<T> {
  return { state: "ready", data };
}

export function emptyState<T>(message?: string): ProductViewState<T> {
  return { state: "empty", data: null, message: message || "Not enough information for this view yet." };
}

export function partialState<T>(data: T, message?: string): ProductViewState<T> {
  return { state: "partial", data, message: message || "Partial research context" };
}

export function errorState<T>(message?: string): ProductViewState<T> {
  return { state: "error", data: null, message: message || "Research signals are being prepared." };
}
