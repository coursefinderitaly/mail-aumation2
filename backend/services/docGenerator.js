const fs = require('fs');
const path = require('path');

function generateAiTrainingDoc(aiConfig) {
  const targetPath = path.join(__dirname, '../../frontend/public/AiTraining.md');
  const backupPath = path.join(__dirname, '../data/AiTraining.md');
  
  const dateStr = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  const statusStr = aiConfig.isAiEnabled ? "🟢 ON (Active Gemini-2.5-Flash Engine)" : "🟡 OFF (Fallback Local Rules Engine Active)";

  let inclusionBullets = (aiConfig.inclusionRules || []).map(r => `- **Inclusion**: ${r}`).join('\n');
  if (!inclusionBullets) inclusionBullets = '- No custom inclusion rules defined.';

  let exclusionBullets = (aiConfig.exclusionRules || []).map(r => `- **Exclusion**: ${r}`).join('\n');
  if (!exclusionBullets) exclusionBullets = '- No custom exclusion rules defined.';

  let examplesCount = (aiConfig.fewShotExamples || []).length;
  let examplesText = (aiConfig.fewShotExamples || []).map((ex, idx) => {
    return `### Example #${idx + 1}\n**Input Sample:**\n\`\`\`text\n${ex.input}\n\`\`\`\n\n**Target Structured Output:**\n\`\`\`json\n${ex.output}\n\`\`\``;
  }).join('\n\n---\n\n');

  const content = `# 🧠 Gemini AI Engine & Training Documentation
**Last Updated:** ${dateStr}
**Current Engine Status:** ${statusStr}
**Model Target:** \`gemini-2.5-flash\`

---

## 1. Executive Summary & Architecture Overview
This document serves as the live ground truth training guide and operational schema for our automated Study Abroad CRM & Course Matching system. When active, our email parsing pipeline utilizes Google's advanced Gemini LLM to interpret unstructured student inquiry emails, extract precise learner parameters, and execute intelligent university matching.

### ⚙️ Automated Pipeline Breakdown
1. **Email Ingestion**: Incoming Gmail inquiries are fetched and stripped of HTML tags, table structures, non-breaking characters, and quoted signatures to normalize text content.
2. **Gemini Extraction**: The cleaned text payload, along with stored few-shot training examples and system instructions, is transmitted to the Gemini API (\`gemini-2.5-flash\`) requesting strict, validated JSON output.
3. **Database Querying**: Extracted learner parameters (\`programOfInterest\`, \`class12Stream\`, \`eligibilityCountry\`, \`class12Score\`) are cross-referenced against our proprietary university course catalog in real time.
4. **Exclusion & Inclusion Filtering**: Dynamic organizational match rules are evaluated to filter out restricted institutions or prioritize tailored academic pathways.
5. **Response Template Generation**: A personalized email reply draft is compiled, embedding matched course rosters and seasonal intake remarks ready for automated delivery or advisor review.

---

## 2. Core Persona & System Instructions
\`\`\`text
${aiConfig.systemInstructions || 'Standard educational consultant instructions.'}
\`\`\`

---

## 3. Dynamic Match Rules & Filters

### 🟢 Active Inclusion & Match Rules
${inclusionBullets}

### 🔴 Active Exclusion Filters
${exclusionBullets}

---

## 4. Seasonal Intake Remarks Configuration
\`\`\`text
${aiConfig.intakeRemarks || 'Standard upcoming intake remarks.'}
\`\`\`

---

## 5. Few-Shot Training Memory Pool
**Total Trained Examples:** ${examplesCount}

${examplesText || '*No few-shot training examples saved yet. Use the Interactive Training Bot to record new examples.*'}

---
*Generated automatically by the Presume Overseas AI Control Center.*
`;

  try {
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.writeFileSync(targetPath, content, 'utf8');
    fs.mkdirSync(path.dirname(backupPath), { recursive: true });
    fs.writeFileSync(backupPath, content, 'utf8');
    console.log("✅ Successfully regenerated AiTraining.md documentation.");
  } catch (err) {
    console.error("❌ Failed to write AiTraining.md:", err);
  }
  
  return content;
}

module.exports = { generateAiTrainingDoc };
