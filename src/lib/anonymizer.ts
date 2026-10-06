/**
 * Enterprise PII Anonymization Engine for Legal Contracts
 * Detects and redacts sensitive entities (Parties, Emails, Phone Numbers, Monetary Figures)
 */

export interface AnonymizationResult {
  anonymizedText: string;
  replacementCount: number;
  entityMap: Record<string, string>;
}

export function anonymizeContractText(text: string): AnonymizationResult {
  if (!text) {
    return { anonymizedText: '', replacementCount: 0, entityMap: {} };
  }

  let anonymized = text;
  let count = 0;
  const entityMap: Record<string, string> = {};

  // 1. Email addresses
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
  let emailIdx = 1;
  anonymized = anonymized.replace(emailRegex, (match) => {
    count++;
    const placeholder = `[EMAIL_${emailIdx++}]`;
    entityMap[placeholder] = match;
    return placeholder;
  });

  // 2. Phone numbers (international and local)
  const phoneRegex = /(?:\+?\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}\b/g;
  let phoneIdx = 1;
  anonymized = anonymized.replace(phoneRegex, (match) => {
    if (match.length >= 8) {
      count++;
      const placeholder = `[PHONE_${phoneIdx++}]`;
      entityMap[placeholder] = match;
      return placeholder;
    }
    return match;
  });

  // 3. Monetary amounts (AED, USD, EUR, GBP, INR, etc.)
  const moneyRegex = /(?:AED|USD|EUR|GBP|INR|Rs\.?|\$|€|£|₹)\s*[\d,]+(?:\.\d{2})?|\b[\d,]+(?:\.\d{2})?\s*(?:AED|Dirhams|USD|Dollars|Euros|Rupees)\b/gi;
  let moneyIdx = 1;
  anonymized = anonymized.replace(moneyRegex, (match) => {
    count++;
    const placeholder = `[FINANCIAL_VAL_${moneyIdx++}]`;
    entityMap[placeholder] = match;
    return placeholder;
  });

  // 4. Common contract party entity patterns: "between [X] and [Y]"
  const partyRegex = /(?:between|amongst|by and between)\s+([A-Z][A-Za-z0-9\s,\.]{2,40}?)\s+(?:and|,|having)\s+([A-Z][A-Za-z0-9\s,\.]{2,40}?)(?=\s+(?:collectively|hereinafter|\(|\.))/g;
  anonymized = anonymized.replace(partyRegex, (fullMatch, partyA, partyB) => {
    count += 2;
    const placeholderA = `[PARTY_A]`;
    const placeholderB = `[PARTY_B]`;
    entityMap[placeholderA] = partyA.trim();
    entityMap[placeholderB] = partyB.trim();
    return fullMatch.replace(partyA, placeholderA).replace(partyB, placeholderB);
  });

  return {
    anonymizedText: anonymized,
    replacementCount: count,
    entityMap,
  };
}
