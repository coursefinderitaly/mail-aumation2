const { db } = require('../db');

// ============================================================
// PROFILE PATTERN RULES — Excel-Like Two-Stage Filter Engine
//
// Stage 1: backgroundField gate (what stream/degree you did)
// Stage 2: programOfInterest keyword filter (what you want)
//
// Deterministic filtering for both Bachelor and Master applicants.
// ============================================================

/**
 * Safely extracts a percentage decimal (e.g. 0.7117 for 71.17%) from arbitrary score strings like
 * "71.17%", "Class 12th - 65%", "11th-74%", "65%", "85.5", "8.5 CGPA".
 * Prevents grade numbers like "12th" or "11th" or years like "2018" from being misparsed as student scores.
 */
function parseScorePercentage(scoreStr) {
  if (!scoreStr) return 0;
  let str = String(scoreStr).trim();
  if (!str) return 0;
  
  // 1. Remove grade labels and year strings
  str = str.replace(/(class\s*)?(10|11|12)(th)?/gi, '').replace(/year\s*\d{4}/gi, '').trim();
  
  // 2. Search for explicit percentage like '71.17%', '65%', '74.5%'
  const percentMatch = str.match(/(\d+(\.\d+)?)\s*%/);
  if (percentMatch) {
    const val = parseFloat(percentMatch[1]);
    return val > 1 ? val / 100 : val;
  }
  
  // 3. Search for CGPA out of 10 like '8.5/10' or '8.5'
  const cgpaMatch = str.match(/(\d+(\.\d+)?)\s*\/\s*10/);
  if (cgpaMatch) {
    return parseFloat(cgpaMatch[1]) / 10;
  }
  
  // 4. Extract any remaining numeric value
  const numMatch = str.match(/(\d+(\.\d+)?)/);
  if (numMatch) {
    const val = parseFloat(numMatch[1]);
    if (val > 10) return val / 100;
    if (val > 0 && val <= 10) return val / 10;
  }
  
  return 0;
}

/**
 * Calculates effective score percentage using the 5-point rounding rule:
 * - Scores ending in 3 or 4 round up to 5 (e.g. 73, 74 -> 75; 68, 69 -> 70; 63, 64 -> 65; 78, 79 -> 80)
 * - Scores ending in 1 or 2 round down to 0 (e.g. 71, 72 -> 70; 66, 67 -> 65; 61, 62 -> 60)
 * 
 * Returns the effective decimal percentage for eligibility comparison.
 */
function getEffectivePercentage(rawPerc) {
  if (!rawPerc || rawPerc <= 0) return 0;
  const score100 = rawPerc > 1 ? rawPerc : rawPerc * 100;
  const rounded5 = Math.round(score100 / 5) * 5;
  const effective100 = Math.max(score100, rounded5);
  return effective100 / 100;
}

/**
 * Determines the list of background field keywords compatible with a student's stream/education.
 * Mirrors the first Excel filter: "backgroundField contains..."
 */
function getBackgroundCompatibilityPattern(stream, isMasterTarget, poi, bachelorProgram, bachelorDegree) {
  const s = (stream || '').toLowerCase();
  const p = (poi || '').toLowerCase();
  const bp = (bachelorProgram || '').toLowerCase();
  const bd = (bachelorDegree || '').toLowerCase();

  if (isMasterTarget) {
    // Postgrad students: background gate is relaxed for Masters, but check general alignment
    if (bd.includes('bca') || bp.includes('computer') || bp.includes('cs') || bp.includes('information') || bd.includes('b.tech') || bd.includes('b.sc')) {
      return /computer|cs|software|engineering|information|math|statistics|data|technology|science|any background|any field|bachelor/i;
    }
    if (bd.includes('b.com') || bd.includes('bba') || bp.includes('business') || bp.includes('commerce') || bp.includes('management')) {
      return /commerce|business|economics|management|finance|accounting|any background|any field|bachelor/i;
    }
    if (bd.includes('barch') || bd.includes('b.arch') || bp.includes('architecture') || bd.includes('architecture')) {
      return /architecture|urban|design|landscape|building|environmental|engineering|any background|any field|bachelor/i;
    }
    return null; // Broad relaxation for Masters
  }

  // PCM (Physics, Chemistry, Mathematics) — 12th standard science stream with maths
  if (s.includes('pcm') || (s.includes('science') && s.includes('math'))) {
    return /physics,?\s*chemistry,?\s*(and\s*|&\s*)?math|science,?\s*maths|science,?\s*commerce|commerce.*math|arts.*commerce.*math|\bpcm\b|any background|any field/i;
  }

  // PCB (Physics, Chemistry, Biology) — 12th standard science stream with biology
  if (s.includes('pcb') || (s.includes('science') && s.includes('bio'))) {
    return /physics,?\s*chemistry,?\s*(and\s*|&\s*)?biol?o?g?y|life science|biomedical|pharma|medical|\bpcb\b|any background|any field/i;
  }

  // Commerce — 12th commerce stream
  if (s.includes('commerce') || s.includes('business') || s.includes('accounts')) {
    return /commerce|business|economics|management|arts.*commerce|finance|accounting|any background|any field/i;
  }

  // Humanities / Arts
  if (s.includes('humanities') || s.includes('arts') || s.includes('social')) {
    return /humanities|arts|social|law|political|philosophy|communication|any background|any field/i;
  }

  // Fallback: no gate
  return null;
}

/**
 * Determines what programs/fields a student is interested in.
 * Mirrors the second Excel filter: "programName or interestedField contains..."
 * Returns an array of regex patterns for matching.
 */
function getInterestProfile(poi, stream, bachelorProgram = '', bachelorDegree = '') {
  const p = (poi || '').toLowerCase();
  const s = (stream || '').toLowerCase();
  const bp = (bachelorProgram || '').toLowerCase();
  const bd = (bachelorDegree || '').toLowerCase();
  const combined = `${p} ${s} ${bp} ${bd}`;

  const interests = [];

  // ── CS / AI / ML / Data Science / Software ──
  if (combined.match(/\b(cs|computer science|computer engineering|artificial intelligence|ai|machine learning|ml|data science|data engineering|data analyst|data analytics|software|information technology|it|software engineering|bca|bachelor of computer|programming|coding|cyber|robotics|hci|nlp|deep learning|neural)\b/i)) {
    interests.push({
      label: 'CS/AI/ML',
      programMatch: /computer|artificial intelligence|data science|data engineering|data analyst|data analytics|machine learning|software|information technology|cyber security|robotics|hci|neural|nlp|computer engineering|computer applications|data analysis|information engineering|computing|programming/i,
      fieldMatch: /computer|artificial|data|software|information|engineering|sciences/i,
      subMatch: /computer|artificial|data|software|information|machine learning|cyber/i,
      bgMatch: /physics|math|cs|computer|software|engineering|statistics|any background|any field|bachelor/i,
      excludeFields: /humanities|arts|bio science|medical|law|social|agriculture|veterinary/i
    });
  }

  // ── Medical / MBBS / Dentistry / Pharmacy ──
  if (p.match(/\b(mbbs|medicine|medical|doctor|dentistry|dental|pharmacy|pharma|nursing|veterinary|clinical|surgery|healthcare|health|bio science|biomedical)\b/i)) {
    interests.push({
      label: 'Medical',
      programMatch: /medicine|medical|mbbs|dentistry|dental|pharmacy|pharma|nursing|veterinary|clinical|surgery|healthcare|biomedical|biomedicine/i,
      fieldMatch: /bio science|medical|pharma|dentistry|veterinary|mbbs|medtec|biomedical/i,
      subMatch: /medicine|medical|pharma|dental|nursing|veterinary|biomedical/i,
      bgMatch: /biology|life science|biomedical|pharma|medical|any background|any field/i,
      excludeFields: /engineering|computer|law|social|arts|humanities/i
    });
  }

  // ── Biotechnology / Bioinformatics / Genetics ──
  if (combined.match(/\b(biotech|biotechnology|bioinformatics|genetics|genomics|molecular biology|biochemistry|microbiology)\b/i)) {
    interests.push({
      label: 'Biotech',
      programMatch: /biotech|biotechnology|bioinformatics|genetics|genomics|molecular biology|biochemistry|microbiology/i,
      fieldMatch: /bio science|sciences|engineering/i,
      subMatch: /biotech|bioinformatics|genetics|genomics|molecular|biochemistry/i,
      bgMatch: /biology|chemistry|life science|any background|any field/i,
      excludeFields: /law|social|arts|humanities|computer applications/i
    });
  }

  // ── Architecture / Urban Planning / Design ──
  if (combined.match(/\b(architecture|barch|b\.arch|bachelor of architecture|urban planning|urban design|interior design|landscape)\b/i)) {
    interests.push({
      label: 'Architecture',
      programMatch: /architecture|urban planning|interior design|landscape|building design/i,
      fieldMatch: /architecture|design/i,
      subMatch: /architecture|urban|design/i,
      bgMatch: /physics|math|architecture|barch|b\.arch|any background|any field/i,
      excludeFields: /medical|bio science|law|humanities|computer applications/i
    });
  }

  // ── Engineering (generic/civil/mechanical/electrical) ──
  if (p.match(/\b(engineering|mechanical|civil|electrical|electronics|chemical|structural|energy|aerospace|aeronautical|automotive|industrial|environmental)\b/i)) {
    const engType = p.match(/mechanical|civil|electrical|electronics|chemical|structural|energy|aerospace|aeronautical|automotive|industrial|environmental/i);
    const specificEng = engType ? engType[0].toLowerCase() : null;
    interests.push({
      label: 'Engineering',
      programMatch: specificEng
        ? new RegExp(`${specificEng}|engineering`, 'i')
        : /engineering|mechanical|civil|electrical|electronics|chemical|aerospace|aeronautical|automotive|industrial/i,
      fieldMatch: /engineering|architecture|sciences/i,
      subMatch: specificEng ? new RegExp(specificEng, 'i') : /engineering/i,
      bgMatch: /physics|math|engineering|any background|any field/i,
      excludeFields: /medical|bio science|law|humanities|computer applications|arts/i
    });
  }

  // ── Business / Management / MBA / Economics ──
  if (combined.match(/\b(business|management|mba|bba|economics|finance|accounting|marketing|entrepreneurship|commerce|administration|corporate|b\.com)\b/i)) {
    interests.push({
      label: 'Business',
      programMatch: /business|management|economics|finance|accounting|marketing|entrepreneurship|commerce|administration|corporate|mba|bba/i,
      fieldMatch: /management|commerce|economics|business/i,
      subMatch: /business|management|economics|finance|accounting|marketing|commerce/i,
      bgMatch: /commerce|business|economics|math|any background|any field|arts.*commerce|science/i,
      excludeFields: /bio science|medical|veterinary/i
    });
  }

  // ── Law / Political Science / International Relations ──
  if (combined.match(/\b(law|legal|political science|international relations|governance|public policy|diplomacy|politics|llb)\b/i)) {
    interests.push({
      label: 'Law',
      programMatch: /law|legal|political|international relations|governance|public policy|diplomacy|politics/i,
      fieldMatch: /law|social sciences|humanities|arts/i,
      subMatch: /law|political|international|governance|policy|diplomacy/i,
      bgMatch: /law|political|arts|humanities|social|any background|any field/i,
      excludeFields: /engineering|bio science|medical|computer applications/i
    });
  }

  // ── Data Science / Analytics ──
  if (combined.match(/\b(data science|data analytics|data analysis|data analyst|business analytics|big data|statistics)\b/i) && !interests.find(i => i.label === 'CS/AI/ML')) {
    interests.push({
      label: 'Data Science',
      programMatch: /data science|data analytics|data analysis|data analyst|business analytics|big data|statistics|quantitative/i,
      fieldMatch: /engineering|sciences|computer|commerce/i,
      subMatch: /data science|data analytics|statistics|quantitative|big data|data analyst/i,
      bgMatch: /math|statistics|computer|economics|physics|science|any background|any field/i,
      excludeFields: /bio science|medical|law|arts|humanities/i
    });
  }

  // ── Sciences / Physics / Chemistry / Maths ──
  if (combined.match(/\b(physics|chemistry|mathematics|pure science|applied science|environmental science|earth science|geology|astronomy|astrophysics)\b/i)) {
    interests.push({
      label: 'Sciences',
      programMatch: /physics|chemistry|mathematics|environmental science|earth science|geology|astronomy|astrophysics|natural science|atmospheric/i,
      fieldMatch: /sciences|engineering/i,
      subMatch: /physics|chemistry|mathematics|geology|astronomy|astrophysics|environmental/i,
      bgMatch: /physics|chemistry|math|science|any background|any field/i,
      excludeFields: /humanities|arts|law|social|medical|computer applications/i
    });
  }

  return interests;
}

/**
 * Core deterministic Excel-like scorer for a single course.
 * Returns a numeric score — positive = eligible, negative = excluded.
 */
function scoreCourse(course, studentProfile) {
  const {
    stream, poi, isMasterTarget, isUndergrad,
    studentScorePerc, interests, bgCompatibilityPattern,
    isStreamPCM, isStreamPCB, bachelorDegree, bachelorProgram, bachelorDuration
  } = studentProfile;

  if (!course || !course.programName) return -9999;

  // Hard exclude: University of Venice (known scholarship issues)
  if ((course.universityName || '').toLowerCase().includes('venice')) return -9999;

  let score = 0;
  const field  = (course.interestedField  || '').toLowerCase();
  const prog   = (course.programName      || '').toLowerCase();
  const sub    = (course.subField         || '').toLowerCase();
  const level  = (course.programLevel     || course.category || '').toLowerCase();
  const bgField= (course.backgroundField  || '').toLowerCase();
  const acadBg = (course.academicBackground || '').toLowerCase();

  // ── STAGE 1: Program Level Gate (HARD GATE) ──
  if (isMasterTarget && !level.includes('master')) {
    return -9999;
  }
  if (isUndergrad && !isMasterTarget && level.includes('master')) {
    return -9999;
  }

  // ── STRICT BLOCK: Tech/Science Courses for Humanities/Commerce ──
  if (isUndergrad) {
    const st = (stream || '').toLowerCase();
    const isHumanitiesOrCommerce = st.includes('humanities') || st.includes('arts') || st.includes('commerce') || st.includes('business');
    if (isHumanitiesOrCommerce) {
      // If course is explicitly Tech, Engineering, or Medical, block it even if it says "Any Background"
      const isTechOrSci = /computer|software|engineering|technology|physics|chemistry|biology|medical|nursing|pharma|medicine|surgery|artificial intelligence|data science|cyber|it\b/i.test(prog + ' ' + sub + ' ' + field);
      if (isTechOrSci) {
        return -9999;
      }
    }
  }

  // ── STAGE 2: Percentage Eligibility Gate (HARD GATE) ──
  // Student score must be >= course minimum required %
  // 5-Point Rounding Rule:
  // - 73 or 74 -> considered as 75 (also 68, 69 -> 70; 63, 64 -> 65; 78, 79 -> 80, etc.)
  // - 71 or 72 -> considered as 70 (also 66, 67 -> 65; 61, 62 -> 60; 76, 77 -> 75, etc.)
  if (studentScorePerc > 0) {
    let courseMinPerc = parseFloat(course.percentage);
    if (!isNaN(courseMinPerc) && courseMinPerc > 0) {
      if (courseMinPerc > 1) courseMinPerc = courseMinPerc / 100; // Normalize: 75 → 0.75
      const effectiveStudentPerc = getEffectivePercentage(studentScorePerc);
      if (effectiveStudentPerc < courseMinPerc) {
        return -9999;
      } else {
        score += 50; // Qualifying bonus
      }
    }
  }

  // ── STAGE 3: Background Field Compatibility ──
  if (isMasterTarget) {
    // Check degree duration compatibility (3 years vs 4 years)
    const durationNum = bachelorDuration ? parseInt(bachelorDuration) : 3;
    if (durationNum === 3 && acadBg.includes('4 years') && !acadBg.includes('3')) {
      score -= 30; // 3-year bachelor applying to 4-year degree (possible but lower rank)
    } else if (acadBg.includes('3') || acadBg.includes('bachelor')) {
      score += 30;
    }

    // Match Bachelor program keywords with course background requirements
    const bp = (bachelorProgram || '').toLowerCase();
    const bd = (bachelorDegree || '').toLowerCase();
    if (bp.includes('computer') || bd.includes('bca') || bp.includes('cs') || bp.includes('information')) {
      if (bgField.includes('cs') || bgField.includes('computer') || bgField.includes('engineering') || bgField.includes('information') || bgField.includes('math') || bgField.includes('programming')) {
        score += 60;
      }
    } else if (bp.includes('business') || bd.includes('bba') || bd.includes('b.com') || bp.includes('commerce') || bp.includes('management')) {
      if (bgField.includes('business') || bgField.includes('commerce') || bgField.includes('economics') || bgField.includes('management')) {
        score += 60;
      }
    } else if (bp.includes('architecture') || bd.includes('barch') || bd.includes('b.arch') || bd.includes('architecture')) {
      if (bgField.includes('architecture') || bgField.includes('design') || bgField.includes('urban') || bgField.includes('landscape') || bgField.includes('building')) {
        score += 60;
      }
    }
  } else if (bgCompatibilityPattern) {
    const bgCompatible = bgCompatibilityPattern.test(bgField);
    if (!bgCompatible) {
      score -= 300; // Hard exclude — course requires a background the student doesn't have
    } else {
      if (isStreamPCM && bgField.includes('physics') && bgField.includes('math')) {
        score += 60;
      }
      if (isStreamPCB && bgField.includes('biology')) {
        score += 60;
      }
    }
  }

  // ── STAGE 4: Program of Interest Match ──
  const isMultidisciplinary = sub.includes('multidisciplinary') || prog.includes('multidisciplinary');

  if (interests.length > 0) {
    let anyInterestMatched = false;
    let bestInterestBonus = 0;

    for (const interest of interests) {
      const fieldOk  = interest.fieldMatch.test(field);
      const progOk   = interest.programMatch.test(prog);
      const subOk    = interest.subMatch.test(sub);
      const bgOk     = interest.bgMatch ? interest.bgMatch.test(bgField) : true;

      if (interest.excludeFields && interest.excludeFields.test(field)) {
        score -= 200;
        continue;
      }

      if (progOk || (fieldOk && subOk) || (progOk && bgOk)) {
        anyInterestMatched = true;
        let bonus = 0;
        if (progOk) bonus += 150;
        if (fieldOk) bonus += 80;
        if (subOk)  bonus += 60;
        if (bgOk)   bonus += 30;
        bestInterestBonus = Math.max(bestInterestBonus, bonus);
      }
    }

    // Multidisciplinary Engineering is always considered for PCM students (subject to percentage eligibility filter)
    if (isStreamPCM && isMultidisciplinary && !isMasterTarget) {
      anyInterestMatched = true;
      bestInterestBonus = Math.max(bestInterestBonus, 90);
    }

    if (anyInterestMatched) {
      score += bestInterestBonus;
    } else if (interests.length > 0) {
      score -= 250;
    }
  } else if (isStreamPCM && isMultidisciplinary && !isMasterTarget) {
    score += 90;
  }

  // ── STAGE 5: Hard exclusions for off-domain courses ──
  if ((isStreamPCM || isStreamPCB) && !isMasterTarget) {
    if (field.match(/arts|humanities|law|social sciences|social science/i) && 
        !interests.some(i => i.label === 'Law')) {
      score -= 300;
    }
    if (field.match(/agriculture|veterinary/i) && !interests.some(i => i.label === 'Medical' || i.label === 'Biotech')) {
      score -= 200;
    }
  }

  // ── STAGE 6: Granular token bonus ──
  let tokenBonus = 0;
  const poiTokens = (`${poi || ''} ${bachelorProgram || ''}`).split(/[\s,+/()&]+/).filter(w => w.length >= 3 && !['and', 'the', 'for', 'options', 'related'].includes(w.toLowerCase()));
  poiTokens.forEach(token => {
    const t = token.toLowerCase();
    if (prog.includes(t)) tokenBonus += 15;
    else if (sub.includes(t)) tokenBonus += 10;
    else if (field.includes(t)) tokenBonus += 5;
  });
  score += tokenBonus;

  // ── STAGE 7: Final Validation for Specific Unknown POIs ──
  // If we couldn't classify the POI into a known category (interests.length === 0),
  // and it's a specific POI (not 'any' or 'relevant'),
  // we MUST require at least one keyword token match. Otherwise, we reject the course.
  if (interests.length === 0) {
    const rawPoiStr = (poi || '').toLowerCase();
    const isGenericPoi = rawPoiStr.includes('relevant') || rawPoiStr.includes('any') || rawPoiStr.includes('eligible') || rawPoiStr.includes('process') || rawPoiStr.includes('course') || rawPoiStr.length < 3;
    if (!isGenericPoi && tokenBonus === 0) {
      score -= 250; // Hard exclude because it has absolutely zero keyword correlation
    }
  }

  return score;
}

/**
 * Intelligent Profile-Aware Course Matching Engine
 *
 * Filter Pipeline (mirrors manual Excel process):
 *   Stage 1: Program level (Bachelor vs Master)
 *   Stage 2: Student score >= course minimum %
 *   Stage 3: backgroundField compatibility (Bachelor degree / stream alignment)
 *   Stage 4: Program of Interest match (CS/AI/ML, Data Science, etc.)
 */
async function matchCourses(studentData, userInstruction = '') {
  let {
    programOfInterest = '',
    intakePitched = '',
    class12Stream = '',
    workExperience = '',
    class12Score = '',
    class11Score = '',
    class10Score = '',
    bachelorDegree = '',
    bachelorProgram = '',
    bachelorScore = '',
    bachelorDuration = '',
    graduationYear = null,
    bachelorUniversity = '',
    highestEducation = '',
    targetDegreeLevel = '',
    isPursuing = false,
    isGap = false,
    eligibilityCountry = ''
  } = (studentData || {});

  // ── 1. Parse & Normalize Profile ──
  const poi    = String(programOfInterest || '').toLowerCase();
  const stream = String(class12Stream    || '').toLowerCase();
  const work   = String(workExperience   || '').toLowerCase();

  // Detect education level target: If student has Bachelor's degree/score/details, target Masters!
  const hasBachelor = !!(bachelorDegree || bachelorScore || bachelorProgram || graduationYear || bachelorUniversity || highestEducation === 'Bachelors');
  const isMasterTarget = hasBachelor || targetDegreeLevel === 'Masters' ||
    !!poi.match(/\b(master|masters|msc|ma|mba|post grad|postgraduate)\b/i) ||
    !!work.match(/\b(years|exp|manager)\b/i);

  const isUndergrad = !isMasterTarget;
  const lastEducation = isMasterTarget
    ? `Bachelor's (${bachelorDegree || 'UG'}${bachelorProgram ? ` - ${bachelorProgram}` : ''})`
    : 'Class 12th/High School';

  const session = intakePitched || 'Upcoming';
  const studentStatus = String(isPursuing).toLowerCase() === 'true'
    ? 'Currently Pursuing'
    : (String(isGap).toLowerCase() === 'true' ? 'Has Gap' : 'Passed Out');

  // ── 2. Identify Student Score ──
  let studentScoreStr = '';
  let studentScorePerc = 0;
  let scoreSource = '';

  const percBachelor = parseScorePercentage(bachelorScore);
  const perc12 = parseScorePercentage(class12Score);
  const perc11 = parseScorePercentage(class11Score);
  const perc10 = parseScorePercentage(class10Score);

  if (isMasterTarget && percBachelor > 0) {
    studentScorePerc = percBachelor;
    studentScoreStr = bachelorScore;
    scoreSource = `Bachelor's (${bachelorDegree || 'Score'})`;
  } else if (perc12 > 0) {
    studentScorePerc = perc12;
    studentScoreStr = class12Score;
    scoreSource = 'Class 12th';
  } else if (percBachelor > 0) {
    studentScorePerc = percBachelor;
    studentScoreStr = bachelorScore;
    scoreSource = `Bachelor's (${bachelorDegree || 'Score'})`;
  } else if (perc11 > 0) {
    studentScorePerc = perc11;
    studentScoreStr = class11Score;
    scoreSource = 'Class 11th';
  } else if (String(isPursuing).toLowerCase() === 'true' && !hasBachelor) {
    return {
      matchedCourses: [],
      intakeRemarks: `Greetings!\n\nThank you for reaching out to us.\n\nWe noticed that you are currently pursuing your 12th standard, but your 11th standard percentage is missing from your details. To help us accurately evaluate your profile and recommend the best course options for you, kindly send us your 11th standard marks/percentage.\n\nBest regards,\nPresume Overseas Admission Team`,
      profileLabels: ['missing 11th score'],
      poiNotAvailable: true,
      aiReasoning: 'Missing 11th Score for Pursuing Student',
      missing11thScore: true
    };
  } else if (perc10 > 0) {
    studentScorePerc = perc10;
    studentScoreStr = class10Score;
    scoreSource = 'Class 10th';
  }

  // ── 3. Generate Intake Remarks ──
  let intakeRemarks = `REMARKS: Details for ${session} Intake\n`;
  intakeRemarks += `Profile Analysis: Last Education: ${lastEducation}, Status: ${studentStatus}, Score: ${(studentScorePerc * 100).toFixed(1)}%${scoreSource ? ` (${scoreSource})` : ''}.\n`;
  if (String(isGap).toLowerCase() === 'true') {
    intakeRemarks += isMasterTarget && graduationYear
      ? `Note: The student graduated in ${graduationYear} and has a study gap. Gap justification / CV verification will be needed.\n`
      : 'Note: The student has a study gap. We will need to verify gap justification documents.\n';
  }
  if (session.toLowerCase().includes('sept 2027') || session.toLowerCase().includes('sep 2027')) {
    intakeRemarks += '1. We will evaluate the profile again before starting the admission application submission.\n';
    intakeRemarks += '2. We can start admission applications for Sept 2027 by November 2026!\n';
  } else {
    intakeRemarks += '1. We will evaluate the profile again before starting the admission application submission.\n';
  }

  // ── 4. Generate Profile Labels ──
  const profileLabels = [];
  const isMBBS = poi.match(/mbbs|medicine/i);
  const isSept2027 = session.toLowerCase().includes('sept 2027') || session.toLowerCase().includes('sep 2027');
  if (isSept2027) {
    if (isMBBS) profileLabels.push('MBBS sep 2027');
    else if (isMasterTarget) profileLabels.push('masters sep 2027 intake');
    else profileLabels.push('bachelors sep 2027 intake');
  }
  const effectivePerc = getEffectivePercentage(studentScorePerc);
  if (effectivePerc > 0 && effectivePerc < 0.65) profileLabels.push('low profile');

  if (!Array.isArray(db.courses) || db.courses.length === 0) {
    return { matchedCourses: [], intakeRemarks, profileLabels };
  }

  // ── 5. Build Excel Filter Profiles ──
  const isStreamPCM = stream.includes('pcm');
  const isStreamPCB = stream.includes('pcb');

  const bgCompatibilityPattern = getBackgroundCompatibilityPattern(stream, isMasterTarget, poi, bachelorProgram, bachelorDegree);
  const interests = getInterestProfile(poi, stream, bachelorProgram, bachelorDegree);

  const studentProfile = {
    stream, poi, isMasterTarget, isUndergrad,
    studentScorePerc, interests, bgCompatibilityPattern,
    isStreamPCM, isStreamPCB,
    bachelorDegree, bachelorProgram, bachelorDuration
  };

  // ── 6. Apply Scoring to All Courses ──
  const scoredCourses = db.courses.map(course => ({
    course,
    score: scoreCourse(course, studentProfile)
  }));

  // ── 7. Filter: keep only positively scored, sort by relevance ──
  let matchedCourses = scoredCourses
    .filter(item => item.score > 0)
    .sort((a, b) => b.score - a.score)
    .map(item => item.course);

  let poiNotAvailable = false;
  let isNoCourseOptionsForPoi = false;

  // ── 8. Strict Fallback Check ──
  const rawPoiStrForFallback = (poi || '').toLowerCase();
  const isGenericPoiForFallback = rawPoiStrForFallback.includes('relevant') || rawPoiStrForFallback.includes('any') || rawPoiStrForFallback.includes('eligible') || rawPoiStrForFallback.includes('process') || rawPoiStrForFallback.includes('course') || rawPoiStrForFallback.length < 3;

  // If student score is below the minimum database threshold (e.g. 50% < 65%), DO NOT add fallback courses.
  if (matchedCourses.length === 0) {
    if (effectivePerc > 0 && effectivePerc < 0.65) {
      // Score is ineligible across all universities in database
      matchedCourses = [];
      poiNotAvailable = true;
    } else if (!isGenericPoiForFallback) {
      // The student requested a specific program (like "Animation", "Dental"), but we have 0 matches.
      // Do NOT dump random Engineering/Bio courses. Leave it as 0 to trigger the "No Courses Available" email draft.
      matchedCourses = [];
      poiNotAvailable = true;
      isNoCourseOptionsForPoi = true;
    } else {
      // Only suggest diverse general courses if the student's score is >= course cutoff, level matches, and POI is generic
      const diverse = db.courses.filter(c => {
        if (!c || (c.universityName || '').toLowerCase().includes('venice')) return false;
        const lvl = (c.programLevel || c.category || '').toLowerCase();
        if (isMasterTarget && !lvl.includes('master')) return false;
        if (!isMasterTarget && lvl.includes('master')) return false;
        
        let cMin = parseFloat(c.percentage) || 0;
        if (cMin > 1) cMin = cMin / 100;
        if (effectivePerc > 0 && cMin > 0 && effectivePerc < cMin) return false;
        return true;
      });
      matchedCourses = [
        ...diverse.filter(c => (c.interestedField || '').includes('Management')).slice(0, 3),
        ...diverse.filter(c => (c.interestedField || '').includes('Engineering')).slice(0, 3),
        ...diverse.filter(c => (c.interestedField || '').includes('Bio')).slice(0, 2)
      ];
    }
  }

  // ── 9. Check if POI is represented in matched results ──
  if (poi && poi.length > 2 && matchedCourses.length > 0 && interests.length > 0) {
    const hasMatch = matchedCourses.some(c => {
      const p = (c.programName || '').toLowerCase();
      const s = (c.subField || '').toLowerCase();
      const f = (c.interestedField || '').toLowerCase();
      return interests.some(interest =>
        interest.programMatch.test(p) || interest.fieldMatch.test(f) || interest.subMatch.test(s)
      );
    });
    poiNotAvailable = !hasMatch;
  }

  const exactBgKeyword = isMasterTarget
    ? `Bachelor in ${bachelorDegree || 'Relevant Field'}`
    : (stream.includes('pcm') ? '"Physics, Chemistry, and Mathematics"' :
       stream.includes('pcb') ? '"Physics, Chemistry & Biology"' :
       stream.includes('commerce') ? '"Commerce/Business"' :
       stream.includes('humanities') ? '"Humanities/Arts"' : '"Any Background"');

  const exactLevelKeyword = isMasterTarget ? '"Masters"' : '"Bachelor"';

  let rawPoiStr = (poi || '').toLowerCase();
  const isGenericPoi = rawPoiStr.includes('relevant') || rawPoiStr.includes('any') || rawPoiStr.includes('eligible') || rawPoiStr.includes('process') || rawPoiStr.includes('course');

  const exactInterestKeywords = interests.length > 0
    ? interests.map(i => i.label).join(', ')
    : (isGenericPoi ? 'General' : (poi || stream || 'General'));

  const exactScoreCutoff = studentScorePerc > 0
    ? `<= ${(studentScorePerc * 100).toFixed(1)}% (${scoreSource || 'Score'})`
    : 'No Cutoff (0%)';

  const displayStream = bachelorDegree
    ? `${bachelorDegree}${bachelorProgram ? ` (${bachelorProgram})` : ''}`
    : (class12Stream.toUpperCase() || 'GENERAL');

  const appliedFilters = [
    {
      stage: "Stage 1",
      columnName: "backgroundField",
      exactKeyword: exactBgKeyword,
      filterApplied: `Excel Column 'backgroundField' matches ${exactBgKeyword}`,
      action: isMasterTarget ? `Matches ${bachelorDegree || 'Bachelor'} background` : `Excludes non-${stream.toUpperCase()} academic backgrounds`,
      status: "ACTIVE"
    },
    {
      stage: "Stage 2",
      columnName: "programName, interestedField, subField",
      exactKeyword: exactInterestKeywords,
      filterApplied: `Contains keywords: ${exactInterestKeywords}`,
      action: `Filters programs matching student interest '${poi || displayStream}'`,
      status: "ACTIVE"
    },
    {
      stage: "Stage 3",
      columnName: "programLevel",
      exactKeyword: exactLevelKeyword,
      filterApplied: `Excel Column 'programLevel' equals ${exactLevelKeyword}`,
      action: isMasterTarget ? "Hard-excludes Bachelor level" : "Hard-excludes Master level",
      status: "ACTIVE"
    },
    {
      stage: "Stage 4",
      columnName: "percentage",
      exactKeyword: exactScoreCutoff,
      filterApplied: `Course requirement ${exactScoreCutoff}`,
      action: "Excludes courses requiring higher percentage cutoff",
      status: "ACTIVE"
    }
  ];

  const aiReasoning = [
    `Degree/Stream: ${displayStream}`,
    `Interests detected: ${interests.map(i => i.label).join(', ') || 'General'}`,
    `Background gate: ${isMasterTarget ? `Relaxed (Postgrad - ${bachelorDegree || 'UG'})` : (bgCompatibilityPattern ? 'Active (Stage 1)' : 'Relaxed')}`,
    `Program level: ${isMasterTarget ? 'Masters (Postgraduate)' : 'Bachelor (Undergraduate)'}`,
    `Student score: ${(studentScorePerc * 100).toFixed(1)}% (${scoreSource || 'Score'})`,
    `Matched: ${matchedCourses.length} courses`
  ].join(' | ');

  console.log(`[MATCHER] ${aiReasoning}`);

  return {
    matchedCourses,
    intakeRemarks,
    profileLabels,
    poiNotAvailable,
    isNoCourseOptionsForPoi,
    aiReasoning,
    appliedFilters
  };
}

module.exports = { matchCourses };

