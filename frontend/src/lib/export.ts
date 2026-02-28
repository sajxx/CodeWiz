import { jsPDF } from 'jspdf';
import { saveAs } from 'file-saver';
import type { AnalysisResult } from '@shared/types';

function buildMarkdownString(result: AnalysisResult): string {
  const lines: string[] = [];

  lines.push(`# ${result.projectName} — CodeLens Analysis`);
  lines.push('');
  lines.push(`> Generated on ${new Date(result.analyzedAt).toLocaleString()}`);
  lines.push('');

  // Architecture Summary
  lines.push('## Architecture Summary');
  lines.push('');
  lines.push(result.architectureSummary);
  lines.push('');

  // Tech Stack
  lines.push('## Tech Stack');
  lines.push('');
  result.techStack.forEach((t) => lines.push(`- **${t.name}** (${t.type})`));
  lines.push('');

  // Modules
  lines.push('## Modules');
  lines.push('');
  result.modules.forEach((m) => {
    lines.push(`### ${m.name} — Risk: ${m.riskLevel.toUpperCase()}`);
    lines.push('');
    lines.push(m.role);
    lines.push(`- Files: ${m.fileCount}`);
    lines.push(`- Services: ${m.services.length}`);
    lines.push('');
    m.services.forEach((s) => {
      lines.push(`  - **${s.name}** — ${s.role}`);
    });
    lines.push('');
  });

  // Complexity Scores
  lines.push('## Complexity Scores');
  lines.push('');
  lines.push('| Module | Files | Dependencies | Avg Lines | Coupling | Risk |');
  lines.push('|--------|-------|-------------|-----------|----------|------|');
  result.complexityScores.forEach((c) => {
    lines.push(
      `| ${c.name} | ${c.fileCount} | ${c.dependencyCount} | ${c.avgLines} | ${c.couplingLevel} | ${c.riskLevel} |`,
    );
  });
  lines.push('');

  // Execution Flows
  lines.push('## Execution Flows');
  lines.push('');
  result.executionFlows.forEach((f) => {
    lines.push(`### ${f.name}`);
    lines.push('');
    f.steps.forEach((s, i) => {
      lines.push(`${i + 1}. **${s.label}** — ${s.description ?? ''}`);
    });
    lines.push('');
  });

  // Checklist
  lines.push('## New Developer Checklist');
  lines.push('');
  result.checklist.forEach((phase) => {
    lines.push(`### ${phase.title}`);
    lines.push('');
    phase.items.forEach((item) => {
      lines.push(`- [ ] ${item.label}${item.filePath ? ` (\`${item.filePath}\`)` : ''}`);
    });
    lines.push('');
  });

  return lines.join('\n');
}

export function exportMarkdown(result: AnalysisResult) {
  const md = buildMarkdownString(result);
  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
  saveAs(blob, `${result.projectName}-analysis.md`);
}

export function exportPdf(result: AnalysisResult) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const maxWidth = pageWidth - margin * 2;
  let y = 20;

  const addText = (text: string, size: number, bold = false) => {
    if (y > 270) {
      doc.addPage();
      y = 20;
    }
    doc.setFontSize(size);
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    const splitLines = doc.splitTextToSize(text, maxWidth) as string[];
    doc.text(splitLines, margin, y);
    y += splitLines.length * (size * 0.5) + 4;
  };

  addText(`${result.projectName} — CodeLens Analysis`, 18, true);
  addText(`Generated on ${new Date(result.analyzedAt).toLocaleString()}`, 10);
  y += 4;

  addText('Architecture Summary', 14, true);
  addText(result.architectureSummary, 10);
  y += 4;

  addText('Tech Stack', 14, true);
  result.techStack.forEach((t) => addText(`• ${t.name} (${t.type})`, 10));
  y += 4;

  addText('Modules', 14, true);
  result.modules.forEach((m) => {
    addText(`${m.name} — Risk: ${m.riskLevel.toUpperCase()}`, 12, true);
    addText(m.role, 10);
    addText(`Files: ${m.fileCount} | Services: ${m.services.length}`, 10);
    y += 2;
  });

  addText('Complexity Scores', 14, true);
  result.complexityScores.forEach((c) => {
    addText(
      `${c.name}: ${c.fileCount} files, ${c.dependencyCount} deps, ${c.avgLines} avg lines, ${c.couplingLevel} coupling, ${c.riskLevel} risk`,
      10,
    );
  });

  doc.save(`${result.projectName}-analysis.pdf`);
}
