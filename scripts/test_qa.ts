import fs from 'fs';
import { db } from '../src/lib/db';
import { extractQuotesFromAnswer, verifyAllQuotes } from '../src/lib/quoteVerifier';

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
  'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
  'to', 'was', 'were', 'will', 'with', 'tell', 'me', 'what', 'which',
  'who', 'where', 'when', 'why', 'how', 'give', 'show', 'does', 'did',
  'about', 'please', 'can', 'you', 'given', 'person', 'candidate'
]);

function extractKeywords(query: string): string[] {
  return query
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w));
}

function answerQuestion(query: string, rawText: string, docName: string) {
  const keywords = extractKeywords(query);
  const qLow = query.toLowerCase();
  const lines = rawText.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  // 1. Name query
  if (qLow.includes('name') || qLow.includes('who is') || (keywords.length === 0 && qLow.includes('person'))) {
    const firstLine = lines[0];
    return {
      answer: `The name of the individual in **${docName}** is **${firstLine}**.\n\n` +
        `This is stated at the top of Page 1:\n\n` +
        `> "${firstLine}"`,
      quote: firstLine,
    };
  }

  // 2. Education / University / College query
  if (qLow.includes('university') || qLow.includes('education') || qLow.includes('college') || qLow.includes('degree') || qLow.includes('school')) {
    const eduIdx = lines.findIndex(l => /education/i.test(l));
    let uniLine = '';
    let degreeLine = '';

    if (eduIdx !== -1) {
      uniLine = lines[eduIdx + 1] || '';
      degreeLine = lines[eduIdx + 2] || '';
    } else {
      const uLine = lines.find(l => /university|institute|college|b\.tech|bachelor|master/i.test(l));
      uniLine = uLine || '';
    }

    const cleanUni = uniLine.replace(/^[•\-\–\s]+/, '').trim();
    const cleanDegree = degreeLine.replace(/^[•\-\–\s]+/, '').trim();

    return {
      answer: `According to **${docName}**, the education details are as follows:\n\n` +
        `Institution: **${cleanUni}**\n` +
        (cleanDegree ? `Degree / Program: **${cleanDegree}**\n\n` : '\n') +
        `As stated in the Education section:\n\n` +
        `> "${cleanUni}"`,
      quote: cleanUni,
    };
  }

  // 3. Technical Skills / Tech Stack query
  if (qLow.includes('skill') || qLow.includes('languages') || qLow.includes('tech stack') || qLow.includes('technologies')) {
    const skillsIdx = lines.findIndex(l => /technical skills/i.test(l));
    let skillLines: string[] = [];
    if (skillsIdx !== -1) {
      for (let i = skillsIdx + 1; i < Math.min(lines.length, skillsIdx + 6); i++) {
        if (/experience|projects|education|achievements/i.test(lines[i])) break;
        skillLines.push(lines[i]);
      }
    }
    const quote = skillLines[0] || lines.find(l => /languages|python|react/i.test(l)) || '';
    return {
      answer: `According to **${docName}**, the technical skills include:\n\n` +
        skillLines.map(s => `- ${s}`).join('\n') + '\n\n' +
        `As documented in the Technical Skills section:\n\n` +
        `> "${quote}"`,
      quote,
    };
  }

  // 4. Liability Cap
  if (qLow.includes('liability') || qLow.includes('cap') || qLow.includes('damages')) {
    const liabLine = lines.find(l => /liability|exceed|cap/i.test(l) && /(?:AED|USD|\$|[0-9,]+)/i.test(l)) ||
      lines.find(l => /liability/i.test(l));
    if (liabLine) {
      const match = liabLine.match(/(?:AED|USD|\$|EUR|£)\s*[0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]+)?/i);
      const cap = match ? match[0] : 'specified';
      return {
        answer: `Under **${docName}**, the limitation of liability cap is **${cap}**.\n\n` +
          `As stated in the agreement:\n\n` +
          `> "${liabLine}"`,
        quote: liabLine,
      };
    }
  }

  // 5. General Line Search with Keyword Scoring
  let bestLine = '';
  let bestScore = 0;

  for (const line of lines) {
    const lLow = line.toLowerCase();
    let score = 0;
    for (const kw of keywords) {
      if (lLow.includes(kw)) score += 2;
    }
    if (score > bestScore) {
      bestScore = score;
      bestLine = line;
    }
  }

  if (bestScore > 0 && bestLine) {
    const cleanLine = bestLine.replace(/^[•\-\–\s]+/, '').trim();
    return {
      answer: `Based on **${docName}**, the relevant passage states:\n\n` +
        `> "${cleanLine}"\n\n` +
        `This directly relates to your inquiry.`,
      quote: cleanLine,
    };
  }

  return {
    answer: `I examined **${docName}**, specifically searching for "${keywords.join(' ')}".\n\n` +
      `No clauses or statements addressing this topic were found in the document.`,
    quote: null,
  };
}

// Test queries
async function runTests() {
  const doc = await db.getDocument('doc_uo2cg6g8q');
  if (!doc) {
    console.log('Doc not found');
    return;
  }

  const queries = [
    'whay is the name of given person ?',
    'tell me the university of kalp patel',
    'education from where ?',
    'what are his technical skills?',
  ];

  for (const q of queries) {
    console.log('\n=============================================');
    console.log('QUERY:', q);
    const res = answerQuestion(q, doc.raw_text, doc.filename);
    console.log('ANSWER:\n' + res.answer);

    const extracted = extractQuotesFromAnswer(res.answer);
    console.log('EXTRACTED QUOTES:', extracted);
    const verified = verifyAllQuotes(extracted, [{ id: doc.id, filename: doc.filename, pages: JSON.parse(doc.pages_json) }]);
    console.log('VERIFIED:', verified);
  }
}

runTests().catch(console.error);
