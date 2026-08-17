const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const dataFile = path.join(__dirname, 'data.json');
const coursesFile = path.join(__dirname, 'data/courses.json');

// --- AES Encryption Utility ---
const ENCRYPTION_KEY = crypto.scryptSync(process.env.ADMIN_PASSWORD || 'default_secret', 'salt', 32);
const IV_LENGTH = 16;

function encryptField(data) {
  if (!data) return null;
  const text = typeof data === 'string' ? data : JSON.stringify(data);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return `${iv.toString('hex')}:${encrypted}:${authTag}`;
}

function decryptField(text) {
  if (!text) return null;
  if (typeof text !== 'string') return text; // Already plaintext object/array
  const parts = text.split(':');
  if (parts.length !== 3) {
    // Fallback: If it's not encrypted, try parsing as plaintext JSON for backwards compatibility
    try { return typeof text === 'string' ? JSON.parse(text) : text; } catch (e) { return text; }
  }
  try {
    const iv = Buffer.from(parts[0], 'hex');
    const encryptedText = parts[1];
    const authTag = Buffer.from(parts[2], 'hex');
    const decipher = crypto.createDecipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return JSON.parse(decrypted);
  } catch (e) {
    console.error('Decryption failed:', e);
    return null;
  }
}
// ------------------------------

// Default customizable Mail Templates configuration
const defaultMailTemplates = {
  greetings: "Greetings!",
  safeToApplyText: "SAFE TO APPLY - Only if s/he clears the admission test!!",
  gapWarningText: "NEED TO JUSTIFY GAP WITH PROPER CERTIFICATES",
  pursuing12thWarningText: "Course options are shared only on the basis of predicted marks above 70% also the 12th result will be required till 20th of June 2027.",
  pursuingBachelorWarningText: "NEED PROVISIONAL DEGREE / FINAL TRANSCRIPTS BY JUNE 2027",
  reEvaluationNote: "Before starting the process for {intake} - we will evaluate the profile again as per updated requirements and then finalize the options!!",
  courseAvailabilityIntro: "I have added overall possible course options based on {educationLevel} subjects & preferences, that are available in Italian public universities with 100% Scholarship.",
  updatesDisclaimer: "We will share the information regarding updates (If Any). Also, throughout the process, if we find any more options, we will update the same to you.",
  examBookingNote: "Note: It is essential to book an exam prior to the application submission. The score card will be required when submitting the applications.",
  currentYearDisclaimer: "Note: These details are as per the current year {currentYear} guidelines. If any updates or changes occur for {intake} intake, we will update you accordingly.",
  tableRemarks: {
    headerText: "REMARKS: Details for {intake} Intake",
    point1: "1. We will evaluate the profile again before starting the admission application submission",
    point2: "2. Admission will depend on admission test: CEnT-S, SAT (1300/1600), or respective university test",
    point3: "3. IELTS: Overall 6 band (B2 Level)",
    point4: "4. Application will begin only after completion of all the required documents.",
    point5Highlight: "5. CEnT-S registration is open now - students can book the test for timely results and applications",
    applicationStartHighlight: "We can start admission applications for {intake} by November {previousYear}!!",
    veniceWarning: "We do not proceed with University of Venice - as it has some scholarship issues"
  },
  lowProfile: {
    badgeText: "RISK APPLICATION",
    mainNotice: "This is to inform you that we are unable to proceed with this application due to the low percentage. No university will give priority to this cgpa/percentage.",
    reasonText: "The percentage is very low, that's why we can not take this profile.",
    suretyNotice: "We can not give surety on any part (Admission, Scholarship or Visa)"
  },
  ineligibleBackground: {
    badgeText: "ACADEMIC BACKGROUND MISMATCH",
    mainNotice: "This is to inform you that there are no eligible options available in public universities for the requested program due to academic stream / background requirements (e.g. Non-PCM / domain mismatch).",
    alternativeOffer: "If you want, we can evaluate and send you available university course options according to your academic profile.",
    suretyNotice: "We cannot proceed with applications for off-domain programs as universities strictly filter out incompatible backgrounds."
  },
  missing11th: {
    title: "ACTION REQUIRED: 11th Grade Marks Missing",
    message1: "Thank you for reaching out to us.",
    message2: "We noticed that you are currently pursuing your 12th standard, but we do not have your 11th standard percentage.",
    message3: "As we don't have enough information to accurately recommend universities, kindly reply to this email with your 11th percentage.",
    followUp: "Once we receive this information, we will gladly curate a list of matching programs for you."
  },
  lowCourseOptions: {
    badgeText: "PRE-ENROLLMENT RISK WARNING",
    mainNotice: "This is to inform you that we found very few course options matching your profile.",
    reasonText: "As your percentage is low as per the university criteria, even after clearing the university test, your admission can be cancelled at the pre-enrollment stage.",
    alternativeOffer: "If you want, we can send you the remaining course options too."
  },
  noCourseAvailable: {
    badgeText: "NO COURSE OPTIONS AVAILABLE",
    mainNotice: "This is to inform you that there are no course options available for this profile matching what the student has required.",
    alternativeOffer: "If you would like, we can evaluate the profile for alternative related domains or locations, if applicable."
  },
  signature: "Best regards,<br><b style=\"color: #000;\">Presume Overseas Admission Team</b>"
};

// Initial seed data if file doesn't exist
let db = {
  courses: [],
  logs: [],
  students: [],
  accounts: [],
  mailTemplates: { ...defaultMailTemplates },
  aiConfig: {
    isAiEnabled: true,
    aiProvider: 'gemini',
    apiKey: process.env.GEMINI_API_KEY || '',
    groqApiKey: process.env.GROQ_API_KEY || '',
    systemInstructions: `You are an expert Educational Consultant & AI CRM Engine for Study Abroad in Italy and Global Universities. Your goal is to accurately analyze incoming emails from prospective students and extract their educational profiles, testing scores, work experience, target intakes, and programs of interest with 100% precision. Always follow our consultancy rules and formatting guidelines.`,
    inclusionRules: [
      "Prioritize Bio/Life Science options for PCB (Physics, Chemistry, Biology) students with >65% score.",
      "For Economics, Commerce, or Finance interest, always match MGMT OPTIONS category.",
      "If student has > 2 years gap without formal work experience or degrees, flag gap as true and attach general guidance."
    ],
    exclusionRules: [
      "Never recommend University of Venice due to scholarship issues.",
      "Exclude master's degree courses if learner is pursuing or just completed Class 12th.",
      "Do not suggest courses requiring SAT > 1300 without verification of test scores."
    ],
    intakeRemarks: `REMARKS: Details for Upcoming Intake\n1. We will evaluate the profile again before starting the admission application submission.\n2. We can start admission applications for Sept 2027 by November 2026!`,
    fewShotExamples: [
      {
        id: 'ex-1',
        input: 'Learner Name: Rahul Sharma\nAge: 18\nClass 12th - Stream: PCB\nClass 12th Score: 88%\nProgram of Interest: biotechnology\nIntake Pitched: Sept 2027\nEligibility Country: Italy',
        output: JSON.stringify({
          learnerName: "Rahul Sharma",
          age: 18,
          class12Stream: "PCB",
          class12Score: "88%",
          class12Year: 2025,
          class12Board: "CBSE",
          class10Score: "92%",
          class10Year: 2023,
          workExperience: 0,
          programOfInterest: "biotechnology",
          intakePitched: "Sept 2027",
          eligibilityCountry: "Italy",
          isPursuing: false,
          isGap: false
        }, null, 2),
        timestamp: new Date().toISOString()
      }
    ],
    lastUpdated: new Date().toISOString()
  }
};

// Load real courses from parsed excel
if (fs.existsSync(coursesFile)) {
  try {
    const parsedCourses = JSON.parse(fs.readFileSync(coursesFile, 'utf8'));
    // Add an ID to each course
    db.courses = parsedCourses.map((c, i) => ({
      _id: String(i + 1),
      ...c
    }));
    console.log(`Loaded ${db.courses.length} courses from Excel data.`);
  } catch(e) {
    console.error("Error reading courses.json:", e);
  }
}

// Load from file if it exists
if (fs.existsSync(dataFile)) {
  try {
    const savedData = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
    db.tokens = savedData.tokens ? decryptField(savedData.tokens) : null;
    db.accounts = savedData.accounts ? savedData.accounts.map(acc => ({...acc, tokens: decryptField(acc.tokens)})) : [];
    db.logs = savedData.logs || [];
    db.students = savedData.students || [];
    db.autoReplyEnabled = savedData.autoReplyEnabled || false;
    if (savedData.aiConfig) {
      db.aiConfig = { ...db.aiConfig, ...savedData.aiConfig };
    }
    if (savedData.mailTemplates) {
      db.mailTemplates = {
        ...defaultMailTemplates,
        ...savedData.mailTemplates,
        tableRemarks: { ...defaultMailTemplates.tableRemarks, ...(savedData.mailTemplates.tableRemarks || {}) },
        lowProfile: { ...defaultMailTemplates.lowProfile, ...(savedData.mailTemplates.lowProfile || {}) },
        ineligibleBackground: { ...defaultMailTemplates.ineligibleBackground, ...(savedData.mailTemplates.ineligibleBackground || {}) },
        missing11th: { ...defaultMailTemplates.missing11th, ...(savedData.mailTemplates.missing11th || {}) }
      };
    }
  } catch (error) {
    console.error("Error reading data.json:", error);
  }
}

function saveDb() {
  const dataToSave = {
    tokens: encryptField(db.tokens),
    accounts: db.accounts ? db.accounts.map(acc => ({...acc, tokens: encryptField(acc.tokens)})) : [],
    logs: db.logs,
    students: db.students,
    autoReplyEnabled: db.autoReplyEnabled || false,
    aiConfig: db.aiConfig,
    mailTemplates: db.mailTemplates
  };
  fs.writeFileSync(dataFile, JSON.stringify(dataToSave, null, 2));
}

module.exports = {
  db,
  defaultMailTemplates,
  saveDb
};
