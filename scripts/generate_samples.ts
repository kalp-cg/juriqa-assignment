import fs from 'fs';
import path from 'path';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { Document as DocxDocument, Packer, Paragraph, HeadingLevel } from 'docx';

async function generateSamples() {
  const samplesDir = path.join(process.cwd(), 'sample_contracts');
  if (!fs.existsSync(samplesDir)) {
    fs.mkdirSync(samplesDir, { recursive: true });
  }

  // 1. Searchable Legal Contract PDF (SaaS & Services Agreement)
  const pdfDoc = await PDFDocument.create();
  const timesRoman = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const timesRomanBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Page 1
  let page1 = pdfDoc.addPage([595, 842]);
  page1.drawText('MASTER SERVICES AND SOFTWARE LICENSE AGREEMENT', {
    x: 50,
    y: 780,
    size: 14,
    font: timesRomanBold,
    color: rgb(0.1, 0.1, 0.1),
  });

  const page1Text = [
    'This Master Services Agreement ("Agreement") is made effective as of February 1, 2024 by and between:',
    'Nexis Global Technologies FZ-LLC, a company registered in Dubai, UAE ("Provider"), and',
    'Apex Logistics International Corp, a company having its principal office in Abu Dhabi, UAE ("Customer").',
    '',
    '1. Definitions',
    '1.1 "Authorized Users" means Customer employees and designated contractors authorized to access the Services.',
    '1.2 "Confidential Information" means all non-public technical, commercial, or financial information disclosed',
    'by either party to the other party.',
    '',
    '2. Scope of Services and License Grant',
    'Provider hereby grants to Customer a non-exclusive, non-transferable, revocable license to access the Enterprise',
    'Contract Suite during the Term, strictly for internal business operations.',
    '',
    '3. Fees and Payment Terms',
    'Customer shall pay the annual subscription fee of AED 350,000 within thirty (30) days from invoice date.',
    'Late payments shall accrue interest at the rate of 1.5% per month or the maximum statutory rate permitted by law.',
    '',
    '4. Term and Termination',
    '4.1 Initial Term. This Agreement shall commence on the Effective Date and continue for an initial term of 24 months.',
    '4.2 Termination for Cause. Either party may terminate this Agreement immediately upon written notice if the other',
    'party commits a material breach and fails to cure such breach within thirty (30) days of receiving written notice.',
  ];

  let yPos = 740;
  for (const line of page1Text) {
    const isHeading = /^[0-9]\.\s+[A-Za-z]/.test(line);
    page1.drawText(line, {
      x: 50,
      y: yPos,
      size: isHeading ? 11 : 10,
      font: isHeading ? timesRomanBold : timesRoman,
      color: rgb(0.15, 0.15, 0.15),
    });
    yPos -= isHeading ? 22 : 16;
  }

  // Page 2
  let page2 = pdfDoc.addPage([595, 842]);
  const page2Text = [
    '5. Standard of Care and Confidentiality',
    'Each party agrees to safeguard the Confidential Information of the other party using the same degree of care,',
    'and in no event less than a reasonable degree of care, that it uses to protect its own confidential information of like nature.',
    'The confidentiality obligations herein shall survive the termination of this Agreement for a period of five (5) years.',
    '',
    '6. Limitation of Liability',
    '6.1 IN NO EVENT SHALL EITHER PARTY BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, OR CONSEQUENTIAL DAMAGES,',
    'INCLUDING LOSS OF PROFITS, DATA, OR REVENUE, ARISING OUT OF OR IN CONNECTION WITH THIS AGREEMENT.',
    '6.2 The total aggregate liability of either party for all claims arising under this Agreement shall not exceed AED 100,000.',
    '',
    '7. Indemnification Obligations',
    'Provider agrees to defend, indemnify, and hold harmless Customer against any third-party claim alleging that the Services',
    'infringe any valid patent, trademark, or copyright registered in the United Arab Emirates.',
    '',
    '8. Governing Law and Jurisdiction',
    'This Agreement shall be governed by and construed in accordance with the laws of the Dubai International Financial Centre (DIFC).',
    'Any dispute arising out of or in connection with this contract shall be referred to and finally resolved by arbitration under the',
    'Arbitration Rules of the DIFC-LCIA Arbitration Centre.',
  ];

  yPos = 780;
  for (const line of page2Text) {
    const isHeading = /^[0-9]\.\s+[A-Za-z]/.test(line);
    page2.drawText(line, {
      x: 50,
      y: yPos,
      size: isHeading ? 11 : 10,
      font: isHeading ? timesRomanBold : timesRoman,
      color: rgb(0.15, 0.15, 0.15),
    });
    yPos -= isHeading ? 22 : 16;
  }

  const pdfBytes = await pdfDoc.save();
  const pdfPath = path.join(samplesDir, 'Enterprise_SaaS_Agreement.pdf');
  fs.writeFileSync(pdfPath, pdfBytes);
  console.log('Created searchable PDF:', pdfPath);

  // 2. Scanned PDF with No Readable Text (Blank outline, zero text stream)
  const scannedPdfDoc = await PDFDocument.create();
  const scannedPage = scannedPdfDoc.addPage([595, 842]);
  scannedPage.drawRectangle({
    x: 40,
    y: 40,
    width: 515,
    height: 760,
    borderWidth: 1,
    borderColor: rgb(0.8, 0.8, 0.8),
    color: rgb(0.96, 0.96, 0.96),
  });
  const scannedBytes = await scannedPdfDoc.save();
  const scannedPdfPath = path.join(samplesDir, 'Scanned_Contract_No_Text.pdf');
  fs.writeFileSync(scannedPdfPath, scannedBytes);
  console.log('Created scanned PDF (zero-text test):', scannedPdfPath);

  // 3. Contract Version 1 (DOCX)
  const docx1 = new DocxDocument({
    sections: [
      {
        children: [
          new Paragraph({ text: 'COMMERCIAL SERVICES AGREEMENT (VERSION 1.0)', heading: HeadingLevel.HEADING_1 }),
          new Paragraph({ text: '1. Services Scope: Provider shall deliver technical consulting and implementation services.' }),
          new Paragraph({ text: '2. Payment Terms: Invoices payable within thirty (30) days from receipt.' }),
          new Paragraph({ text: '3. Term: 12-month term with automatic annual renewal.' }),
          new Paragraph({ text: '4. Limitation of Liability: Total liability of either party shall not exceed AED 100,000.' }),
          new Paragraph({ text: '5. Termination: Either party may terminate for convenience with sixty (60) days prior written notice.' }),
          new Paragraph({ text: '6. Governing Law: This contract is governed by Dubai International Financial Centre (DIFC) laws.' }),
        ],
      },
    ],
  });
  const docx1Buffer = await Packer.toBuffer(docx1);
  const docx1Path = path.join(samplesDir, 'Commercial_Agreement_v1.docx');
  fs.writeFileSync(docx1Path, docx1Buffer);
  console.log('Created Contract v1 DOCX:', docx1Path);

  // 4. Contract Version 2 (DOCX) - Substantive revisions (Liability cap moved to AED 1,000,000)
  const docx2 = new DocxDocument({
    sections: [
      {
        children: [
          new Paragraph({ text: 'COMMERCIAL SERVICES AGREEMENT (VERSION 2.0 - AMENDED)', heading: HeadingLevel.HEADING_1 }),
          new Paragraph({ text: '1. Services Scope: Provider shall deliver enhanced technical consulting, AI operations, and implementation services.' }),
          new Paragraph({ text: '2. Payment Terms: Invoices payable within fifteen (15) days from receipt.' }),
          new Paragraph({ text: '3. Term: 24-month fixed commitment without early termination.' }),
          new Paragraph({ text: '4. Limitation of Liability: Total aggregate liability of either party shall not exceed AED 1,000,000.' }),
          new Paragraph({ text: '5. Termination: Termination for convenience is deleted; termination permitted solely for material uncured breach.' }),
          new Paragraph({ text: '6. Governing Law: This contract is governed by Abu Dhabi Global Market (ADGM) laws.' }),
          new Paragraph({ text: '7. Data Protection & Security: Provider shall comply with UAE Federal Personal Data Protection Law.' }),
        ],
      },
    ],
  });
  const docx2Buffer = await Packer.toBuffer(docx2);
  const docx2Path = path.join(samplesDir, 'Commercial_Agreement_v2.docx');
  fs.writeFileSync(docx2Path, docx2Buffer);
  console.log('Created Contract v2 DOCX:', docx2Path);

  // 5. Large 150-Page Master Contract (Testing Requirement 4)
  const largeDoc = await PDFDocument.create();
  const font = await largeDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await largeDoc.embedFont(StandardFonts.HelveticaBold);

  for (let i = 1; i <= 150; i++) {
    const page = largeDoc.addPage([595, 842]);
    page.drawText(`150-PAGE ENTERPRISE FRAMEWORK AGREEMENT - PAGE ${i}`, {
      x: 50,
      y: 800,
      size: 11,
      font: fontBold,
      color: rgb(0.2, 0.2, 0.2),
    });

    const clauseNum = i;
    const clauseTitle =
      i === 1 ? '1. Scope of Enterprise Architecture' :
      i === 14 ? '14. Limitation of Liability and Risk Allocation' :
      i === 42 ? '42. Intellectual Property Rights and Indemnities' :
      i === 99 ? '99. Security Compliance and Regulatory Audits' :
      i === 150 ? '150. Execution, Counterparts and Signatures' :
      `${clauseNum}. Operational Schedule and Service Standards Part ${i}`;

    page.drawText(clauseTitle, {
      x: 50,
      y: 760,
      size: 12,
      font: fontBold,
      color: rgb(0.1, 0.1, 0.1),
    });

    const bodyText =
      i === 14
        ? 'The aggregate liability of either party under this 150-page Master Agreement shall not exceed AED 5,000,000. Under no circumstances shall either party be liable for incidental, special, punitive, or consequential damages.'
        : `This section governs Schedule ${i} provisions, operating procedures, service level commitments, and performance metrics as mutually agreed between the enterprise parties for operational compliance under Page ${i}.`;

    page.drawText(bodyText, {
      x: 50,
      y: 720,
      size: 10,
      font: font,
      color: rgb(0.3, 0.3, 0.3),
      maxWidth: 495,
      lineHeight: 14,
    });
  }

  const largeBytes = await largeDoc.save();
  const largePath = path.join(samplesDir, '150_Page_Enterprise_Master_Agreement.pdf');
  fs.writeFileSync(largePath, largeBytes);
  console.log('Created 150-Page Contract PDF:', largePath);
}

generateSamples().catch(console.error);
