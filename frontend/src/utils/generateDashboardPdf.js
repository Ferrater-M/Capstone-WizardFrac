import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

// Builds the Progress Dashboard PDF (stats, competency mastery, misconceptions,
// and game history) and returns it as a Blob ready to upload/attach.
export function generateDashboardPdf({ studentNickname, summary, accuracy, competencies, misconceptions, gameHistory }) {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' });
  const marginX = 40;
  let y = 50;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text('WizardFrac — Progress Dashboard', marginX, y);
  y += 22;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.text(`Wizard: ${studentNickname || 'Wizard'}`, marginX, y);
  y += 16;
  doc.text(`Generated: ${new Date().toLocaleString()}`, marginX, y);
  y += 28;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('Stats', marginX, y);
  y += 10;

  autoTable(doc, {
    startY: y,
    margin: { left: marginX, right: marginX },
    head: [['Correct Answers', 'Wrong Answers', 'Sessions Played', 'Overall Accuracy']],
    body: [[
      String(summary?.totalCorrect ?? 0),
      String(summary?.totalIncorrect ?? 0),
      String(summary?.totalSessions ?? 0),
      `${accuracy}%`,
    ]],
    theme: 'grid',
    headStyles: { fillColor: [112, 55, 55] },
  });
  y = doc.lastAutoTable.finalY + 26;

  if (competencies?.length) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('Competency Mastery', marginX, y);
    y += 10;

    autoTable(doc, {
      startY: y,
      margin: { left: marginX, right: marginX },
      head: [['Competency', 'Mastery Level', 'Accuracy']],
      body: competencies.map(c => [
        c.competencyName,
        c.masteryLevel,
        `${Math.round(c.accuracy)}%`,
      ]),
      theme: 'grid',
      headStyles: { fillColor: [112, 55, 55] },
    });
    y = doc.lastAutoTable.finalY + 26;
  }

  if (misconceptions?.length) {
    if (y > 680) { doc.addPage(); y = 50; }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('Dissimilar Fraction Misconceptions', marginX, y);
    y += 10;

    autoTable(doc, {
      startY: y,
      margin: { left: marginX, right: marginX },
      head: [['Misconception', 'Count', 'Recurring']],
      body: misconceptions.map(m => [
        m.label,
        String(m.count),
        m.recurring ? 'Yes' : 'No',
      ]),
      theme: 'grid',
      headStyles: { fillColor: [112, 55, 55] },
    });
    y = doc.lastAutoTable.finalY + 26;
  }

  if (gameHistory?.length) {
    if (y > 680) { doc.addPage(); y = 50; }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('Game History', marginX, y);
    y += 10;

    autoTable(doc, {
      startY: y,
      margin: { left: marginX, right: marginX },
      head: [['Nickname', 'Island', 'Lvl', 'Hint', 'Points', 'Status']],
      body: gameHistory.map(entry => [
        entry.nickname || '—',
        entry.island,
        String(entry.level),
        entry.hintLabel || '—',
        String(entry.points),
        entry.status === 'COMPLETED' ? 'Completed' : 'Not Completed',
      ]),
      theme: 'grid',
      headStyles: { fillColor: [112, 55, 55] },
      styles: { fontSize: 9 },
    });
  }

  return doc.output('blob');
}
