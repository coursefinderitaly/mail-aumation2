const { google } = require('googleapis');
const fs = require('fs');
const readline = require('readline');

// Update this with your Pub/Sub Topic name after you create it in Google Cloud
const TOPIC_NAME = 'projects/YOUR_PROJECT_ID/topics/YOUR_TOPIC_NAME';

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.send',
  'https://www.googleapis.com/auth/gmail.modify'
];

const TOKEN_PATH = 'token.json';

function authorize(credentials, callback) {
  const {client_secret, client_id, redirect_uris} = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) return getNewToken(oAuth2Client, callback);
    oAuth2Client.setCredentials(JSON.parse(token));
    callback(oAuth2Client);
  });
}

function getNewToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log('Authorize this app by visiting this url:', authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question('Enter the code from that page here: ', (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error('Error retrieving access token', err);
      oAuth2Client.setCredentials(token);
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) return console.error(err);
        console.log('Token stored to', TOKEN_PATH);
      });
      callback(oAuth2Client);
    });
  });
}

async function setupWatch(auth) {
  const gmail = google.gmail({version: 'v1', auth});
  try {
    const res = await gmail.users.watch({
      userId: 'me',
      requestBody: {
        topicName: TOPIC_NAME,
        labelIds: ['INBOX'], // only watch the inbox
      },
    });
    console.log('Successfully connected Gmail to Pub/Sub! Watch Response:', res.data);
  } catch (error) {
    console.error('Error setting up watch:', error.message);
  }
}

// Run the script
fs.readFile('credentials.json', (err, content) => {
  if (err) return console.log('Error loading client secret file. Did you download credentials.json?');
  authorize(JSON.parse(content), setupWatch);
});
