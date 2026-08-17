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
    const list = await gmail.users.messages.list({ userId: 'me', maxResults: 1 });
    const id = list.data.messages[0].id;
    console.log("Found message:", id);
    const msg = await gmail.users.messages.get({ userId: 'me', id });
    console.log("Trying to apply TRASH label...");
    await gmail.users.threads.modify({
      userId: 'me',
      id: msg.data.threadId,
      requestBody: {
        addLabelIds: ['TRASH'],
        removeLabelIds: ['INBOX']
      }
    });
    console.log("Success!");
  } catch(e) {
    console.log("Error:", e.message);
  }
}
test();
