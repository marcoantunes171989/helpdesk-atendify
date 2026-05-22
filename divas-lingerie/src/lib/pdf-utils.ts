import { jsPDF } from "jspdf";
import { COMPANY_NAME, OLD_NAMES } from "./constants";

/**
 * Sanitizes text to ensure it always uses the current company name
 * and doesn't contain any known old names.
 */
export function sanitizeText(text: string): string {
  if (!text || typeof text !== 'string') return text;
  
  let sanitized = text;
  
  // Replace known old names
  OLD_NAMES.forEach(oldName => {
    const regex = new RegExp(oldName, 'gi');
    if (regex.test(sanitized)) {
      console.warn(`[PDF Validation] Old name detected and replaced: "${oldName}" -> "${COMPANY_NAME}"`);
      sanitized = sanitized.replace(regex, COMPANY_NAME);
    }
  });
  
  return sanitized;
}

/**
 * Enhanced jsPDF with automatic text sanitization
 */
export class SafejsPDF extends jsPDF {
  // Override text method to sanitize input
  text(text: string | string[], x: number, y: number, options?: any, transform?: any): jsPDF {
    const sanitizedText = Array.isArray(text) 
      ? text.map(t => sanitizeText(t)) 
      : sanitizeText(text);
    return super.text(sanitizedText, x, y, options, transform);
  }
}

/**
 * Helper to ensure a string contains the company name if it's supposed to be a brand header
 */
export function validateBrandName(text: string): string {
  if (text.toLowerCase().includes("divas") && !text.toLowerCase().includes("lingerie")) {
    // If it says "Divas" but not "Lingerie", it might be an old or incomplete name
    // Replace "Divas" followed by something else or end of string with "Divas Lingerie"
    // but avoid matching "Fábrica Divas" which might be a legitimate provider name if that's the case.
    // However, the user wants ALL PDFs to use Divas Lingerie for the company.
    
    // Simple approach: if it's just "Divas", make it "Divas Lingerie"
    if (text.trim() === "Divas") return COMPANY_NAME;
  }
  return sanitizeText(text);
}
