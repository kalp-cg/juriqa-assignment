import { DocumentRecord } from './db';
import { ExtractedClause } from './documentProcessor';
import { diffWords } from 'diff';

export type SignificanceLevel = 'high' | 'medium' | 'low';

export interface ClauseDiff {
  id: string;
  clauseTitle: string;
  clauseNumber: string;
  status: 'added' | 'removed' | 'modified' | 'unchanged';
  textA: string;
  textB: string;
  significance: SignificanceLevel;
  explanation: string;
  numericChange?: { from?: string; to?: string };
  wordDiff?: { added?: boolean; removed?: boolean; value: string }[];
}

export interface ComparisonResult {
  id: string;
  docA: { id: string; filename: string };
  docB: { id: string; filename: string };
  summary: string;
  totalDiffs: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  diffs: ClauseDiff[];
}

// Key legal categories that represent high risk or material exposure
const HIGH_RISK_KEYWORDS = [
  'liability', 'cap', 'indemn', 'warranty', 'guarantee',
  'termination', 'liquidated', 'penalt', 'jurisdiction', 'governing law',
  'arbitration', 'payment', 'damages', 'consequential', 'sole remedy'
];

/**
 * Extracts monetary amounts, percentages, and numbers from text
 */
function extractNumbersAndCurrencies(text: string): string[] {
  const regex = /(?:AED|USD|EUR|GBP|\$|€|£)?\s*[0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]+)?%?/g;
  const matches = text.match(regex) || [];
  return matches.map(m => m.trim()).filter(m => m.length > 0 && /\d/.test(m));
}

/**
 * Assesses legal significance of clause changes
 */
function evaluateSignificance(
  clauseTitle: string,
  textA: string,
  textB: string,
  status: 'added' | 'removed' | 'modified' | 'unchanged'
): { significance: SignificanceLevel; explanation: string } {
  if (status === 'unchanged') {
    return { significance: 'low', explanation: 'No substantive changes detected.' };
  }

  const titleLower = clauseTitle.toLowerCase();
  const textALower = textA.toLowerCase();
  const textBLower = textB.toLowerCase();

  const isHighRiskClause = HIGH_RISK_KEYWORDS.some(k => titleLower.includes(k));

  if (status === 'added') {
    return {
      significance: isHighRiskClause ? 'high' : 'medium',
      explanation: `Entirely new clause added: "${clauseTitle}". Introduces new obligations not present in the earlier version.`,
    };
  }

  if (status === 'removed') {
    return {
      significance: isHighRiskClause ? 'high' : 'medium',
      explanation: `Clause deleted: "${clauseTitle}". Removes previous rights or obligations.`,
    };
  }

  // Check for numerical or monetary shifts
  const numsA = extractNumbersAndCurrencies(textA);
  const numsB = extractNumbersAndCurrencies(textB);

  const numChanges: string[] = [];
  for (const nB of numsB) {
    if (!numsA.includes(nB)) {
      numChanges.push(nB);
    }
  }

  if (numChanges.length > 0) {
    return {
      significance: 'high',
      explanation: `Substantive numeric modification: changes monetary cap, percentage, or timeline threshold (e.g. from [${numsA.slice(0, 3).join(', ')}] to [${numsB.slice(0, 3).join(', ')}]).`,
    };
  }

  // Check for liability/indemnity shifts
  if (isHighRiskClause) {
    return {
      significance: 'high',
      explanation: `Material amendment in high-stakes clause "${clauseTitle}". Directly impacts risk allocation, exposure, or legal remedies.`,
    };
  }

  // Word-level variation ratio
  const lenDiff = Math.abs(textA.length - textB.length);
  if (lenDiff > 100) {
    return {
      significance: 'medium',
      explanation: `Significant modification to provisions in "${clauseTitle}", expanding or narrowing scope of duties.`,
    };
  }

  return {
    significance: 'low',
    explanation: `Minor stylistic or linguistic rewording in "${clauseTitle}" with no major change to substantive legal effect.`,
  };
}

/**
 * Compares two contract documents clause-by-clause
 */
export function compareContracts(docA: DocumentRecord, docB: DocumentRecord): ComparisonResult {
  let clausesA: ExtractedClause[] = [];
  let clausesB: ExtractedClause[] = [];

  try {
    clausesA = JSON.parse(docA.clauses_json);
  } catch {
    clausesA = [];
  }
  try {
    clausesB = JSON.parse(docB.clauses_json);
  } catch {
    clausesB = [];
  }

  const diffs: ClauseDiff[] = [];
  const processedBIds = new Set<string>();

  let diffIndex = 1;

  for (const cA of clausesA) {
    // Find matching clause in B by number or similar title
    const matchB = clausesB.find(
      cB =>
        cB.number.trim().toLowerCase() === cA.number.trim().toLowerCase() ||
        cB.title.trim().toLowerCase() === cA.title.trim().toLowerCase()
    );

    if (!matchB) {
      // Removed in B
      const { significance, explanation } = evaluateSignificance(cA.title, cA.text, '', 'removed');
      diffs.push({
        id: `diff_${diffIndex++}`,
        clauseTitle: cA.title,
        clauseNumber: cA.number,
        status: 'removed',
        textA: cA.text,
        textB: '',
        significance,
        explanation,
      });
    } else {
      processedBIds.add(matchB.id);

      const normA = cA.text.replace(/\s+/g, ' ').trim();
      const normB = matchB.text.replace(/\s+/g, ' ').trim();

      if (normA === normB) {
        diffs.push({
          id: `diff_${diffIndex++}`,
          clauseTitle: cA.title,
          clauseNumber: cA.number,
          status: 'unchanged',
          textA: cA.text,
          textB: matchB.text,
          significance: 'low',
          explanation: 'Clause remains identical between versions.',
        });
      } else {
        const { significance, explanation } = evaluateSignificance(cA.title, cA.text, matchB.text, 'modified');
        const wordDiff = diffWords(cA.text, matchB.text).map(part => ({
          added: part.added,
          removed: part.removed,
          value: part.value,
        }));

        diffs.push({
          id: `diff_${diffIndex++}`,
          clauseTitle: cA.title,
          clauseNumber: cA.number,
          status: 'modified',
          textA: cA.text,
          textB: matchB.text,
          significance,
          explanation,
          wordDiff,
        });
      }
    }
  }

  // Check for newly added clauses in B
  for (const cB of clausesB) {
    if (!processedBIds.has(cB.id)) {
      const { significance, explanation } = evaluateSignificance(cB.title, '', cB.text, 'added');
      diffs.push({
        id: `diff_${diffIndex++}`,
        clauseTitle: cB.title,
        clauseNumber: cB.number,
        status: 'added',
        textA: '',
        textB: cB.text,
        significance,
        explanation,
      });
    }
  }

  // Summary counts
  const highCount = diffs.filter(d => d.significance === 'high').length;
  const mediumCount = diffs.filter(d => d.significance === 'medium').length;
  const lowCount = diffs.filter(d => d.significance === 'low').length;
  const totalDiffs = diffs.filter(d => d.status !== 'unchanged').length;

  const executiveSummary =
    `Comparison of **${docA.filename}** (v1) and **${docB.filename}** (v2) revealed **${totalDiffs} clause-level differences**.\n\n` +
    `- **${highCount} High-Significance changes**: Material impacts to risk allocation, monetary caps, or critical legal clauses.\n` +
    `- **${mediumCount} Medium-Significance changes**: Substantive operational or procedural modifications.\n` +
    `- **${lowCount} Low-Significance changes**: Stylistic or minor grammatical adjustments without changing legal effect.\n\n` +
    `Review high-priority clauses first to evaluate shifted obligations before signing.`;

  return {
    id: `comp_${Date.now()}`,
    docA: { id: docA.id, filename: docA.filename },
    docB: { id: docB.id, filename: docB.filename },
    summary: executiveSummary,
    totalDiffs,
    highCount,
    mediumCount,
    lowCount,
    diffs,
  };
}
