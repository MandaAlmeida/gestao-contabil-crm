import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Formata uma data no formato YYYY-MM-DD para DD/MM/YYYY
 * Evita problemas de timezone ao trabalhar diretamente com a string
 */
export function formatarDataBR(dataString: string): string {
  if (!dataString) return "";

  // Se já está no formato YYYY-MM-DD, converte diretamente
  const partes = dataString.split("-");
  if (partes.length === 3) {
    return `${partes[2]}/${partes[1]}/${partes[0]}`;
  }

  // Se não, tenta usar Date mas ajustando para timezone local
  const data = new Date(dataString);
  if (isNaN(data.getTime())) return "";

  // Usa os componentes locais da data para evitar problemas de timezone
  const dia = String(data.getDate()).padStart(2, "0");
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const ano = data.getFullYear();

  return `${dia}/${mes}/${ano}`;
}

/**
 * Formata um número de telefone brasileiro
 * Exemplos:
 * - "3197891102" -> "(31) 9 9789-1102"
 * - "31997891102" -> "(31) 9 9789-1102"
 * - "31978911020" -> "(31) 9 7891-1020"
 */
export function formatarTelefone(telefone: string): string {
  if (!telefone) return "";

  // Remove todos os caracteres não numéricos
  const numeros = telefone.replace(/\D/g, "");

  // Se não tiver números suficientes, retorna como está
  if (numeros.length < 10) return telefone;

  // Formata para celular (11 dígitos) ou fixo (10 dígitos)
  if (numeros.length === 11) {
    // Celular: (XX) 9 XXXX-XXXX
    return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 3)} ${numeros.slice(
      3,
      7
    )}-${numeros.slice(7)}`;
  } else if (numeros.length === 10) {
    // Fixo: (XX) XXXX-XXXX
    return `(${numeros.slice(0, 2)}) ${numeros.slice(2, 6)}-${numeros.slice(
      6
    )}`;
  }

  // Se tiver mais de 11 dígitos, formata os primeiros 11
  if (numeros.length > 11) {
    const numerosLimitados = numeros.slice(0, 11);
    return `(${numerosLimitados.slice(0, 2)}) ${numerosLimitados.slice(
      2,
      3
    )} ${numerosLimitados.slice(3, 7)}-${numerosLimitados.slice(7)}`;
  }

  return telefone;
}
