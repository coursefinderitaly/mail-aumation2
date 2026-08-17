const xlsx = require('xlsx');
const fs = require('fs');
const path = require('path');

const EXCEL_PATH = path.join(__dirname, '../../coursess.xlsx');
const OUTPUT_PATH = path.join(__dirname, '../data/courses.json');

const allCourses = [];
const seenCourses = new Set();

console.log('Loading Excel file (this may take a moment)...');
const workbook = xlsx.readFile(EXCEL_PATH);

const sheetName = 'Sheet1'; 
console.log(`Parsing sheet: ${sheetName}`);
const sheet = workbook.Sheets[sheetName];
if (sheet) {
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

    if (headerMap && row[headerMap['university name']] && row[headerMap['program name']]) {
      const course = {
        category: row[headerMap['program level']] ? String(row[headerMap['program level']]).trim() : 'Unknown',
        universityName: String(row[headerMap['university name']]).trim(),
        programLevel: row[headerMap['program level']] ? String(row[headerMap['program level']]).trim() : 'Unknown',
        duration: row[headerMap['duration']] ? String(row[headerMap['duration']]).trim() : 'Unknown',
        interestedField: row[headerMap['interested field']] ? String(row[headerMap['interested field']]).trim() : 'Unknown',
        subField: row[headerMap['sub field']] ? String(row[headerMap['sub field']]).trim() : 'Unknown',
        pursuingPassOut: row[headerMap['pursuing / pass out']] ? String(row[headerMap['pursuing / pass out']]).trim() : 'Unknown',
        academicBackground: row[headerMap['academic background']] ? String(row[headerMap['academic background']]).trim() : 'Unknown',
        backgroundField: row[headerMap['background field']] ? String(row[headerMap['background field']]).trim() : 'Unknown',
        percentage: (() => {
          let p = row[headerMap['percentage']] ? String(row[headerMap['percentage']]).trim() : 'Unknown';
          if (p !== 'Unknown') {
            let num = parseFloat(p);
            if (!isNaN(num)) {
              if (num > 0 && num < 1) return `${Math.round(num * 100)}%`;
              if (num >= 1 && !p.includes('%')) return `${num}%`;
            }
          }
          return p;
        })(),
        programName: String(row[headerMap['program name']]).trim(),
        languageRequirement: row[headerMap['lang. req.']] ? String(row[headerMap['lang. req.']]).trim() : 'Unknown',
        otherReq: row[headerMap['other req.']] ? String(row[headerMap['other req.']]).trim() : 'None',
        admissionTest: row[headerMap['admission test/interview']] ? String(row[headerMap['admission test/interview']]).trim() : 'None',
        applicationFees: row[headerMap['applicaion fees']] ? String(row[headerMap['applicaion fees']]).trim() : 'Unknown',
        tentativeMonths: (() => {
          let val = row[headerMap['tentative months (only opening)']] ? String(row[headerMap['tentative months (only opening)']]).trim() : 'Unknown';
          if (val && !isNaN(val) && val.length === 5 && val.startsWith('4')) {
            const date = new Date(Math.round((parseInt(val) - 25569) * 86400 * 1000));
            return date.toLocaleString('en-US', { month: 'short', year: 'numeric' });
          }
          return val;
        })()
      };

      const key = `${course.universityName}-${course.programName}`;
      if (!seenCourses.has(key)) {
        seenCourses.add(key);
        allCourses.push(course);
      }
    }
  }
}

// Create data directory if it doesn't exist
const dataDir = path.dirname(OUTPUT_PATH);
if (!fs.existsSync(dataDir)){
    fs.mkdirSync(dataDir, { recursive: true });
}

fs.writeFileSync(OUTPUT_PATH, JSON.stringify(allCourses, null, 2));
console.log(`Successfully extracted ${allCourses.length} unique courses to courses.json`);
