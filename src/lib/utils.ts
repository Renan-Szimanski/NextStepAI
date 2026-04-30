import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combina classes do Tailwind CSS de forma inteligente.
 * Usado com shadcn/ui.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Gera um identificador único universal (UUID v4).
 */
export function gerarId(): string {
  return crypto.randomUUID();
}