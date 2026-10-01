import fs from 'fs';
import path from 'path';
import { processPdf, processDocx, validateFileType } from '../src/lib/documentProcessor';
import { compareContracts } from '../src/lib/comparisonEngine';
import { DocumentRecord } from '../src/lib/db';

async function testPipeline() {
  console.log('--- TEST 1: Validate file types ---');
  console.log('PDF:', validateFileType('contract.pdf'));
  console.log('DOCX:', validateFileType('contract.docx'));
  console.log('TXT (should fail):', validateFileType('contract.txt'));

  console.log('\n--- TEST 2: Process Searchable PDF ---');
  const pdfBuf = fs.readFileSync(path.join(process.cwd(), 'sample_contracts', 'Enterprise_SaaS_Agreement.pdf'));
  const pdfRes = await processPdf(pdfBuf, 'Enterprise_SaaS_Agreement.pdf', 'doc_test_1');
  console.log('PDF Total Pages:', pdfRes.totalPages);
  console.log('PDF Total Words:', pdfRes.totalWords);
  console.log('PDF Clauses Extracted:', pdfRes.clauses.map(c => `${c.number} ${c.title}`));

  console.log('\n--- TEST 3: Process Scanned PDF with Zero Text (Must reject gracefully) ---');
  const scannedBuf = fs.readFileSync(path.join(process.cwd(), 'sample_contracts', 'Scanned_Contract_No_Text.pdf'));
  try {
    await processPdf(scannedBuf, 'Scanned_Contract_No_Text.pdf', 'doc_test_2');
    console.error('FAIL: Scanned PDF was not rejected!');
  } catch (err: any) {
    console.log('PASS: Correctly rejected scanned PDF with message:');
    console.log('-->', err.message);
  }

  console.log('\n--- TEST 4: Process DOCX Contracts & Run Comparison ---');
  const docx1Buf = fs.readFileSync(path.join(process.cwd(), 'sample_contracts', 'Commercial_Agreement_v1.docx'));
  const docx2Buf = fs.readFileSync(path.join(process.cwd(), 'sample_contracts', 'Commercial_Agreement_v2.docx'));
  const docx1 = await processDocx(docx1Buf, 'Commercial_Agreement_v1.docx', 'doc_v1');
  const docx2 = await processDocx(docx2Buf, 'Commercial_Agreement_v2.docx', 'doc_v2');

  const recordA: DocumentRecord = {
    id: docx1.id,
    filename: docx1.filename,
    filetype: 'docx',
    filesize: docx1.filesize,
    total_pages: docx1.totalPages,
    total_words: docx1.totalWords,
    raw_text: docx1.rawText,
    pages_json: JSON.stringify(docx1.pages),
    clauses_json: JSON.stringify(docx1.clauses),
    created_at: new Date().toISOString(),
    status: 'ready',
  };

  const recordB: DocumentRecord = {
    id: docx2.id,
    filename: docx2.filename,
    filetype: 'docx',
    filesize: docx2.filesize,
    total_pages: docx2.totalPages,
    total_words: docx2.totalWords,
    raw_text: docx2.rawText,
    pages_json: JSON.stringify(docx2.pages),
    clauses_json: JSON.stringify(docx2.clauses),
    created_at: new Date().toISOString(),
    status: 'ready',
  };

  const comparison = compareContracts(recordA, recordB);
  console.log('\nComparison Results:');
  console.log('Total Diffs:', comparison.totalDiffs);
  console.log('High Significance Count:', comparison.highCount);
  console.log('Medium Significance Count:', comparison.mediumCount);
  console.log('Low Significance Count:', comparison.lowCount);
  console.log('\nDetailed Diffs:');
  for (const d of comparison.diffs) {
    if (d.status !== 'unchanged') {
      console.log(`[${d.significance.toUpperCase()}] ${d.clauseNumber} ${d.clauseTitle} (${d.status}): ${d.explanation}`);
    }
  }
}

testPipeline().catch(console.error);
