const { google } = require('googleapis');
const db = require('./backend/db').db;
if (db.accounts && db.accounts.length > 0) {
  console.log("Found an account!");
} else {
  console.log("No accounts found in db.json");
}
