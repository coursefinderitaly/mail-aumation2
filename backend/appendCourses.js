const fs = require('fs');
const path = require('path');

const coursesFile = path.join(__dirname, 'data/courses.json');
let courses = JSON.parse(fs.readFileSync(coursesFile, 'utf8'));

const newCourses = [
  { universityName: "Politecnico Di Milano", duration: "2 years", programName: "Computer Science and Engineering - Milano Lenardo", category: "CS MASTERS", languageRequirement: "B2 Level English Certificate", admissionTest: "May ask for Interview" },
  { universityName: "University of Sapienza", duration: "2 years", programName: "Artificial Intelligence", category: "CS MASTERS", languageRequirement: "B2 Level English Certificate", admissionTest: "May ask for Interview" },
  { universityName: "University of Sapienza", duration: "2 years", programName: "Artificial Intelligence & Robotics", category: "CS MASTERS", languageRequirement: "B2 Level English Certificate", admissionTest: "Admission Interview" },
  { universityName: "University of Sapienza", duration: "2 years", programName: "Computer Science", category: "CS MASTERS", languageRequirement: "B2 Level English Certificate", admissionTest: "Admission Interview" },
  { universityName: "University of Sapienza", duration: "2 years", programName: "Cyber Security", category: "CS MASTERS", languageRequirement: "B2 Level English Certificate", admissionTest: "May ask for Interview" },
  { universityName: "University of Sapienza", duration: "2 years", programName: "Data Science", category: "CS MASTERS", languageRequirement: "B2 Level English Certificate", admissionTest: "Admission Interview" },
  { universityName: "University of Sapienza", duration: "2 years", programName: "Engineering in Computer Science & Artificial Intelligence", category: "CS MASTERS", languageRequirement: "B2 Level English Certificate", admissionTest: "Admission Interview" },
  { universityName: "University of Bologna", duration: "2 years", programName: "Engineering and Computer Science", category: "CS MASTERS", languageRequirement: "B2 Level English Certificate", admissionTest: "May ask for Interview" },
  { universityName: "University of Bologna", duration: "2 years", programName: "Artificial Intelligence", category: "CS MASTERS", languageRequirement: "B2 Level English Certificate", admissionTest: "May ask for Interview" },
  { universityName: "University of Bologna", duration: "2 years", programName: "Computer Science & Engineering - Intelligent Embedded Systems", category: "CS MASTERS", languageRequirement: "B2 Level English Certificate", admissionTest: "Admission Interview" },
  { universityName: "University of Padova", duration: "2 years", programName: "International Cyber Security and Cyberintelligence", category: "CS MASTERS", languageRequirement: "B2 Level English Certificate", admissionTest: "May ask for Interview" },
  { universityName: "University of Padova", duration: "2 years", programName: "Computer Engineering", category: "CS MASTERS", languageRequirement: "B2 Level English Certificate", admissionTest: "May ask for Interview" },
  { universityName: "University of Padova", duration: "2 years", programName: "Computer Science", category: "CS MASTERS", languageRequirement: "B2 Level English Certificate", admissionTest: "May ask for Interview" },
  { universityName: "University of Padova", duration: "2 years", programName: "Cyber Security", category: "CS MASTERS", languageRequirement: "B2 Level English Certificate", admissionTest: "Admission Interview" },
  { universityName: "University of Padova", duration: "2 years", programName: "Data Science", category: "CS MASTERS", languageRequirement: "B2 Level English Certificate", admissionTest: "May ask for Interview" },
  { universityName: "Politecnico Di Torino", duration: "2 years", programName: "Computer Engineering", category: "CS MASTERS", languageRequirement: "B2 Level English Certificate", admissionTest: "May ask for Interview" },
  { universityName: "Politecnico Di Torino", duration: "2 years", programName: "Cyber Security", category: "CS MASTERS", languageRequirement: "B2 Level English Certificate", admissionTest: "May ask for Interview" },
  { universityName: "Politecnico Di Torino", duration: "2 years", programName: "Data Science and Engineering", category: "CS MASTERS", languageRequirement: "B2 Level English Certificate", admissionTest: "May ask for Interview" },
  { universityName: "University of Naples Federico II", duration: "2 years", programName: "Data Science", category: "CS MASTERS", languageRequirement: "B2 Level English Certificate", admissionTest: "May ask for Interview" },
  { universityName: "University of Pisa", duration: "2 years", programName: "Artificial Intelligence & Data Engineering", category: "CS MASTERS", languageRequirement: "B2 Level English Certificate", admissionTest: "May ask for Interview" },
  { universityName: "University of Pisa", duration: "2 years", programName: "Computer Engineering", category: "CS MASTERS", languageRequirement: "B2 Level English Certificate", admissionTest: "May ask for Interview" },
  { universityName: "University of Pisa", duration: "2 years", programName: "Cyber Security", category: "CS MASTERS", languageRequirement: "B2 Level English Certificate", admissionTest: "May ask for Interview" },
  { universityName: "University of Pisa", duration: "2 years", programName: "Computer Science", category: "CS MASTERS", languageRequirement: "B2 Level English Certificate", admissionTest: "May ask for Interview" },
  { universityName: "University of Pisa", duration: "2 years", programName: "Informatics for Digital Health", category: "CS MASTERS", languageRequirement: "B2 Level English Certificate", admissionTest: "May ask for Interview" },
  { universityName: "University of Turin", duration: "2 years", programName: "Artifical Intelligence & High Performance Computing Technologies", category: "CS MASTERS", languageRequirement: "B2 Level English Certificate", admissionTest: "May ask for Interview" },
  { universityName: "University of Pavia", duration: "2 years", programName: "Computer Engineering", category: "CS MASTERS", languageRequirement: "B2 Level English Certificate", admissionTest: "May ask for Interview" },
  { universityName: "University of Milano Bicocca", duration: "2 years", programName: "Artificial Intelligence for Science & Technology", category: "CS MASTERS", languageRequirement: "B2 Level English Certificate", admissionTest: "May ask for Interview" },
  { universityName: "University of Milano Bicocca", duration: "2 years", programName: "Data Science", category: "CS MASTERS", languageRequirement: "B2 Level English Certificate", admissionTest: "May ask for Interview" },
  { universityName: "University of Genova", duration: "2 years", programName: "Computer Engineering", category: "CS MASTERS", languageRequirement: "B2 Level English Certificate", admissionTest: "May ask for Interview" },
  { universityName: "University of Genova", duration: "2 years", programName: "Computer Science", category: "CS MASTERS", languageRequirement: "B2 Level English Certificate", admissionTest: "May ask for Interview" },
  { universityName: "University of Campania", duration: "2 years", programName: "Data Science", category: "CS MASTERS", languageRequirement: "B2 Level English Certificate", admissionTest: "May ask for Interview" },
  { universityName: "University of Cagliari", duration: "2 years", programName: "Computer Engineering, Cyber Security & Artificial Intelligence", category: "CS MASTERS", languageRequirement: "B2 Level English Certificate", admissionTest: "May ask for Interview" },
  { universityName: "University of Perugia", duration: "2 years", programName: "Computer Engineering & Robotics", category: "CS MASTERS", languageRequirement: "B2 Level English Certificate", admissionTest: "May ask for Interview" },
  { universityName: "University of Siena", duration: "2 years", programName: "Artificial Intelligence & Automation Engineering", category: "CS MASTERS", languageRequirement: "B2 Level English Certificate", admissionTest: "May ask for Interview" },
  { universityName: "University of Messina", duration: "2 years", programName: "Data Sciences", category: "CS MASTERS", languageRequirement: "B2 Level English Certificate", admissionTest: "May ask for Interview" }
];

courses = courses.concat(newCourses);
fs.writeFileSync(coursesFile, JSON.stringify(courses, null, 2));
console.log('Added ' + newCourses.length + ' Master courses.');
