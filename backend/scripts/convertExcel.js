const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

const EXCEL_PATH = path.join(__dirname, '../../ITALY -- OVERALL BACHELOR COURSE OPTIONS -- JULY 2026.xlsx');
const OUTPUT_PATH = path.join(__dirname, '../data/courses.json');

const sheetsToParse = ['CS OPTIONS ', 'MGMT OPTIONS', 'BIO OPTIONS', 'HUMANITIES', 'OVERALL TECH OPTIONS'];
const allCourses = [];
const seenCourses = new Set(); // To avoid duplicates

console.log('Loading Excel file (this may take a moment)...');
const workbook = xlsx.readFile(EXCEL_PATH);

sheetsToParse.forEach(sheetName => {
  console.log(`Parsing sheet: ${sheetName}`);
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return;
  
  const data = xlsx.utils.sheet_to_json(sheet, { header: 1 });
  let headerMap = null;

  for (let i = 0; i < data.length; i++) {
    const row = data[i];
    if (!row || row.length === 0) continue;
    
    // Check if it's the header row
    const strRow = row.map(c => String(c).trim().toLowerCase());
    if (strRow.includes('university name') && strRow.includes('program name')) {
      headerMap = {};
      row.forEach((col, idx) => {
        if (col) headerMap[String(col).trim().toLowerCase()] = idx;
      });
      continue;
    }

    // Skip remarks or empty rows
    if (String(row[0]).toUpperCase().includes('REMARK') || String(row[1]).toUpperCase().includes('REMARK')) {
      continue;
    }

    if (headerMap && row[headerMap['university name']] && row[headerMap['program name']]) {
      const course = {
        category: sheetName.trim(),
        universityName: String(row[headerMap['university name']]).trim(),
        duration: row[headerMap['duration']] ? String(row[headerMap['duration']]).trim() : '3 Years',
        subField: row[headerMap['sub field']] ? String(row[headerMap['sub field']]).trim() : 'Unknown',
        programName: String(row[headerMap['program name']]).trim(),
        languageRequirement: row[headerMap['lang. req.']] ? String(row[headerMap['lang. req.']]).trim() : 'B2 Level English Certificate',
        admissionTest: row[headerMap['admission test/interview']] ? String(row[headerMap['admission test/interview']]).trim() : 'Entrance Exam'
      };

      const key = `${course.universityName}-${course.programName}`;
      if (!seenCourses.has(key)) {
        seenCourses.add(key);
        allCourses.push(course);
      }
    }
  }
});

// Create data directory if it doesn't exist
const dataDir = path.dirname(OUTPUT_PATH);
if (!fs.existsSync(dataDir)){
    fs.mkdirSync(dataDir, { recursive: true });
}

fs.writeFileSync(OUTPUT_PATH, JSON.stringify(allCourses, null, 2));
console.log(`Successfully extracted ${allCourses.length} unique courses to courses.json`);
