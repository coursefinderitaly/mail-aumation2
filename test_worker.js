const { google } = require('googleapis');
const db = require('./backend/db').db;
const OAuth2 = google.auth.OAuth2;
const oauth2Client = new OAuth2(process.env.CLIENT_ID || 'dummy', process.env.CLIENT_SECRET || 'dummy', 'http://localhost:5000/auth/callback');

async function test() {
  if (!db.tokens) return console.log("No tokens");
  oauth2Client.setCredentials(db.tokens);
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
  try {
    const response = await gmail.users.messages.list({ userId: 'me', q: 'is:unread in:inbox -label:auto-replied -label:not-analyzed', maxResults: 10 });
    console.log("Found emails:", response.data.messages ? response.data.messages.length : 0);
    if (!response.data.messages) return;
    const msg = response.data.messages[0];
    console.log("Checking email:", msg.id);
    const details = await gmail.users.messages.get({ userId: 'me', id: msg.id });
    console.log("Details subject:", details.data.payload.headers.find(h => h.name === 'Subject').value);
  } catch (err) {
    console.log("Error:", err.message);
  }
}
test();
