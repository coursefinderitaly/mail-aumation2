# 🧠 Gemini AI Engine & Training Documentation
**Last Updated:** Aug 19, 2026, 03:39 PM
**Current Engine Status:** 🟢 ON (Active Gemini-2.5-Flash Engine)
**Model Target:** `gemini-2.5-flash`

---

## 1. Executive Summary & Architecture Overview
This document serves as the live ground truth training guide and operational schema for our automated Study Abroad CRM & Course Matching system. When active, our email parsing pipeline utilizes Google's advanced Gemini LLM to interpret unstructured student inquiry emails, extract precise learner parameters, and execute intelligent university matching.

### ⚙️ Automated Pipeline Breakdown
1. **Email Ingestion**: Incoming Gmail inquiries are fetched and stripped of HTML tags, table structures, non-breaking characters, and quoted signatures to normalize text content.
2. **Gemini Extraction**: The cleaned text payload, along with stored few-shot training examples and system instructions, is transmitted to the Gemini API (`gemini-2.5-flash`) requesting strict, validated JSON output.
3. **Database Querying**: Extracted learner parameters (`programOfInterest`, `class12Stream`, `eligibilityCountry`, `class12Score`) are cross-referenced against our proprietary university course catalog in real time.
4. **Exclusion & Inclusion Filtering**: Dynamic organizational match rules are evaluated to filter out restricted institutions or prioritize tailored academic pathways.
5. **Response Template Generation**: A personalized email reply draft is compiled, embedding matched course rosters and seasonal intake remarks ready for automated delivery or advisor review.

---

## 2. Core Persona & System Instructions
```text
You are an expert Educational Consultant & AI CRM Engine for Study Abroad in Italy and Global Universities. Your goal is to accurately analyze incoming emails from prospective students and extract their educational profiles, testing scores, work experience, target intakes, and programs of interest with 100% precision. Always follow our consultancy rules and formatting guidelines.
```

---

## 3. Dynamic Match Rules & Filters

### 🟢 Active Inclusion & Match Rules
- **Inclusion**: Prioritize Bio/Life Science options for PCB (Physics, Chemistry, Biology) students with >65% score.
- **Inclusion**: For Economics, Commerce, or Finance interest, always match MGMT OPTIONS category.
- **Inclusion**: If student has > 2 years gap without formal work experience or degrees, flag gap as true and attach general guidance.

### 🔴 Active Exclusion Filters
- **Exclusion**: Never recommend University of Venice due to scholarship issues.
- **Exclusion**: Exclude master's degree courses if learner is pursuing or just completed Class 12th.
- **Exclusion**: Do not suggest courses requiring SAT > 1300 without verification of test scores.

---

## 4. Seasonal Intake Remarks Configuration
```text
REMARKS: Details for Upcoming Intake
1. We will evaluate the profile again before starting the admission application submission.
2. We can start admission applications for Sept 2027 by November 2026!
```

---

## 5. Few-Shot Training Memory Pool
**Total Trained Examples:** 2

### Example #1
**Input Sample:**
```text
Learner Name: Rahul Sharma
Age: 18
Class 12th - Stream: PCB
Class 12th Score: 12th expected -88% \n 11th - 75%
Program of Interest: biotechnology
Intake Pitched: Sept 2027
Eligibility Country: Italy
```

**Target Structured Output:**
```json
{
  "learnerName": "Rahul Sharma",
  "age": 18,
  "highestEducation": "Class 12th",
  "targetDegreeLevel": "Bachelor",
  "bachelorDegree": null,
  "bachelorProgram": null,
  "bachelorScore": null,
  "bachelorDuration": null,
  "graduationYear": null,
  "bachelorUniversity": null,
  "class12Stream": "PCB",
  "class12Score": "88%",
  "class12Year": 2025,
  "class12Board": "CBSE",
  "class11Score": "75%",
  "class10Score": "92%",
  "class10Year": 2023,
  "workExperience": 0,
  "programOfInterest": "biotechnology",
  "intakePitched": "Sept 2027",
  "eligibilityCountry": "Italy",
  "isPursuing": false,
  "isGap": false
}
```

---

### Example #2
**Input Sample:**
```text
Learner Name: Harpinder Singh
Age: 31
Select your Bachelor's Degree: BCA
Name of the Bachelor's Program: Bachelors of Computer science
Bachelor's Score (CGPA/Percentage): 71.17%
Duration of Bachelor's Degree: 3 years
Year of Graduation (YYYY): Year2018
Bachelors University: Guru Nanak Dev University
Work Experience: CV attached for the detailed experience details
Program of Interest: related options cs and data analyst
Intake Pitched: Sept 2027
Eligibility Country: Italy
```

**Target Structured Output:**
```json
{
  "learnerName": "Harpinder Singh",
  "age": 31,
  "highestEducation": "Bachelors",
  "targetDegreeLevel": "Masters",
  "bachelorDegree": "BCA",
  "bachelorProgram": "Bachelors of Computer science",
  "bachelorScore": "71.17%",
  "bachelorDuration": "3 years",
  "graduationYear": 2018,
  "bachelorUniversity": "Guru Nanak Dev University",
  "class12Stream": null,
  "class12Score": null,
  "class12Year": null,
  "class12Board": null,
  "class11Score": null,
  "class10Score": null,
  "class10Year": null,
  "workExperience": "CV attached",
  "programOfInterest": "cs and data analyst",
  "intakePitched": "Sept 2027",
  "eligibilityCountry": "Italy",
  "isPursuing": false,
  "isGap": true
}
```

---
*Generated automatically by the Presume Overseas AI Control Center.*
