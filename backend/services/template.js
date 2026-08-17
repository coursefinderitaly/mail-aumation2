const { db, defaultMailTemplates } = require('../db');

/**
 * Generates the complete HTML email body for student course pitches & inquiries.
 * Supports:
 * - Bachelor, Master, Pursuing 12th/UG, Gap Year variations
 * - Low Profile / Low Percentage (Risk Application - per Image 5)
 * - Ineligible Academic Background (Domain mismatch + alternative courses offer)
 * - Missing 11th Grade Marks alert
 * - Dynamic Current Year disclaimer line (e.g. 2026 for 2027 intake)
 * - Authentic agency table format with Light Blue Remarks box, pink headers, yellow alerts
 */
function generateTemplate(crmData, studentName = 'Student', isPursuing = false, isGap = false, customConfig = null) {
  const t = customConfig || db.mailTemplates || defaultMailTemplates;
  const student = crmData?.studentData || {};
  const intake = student.intakePitched || 'Sept 2027';
  
  // Extract year information for dynamic year disclaimers
  const currentYear = new Date().getFullYear(); // e.g. 2026
  const yearMatch = intake.match(/\b(20\d{2})\b/);
  const intakeYear = yearMatch ? parseInt(yearMatch[1]) : (currentYear + 1); // e.g. 2027
  const previousYear = intakeYear - 1; // e.g. 2026

  const isMaster = !!(
    student.bachelorDegree || 
    student.bachelorScore || 
    student.highestEducation === 'Bachelors' || 
    student.targetDegreeLevel === 'Masters' || 
    (student.programOfInterest || '').toLowerCase().match(/\b(master|masters|msc|ma|mba|post grad|postgraduate)\b/i)
  );

  const matchedCourses = crmData?.matchedCourses || [];
  const poiNotAvailable = !!crmData?.poiNotAvailable;
  const isNoCourseOptionsForPoi = !!crmData?.isNoCourseOptionsForPoi;
  const missing11thScore = !!crmData?.missing11thScore;
  const profileLabels = crmData?.profileLabels || [];
  const isLowProfile = crmData?.isLowProfile || profileLabels.includes('low profile') || (matchedCourses.length === 0 && (parseFloat(student.class12Score) < 65 || parseFloat(student.bachelorScore) < 65));
  
  // If it's a specific POI missing, trigger No Course Options. If it's something else with 0 courses, trigger Ineligible Background.
  const isIneligibleBackground = (crmData?.isIneligibleBackground || (matchedCourses.length === 0 && poiNotAvailable && !isLowProfile)) && !isNoCourseOptionsForPoi;

  // ── CASE 1: Missing 11th Score ──
  if (missing11thScore) {
    const missingT = t.missing11th || defaultMailTemplates.missing11th;
    return `
      <div style="font-family: Arial, sans-serif; color: #111; line-height: 1.7; font-size: 16px; max-width: 100%; margin: 0 auto; padding: 6px;">
        <p style="font-size: 18px; font-weight: bold; margin: 0 0 16px 0;">${t.greetings || 'Greetings!'}</p>
        <div style="background-color: #fff3cd; padding: 16px 18px; border: 1px solid #ffeeba; border-radius: 8px; margin-bottom: 18px;">
          <h2 style="margin: 0 0 10px 0; color: #856404; font-size: 16.5px;">${missingT.title}</h2>
          <p style="margin: 0 0 8px 0; color: #664d03;">${missingT.message1}</p>
          <p style="margin: 0 0 8px 0; color: #664d03;">${missingT.message2}</p>
          <p style="margin: 0; color: #664d03;"><strong>${missingT.message3}</strong></p>
        </div>
        <p style="margin: 16px 0; font-size: 16px; font-weight: 500; color: #333;">${missingT.followUp}</p>
        <p style="margin-top: 28px; font-size: 15.5px; color: #333;">${t.signature || defaultMailTemplates.signature}</p>
      </div>
    `;
  }

  // ── CASE 2: Low Profile Rejection ──
  if (isLowProfile) {
    const lowT = t.lowProfile || defaultMailTemplates.lowProfile;
    return `
      <div style="font-family: Arial, sans-serif; color: #111; line-height: 1.7; font-size: 16px; max-width: 100%; margin: 0 auto; padding: 8px;">
        <p style="font-size: 18px; font-weight: bold; margin: 0 0 18px 0;">${t.greetings || 'Greetings!'}</p>

        <p style="margin: 16px 0;">
          <span style="background-color: #dc2626; color: #FFFFFF; font-weight: bold; padding: 6px 14px; font-size: 16px; display: inline-block; border-radius: 4px;">${lowT.badgeText}</span>
        </p>

        <p style="margin: 16px 0;">
          <span style="background-color: #fde8d7; color: #991b1b; font-weight: bold; padding: 6px 14px; font-size: 15.5px; display: inline-block; border-radius: 4px; line-height: 1.5;">${lowT.mainNotice}</span>
        </p>

        <p style="color: #1d4ed8; font-weight: bold; font-size: 16px; margin: 16px 0; line-height: 1.6;">
          ${lowT.reasonText}
        </p>

        <p style="margin: 16px 0;">
          <span style="background-color: #fff3cd; color: #856404; font-weight: bold; padding: 6px 14px; font-size: 15px; display: inline-block; border-radius: 4px;">${lowT.suretyNotice}</span>
        </p>

        <p style="margin-top: 28px; font-size: 15.5px; color: #333;">${t.signature || defaultMailTemplates.signature}</p>
      </div>
    `;
  }

  // ── CASE 3: Ineligible Background (Domain Mismatch with Alternative Offer) ──
  if (isIneligibleBackground) {
    const ineligT = t.ineligibleBackground || defaultMailTemplates.ineligibleBackground;
    return `
      <div style="font-family: Arial, sans-serif; color: #111; line-height: 1.7; font-size: 16px; max-width: 100%; margin: 0 auto; padding: 8px;">
        <p style="font-size: 18px; font-weight: bold; margin: 0 0 18px 0;">${t.greetings || 'Greetings!'}</p>

        <p style="margin: 16px 0;">
          <span style="background-color: #dc2626; color: #FFFFFF; font-weight: bold; padding: 6px 14px; font-size: 16px; display: inline-block; border-radius: 4px;">${ineligT.badgeText}</span>
        </p>

        <p style="margin: 16px 0;">
          <span style="background-color: #fde8d7; color: #991b1b; font-weight: bold; padding: 6px 14px; font-size: 15.5px; display: inline-block; border-radius: 4px; line-height: 1.5;">${ineligT.mainNotice}</span>
        </p>

        <p style="color: #1d4ed8; font-weight: bold; font-size: 16px; margin: 16px 0; line-height: 1.6;">
          ${ineligT.alternativeOffer}
        </p>

        <p style="margin: 16px 0;">
          <span style="background-color: #fff3cd; color: #856404; font-weight: bold; padding: 6px 14px; font-size: 15px; display: inline-block; border-radius: 4px;">${ineligT.suretyNotice}</span>
        </p>

        <p style="margin-top: 28px; font-size: 15.5px; color: #333;">${t.signature || defaultMailTemplates.signature}</p>
      </div>
    `;
  }

  // ── CASE 3.5: No Course Options Available ──
  if (isNoCourseOptionsForPoi) {
    const ncaT = t.noCourseAvailable || defaultMailTemplates.noCourseAvailable;
    return `
      <div style="font-family: Arial, sans-serif; color: #111; line-height: 1.7; font-size: 16px; max-width: 100%; margin: 0 auto; padding: 8px;">
        <p style="font-size: 18px; font-weight: bold; margin: 0 0 18px 0;">${t.greetings || 'Greetings!'}</p>

        <p style="margin: 16px 0;">
          <span style="background-color: #f59e0b; color: #FFFFFF; font-weight: bold; padding: 6px 14px; font-size: 16px; display: inline-block; border-radius: 4px;">${ncaT.badgeText}</span>
        </p>

        <p style="margin: 16px 0;">
          <span style="background-color: #fef3c7; color: #b45309; font-weight: bold; padding: 6px 14px; font-size: 15.5px; display: inline-block; border-radius: 4px; line-height: 1.5;">${ncaT.mainNotice}</span>
        </p>

        <p style="color: #1d4ed8; font-weight: bold; font-size: 16px; margin: 16px 0; line-height: 1.6;">
          ${ncaT.alternativeOffer}
        </p>

        <p style="margin-top: 28px; font-size: 15.5px; color: #333;">${t.signature || defaultMailTemplates.signature}</p>
      </div>
    `;
  }

  // ── CASE 4: Low Course Options Warning ──
  const isUndergrad = !isMaster;
  const isLowCourseOptions = isUndergrad && matchedCourses.length > 0 && matchedCourses.length < 3;
  if (isLowCourseOptions) {
    const lowC = t.lowCourseOptions || defaultMailTemplates.lowCourseOptions;
    return `
      <div style="font-family: Arial, sans-serif; color: #111; line-height: 1.7; font-size: 16px; max-width: 100%; margin: 0 auto; padding: 8px;">
        <p style="font-size: 18px; font-weight: bold; margin: 0 0 18px 0;">${t.greetings || 'Greetings!'}</p>

        <p style="margin: 16px 0;">
          <span style="background-color: #f59e0b; color: #FFFFFF; font-weight: bold; padding: 6px 14px; font-size: 16px; display: inline-block; border-radius: 4px;">${lowC.badgeText}</span>
        </p>

        <p style="margin: 16px 0;">
          <span style="background-color: #fef3c7; color: #92400e; font-weight: bold; padding: 6px 14px; font-size: 15.5px; display: inline-block; border-radius: 4px; line-height: 1.5;">${lowC.mainNotice}</span>
        </p>

        <p style="color: #92400e; font-weight: bold; font-size: 15.5px; margin: 16px 0; line-height: 1.6;">
          ${lowC.reasonText}
        </p>

        <p style="color: #1d4ed8; font-weight: bold; font-size: 16px; margin: 16px 0; line-height: 1.6;">
          ${lowC.alternativeOffer}
        </p>

        <p style="margin-top: 28px; font-size: 15.5px; color: #333;">${t.signature || defaultMailTemplates.signature}</p>
      </div>
    `;
  }

  // ── CASE 5: Standard Course Pitch Email (Bachelors / Masters / Pursuing / Gap) ──
  
  // Format category banner
  let categoryBannerText = 'THESE ARE THE OVERALL COURSE OPTIONS AVAILABLE';
  const poi = (student.programOfInterest || '').toLowerCase();
  const stream = (student.class12Stream || '').toLowerCase();
  if (poi.includes('management') || poi.includes('business') || poi.includes('economics') || poi.includes('finance') || stream.includes('commerce')) {
    categoryBannerText = 'THESE ARE THE ONLY MANAGEMENT RELATED BACHELOR COURSES';
  } else if (poi.includes('bio') || poi.includes('medical') || poi.includes('pharma') || poi.includes('biotech') || stream.includes('pcb')) {
    categoryBannerText = 'THESE ARE THE ONLY BIO RELATED BACHELOR COURSES';
  } else if (poi.includes('computer') || poi.includes('cs') || poi.includes('ai') || poi.includes('data') || poi.includes('engineering') || stream.includes('pcm')) {
    categoryBannerText = 'THESE ARE THE OVERALL TECH/SCIENCE BACHELOR COURSES';
  }

  const tableRemarks = t.tableRemarks || defaultMailTemplates.tableRemarks;
  const replacePlaceholders = (text) => {
    if (!text) return '';
    return text
      .replace(/\{intake\}/g, intake)
      .replace(/\{currentYear\}/g, currentYear)
      .replace(/\{intakeYear\}/g, intakeYear)
      .replace(/\{previousYear\}/g, previousYear)
      .replace(/\{educationLevel\}/g, isMaster ? "Bachelor's" : "12th");
  };

  const coursesHtml = matchedCourses.map((c, i) => `
    <tr style="text-align: center; border-bottom: 1px solid #ccc;">
      <td style="border: 1px solid #ccc; padding: 10px 12px; font-size: 14.5px; font-weight: bold; text-align: center;">${i + 1}</td>
      <td style="border: 1px solid #ccc; padding: 10px 12px; font-size: 14.5px; font-weight: bold; text-align: left; color: #111;">${c.universityName || c.university || '-'}</td>
      <td style="border: 1px solid #ccc; padding: 10px 12px; font-size: 14.5px; text-align: center;">${c.duration || '-'}</td>
      <td style="border: 1px solid #ccc; padding: 10px 12px; font-size: 14.5px; font-weight: bold; text-align: left; color: #0056b3;">${c.programName || c.name || '-'}</td>
      <td style="border: 1px solid #ccc; padding: 10px 12px; font-size: 14.5px; font-weight: bold; text-align: center;">${c.percentage || c.score || '-'}</td>
      <td style="border: 1px solid #ccc; padding: 10px 12px; font-size: 14.5px; text-align: center;">${c.languageRequirement || '-'}</td>
      <td style="border: 1px solid #ccc; padding: 10px 12px; font-size: 14.5px; text-align: center;">${c.otherReq || '-'}</td>
      <td style="border: 1px solid #ccc; padding: 10px 12px; font-size: 14.5px; font-weight: bold; text-align: center;">${c.admissionTest || '-'}</td>
      <td style="border: 1px solid #ccc; padding: 10px 12px; font-size: 14.5px; text-align: center;">${c.applicationFees || '-'}</td>
      <td style="border: 1px solid #ccc; padding: 10px 12px; font-size: 14.5px; text-align: center;">${c.tentativeMonths || '-'}</td>
    </tr>
  `).join('');

  return `
    <div style="font-family: Arial, sans-serif; color: #111; line-height: 1.7; font-size: 16px; max-width: 100%; margin: 0 auto; padding: 8px;">
      <p style="font-size: 18px; font-weight: bold; margin: 0 0 18px 0;">${t.greetings || 'Greetings!'}</p>

      <p style="margin: 16px 0;">
        <span style="background-color: #fce4d6; padding: 6px 14px; font-weight: bold; font-size: 16px; color: #000; display: inline-block; border-radius: 4px;">For ${intake} Intake</span>
      </p>

      ${isPursuing ? `
      <p style="margin: 16px 0;">
        <span style="background-color: #FFFF00; color: #FF0000; font-weight: bold; padding: 6px 14px; font-size: 15.5px; display: inline-block; border-radius: 4px; line-height: 1.5;">
          ${isMaster ? replacePlaceholders(t.pursuingBachelorWarningText) : replacePlaceholders(t.pursuing12thWarningText)}
        </span>
      </p>
      ` : ''}

      <p style="margin: 16px 0;">
        <span style="background-color: #00FF00; padding: 6px 14px; font-weight: bold; font-size: 16px; color: #000; display: inline-block; border-radius: 4px;">${t.safeToApplyText || 'SAFE TO APPLY - Only if s/he clears the admission test!!'}</span>
      </p>

      ${isGap ? `
      <p style="margin: 16px 0;">
        <span style="background-color: #FFFF00; color: #FF0000; font-weight: bold; padding: 6px 14px; font-size: 16px; display: inline-block; border-radius: 4px;">${t.gapWarningText || 'NEED TO JUSTIFY GAP WITH PROPER CERTIFICATES'}</span>
      </p>
      ` : ''}

      <p style="font-weight: bold; font-size: 16px; color: #000; margin: 20px 0; line-height: 1.6;">
        ${replacePlaceholders(t.reEvaluationNote)}
      </p>

      <p style="color: #0000FF; font-weight: bold; font-size: 16px; margin: 20px 0; line-height: 1.6;">
        ${replacePlaceholders(t.courseAvailabilityIntro)}
      </p>

      <p style="font-weight: bold; font-size: 15.5px; color: #000; margin: 18px 0; line-height: 1.6;">
        ${replacePlaceholders(t.updatesDisclaimer)}
      </p>

      <p style="margin: 18px 0;">
        <span style="background-color: #fde8d7; padding: 6px 14px; font-weight: bold; font-size: 15px; color: #000; display: inline-block; border-radius: 4px; line-height: 1.5;">
          ${replacePlaceholders(t.examBookingNote)}
        </span>
      </p>

      <!-- Dynamic Current Year Notice (Included for all non-low-profile emails) -->
      <p style="margin: 18px 0;">
        <span style="background-color: #e0e7ff; color: #1e1b4b; padding: 7px 14px; font-weight: bold; font-size: 15px; border-left: 4px solid #4f46e5; display: inline-block; border-radius: 2px; line-height: 1.5;">
          ${replacePlaceholders(t.currentYearDisclaimer)}
        </span>
      </p>

      ${matchedCourses.length > 0 ? `
      <div style="margin-top: 24px; overflow-x: auto;">
        <table style="width: 100%; border-collapse: collapse; font-size: 14.5px; margin-top: 16px; border: 1px solid #ccc;">
          <thead>
            <tr style="background-color: #FCE4D6; color: #111;">
              <th style="border: 1px solid #ccc; padding: 12px 10px; font-size: 15px; font-weight: bold; text-align: center; width: 55px;">S.No</th>
              <th style="border: 1px solid #ccc; padding: 12px 10px; font-size: 15px; font-weight: bold; text-align: left;">University Name</th>
              <th style="border: 1px solid #ccc; padding: 12px 10px; font-size: 15px; font-weight: bold; text-align: center; width: 90px;">Duration</th>
              <th style="border: 1px solid #ccc; padding: 12px 10px; font-size: 15px; font-weight: bold; text-align: left;">Program Name</th>
              <th style="border: 1px solid #ccc; padding: 12px 10px; font-size: 15px; font-weight: bold; text-align: center;">Percentage</th>
              <th style="border: 1px solid #ccc; padding: 12px 10px; font-size: 15px; font-weight: bold; text-align: center;">Lang. Req.</th>
              <th style="border: 1px solid #ccc; padding: 12px 10px; font-size: 15px; font-weight: bold; text-align: center;">Other Req.</th>
              <th style="border: 1px solid #ccc; padding: 12px 10px; font-size: 15px; font-weight: bold; text-align: center;">Admission Test/Interview</th>
              <th style="border: 1px solid #ccc; padding: 12px 10px; font-size: 15px; font-weight: bold; text-align: center;">Application Fees</th>
              <th style="border: 1px solid #ccc; padding: 12px 10px; font-size: 15px; font-weight: bold; text-align: center;">Tentative Months (Only Opening)</th>
            </tr>
            <!-- Blue Table Remarks Container Header (Per Agency Screenshots) -->
            <tr>
              <td colspan="10" style="background-color: #dbeafe; padding: 16px 22px; border: 1px solid #93c5fd; text-align: center; color: #1e3a8a; line-height: 1.75; font-size: 15px;">
                <div style="font-weight: bold; font-size: 16.5px; margin-bottom: 8px; color: #1d4ed8;">${replacePlaceholders(tableRemarks.headerText)}</div>
                <div style="font-weight: 600; margin: 3px 0;">${replacePlaceholders(tableRemarks.point1)}</div>
                <div style="font-weight: 600; margin: 3px 0;">${replacePlaceholders(tableRemarks.point2)}</div>
                <div style="font-weight: 600; margin: 3px 0;">${replacePlaceholders(tableRemarks.point3)}</div>
                <div style="font-weight: 600; margin: 3px 0;">${replacePlaceholders(tableRemarks.point4)}</div>
                <div style="margin-top: 6px;"><span style="background-color: #FFFF00; color: #000; font-weight: bold; padding: 3px 8px; font-size: 14.5px; display: inline-block; border-radius: 3px;">${replacePlaceholders(tableRemarks.point5Highlight)}</span></div>
                <div style="margin-top: 6px; font-weight: bold; font-size: 15.5px; color: #1d4ed8;">${replacePlaceholders(tableRemarks.applicationStartHighlight)}</div>
                <div style="margin-top: 8px;"><span style="background-color: #FFFF00; color: #FF0000; font-weight: bold; padding: 4px 10px; font-size: 14.5px; display: inline-block; border-radius: 3px;">${categoryBannerText}</span></div>
                <div style="margin-top: 6px; color: #dc2626; font-weight: bold; font-size: 15px;">${replacePlaceholders(tableRemarks.veniceWarning)}</div>
              </td>
            </tr>
          </thead>
          <tbody>
            ${coursesHtml}
          </tbody>
        </table>
      </div>
      ` : ''}

      <p style="margin-top: 28px; font-size: 15.5px; color: #333;">${t.signature || defaultMailTemplates.signature}</p>
    </div>
  `;
}

module.exports = { generateTemplate };
