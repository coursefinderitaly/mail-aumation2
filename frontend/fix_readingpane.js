const fs = require('fs');
const file = './components/ReadingPane.jsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(/setCrmData\(prev => \(\{\.\.\.prev, appliedFilters: newFilters, matchedCourses: applyCrmFilters\(newFilters, allCourses\)\}\)\);/g, 
  "setCrmData(prev => ({...prev, appliedFilters: newFilters, matchedCourses: applyCrmFilters(newFilters, allCourses)}));\n                                              setLogicChanged(true);"
);

fs.writeFileSync(file, content);
