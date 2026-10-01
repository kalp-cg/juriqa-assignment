import fs from 'fs';
import path from 'path';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { Document as DocxDocument, Packer, Paragraph, TextRun, HeadingLevel, PageBreak } from 'docx';

const samplesDir = path.join(process.cwd(), 'sample_contracts');
if (!fs.existsSync(samplesDir)) {
  fs.mkdirSync(samplesDir, { recursive: true });
}

// 1. French Commercial NDA (DOCX, 3 Pages)
async function generateFrenchNdaDocx() {
  const sections = [
    {
      title: "ACCORD DE CONFIDENTIALITÉ ET DE NON-DIVULGATION",
      clauses: [
        "1. Objet du Contrat et Définitions",
        "Le présent Accord de Confidentialité est conclu le 15 janvier 2024 entre :",
        "La société Lumina Solutions SAS, société par actions simplifiée au capital de 100.000 euros, immatriculée au RCS de Paris sous le numéro 812 345 678, sise 25 Rue de la Paix, 75002 Paris, France, représentée par M. Alexandre Laurent, d'une part ;",
        "Et la société Horizon Technologies SA, société anonyme au capital de 250.000 euros, immatriculée au RCS de Lyon sous le numéro 745 678 912, sise 14 Quai Victor Augagneur, 69003 Lyon, France, représentée par Mme Sophie Dubois, d'autre part.",
        "1.1 Par 'Informations Confidentielles', on entend l'ensemble des informations techniques, financières, juridiques et commerciales divulguées par l'une des parties à l'autre.",
        "1.2 La Partie Réceptrice s'engage à utiliser les Informations Confidentielles exclusivement dans le cadre de l'évaluation du projet de partenariat stratégique."
      ]
    },
    {
      title: "Page 2 : Obligations de Sécurité et Durée",
      clauses: [
        "2. Degré de Diligence et Mesures de Sécurité",
        "2.1 La Partie Réceptrice s'engage à appliquer aux Informations Confidentielles les mêmes mesures de protection et de diligence raisonnable qu'elle applique à ses propres données les plus sensibles, et en tout état de cause au moins un degré de soin raisonnable.",
        "2.2 L'accès aux Informations Confidentielles est strictement réservé aux salariés, consultants et dirigeants ayant un besoin direct d'en connaître (need-to-know).",
        "3. Durée des Engagements",
        "Le présent Accord entre en vigueur à la date de signature pour une durée initiale de trois (3) ans. Les obligations de confidentialité relatives aux secrets de fabrique et aux données techniques survivront pour une durée indéterminée ou jusqu'à leur entrée dans le domaine public."
      ]
    },
    {
      title: "Page 3 : Sanctions, Droit Applicable et Juridiction",
      clauses: [
        "4. Violation et Pénalités Contractuelles",
        "En cas de manquement avéré aux obligations de non-divulgation, la Partie Défaillante sera redevable d'une indemnité forfaitaire minimale de 150.000 euros (cent cinquante mille euros), sans préjudice de tout autre dommage et intérêt qui pourrait être réclamé devant les juridictions compétentes.",
        "5. Droit Applicable et Règlement des Différends",
        "5.1 Le présent Accord est régi et interprété conformément au droit français (Code civil français).",
        "5.2 Tout litige relatif à la validité, l'interprétation ou l'exécution du présent contrat sera soumis à la compétence exclusive du Tribunal de Commerce de Paris, nonobstant pluralité de défendeurs ou appel en garantie."
      ]
    }
  ];

  const docChildren: any[] = [];
  sections.forEach((sec, idx) => {
    if (idx > 0) docChildren.push(new Paragraph({ children: [new PageBreak()] }));
    docChildren.push(
      new Paragraph({
        text: sec.title,
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 200 }
      })
    );
    sec.clauses.forEach(cl => {
      const isNum = /^[0-9]\./.test(cl);
      docChildren.push(
        new Paragraph({
          children: [
            new TextRun({
              text: cl,
              bold: isNum,
              size: 22
            })
          ],
          spacing: { after: 140 }
        })
      );
    });
  });

  const doc = new DocxDocument({ sections: [{ children: docChildren }] });
  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(path.join(samplesDir, 'Accord_de_Confidentialite_Commercial_France.docx'), buffer);
  console.log('Created French NDA DOCX');
}

// 2. German Software License Agreement (PDF, 4 Pages)
async function generateGermanLicensePdf() {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const pagesContent = [
    {
      page: 1,
      title: 'SOFTWARE-LIZENZ- UND WARTUNGSVERTRAG',
      lines: [
        'Zwischen der Byteworks Software AG, Taunusanlage 8, 60329 Frankfurt am Main (nachfolgend "Lizenzgeber"),',
        'und der Deutsche Industrie Holding GmbH, Maximilianstraße 35, 80539 München (nachfolgend "Lizenznehmer").',
        '',
        '§ 1 Vertragsgegenstand und Lizenzgewährung',
        '(1) Der Lizenzgeber räumt dem Lizenznehmer ein nicht-ausschließliches, zeitlich unbeschränktes Recht ein,',
        'die Standardsoftware "Enterprise Core Suite 4.0" für bis zu 500 gleichzeitige Benutzer zu nutzen.',
        '(2) Eine Weitergabe der Software oder Unterlizenzierung an Dritte ist ohne vorherige schriftliche Zustimmung',
        'des Lizenzgebers unzulässig.'
      ]
    },
    {
      page: 2,
      title: '§ 2 Vergütung und Fälligkeit (Zahlungsbedingungen)',
      lines: [
        '(1) Die einmalige Lizenzgebühr beträgt 450.000 EUR (in Worten: vierhundertfünfzigtausend Euro) netto.',
        '(2) Die laufende jährliche Wartungsgebühr beträgt 18% des Lizenzwertes, zahlbar jährlich im Voraus.',
        '(3) Rechnungen sind innerhalb von vierzehn (14) Tagen ab Rechnungsdatum ohne Abzug zur Zahlung fällig.',
        '(4) Bei Zahlungsverzug werden Verzugszinsen in Höhe von 9 Prozentpunkten über dem Basiszinssatz berechnet.',
        '',
        '§ 3 Gewährleistung und Mängelhaftung',
        'Der Lizenzgeber gewährleistet, dass die Software den vertraglichen Spezifikationen entspricht.',
        'Die Verjährungsfrist für Mängelansprüche beträgt zwölf (12) Monate ab Abnahme.'
      ]
    },
    {
      page: 3,
      title: '§ 4 Haftungsbeschränkung und Schadensersatz',
      lines: [
        '(1) Der Lizenzgeber haftet unbeschränkt bei Vorsatz und grober Fahrlässigkeit sowie bei Verletzung von Leben,',
        'Körper oder Gesundheit.',
        '(2) Bei einfacher Fahrlässigkeit haftet der Lizenzgeber nur bei Verletzung einer wesentlichen Vertragspflicht',
        '(Kardinalpflicht).',
        '(3) Die Gesamthaftung beider Parteien ist der Höhe nach auf einen Höchstbetrag von 250.000 EUR beschränkt.',
        '(4) Die Haftung für entgangenen Gewinn und mittelbare Folgeschäden ist ausgeschlossen.'
      ]
    },
    {
      page: 4,
      title: '§ 5 Schlussbestimmungen und Gerichtsstand',
      lines: [
        '(1) Änderungen und Ergänzungen dieses Vertrages bedürfen der Schriftform.',
        '(2) Es gilt das Recht der Bundesrepublik Deutschland unter Ausschluss des UN-Kaufrechts (CISG).',
        '(3) Ausschließlicher Gerichtsstand für alle Streitigkeiten aus oder im Zusammenhang mit diesem Vertrag',
        'ist Frankfurt am Main, Deutschland.',
        '',
        'Unterzeichnet zu Frankfurt am Main am 10. März 2024 durch die bevollmächtigten Vertreter beider Parteien.'
      ]
    }
  ];

  for (const pData of pagesContent) {
    const page = pdfDoc.addPage([595, 842]);
    page.drawText(pData.title, {
      x: 50,
      y: 780,
      size: 13,
      font: fontBold,
      color: rgb(0.1, 0.1, 0.1)
    });
    let y = 740;
    for (const line of pData.lines) {
      const isSec = /^§\s+[0-9]/.test(line);
      page.drawText(line, {
        x: 50,
        y,
        size: isSec ? 11 : 9.5,
        font: isSec ? fontBold : font,
        color: rgb(0.15, 0.15, 0.15)
      });
      y -= isSec ? 22 : 16;
    }
  }

  const bytes = await pdfDoc.save({ useObjectStreams: false });
  fs.writeFileSync(path.join(samplesDir, 'Software_Lizenzvertrag_Deutschland.pdf'), bytes);
  console.log('Created German Software License PDF');
}

// 3. Spanish Master Services Agreement (PDF, 5 Pages)
async function generateSpanishServicesPdf() {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const pages = [
    {
      title: 'CONTRATO MARCO DE PRESTACIÓN DE SERVICIOS TECNOLÓGICOS',
      lines: [
        'En Madrid, a 18 de abril de 2024.',
        'DE UNA PARTE: Iberia Cloud Services S.L., con NIF B-88991122, con domicilio en Paseo de la Castellana 95, Madrid.',
        'DE OTRA PARTE: Corporación Logística del Mediterráneo S.A., con NIF A-28374650, con domicilio en Calle Alcalá 42, Madrid.',
        '',
        'CLÁUSULA PRIMERA: OBJETO DEL CONTRATO',
        'El Proveedor se compromete a prestar al Cliente servicios de arquitectura en la nube, ciberseguridad gestionada',
        'y mantenimiento correctivo continuo conforme a los Acuerdos de Nivel de Servicio (SLA) suscritos.'
      ]
    },
    {
      title: 'CLÁUSULA SEGUNDA: CONDICIONES ECONÓMICAS Y FACTURACIÓN',
      lines: [
        '2.1 Los honorarios profesionales ascienden a la cantidad fija anual de 320.000 EUR (trescientos veinte mil euros),',
        'facturados en doce mensualidades consecutivas de 26.666 EUR.',
        '2.2 El pago se realizará mediante transferencia bancaria dentro de los treinta (30) días naturales posteriores',
        'a la emisión de la correspondiente factura electrónica debidamente validada.',
        '2.3 El tipo de interés de demora aplicable será el fijado en la Ley 3/2004 de medidas de lucha contra la morosidad.'
      ]
    },
    {
      title: 'CLÁUSULA TERCERA: CONFIDENCIALIDAD Y PROTECCIÓN DE DATOS',
      lines: [
        '3.1 Toda información intercambiada se considerará estrictamente confidencial por un período de cinco (5) años.',
        '3.2 Ambas partes declaran cumplir escrupulosamente con el Reglamento General de Protección de Datos (RGPD UE 2016/679)',
        'y la Ley Orgánica 3/2018 de Protección de Datos Personales y garantía de los derechos digitales (LOPDGDD).',
        '3.3 El Proveedor actuará como Encargado del Tratamiento en relación con los datos de clientes alojados en la plataforma.'
      ]
    },
    {
      title: 'CLÁUSULA CUARTA: LÍMITE DE RESPONSABILIDAD',
      lines: [
        '4.1 La responsabilidad patrimonial total acumulada del Proveedor frente al Cliente por cualquier reclamación contractual',
        'o extracontractual quedará expresamente limitada a la suma máxima de 500.000 EUR (quinientos mil euros).',
        '4.2 Ninguna de las partes responderá en ningún caso por daños indirectos, pérdida de negocio o lucro cesante.',
        '4.3 Las exclusiones de responsabilidad no aplicarán en supuestos de dolo, culpa grave o fraude civil.'
      ]
    },
    {
      title: 'CLÁUSULA QUINTA: LEY APLICABLE Y JURISDICCIÓN',
      lines: [
        '5.1 El presente Contrato se regirá por la legislación común española.',
        '5.2 Para la resolución de cualquier discrepancia o controversia derivada de la interpretación o ejecución de este contrato,',
        'las partes renuncian formalmente a cualquier otro fuero que pudiera corresponderles y se someten expresamente a la jurisdicción',
        'y competencia exclusiva de los Juzgados y Tribunales de la ciudad de Madrid (España).',
        '',
        'En prueba de conformidad, ambas partes firman el presente contrato por duplicado ejemplar en la fecha arriba indicada.'
      ]
    }
  ];

  for (const p of pages) {
    const page = pdfDoc.addPage([595, 842]);
    page.drawText(p.title, { x: 50, y: 780, size: 12, font: fontBold, color: rgb(0.1, 0.1, 0.1) });
    let y = 740;
    for (const line of p.lines) {
      const isH = /^CLÁUSULA/.test(line);
      page.drawText(line, {
        x: 50,
        y,
        size: isH ? 11 : 9.5,
        font: isH ? fontBold : font,
        color: rgb(0.15, 0.15, 0.15)
      });
      y -= isH ? 22 : 16;
    }
  }

  const bytes = await pdfDoc.save({ useObjectStreams: false });
  fs.writeFileSync(path.join(samplesDir, 'Acuerdo_Marco_de_Servicios_Espanol.pdf'), bytes);
  console.log('Created Spanish Services Agreement PDF');
}

// 4. Executive Employment Agreement (DOCX, 6 Pages)
async function generateEmploymentDocx() {
  const pages = [
    {
      title: "EXECUTIVE EMPLOYMENT AGREEMENT - CHIEF OPERATING OFFICER",
      clauses: [
        "1. Parties and Appointment",
        "This Executive Employment Agreement (the 'Agreement') is entered into as of May 1, 2024, by and between:",
        "Global Financial Nexus Corp., a Delaware corporation ('Company'), and Marcus Vance, an individual residing in New York ('Executive').",
        "The Company hereby appoints and employs Executive as Chief Operating Officer (COO), reporting directly to the Chief Executive Officer.",
        "1.1 Duties: Executive shall have overall managerial authority for company operational scalability, infrastructure, and delivery."
      ]
    },
    {
      title: "Page 2: Compensation and Equity Participation",
      clauses: [
        "2. Base Salary and Performance Bonus",
        "2.1 Base Salary: The Company shall pay Executive an initial annual base salary of $450,000 (four hundred fifty thousand USD), payable in regular installments in accordance with standard payroll schedules.",
        "2.2 Annual Incentive Bonus: Executive shall be eligible for an annual performance-based target bonus equal to 50% of the Base Salary upon satisfaction of financial and operational OKRs established by the Board.",
        "2.3 Equity Incentive: Executive shall be granted 250,000 incentive stock options vesting over a standard four-year schedule with a one-year cliff."
      ]
    },
    {
      title: "Page 3: Benefits and Severance Terms",
      clauses: [
        "3. Termination and Severance Benefits",
        "3.1 At-Will Employment: Employment is at-will and may be terminated by either party upon sixty (60) days advance written notice.",
        "3.2 Termination Without Cause: If Executive is terminated without Cause or resigns for Good Reason, Executive shall receive twelve (12) months of continued Base Salary, accelerated vesting of 25% unvested equity, and subsidized health coverage."
      ]
    },
    {
      title: "Page 4: Confidentiality and Proprietary Information",
      clauses: [
        "4. Inventions and Proprietary Rights",
        "4.1 All inventions, designs, source code, workflows, trade secrets, and business plans conceived by Executive during the Term shall belong exclusively and irrevocably to the Company.",
        "4.2 Executive agrees not to disclose or use any Company Confidential Information at any time during or following employment."
      ]
    },
    {
      title: "Page 5: Restrictive Covenants and Non-Competition",
      clauses: [
        "5. Non-Competition and Non-Solicitation",
        "5.1 Non-Compete: During the term of employment and for twelve (12) months following termination, Executive shall not directly or indirectly engage in or assist any business entity competing with the Company in North America or EMEA.",
        "5.2 Non-Solicitation of Employees: Executive covenants that for twenty-four (24) months following termination, Executive shall not solicit, recruit, or entice any employee of the Company to leave."
      ]
    },
    {
      title: "Page 6: Governing Law and Dispute Resolution",
      clauses: [
        "6. Governing Law and Arbitration",
        "6.1 This Agreement shall be governed by and construed in accordance with the laws of the State of Delaware, without regard to conflict of laws rules.",
        "6.2 Any dispute, claim, or controversy arising out of this Agreement shall be settled by binding confidential arbitration administered by the American Arbitration Association (AAA) in New York, NY.",
        "In witness whereof, the parties have executed this Agreement as of the Effective Date."
      ]
    }
  ];

  const docChildren: any[] = [];
  pages.forEach((sec, idx) => {
    if (idx > 0) docChildren.push(new Paragraph({ children: [new PageBreak()] }));
    docChildren.push(
      new Paragraph({
        text: sec.title,
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 200 }
      })
    );
    sec.clauses.forEach(cl => {
      const isNum = /^[0-9]\./.test(cl);
      docChildren.push(
        new Paragraph({
          children: [
            new TextRun({
              text: cl,
              bold: isNum,
              size: 22
            })
          ],
          spacing: { after: 140 }
        })
      );
    });
  });

  const doc = new DocxDocument({ sections: [{ children: docChildren }] });
  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(path.join(samplesDir, 'Executive_Employment_Agreement.docx'), buffer);
  console.log('Created Executive Employment DOCX');
}

// 5. Commercial Real Estate Lease Agreement (DOCX, 8 Pages)
async function generateRealEstateDocx() {
  const pages = [
    { title: "COMMERCIAL PREMISES LEASE AGREEMENT (DIFC GATE PRECINCT)", clauses: [
      "This Commercial Lease Agreement is executed on June 1, 2024 between:",
      "Landlord: DIFC Properties Holdings Ltd, Gate Village Building 3, DIFC, Dubai, UAE.",
      "Tenant: Apex Capital Partners ME Limited, licensed financial services firm in DIFC.",
      "Premises: Office Suite 701, Level 7, Precinct Building 4, DIFC, comprising approximately 4,500 square feet."
    ]},
    { title: "Page 2: Term and Possession Covenants", clauses: [
      "2.1 Lease Term: The initial term shall be five (5) years, commencing July 1, 2024 and ending June 30, 2029.",
      "2.2 Tenant Option to Renew: Tenant shall have one option to renew the Lease for an additional three (3) year term upon six (6) months advance notice."
    ]},
    { title: "Page 3: Rent and Payment Schedules", clauses: [
      "3.1 Annual Basic Rent: The annual rent shall be AED 850,000 payable in four (4) equal quarterly installments of AED 212,500 in advance.",
      "3.2 Escalation: Annual rent shall increase by 3.5% annually commencing in year two of the Term."
    ]},
    { title: "Page 4: Security Deposit and Guarantees", clauses: [
      "4.1 Security Deposit: Tenant shall deposit with Landlord the sum of AED 212,500 (equivalent to three months rent) as security for full performance.",
      "4.2 Refund: The deposit shall be returned within thirty (30) days following surrender of premises in broom-clean condition."
    ]},
    { title: "Page 5: Permitted Use and Alterations", clauses: [
      "5.1 Permitted Use: Premises shall be used solely for licensed professional financial and asset management services.",
      "5.2 Fit-out Works: Any structural or mechanical alterations require Landlord's prior written consent and DIFC Authority permits."
    ]},
    { title: "Page 6: Maintenance and Utility Services", clauses: [
      "6.1 Landlord shall maintain building structural elements, chilled water air-conditioning, elevators, and common area amenities.",
      "6.2 Tenant shall be responsible for internal electrical, communication, and interior janitorial services."
    ]},
    { title: "Page 7: Insurance and Indemnity", clauses: [
      "7.1 Tenant shall procure comprehensive general public liability insurance of not less than AED 10,000,000 per occurrence.",
      "7.2 Landlord shall maintain all-risk property casualty insurance covering the core building structure."
    ]},
    { title: "Page 8: Governing Law and Dispute Resolution", clauses: [
      "8.1 This Lease is governed exclusively by the laws and regulations of the Dubai International Financial Centre (DIFC).",
      "8.2 Any dispute arising hereunder shall be submitted to the exclusive jurisdiction of the DIFC Small Claims Tribunal or DIFC Courts.",
      "Executed in duplicate on the date first written above."
    ]}
  ];

  const docChildren: any[] = [];
  pages.forEach((sec, idx) => {
    if (idx > 0) docChildren.push(new Paragraph({ children: [new PageBreak()] }));
    docChildren.push(
      new Paragraph({
        text: sec.title,
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 200 }
      })
    );
    sec.clauses.forEach(cl => {
      docChildren.push(
        new Paragraph({
          children: [
            new TextRun({
              text: cl,
              bold: /^[0-9]+\./.test(cl),
              size: 22
            })
          ],
          spacing: { after: 140 }
        })
      );
    });
  });

  const doc = new DocxDocument({ sections: [{ children: docChildren }] });
  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(path.join(samplesDir, 'Real_Estate_Commercial_Lease_Agreement.docx'), buffer);
  try { fs.unlinkSync(path.join(samplesDir, 'Real_Estate_Commercial_Lease_Agreement.pdf')); } catch {}
  console.log('Created Real Estate Lease DOCX');
}

// 6. GDPR Data Processing Agreement (DOCX, 10 Pages)
async function generateGdprDpaDocx() {
  const pages = [
    { title: "DATA PROCESSING ADDENDUM (GDPR ARTICLE 28 COMPLIANT)", clauses: [
      "This Data Processing Addendum ('DPA') governs the processing of personal data by CloudBridge Technologies Ltd ('Processor') on behalf of Horizon Consumer Goods Europe B.V. ('Controller').",
      "1. Subject Matter and Scope: Processor processes EU Personal Data to provide cloud analytical services as specified in the Principal Services Agreement."
    ]},
    { title: "Page 2: Nature and Purpose of Processing", clauses: [
      "2. Duration: Processing shall continue for the duration of the Principal Agreement plus retention periods mandated by statutory audit obligations.",
      "3. Categories of Data Subjects: Controller customers, employees, suppliers, and website visitors."
    ]},
    { title: "Page 3: Controller and Processor Obligations", clauses: [
      "4. Documented Instructions: Processor shall process personal data solely on documented instructions from Controller, including regarding international data transfers.",
      "5. Confidentiality: Processor ensures that all personnel authorized to process personal data have committed themselves to confidentiality."
    ]},
    { title: "Page 4: Technical and Organizational Measures (TOMs)", clauses: [
      "6. Security Standards: Processor implements AES-256 encryption at rest, TLS 1.3 in transit, role-based access control (RBAC), and annual SOC 2 Type II audits.",
      "7. Resilience: Processor tests disaster recovery and business continuity plans semi-annually."
    ]},
    { title: "Page 5: Sub-processors and Third-Party Vendors", clauses: [
      "8. Sub-processor Engagement: Controller grants general written authorization for Processor to engage infrastructure sub-processors listed on its website.",
      "9. Objection: Processor shall provide thirty (30) days advance notice before adding new sub-processors, allowing Controller to object on reasonable data protection grounds."
    ]},
    { title: "Page 6: Data Subject Rights and Support", clauses: [
      "10. Assistance with Requests: Taking into account the nature of processing, Processor shall assist Controller by appropriate technical measures to fulfill data subject requests (access, rectification, erasure, portability)."
    ]},
    { title: "Page 7: Personal Data Breach Notification", clauses: [
      "11. Security Breach Notice: In the event of a confirmed Personal Data Breach, Processor shall notify Controller without undue delay and in any event within forty-eight (48) hours of becoming aware.",
      "12. Notice Contents: The notice shall describe the nature of breach, approximate data subjects impacted, and proposed mitigation actions."
    ]},
    { title: "Page 8: Audits and Compliance Verification", clauses: [
      "13. Audit Rights: Processor shall make available to Controller all information necessary to demonstrate compliance with GDPR Article 28 and allow for reasonable audits conducted by an independent auditor."
    ]},
    { title: "Page 9: International Transfers and Standard Contractual Clauses", clauses: [
      "14. Cross-Border Transfers: Any transfer outside the EEA shall be governed by the European Commission Standard Contractual Clauses (SCCs Module 2 Controller-to-Processor).",
      "15. Supplementary Measures: Processor implements technical supplementary measures ensuring government access requests are lawfully contested."
    ]},
    { title: "Page 10: Liability, Termination, and Governing Law", clauses: [
      "16. Liability Cap: The total aggregate liability arising out of this DPA shall be capped at 2,000,000 EUR (two million euros).",
      "17. Return or Deletion: Upon termination, Processor shall securely delete or return all Controller personal data within thirty (30) days.",
      "18. Governing Law: This DPA is governed by the laws of the Netherlands and the competent courts of Amsterdam."
    ]}
  ];

  const docChildren: any[] = [];
  pages.forEach((sec, idx) => {
    if (idx > 0) docChildren.push(new Paragraph({ children: [new PageBreak()] }));
    docChildren.push(
      new Paragraph({
        text: sec.title,
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 200 }
      })
    );
    sec.clauses.forEach(cl => {
      docChildren.push(
        new Paragraph({
          children: [
            new TextRun({
              text: cl,
              bold: /^[0-9]+\./.test(cl),
              size: 22
            })
          ],
          spacing: { after: 140 }
        })
      );
    });
  });

  const doc = new DocxDocument({ sections: [{ children: docChildren }] });
  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(path.join(samplesDir, 'Cross_Border_Data_Processing_Agreement_GDPR.docx'), buffer);
  console.log('Created GDPR DPA DOCX');
}

// 7. Employee IP & NDA Agreement (PDF, 6 Pages)
async function generateEmployeeNdaPdf() {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const pages = [
    { title: "EMPLOYEE NON-DISCLOSURE AND PROPRIETARY INFORMATION AGREEMENT", lines: [
      "This Employee NDA is entered into between Ambiguity Labs Inc. ('Company') and employee ('Employee').",
      "Section 1: Recognition of Company Assets",
      "Employee acknowledges that in the course of employment, Employee will receive access to proprietary AI models,",
      "evaluation datasets, adversarial benchmarking test suites, and confidential client evaluation weights."
    ]},
    { title: "Section 2: Maintenance of Confidentiality", lines: [
      "2.1 Duty of Confidentiality: Employee shall protect Confidential Information with the highest standard of care.",
      "2.2 Absolute Non-Disclosure: Employee shall not publish, reverse-engineer, or transmit model architectures to third parties."
    ]},
    { title: "Section 3: Inventions and Assignment of Rights", lines: [
      "3.1 Work for Hire: All software, scripts, datasets, and patents conceived during employment belong solely to Company.",
      "3.2 Power of Attorney: Employee irrevocably appoints Company as attorney-in-fact to execute IP assignments."
    ]},
    { title: "Section 4: Post-Employment Restrictive Covenants", lines: [
      "4.1 Non-Solicitation: Employee shall not solicit Company employees or contractors for eighteen (18) months post-termination.",
      "4.2 Model Weight Exfiltration: Exfiltration of neural network weights is deemed criminal trade secret theft."
    ]},
    { title: "Section 5: Equitable Relief and Liquidated Damages", lines: [
      "5.1 Injunctive Relief: Company shall be entitled to seek temporary and permanent injunctive relief without posting bond.",
      "5.2 Liquidated Damages: Unlawful release of benchmark suites carries liquidated damages of $500,000 per violation."
    ]},
    { title: "Section 6: Governing Law and Jurisdiction", lines: [
      "6.1 Governing Law: This Agreement is governed by the laws of the Commonwealth of Massachusetts.",
      "6.2 Exclusive Jurisdiction: Any dispute shall be brought exclusively in the state or federal courts in Boston, MA.",
      "Executed by Employee and Company."
    ]}
  ];

  for (const p of pages) {
    const page = pdfDoc.addPage([595, 842]);
    page.drawText(p.title, { x: 50, y: 780, size: 12, font: fontBold, color: rgb(0.1, 0.1, 0.1) });
    let y = 740;
    for (const line of p.lines) {
      page.drawText(line, { x: 50, y, size: 9.5, font, color: rgb(0.15, 0.15, 0.15) });
      y -= 18;
    }
  }

  const bytes = await pdfDoc.save({ useObjectStreams: false });
  fs.writeFileSync(path.join(samplesDir, 'Employee_NDA_Ambiguity_Labs.pdf'), bytes);
  console.log('Created Employee NDA PDF');
}

// 8. Joint Venture Technology Partnership Agreement (DOCX, 12 Pages)
async function generateJointVentureDocx() {
  const pages = [
    { title: "STRATEGIC JOINT VENTURE AND CO-DEVELOPMENT AGREEMENT", clauses: [
      "This Joint Venture Agreement is entered into between Vertex AI Holdings Ltd and Quantum Dynamics Group Corp.",
      "1. Recitals and Strategic Purpose: The parties establish an unincorporated joint venture to build quantum-resistant AI infrastructure."
    ]},
    { title: "Page 2: Capital Contributions and Financing", clauses: [
      "2. Capital Commitments: Vertex contributes $5,000,000 cash; Quantum contributes proprietary compiler IP valued at $5,000,000.",
      "3. Additional Calls: Capital calls require 75% supermajority approval of the Joint Steering Committee."
    ]},
    { title: "Page 3: Governance and Management Committee", clauses: [
      "4. Steering Committee: Composed of three (3) representatives from Vertex and three (3) representatives from Quantum.",
      "5. Quorum: Quorum requires attendance of at least two members from each parent entity."
    ]},
    { title: "Page 4: Intellectual Property Ownership", clauses: [
      "6. Background IP: Each party retains sole ownership of its pre-existing background IP.",
      "7. Foreground IP: All newly developed models and patents shall be jointly owned with equal cross-licensing rights."
    ]},
    { title: "Page 5: Commercial Revenue and Profit Allocation", clauses: [
      "8. Profit Distribution: Net operating profits shall be distributed 50/50 on a semi-annual basis following independent audit."
    ]},
    { title: "Page 6: Representations and Warranties", clauses: [
      "9. Mutual Warranties: Each party represents it has full corporate authority to enter into this joint venture."
    ]},
    { title: "Page 7: Confidentiality and Data Protection", clauses: [
      "10. Joint Secrets: All algorithms, training pipelines, and financial models are classified as Joint Confidential Property."
    ]},
    { title: "Page 8: Non-Competition Covenant", clauses: [
      "11. Exclusivity: Neither party shall develop competing quantum neural hardware independently during the five-year JV term."
    ]},
    { title: "Page 9: Deadlock Resolution Procedures", clauses: [
      "12. Deadlock Escalation: If the Steering Committee cannot agree, the matter is escalated to the CEOs within fourteen (14) days."
    ]},
    { title: "Page 10: Term and Orderly Dissolution", clauses: [
      "13. Term: Initial term of five (5) years with mutual written renewal options.",
      "14. Dissolution: Assets liquidated and net cash distributed pro-rata after settling all trade creditors."
    ]},
    { title: "Page 11: Limitation of Liability and Indemnities", clauses: [
      "15. Liability Ceiling: Aggregate liability between partners shall not exceed $10,000,000, except for gross negligence or IP theft."
    ]},
    { title: "Page 12: Governing Law and LCIA Arbitration", clauses: [
      "16. Governing Law: English Law shall govern all aspects of this Agreement.",
      "17. Arbitration: London Court of International Arbitration (LCIA) seated in London, UK.",
      "Executed by authorized signatories of Vertex and Quantum."
    ]}
  ];

  const docChildren: any[] = [];
  pages.forEach((sec, idx) => {
    if (idx > 0) docChildren.push(new Paragraph({ children: [new PageBreak()] }));
    docChildren.push(
      new Paragraph({
        text: sec.title,
        heading: HeadingLevel.HEADING_1,
        spacing: { after: 200 }
      })
    );
    sec.clauses.forEach(cl => {
      docChildren.push(
        new Paragraph({
          children: [
            new TextRun({
              text: cl,
              bold: /^[0-9]+\./.test(cl),
              size: 22
            })
          ],
          spacing: { after: 140 }
        })
      );
    });
  });

  const doc = new DocxDocument({ sections: [{ children: docChildren }] });
  const buffer = await Packer.toBuffer(doc);
  fs.writeFileSync(path.join(samplesDir, 'Joint_Venture_Technology_Partnership.docx'), buffer);
  console.log('Created Joint Venture DOCX');
}

async function run() {
  await generateFrenchNdaDocx();
  await generateGermanLicensePdf();
  await generateSpanishServicesPdf();
  await generateEmploymentDocx();
  await generateRealEstateDocx();
  await generateGdprDpaDocx();
  await generateEmployeeNdaPdf();
  await generateJointVentureDocx();
  console.log('All multilingual sample contracts generated successfully!');
}

run();
