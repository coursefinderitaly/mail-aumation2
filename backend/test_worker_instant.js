require('dotenv').config();
const { google } = require('googleapis');
const db = require('./db').db;
const { matchCourses } = require('./services/matcher');
const { generateTemplate } = require('./services/template');
const OAuth2 = google.auth.OAuth2;
const oauth2Client = new OAuth2(process.env.CLIENT_ID, process.env.CLIENT_SECRET, 'http://localhost:5000/auth/callback');

function extractText(payload) {
  let text = '';
  if (payload.mimeType === 'text/plain' && payload.body && payload.body.data) {
    return Buffer.from(payload.body.data, 'base64').toString('utf8');
  }
  if (payload.parts) {
    for (let part of payload.parts) {
      if (part.mimeType === 'text/plain' && part.body && part.body.data) {
        text += Buffer.from(part.body.data, 'base64').toString('utf8');
      } else if (part.parts) {
        text += extractText(part);
      }
    }
  }
  return text;
}

async function test() {
  if (!db.tokens) return console.log("No tokens");
  oauth2Client.setCredentials(db.tokens);
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
  try {
    const response = await gmail.users.messages.list({ userId: 'me', q: 'is:unread in:inbox -label:auto-replied -label:not-analyzed', maxResults: 10 });
    console.log("Worker found unread emails:", response.data.messages ? response.data.messages.length : 0);
  } catch(e) {
    console.log("Error:", e.message);
  }
}
test();
