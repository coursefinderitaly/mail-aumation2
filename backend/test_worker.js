require('dotenv').config();
const { google } = require('googleapis');
const db = require('./db').db;
const OAuth2 = google.auth.OAuth2;
const oauth2Client = new OAuth2(process.env.CLIENT_ID, process.env.CLIENT_SECRET, 'http://localhost:5000/auth/callback');

async function test() {
  if (!db.tokens) return console.log("No tokens");
  oauth2Client.setCredentials(db.tokens);
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
  try {
    const response = await gmail.users.messages.list({ userId: 'me', q: 'is:unread in:inbox', maxResults: 5 });
    console.log("Found emails:", response.data.messages ? response.data.messages.length : 0);
  } catch (err) {
    console.log("Error:", err.message);
  }
}
test();
