// src/hooks/auth/useAuth.tsx
import { useAuth as useFirebaseAuth } from "../../context/AuthContext";
import type { AuthContextType } from "../../context/AuthContext";

export const useAuth = (): AuthContextType => {
  return useFirebaseAuth();
};
