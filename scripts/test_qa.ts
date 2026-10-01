import { db } from '../src/lib/db';
import { extractQuotesFromAnswer, verifyAllQuotes } from '../src/lib/quoteVerifier';

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
  'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
  'to', 'was', 'were', 'will', 'with', 'tell', 'me', 'what', 'which',
  'who', 'where', 'when', 'why', 'how', 'give', 'show', 'does', 'did',
  'about', 'please', 'can', 'you', 'given', 'person', 'candidate',
  'contract', 'agreement', 'document', 'say', 'stated', 'mention',
  'section', 'details', 'his', 'her', 'their'
]);

function normalizeQuery(q: string): string {
  return q
    .toLowerCase()
    .replace(/expre?i[ec][ec]n?ce?/g, 'experience')
    .replace(/experiance|experiense|expirience/g, 'experience')
    .replace(/univercity|universty/g, 'university')
    .replace(/educatn|edication|educaton/g, 'education')
    .replace(/liabilty|liabiltiy/g, 'liability')
    .replace(/terminatn|terminaton/g, 'termination')
    .replace(/achivement|acheivement/g, 'achievement')
    .replace(/projct|projets/g, 'projects');
}

function extractKeywords(query: string): string[] {
  const norm = normalizeQuery(query);
  return norm
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 2 && !STOP_WORDS.has(w));
}

function answerQuestion(rawQuery: string, rawText: string, docName: string) {
  const qNorm = normalizeQuery(rawQuery);
  const keywords = extractKeywords(rawQuery);
  const lines = rawText.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  // 1. Name / Identity Query
  if (
    qNorm.includes('name') ||
    qNorm.includes('who is') ||
    (keywords.length === 0 && (qNorm.includes('person') || qNorm.includes('candidate')))
  ) {
    const firstLine = lines[0];
    return {
      answer:
        `The name of the individual in **${docName}** is **${firstLine}**.\n\n` +
        `This is stated at the top of Page 1:\n\n` +
        `> "${firstLine}"`,
    };
  }

  // 2. Experience / Work / Internship / Job / Career (including "recent experience" or "experience section")
  if (
    qNorm.includes('experience') ||
    qNorm.includes('intern') ||
    qNorm.includes('job') ||
    qNorm.includes('work') ||
    qNorm.includes('career') ||
    qNorm.includes('role')
  ) {
    const expIdx = lines.findIndex(l => /^experience$/i.test(l.replace(/[^a-zA-Z]/g, '')));
    if (expIdx !== -1) {
      // Collect entries until next section
      const expItems: string[] = [];
      for (let i = expIdx + 1; i < lines.length; i++) {
        if (/^(projects|education|achievements|technical skills|certifications)$/i.test(lines[i].replace(/[^a-zA-Z]/g, ''))) {
          break;
        }
        if (lines[i].startsWith('•') || lines[i].includes('–') || lines[i].includes('-')) {
          expItems.push(lines[i]);
        }
      }

      // Identify recent/first experience
      const recentRoleLine = expItems.find(item => item.startsWith('•')) || expItems[0] || lines[expIdx + 1];
      const cleanQuote = recentRoleLine ? recentRoleLine.replace(/^[•\s]+/, '').trim() : '';

      if (qNorm.includes('recent') || qNorm.includes('latest') || qNorm.includes('current')) {
        return {
          answer:
            `According to **${docName}**, the most recent professional experience is:\n\n` +
            `- **${cleanQuote}**\n\n` +
            `As recorded in the Experience section:\n\n` +
            `> "${cleanQuote}"`,
        };
      }

      // General experience query
      const formattedRoles = expItems.filter(item => item.startsWith('•')).slice(0, 3);
      return {
        answer:
          `According to **${docName}**, the professional experience includes:\n\n` +
          (formattedRoles.length > 0
            ? formattedRoles.map(r => `- ${r.replace(/^[•\s]+/, '').trim()}`).join('\n') + '\n\n'
            : `- **${cleanQuote}**\n\n`) +
          `As documented in the Experience section:\n\n` +
          `> "${cleanQuote}"`,
      };
    }
  }

  // 3. Education / University / College Query
  if (
    qNorm.includes('university') ||
    qNorm.includes('education') ||
    qNorm.includes('college') ||
    qNorm.includes('degree') ||
    qNorm.includes('school')
  ) {
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
      answer:
        `According to **${docName}**, the education details are as follows:\n\n` +
        `- **Institution**: ${cleanUni}\n` +
        (cleanDegree ? `- **Degree / Program**: ${cleanDegree}\n\n` : '\n') +
        `As stated in the Education section:\n\n` +
        `> "${cleanUni}"`,
    };
  }

  // 4. Projects / Portfolio Work Query
  if (qNorm.includes('project') || qNorm.includes('built') || qNorm.includes('portfolio work')) {
    const projIdx = lines.findIndex(l => /^projects$/i.test(l.replace(/[^a-zA-Z]/g, '')));
    if (projIdx !== -1) {
      const projItems: string[] = [];
      for (let i = projIdx + 1; i < lines.length; i++) {
        if (/^(experience|education|achievements|technical skills|certifications)$/i.test(lines[i].replace(/[^a-zA-Z]/g, ''))) {
          break;
        }
        if (lines[i].startsWith('•') || lines[i].includes('–') || lines[i].includes('-')) {
          projItems.push(lines[i]);
        }
      }
      const firstProj = projItems.find(p => p.startsWith('•')) || projItems[0] || lines[projIdx + 1];
      const cleanQuote = firstProj ? firstProj.replace(/^[•\s]+/, '').trim() : '';

      return {
        answer:
          `According to **${docName}**, key projects include:\n\n` +
          projItems.filter(p => p.startsWith('•')).slice(0, 4).map(p => `- ${p.replace(/^[•\s]+/, '').trim()}`).join('\n') + '\n\n' +
          `As documented in the Projects section:\n\n` +
          `> "${cleanQuote}"`,
      };
    }
  }

  // 5. Achievements / Awards / Hackathons
  if (qNorm.includes('achievement') || qNorm.includes('award') || qNorm.includes('hackathon') || qNorm.includes('winner') || qNorm.includes('certification')) {
    const achIdx = lines.findIndex(l => /^achievements$/i.test(l.replace(/[^a-zA-Z]/g, '')));
    if (achIdx !== -1) {
      const items: string[] = [];
      for (let i = achIdx + 1; i < lines.length; i++) {
        if (/^(experience|education|projects|technical skills)$/i.test(lines[i].replace(/[^a-zA-Z]/g, ''))) break;
        if (lines[i].startsWith('•')) items.push(lines[i]);
      }
      const quote = items[0] ? items[0].replace(/^[•\s]+/, '').trim() : lines[achIdx + 1];
      return {
        answer:
          `According to **${docName}**, achievements and honors include:\n\n` +
          items.map(it => `- ${it.replace(/^[•\s]+/, '').trim()}`).join('\n') + '\n\n' +
          `As recorded in the Achievements section:\n\n` +
          `> "${quote}"`,
      };
    }
  }

  // 6. Contact / Email / Phone / Links
  if (qNorm.includes('contact') || qNorm.includes('email') || qNorm.includes('phone') || qNorm.includes('github') || qNorm.includes('linkedin')) {
    const contactLine = lines.find(l => /@|phone|\+91|github|linkedin|portfolio/i.test(l));
    if (contactLine) {
      return {
        answer:
          `The contact and portfolio details in **${docName}** are:\n\n` +
          `> "${contactLine.trim()}"`,
      };
    }
  }

  // 7. Technical Skills Query
  if (qNorm.includes('skill') || qNorm.includes('languages') || qNorm.includes('tech stack') || qNorm.includes('technologies')) {
    const skillsIdx = lines.findIndex(l => /technical skills/i.test(l));
    let skillLines: string[] = [];
    if (skillsIdx !== -1) {
      for (let i = skillsIdx + 1; i < Math.min(lines.length, skillsIdx + 7); i++) {
        if (/experience|projects|education|achievements/i.test(lines[i])) break;
        skillLines.push(lines[i].replace(/^[•\-\–\s]+/, '').trim());
      }
    }
    const quote = skillLines[0] || lines.find(l => /languages|python|react/i.test(l)) || '';
    return {
      answer:
        `According to **${docName}**, the technical competencies are documented as:\n\n` +
        skillLines.map(s => `- ${s}`).join('\n') + '\n\n' +
        `Supported by the document passage:\n\n` +
        `> "${quote}"`,
    };
  }

  // 8. General search
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
      answer:
        `Based on **${docName}**, the relevant passage states:\n\n` +
        `> "${cleanLine}"\n\n` +
        `This directly relates to your inquiry.`,
    };
  }

  return {
    answer:
      `I examined **${docName}**, searching for terms matching: ${keywords.join(', ') || qNorm}.\n\n` +
      `No clauses or statements addressing this topic were found in the document.\n\n` +
      `As required by contract analysis standards, no obligations or facts on this subject can be presumed without explicit textual evidence.`,
  };
}

async function runTests() {
  const doc = await db.getDocument('doc_uo2cg6g8q');
  if (!doc) {
    console.log('Doc not found');
    return;
  }

  const queries = [
    'tell me kalp patel\'s recent experience !',
    'expreicence section',
    'Experience',
    'what are his projects?',
    'what are his achievements?',
    'what is his contact info?',
    'tell me the university of kalp patel',
  ];

  for (const q of queries) {
    console.log('\n=============================================');
    console.log('QUERY:', q);
    const res = answerQuestion(q, doc.raw_text, doc.filename);
    console.log('ANSWER:\n' + res.answer);

    const extracted = extractQuotesFromAnswer(res.answer);
    console.log('EXTRACTED QUOTES:', extracted);
    const verified = verifyAllQuotes(extracted, [{ id: doc.id, filename: doc.filename, pages: JSON.parse(doc.pages_json) }]);
    console.log('VERIFIED STATUS:', verified.map(v => ({ quote: v.quote, verified: v.verified, page: v.pageNumber })));
  }
}

runTests().catch(console.error);
