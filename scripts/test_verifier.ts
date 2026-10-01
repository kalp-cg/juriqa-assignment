import { verifyQuoteAgainstDocument, extractQuotesFromAnswer } from '../src/lib/quoteVerifier';

const samplePages = [
  {
    pageNumber: 1,
    text: `NON-DISCLOSURE AND CONFIDENTIALITY AGREEMENT
This Agreement is entered into on January 15, 2024 between Alpha Corp ("Disclosing Party") and Beta LLC ("Receiving Party").
1. Confidential Information. The term "Confidential Information" means any and all technical and non-technical information provided by Disclosing Party to Receiving Party, including but not limited to patents, copyrights, trade secrets, software code, and financial models.
2. Standard of Care. Receiving Party agrees to protect the Confidential Information using the same degree of care, but no less than a reasonable degree of care, that it uses to protect its own confidential information of like nature.`
  },
  {
    pageNumber: 2,
    text: `3. Limitation of Liability. IN NO EVENT SHALL EITHER PARTY BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, OR CONSEQUENTIAL DAMAGES.
The total aggregate liability of either party under this Agreement shall not exceed AED 100,000.
4. Governing Law. This Agreement shall be governed by and construed in accordance with the laws of the Dubai International Financial Centre (DIFC).`
  }
];

// Test 1: Exact match with line breaks and quotes
const q1 = 'Receiving Party agrees to protect the Confidential Information using the same degree of care';
const r1 = verifyQuoteAgainstDocument(q1, samplePages, 'doc1', 'NDA.pdf');
console.log('Test 1 (Real quote):', r1.verified === true && r1.pageNumber === 1 ? 'PASS' : 'FAIL', r1);

// Test 2: Quote across line breaks and uppercase/lowercase
const q2 = 'total aggregate liability of either party under this Agreement shall not exceed AED 100,000.';
const r2 = verifyQuoteAgainstDocument(q2, samplePages, 'doc1', 'NDA.pdf');
console.log('Test 2 (Page 2 liability):', r2.verified === true && r2.pageNumber === 2 ? 'PASS' : 'FAIL', r2);

// Test 3: Hallucinated / Invented quote
const q3 = 'Disclosing party shall pay a penalty of USD 500,000 upon any breach of confidentiality.';
const r3 = verifyQuoteAgainstDocument(q3, samplePages, 'doc1', 'NDA.pdf');
console.log('Test 3 (Hallucination rejection):', r3.verified === false ? 'PASS' : 'FAIL', r3);

// Test 4: Paraphrased quote (not verbatim)
const q4 = 'The parties agree that damages will be capped at one hundred thousand Dirhams.';
const r4 = verifyQuoteAgainstDocument(q4, samplePages, 'doc1', 'NDA.pdf');
console.log('Test 4 (Paraphrase rejection):', r4.verified === false ? 'PASS' : 'FAIL', r4);
