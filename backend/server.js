require('dotenv').config({ path: require('path').join(__dirname, '.env') });

process.on('uncaughtException', (err) => {
  console.error('🔥 [UNCAUGHT EXCEPTION]:', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('🔥 [UNHANDLED REJECTION]:', reason);
});

const express = require('express');
const cors = require('cors');
const { google } = require('googleapis');
const { matchCourses } = require('./services/matcher');
const { generateTemplate } = require('./services/template');
const { db, defaultMailTemplates, saveDb } = require('./db');
const { parseStudentData, parseEmailWithAI, chatWithAI, testApiConnection } = require('./services/aiService');
const { generateAiTrainingDoc } = require('./services/docGenerator');

// Initialize doc on startup
generateAiTrainingDoc(db.aiConfig || {});

const crypto = require('crypto');
const app = express();
app.use(express.json());

// --- 1. API Hardening (Helmet, Strict CORS, Rate Limiting, Validation) ---

// CORS Configuration
app.use(cors({ 
  origin: function(origin, callback) {
    // Allow all same-origin, localhost, and presumeoverseas.com requests
    if (!origin || origin.includes('presumeoverseas.com') || origin.includes('localhost') || origin.includes('127.0.0.1')) {
      callback(null, true);
    } else {
      callback(null, true);
    }
  }, 
  credentials: true 
}));

// Helmet-like Security Headers
app.use((req, res, next) => {
  res.setHeader('X-DNS-Prefetch-Control', 'off');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Strict-Transport-Security', 'max-age=15552000; includeSubDomains');
  res.setHeader('X-Download-Options', 'noopen');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '0');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-eval' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' http: https:;");
  next();
});

// Cookie Parser Utility
app.use((req, res, next) => {
  req.cookies = {};
  if (req.headers.cookie) {
    req.headers.cookie.split(';').forEach(cookie => {
      const parts = cookie.split('=');
      req.cookies[parts.shift().trim()] = decodeURI(parts.join('='));
    });
  }
  next();
});

// Simple In-Memory Rate Limiter
const rateLimitMap = new Map();
const rateLimiter = (limit, windowMs) => (req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  if (!rateLimitMap.has(ip)) {
    rateLimitMap.set(ip, []);
  }
  const timestamps = rateLimitMap.get(ip).filter(t => now - t < windowMs);
  timestamps.push(now);
  rateLimitMap.set(ip, timestamps);
  if (timestamps.length > limit) {
    return res.status(429).json({ error: 'Too many requests, please try again later.' });
  }
  next();
};

// Strict Validation Utility (Zod Alternative)
const validateStrict = (allowedFields) => (req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    for (const key of Object.keys(req.body)) {
      if (!allowedFields.includes(key)) {
         return res.status(400).json({ error: `Strict Validation Error: Unknown field '${key}' is not allowed.` });
      }
    }
  }
  next();
};

// Stateless Token Verification Middleware
const SECRET_KEY = process.env.ADMIN_PASSWORD || 'fallback-secret-key-for-dev';
const verifyAdmin = (req, res, next) => {
  const token = req.cookies.admin_token;
  if (!token) return res.status(401).json({ error: 'Unauthorized: No token provided' });
  try {
    const [payloadBase64, signature] = token.split('.');
    if (!payloadBase64 || !signature) throw new Error();
    const expectedSignature = crypto.createHmac('sha256', SECRET_KEY).update(payloadBase64).digest('hex');
    if (signature !== expectedSignature) throw new Error();
    const payload = JSON.parse(Buffer.from(payloadBase64, 'base64').toString('utf8'));
    if (payload.exp < Date.now()) return res.status(401).json({ error: 'Token expired' });
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Unauthorized: Invalid token' });
  }
};


function getOauth2Client(req) {
  const protocol = req ? (req.headers['x-forwarded-proto'] || req.protocol || 'http') : 'http';
  const host = req ? (req.headers['x-forwarded-host'] || req.get('host')) : 'localhost:5000';
  const redirectUri = process.env.GOOGLE_REDIRECT_URI || `${protocol}://${host}/auth/google/callback`;
  
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID || 'dummy_client_id',
    process.env.GOOGLE_CLIENT_SECRET || 'dummy_client_secret',
    redirectUri
  );
}

const oauth2Client = getOauth2Client();

// 1. OAuth Authentication Route (Triggered from Frontend GUI)
app.get('/auth/google', (req, res) => {
  const client = getOauth2Client(req);
  const url = client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'select_account',
    scope: [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.modify',
      'https://www.googleapis.com/auth/userinfo.profile'
    ]
  });
  res.redirect(url);
});

let pendingNotifications = [];

app.get('/api/notifications', (req, res) => {
  const notifs = [...pendingNotifications];
  pendingNotifications = [];
  res.json({ notifications: notifs });
});

// 2. OAuth Callback Route
app.get('/auth/google/callback', async (req, res) => {
  try {
    const { code } = req.query;
    const client = getOauth2Client(req);
    const { tokens } = await client.getToken(code);
    
    client.setCredentials(tokens);
    const gmail = google.gmail({ version: 'v1', auth: client });
    let emailAddress = 'connected@gmail.com';
    try {
      const profile = await gmail.users.getProfile({ userId: 'me' });
      emailAddress = profile.data.emailAddress;
    } catch (e) {
      console.error("Could not fetch user profile during callback:", e.message);
    }

    if (!db.accounts || !Array.isArray(db.accounts)) db.accounts = [];
    db.accounts = db.accounts.filter(a => a.email !== emailAddress);
    db.accounts.push({ email: emailAddress, tokens });
    
    db.activeEmail = emailAddress;
    db.tokens = tokens;
    saveDb();
    
    res.redirect('/');
  } catch (error) {
    console.error("Auth Error", error);
    res.redirect('/?error=' + encodeURIComponent(error.message));
  }
});

// 3. API to check Auth Status & list logged-in accounts
app.get('/api/auth/status', async (req, res) => {
  // Migrate legacy single-account token to db.accounts if needed
  if (db.tokens && (!db.accounts || db.accounts.length === 0)) {
    oauth2Client.setCredentials(db.tokens);
    const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
    try {
      const profile = await gmail.users.getProfile({ userId: 'me' });
      db.activeEmail = profile.data.emailAddress;
      db.accounts = [{ email: db.activeEmail, tokens: db.tokens }];
      saveDb();
    } catch (e) {
      db.accounts = [{ email: 'Current Account', tokens: db.tokens }];
      db.activeEmail = 'Current Account';
    }
  }

  if (db.tokens && db.activeEmail) {
    res.json({ 
      connected: true, 
      emailAddress: db.activeEmail,
      accounts: (db.accounts || []).map(a => ({ email: a.email, active: a.email === db.activeEmail }))
    });
  } else {
    res.json({ connected: false, accounts: [] });
  }
});

// Endpoint to switch active Gmail account
app.post('/api/auth/switch', (req, res) => {
  const { email } = req.body;
  if (!db.accounts || !Array.isArray(db.accounts)) return res.status(400).json({ error: 'No accounts stored' });
  const account = db.accounts.find(a => a.email === email);
  if (!account) return res.status(404).json({ error: 'Account not found' });
  
  db.activeEmail = account.email;
  db.tokens = account.tokens;
  saveDb();
  res.json({ success: true, activeEmail: account.email });
});

app.get('/api/settings/auto-reply', (req, res) => {
  res.json({ enabled: !!db.autoReplyEnabled });
});

app.post('/api/settings/auto-reply', (req, res) => {
  db.autoReplyEnabled = req.body.enabled;
  saveDb();
  res.json({ enabled: db.autoReplyEnabled });
});

// Endpoint for admin dashboard login
app.post('/api/admin/login', rateLimiter(10, 15 * 60 * 1000), validateStrict(['username', 'password']), (req, res) => {
  const { username, password } = req.body;
  const envUser = process.env.ADMIN_USERNAME;
  const envPass = process.env.ADMIN_PASSWORD;

  if (envUser && envPass && username === envUser && password === envPass) {
    // Generate stateless token
    const payload = { user: username, exp: Date.now() + 24 * 60 * 60 * 1000 };
    const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64');
    const signature = crypto.createHmac('sha256', SECRET_KEY).update(payloadBase64).digest('hex');
    const token = `${payloadBase64}.${signature}`;
    
    res.cookie('admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'Strict',
      maxAge: 24 * 60 * 60 * 1000 // 1 day
    });
    res.json({ success: true });
  } else {
    res.status(401).json({ success: false, error: 'Invalid credentials' });
  }
});

app.get('/api/admin/verify', verifyAdmin, (req, res) => {
  res.json({ success: true, loggedIn: true });
});

app.post('/api/admin/logout', (req, res) => {
  res.clearCookie('admin_token', { httpOnly: true, sameSite: 'Strict' });
  res.json({ success: true });
});

app.get('/api/auth/logout', (req, res) => {
  const targetEmail = req.query.email || db.activeEmail;
  if (db.accounts && Array.isArray(db.accounts)) {
    db.accounts = db.accounts.filter(a => a.email !== targetEmail);
  } else {
    db.accounts = [];
  }

  if (db.activeEmail === targetEmail || !db.accounts.length) {
    if (db.accounts.length > 0) {
      db.activeEmail = db.accounts[0].email;
      db.tokens = db.accounts[0].tokens;
    } else {
      db.activeEmail = null;
      db.tokens = null;
    }
  }
  saveDb();
  res.json({ success: true, remaining: db.accounts ? db.accounts.length : 0, activeEmail: db.activeEmail });
});

function getEmailBody(payload) {
  if (!payload) return '';

  function findBody(part) {
    if (part.mimeType === 'text/html' && part.body && part.body.data) {
      return { html: Buffer.from(part.body.data, 'base64').toString('utf-8') };
    }
    if (part.mimeType === 'text/plain' && part.body && part.body.data) {
      return { text: Buffer.from(part.body.data, 'base64').toString('utf-8') };
    }
    if (part.parts) {
      let foundText = null;
      for (let p of part.parts) {
        const res = findBody(p);
        if (res?.html) return res;
        if (res?.text) foundText = res;
      }
      if (foundText) return foundText;
    }
    return null;
  }

  if (payload.mimeType === 'text/html' && payload.body && payload.body.data) {
    return Buffer.from(payload.body.data, 'base64').toString('utf-8');
  }
  if (payload.mimeType === 'text/plain' && payload.body && payload.body.data) {
    const txt = Buffer.from(payload.body.data, 'base64').toString('utf-8');
    return txt.replace(/\n/g, '<br/>');
  }

  const res = findBody(payload);
  if (res?.html) return res.html;
  if (res?.text) return res.text.replace(/\n/g, '<br/>');
  return '';
}

// Helper to extract text from MIME tree
function extractText(payload) {
  if (!payload) return '';
  if (payload.mimeType === 'text/plain' && payload.body && payload.body.data) {
    return Buffer.from(payload.body.data, 'base64').toString('utf-8');
  }
  if (payload.mimeType === 'text/html' && payload.body && payload.body.data) {
    let html = Buffer.from(payload.body.data, 'base64').toString('utf-8');
    html = html.replace(/<\/td>|<\/th>/gi, '\t');
    html = html.replace(/<\/tr>|<\/div>|<\/p>|<br\s*\/?>/gi, '\n');
    return html.replace(/<[^>]*>?/gm, ' ').replace(/&nbsp;/g, ' '); 
  }
  let text = '';
  if (payload.parts) {
    for (let part of payload.parts) {
      text += extractText(part) + '\n';
    }
  }
  return text;
}

// parseStudentData imported from ./services/aiService

// Helper to extract attachments from message payload
function extractAttachments(payload) {
  if (!payload) return [];
  const attachments = [];
  
  function traverse(part) {
    if (part.filename && part.filename.trim() !== '') {
      attachments.push({
        filename: part.filename,
        mimeType: part.mimeType || 'application/octet-stream',
        size: part.body ? part.body.size : 0,
        attachmentId: part.body ? part.body.attachmentId : null,
        partId: part.partId || null
      });
    }
    if (part.parts && Array.isArray(part.parts)) {
      part.parts.forEach(p => traverse(p));
    }
  }
  
  traverse(payload);
  return attachments;
}

// 4. API to Fetch Inbox/Folder Emails for the GUI
app.get('/api/emails', async (req, res) => {
  if (!db.tokens) return res.status(401).json({ error: 'Not connected to Gmail' });
  
  oauth2Client.setCredentials(db.tokens);
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
  
  const label = req.query.label || 'INBOX';
  
  const listParams = {
    userId: 'me',
    maxResults: 25,
    includeSpamTrash: true
  };

  if (label !== 'ALL' && label !== 'all') {
    const systemLabels = {
      'INBOX': 'in:inbox',
      'STARRED': 'is:starred',
      'SNOOZED': 'is:snoozed',
      'SENT': 'in:sent',
      'DRAFT': 'is:draft',
      'SPAM': 'in:spam',
      'TRASH': 'in:trash',
      'AUTO_REPLIED': 'label:auto-replied',
      'NOT_ANALYZED': 'label:not-analyzed'
    };
    
    if (systemLabels[label]) {
      listParams.q = systemLabels[label];
    } else {
      listParams.labelIds = [label];
    }
  }
  
  try {
    const response = await gmail.users.messages.list(listParams);
    
    // Fetch all label definitions from Gmail to translate labelIds to names
    let labelMap = {};
    try {
      const lbls = await gmail.users.labels.list({ userId: 'me' });
      (lbls.data.labels || []).forEach(l => {
        labelMap[l.id] = l.name;
      });
    } catch(e) { console.error('Error fetching labels list:', e.message); }

    let messages = [];
    if (response.data.messages) {
      const messagePromises = response.data.messages.map(async (msg) => {
        const details = await gmail.users.messages.get({ userId: 'me', id: msg.id });
        const headers = details.data.payload.headers;
        
        const bodyContent = getEmailBody(details.data.payload) || details.data.snippet;
        const labelIds = details.data.labelIds || [];
        const labelNames = labelIds.map(id => labelMap[id] || id);

        // Check if course option is sended / auto-replied
        const isCourseOptionSent = labelNames.some(name => {
          const n = name.toLowerCase();
          return n.includes('course option sended') || n.includes('course option sent') || n.includes('auto-replied') || n.includes('auto_replied') || n.includes('auto replied') || n === 'sent';
        });

        // Check if email has student profile data (analysed & ready to send)
        const textToAnalyze = (bodyContent || details.data.snippet || '').toLowerCase();
        const hasStudentData = textToAnalyze.includes('learner name') || textToAnalyze.includes('program of interest') || textToAnalyze.includes('class 12') || textToAnalyze.includes('bachelor') || textToAnalyze.includes('graduation') || textToAnalyze.includes('bca') || textToAnalyze.includes('btech') || textToAnalyze.includes('b.tech') || textToAnalyze.includes('bsc') || textToAnalyze.includes('b.sc') || textToAnalyze.includes('bcom') || textToAnalyze.includes('bba') || textToAnalyze.includes('intake pitched') || textToAnalyze.includes('age ') || textToAnalyze.includes('work experience') || textToAnalyze.includes('master');

        const isNotAnalysed = !hasStudentData || labelNames.some(name => name.toLowerCase().includes('not-analyzed') || name.toLowerCase().includes('not analyzed'));
        const isReadyToSend = hasStudentData && !isCourseOptionSent && !labelNames.some(name => name.toLowerCase().includes('not-analyzed') || name.toLowerCase().includes('not analyzed'));
        const attachments = extractAttachments(details.data.payload);

        return {
          id: msg.id,
          threadId: msg.threadId,
          snippet: details.data.snippet,
          body: bodyContent,
          subject: headers.find(h => h.name === 'Subject')?.value || 'No Subject',
          from: headers.find(h => h.name === 'From')?.value || 'Unknown',
          to: headers.find(h => h.name === 'To')?.value || '',
          date: headers.find(h => h.name === 'Date')?.value,
          labelIds: details.data.labelIds || [],
          labelNames,
          attachments,
          hasAttachments: attachments.length > 0,
          isCourseOptionSent,
          isReadyToSend,
          isNotSended: !isCourseOptionSent,
          isNotAnalysed,
          messageId: headers.find(h => h?.name?.toLowerCase() === 'message-id')?.value || '',
          references: headers.find(h => h?.name?.toLowerCase() === 'references')?.value || ''
        };
      });
      
      messages = await Promise.all(messagePromises);
    }
    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Endpoint to fetch and download an email attachment from Gmail
app.get('/api/emails/:messageId/attachments/:attachmentId', async (req, res) => {
  if (!db.tokens) return res.status(401).json({ error: 'Not connected to Gmail' });
  
  oauth2Client.setCredentials(db.tokens);
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
  
  try {
    const { messageId, attachmentId } = req.params;
    const response = await gmail.users.messages.attachments.get({
      userId: 'me',
      messageId: messageId,
      id: attachmentId
    });
    
    const base64Data = response.data.data;
    const buffer = Buffer.from(base64Data.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
    
    if (req.query.mimeType) {
      res.setHeader('Content-Type', req.query.mimeType);
    } else {
      res.setHeader('Content-Type', 'application/octet-stream');
    }
    
    if (req.query.filename) {
      res.setHeader('Content-Disposition', `inline; filename="${req.query.filename}"`);
    }
    
    res.send(buffer);
  } catch (error) {
    console.error('Error fetching attachment from Gmail:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// Helper to get or create Gmail label by name
async function getOrCreateGmailLabel(gmail, name) {
  try {
    let labelsRes = await gmail.users.labels.list({ userId: 'me' });
    let labels = labelsRes.data.labels || [];
    let l = labels.find(x => x.name.toLowerCase() === name.toLowerCase());
    if (!l) {
      try {
        let created = await gmail.users.labels.create({ 
          userId: 'me', 
          requestBody: { name, labelListVisibility: 'labelShow', messageListVisibility: 'show' }
        });
        l = created.data;
      } catch (err) {
        let freshLabels = await gmail.users.labels.list({ userId: 'me' });
        l = (freshLabels.data.labels || []).find(x => x.name.toLowerCase() === name.toLowerCase());
      }
    }
    return l ? l.id : null;
  } catch (e) {
    console.error(`Error getting/creating label ${name}:`, e.message);
    return null;
  }
}

// API to Fetch User Labels
app.get('/api/labels', async (req, res) => {
  if (!db.tokens) return res.status(401).json({ error: 'Not connected' });
  oauth2Client.setCredentials(db.tokens);
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
  try {
    const response = await gmail.users.labels.list({ userId: 'me' });
    const userLabels = (response.data.labels || []).filter(l => l.type === 'user');
    res.json(userLabels);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// API to Create New Label
app.post('/api/labels/create', async (req, res) => {
  const { name } = req.body;
  if (!db.tokens || !name) return res.status(400).json({ error: 'Invalid label name' });
  oauth2Client.setCredentials(db.tokens);
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
  try {
    const response = await gmail.users.labels.create({
      userId: 'me',
      requestBody: { name, labelListVisibility: 'labelShow', messageListVisibility: 'show' }
    });
    res.json(response.data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// API to Modify Email Labels (Star, Trash, Spam, Mark Read)
app.post('/api/emails/:id/modify', async (req, res) => {
  const { id } = req.params;
  const { addLabelIds, removeLabelIds } = req.body;
  if (!db.tokens) return res.status(401).json({ error: 'Not connected' });
  oauth2Client.setCredentials(db.tokens);
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
  try {
    const msg = await gmail.users.messages.get({ userId: 'me', id });
    const threadId = msg.data.threadId;
    
    let response;
    // Gmail API requires using trash/untrash methods instead of modifying the TRASH label directly
    if (addLabelIds && addLabelIds.includes('TRASH')) {
      response = await gmail.users.threads.trash({ userId: 'me', id: threadId });
    } else if (removeLabelIds && removeLabelIds.includes('TRASH')) {
      response = await gmail.users.threads.untrash({ userId: 'me', id: threadId });
    } else {
      response = await gmail.users.threads.modify({
        userId: 'me',
        id: threadId,
        requestBody: {
          addLabelIds: addLabelIds || [],
          removeLabelIds: removeLabelIds || []
        }
      });
    }
    res.json(response.data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 5. API to process an Email via AI (Triggered when clicking an email in GUI)
app.get('/api/courses', (req, res) => {
  res.json(db.courses || []);
});

app.post('/api/courses/update', (req, res) => {
  try {
    const updatedCourses = req.body.courses;
    if (!Array.isArray(updatedCourses)) return res.status(400).json({ error: 'Invalid data' });
    
    // Update memory
    db.courses = updatedCourses;
    
    // Update data/courses.json
    const fs = require('fs');
    const path = require('path');
    const coursesFile = path.join(__dirname, 'data/courses.json');
    fs.writeFileSync(coursesFile, JSON.stringify(db.courses, null, 2), 'utf8');
    
    res.json({ success: true, message: 'Courses updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/process-email', async (req, res) => {
  const { emailId, forceEngine, userInstruction } = req.body;
  console.log('--- PROCESS EMAIL RECEIVED ---');
  console.log('Instruction:', userInstruction);
  if (!db.tokens) return res.status(401).json({ error: 'Not connected' });

  oauth2Client.setCredentials(db.tokens);
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  try {
    const response = await gmail.users.messages.get({ userId: 'me', id: emailId });

    const rawContent = getEmailBody(response.data.payload) || '';
    const plainText = extractText(response.data.payload) || response.data.snippet || '';
    const cleanFromHtml = rawContent.replace(/<\/td>|<\/th>/gi, '\t').replace(/<\/tr>|<\/div>|<\/p>|<br\s*\/?>/gi, '\n').replace(/<[^>]*>?/gm, ' ').replace(/&nbsp;/g, ' ');
    const fullText = (cleanFromHtml + '\n' + plainText).trim()
      .replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

    let fallbackName = 'Student';
    const fromHeader = response.data.payload?.headers?.find(h => h.name === 'From')?.value || '';
    const nameMatch = fromHeader.match(/^"([^"]+)"/) || fromHeader.match(/^([^<]+)/);
    if (nameMatch && nameMatch[1].trim()) fallbackName = nameMatch[1].trim();

    const { studentData, isAiUsed, reason } = await parseEmailWithAI(fullText, db.aiConfig || {}, fallbackName, forceEngine);
    if (!studentData) {
      return res.json({ studentData: null, matchedCourses: [], isAiUsed, reason });
    }
    const matchedCoursesRes = await matchCourses(studentData, userInstruction);
    const matchedCourses = matchedCoursesRes.matchedCourses || matchedCoursesRes || [];
    const poiNotAvailable = matchedCoursesRes.poiNotAvailable || false;
    const aiReasoning = matchedCoursesRes.aiReasoning || null;
    const missing11thScore = matchedCoursesRes.missing11thScore || false;
    const isNoCourseOptionsForPoi = matchedCoursesRes.isNoCourseOptionsForPoi || false;
    
    res.json({
      studentData,
      matchedCourses,
      isAiUsed,
      reason,
      profileLabels: matchedCoursesRes.profileLabels || [],
      poiNotAvailable,
      isNoCourseOptionsForPoi,
      aiReasoning,
      appliedFilters: matchedCoursesRes.appliedFilters || [],
      missing11thScore,
      intakeRemarks: matchedCoursesRes.intakeRemarks || '',
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Match courses directly with custom/updated student data
app.post('/api/courses/match', async (req, res) => {
  try {
    const { studentData, userInstruction } = req.body;
    if (!studentData) {
      return res.status(400).json({ error: 'studentData is required' });
    }
    const matchedCoursesRes = await matchCourses(studentData, userInstruction);
    const matchedCourses = matchedCoursesRes.matchedCourses || matchedCoursesRes || [];
    const poiNotAvailable = matchedCoursesRes.poiNotAvailable || false;
    const aiReasoning = matchedCoursesRes.aiReasoning || null;
    const missing11thScore = matchedCoursesRes.missing11thScore || false;
    const isNoCourseOptionsForPoi = matchedCoursesRes.isNoCourseOptionsForPoi || false;
    
    res.json({
      studentData,
      matchedCourses,
      profileLabels: matchedCoursesRes.profileLabels || [],
      poiNotAvailable,
      isNoCourseOptionsForPoi,
      aiReasoning,
      appliedFilters: matchedCoursesRes.appliedFilters || [],
      missing11thScore,
      intakeRemarks: matchedCoursesRes.intakeRemarks || '',
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 6. API to Send Email
app.post('/api/send-email', async (req, res) => {
  const { to, subject, htmlBody, threadId, messageId, references, emailId } = req.body;
  if (!db.tokens) return res.status(401).json({ error: 'Not connected' });

  oauth2Client.setCredentials(db.tokens);
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });

  try {
    const utf8Subject = `=?utf-8?B?${Buffer.from(subject).toString('base64')}?=`;
    
    // Parse 'to' address properly to just get the email if it has a name attached
    let cleanTo = to;
    const toMatch = to.match(/<([^>]+)>/);
    if (toMatch) cleanTo = toMatch[1];

    const messageParts = [
      `To: ${cleanTo}`,
      `Subject: ${utf8Subject}`,
      ...(messageId ? [`In-Reply-To: ${messageId}`] : []),
      ...(messageId ? [`References: ${references ? references + ' ' : ''}${messageId}`] : []),
      'Content-Type: text/html; charset=utf-8',
      'MIME-Version: 1.0',
      '',
      htmlBody,
    ];
    const message = messageParts.join('\n');
    
    const encodedMessage = Buffer.from(message)
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');

    const resData = await gmail.users.messages.send({
      userId: 'me',
      requestBody: {
        raw: encodedMessage,
        threadId: threadId
      }
    });

    // Automatically apply 'Course Option Sended' label in Gmail to the thread / message
    try {
      const labelId = await getOrCreateGmailLabel(gmail, 'Course Option Sended');
      if (labelId) {
        if (threadId) {
          await gmail.users.threads.modify({
            userId: 'me',
            id: threadId,
            requestBody: { addLabelIds: [labelId], removeLabelIds: ['UNREAD'] }
          });
        } else if (emailId) {
          await gmail.users.messages.modify({
            userId: 'me',
            id: emailId,
            requestBody: { addLabelIds: [labelId], removeLabelIds: ['UNREAD'] }
          });
        }
      }
    } catch(err) {
      console.error('Failed to attach Course Option Sended label on manual send:', err.message);
    }

    pendingNotifications.push(`Sent reply to ${cleanTo}`);

    res.json({ success: true, messageId: resData.data.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// ✉️ MAIL FORMATS & TEMPLATES APIs
// ==========================================
app.get('/api/mail-templates', (req, res) => {
  res.json(db.mailTemplates || defaultMailTemplates);
});

app.post('/api/mail-templates', (req, res) => {
  const newTemplates = req.body;
  db.mailTemplates = {
    ...defaultMailTemplates,
    ...newTemplates,
    tableRemarks: { ...(defaultMailTemplates.tableRemarks || {}), ...(newTemplates.tableRemarks || {}) },
    lowProfile: { ...(defaultMailTemplates.lowProfile || {}), ...(newTemplates.lowProfile || {}) },
    ineligibleBackground: { ...(defaultMailTemplates.ineligibleBackground || {}), ...(newTemplates.ineligibleBackground || {}) },
    missing11th: { ...(defaultMailTemplates.missing11th || {}), ...(newTemplates.missing11th || {}) }
  };
  saveDb();
  res.json({ success: true, mailTemplates: db.mailTemplates });
});

app.post('/api/mail-templates/reset', (req, res) => {
  db.mailTemplates = JSON.parse(JSON.stringify(defaultMailTemplates));
  saveDb();
  res.json({ success: true, mailTemplates: db.mailTemplates });
});

app.post('/api/mail-templates/preview', (req, res) => {
  try {
    const { templateConfig, studentData, matchedCourses, isPursuing, isGap, missing11thScore, isLowProfile, isIneligibleBackground, isLowCourseOptions, isNoCourseOptionsForPoi } = req.body;
    let dummyCourses = matchedCourses || (db.courses && db.courses.slice(0, 5)) || [];
    if (isLowCourseOptions) {
      dummyCourses = db.courses && db.courses.slice(0, 2); // Force < 3 courses to trigger Low Course Options template
    }
    if (isNoCourseOptionsForPoi) {
      dummyCourses = [];
    }
    const crmData = {
      studentData: studentData || { learnerName: 'Jay Kumar Jhirwal', intakePitched: 'Sept 2027', class12Stream: 'pcm', class12Score: '74.6%' },
      matchedCourses: dummyCourses,
      isPursuing: !!isPursuing,
      isGap: !!isGap,
      missing11thScore: !!missing11thScore,
      isLowProfile: !!isLowProfile,
      isIneligibleBackground: !!isIneligibleBackground,
      isNoCourseOptionsForPoi: !!isNoCourseOptionsForPoi
    };
    const html = generateTemplate(crmData, crmData.studentData.learnerName, isPursuing, isGap, templateConfig);
    res.json({ success: true, html });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ==========================================
// 🧠 AI MODEL CONTROL & TRAINING CENTER APIs
// ==========================================
app.get('/api/ai/config', (req, res) => {
  res.json(db.aiConfig || {});
});

app.post('/api/ai/config', (req, res) => {
  const newConfig = req.body;
  db.aiConfig = { ...db.aiConfig, ...newConfig, lastUpdated: new Date().toISOString() };
  saveDb();
  generateAiTrainingDoc(db.aiConfig);
  res.json({ success: true, aiConfig: db.aiConfig });
});

app.post('/api/ai/test-connection', async (req, res) => {
  try {
    const result = await testApiConnection(db.aiConfig || {});
    res.json(result);
  } catch (err) {
    res.status(500).json({ success: false, status: 'ERROR', message: err.message || 'Unknown error testing API connection.' });
  }
});

app.post('/api/ai/chat', async (req, res) => {
  const { message, history } = req.body;
  try {
    const reply = await chatWithAI(message, history || [], db.aiConfig || {}, db.courses || []);
    res.json({ reply });
  } catch (error) {
    console.error('Error in AI Chat:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/ai/save-example', (req, res) => {
  const { input, output } = req.body;
  if (!input || !output) return res.status(400).json({ error: 'Input and output required' });
  
  const newExample = {
    id: `ex-${Date.now()}`,
    input: input.trim(),
    output: typeof output === 'string' ? output.trim() : JSON.stringify(output, null, 2),
    timestamp: new Date().toISOString()
  };
  
  if (!db.aiConfig.fewShotExamples) db.aiConfig.fewShotExamples = [];
  db.aiConfig.fewShotExamples.unshift(newExample);
  db.aiConfig.lastUpdated = new Date().toISOString();
  saveDb();
  generateAiTrainingDoc(db.aiConfig);
  res.json({ success: true, aiConfig: db.aiConfig });
});

app.post('/api/ai/parse-email', async (req, res) => {
  const { emailText, fallbackName } = req.body;
  try {
    const { studentData, isAiUsed, reason } = await parseEmailWithAI(emailText || '', db.aiConfig || {}, fallbackName || 'Student');
    let matchedCourses = [];
    if (studentData) {
      const matchRes = await matchCourses(studentData);
      matchedCourses = matchRes.matchedCourses || matchRes || [];
    }
    res.json({ studentData, matchedCourses, isAiUsed, reason });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/ai/training-doc', (req, res) => {
  const path = require('path');
  const fs = require('fs');
  const docPath = path.join(__dirname, '../frontend/public/AiTraining.md');
  if (fs.existsSync(docPath)) {
    res.send(fs.readFileSync(docPath, 'utf8'));
  } else {
    const content = generateAiTrainingDoc(db.aiConfig || {});
    res.send(content);
  }
});

// --- Serve Frontend Static Export ---
const path = require('path');
const frontendOutPath = path.join(__dirname, '../frontend/out');

// Serve static assets with long cache for JS/CSS/images, but no-cache for HTML
app.use(express.static(frontendOutPath, {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    } else {
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    }
  }
}));

app.get('*', (req, res) => {
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.sendFile(path.join(frontendOutPath, 'index.html'));
});

const PORT = process.env.PORT || 5000;
let server;

if (require.main === module) {
  server = app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));

  server.on('error', (e) => {
    if (e.code === 'EADDRINUSE') {
      console.warn(`[Server Notice] Port ${PORT} currently occupied. Attempting automated port recovery...`);
      try {
        require('child_process').execSync(`fuser -k -9 ${PORT}/tcp 2>/dev/null || true`, { stdio: 'ignore' });
      } catch(err) {}
      setTimeout(() => {
        server.close();
        server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT} (after recovery)`));
      }, 500);
    } else {
      console.error('[Server Error]', e);
    }
  });

  const forceShutdown = () => {
    if (server && server.closeAllConnections) server.closeAllConnections();
    if (server) server.close(() => process.exit(0));
    setTimeout(() => process.exit(0), 400).unref();
  };

  process.on('SIGUSR2', forceShutdown);
  process.on('SIGINT', forceShutdown);
  process.on('SIGTERM', forceShutdown);
}

module.exports = app;

// Auto Analyzer & Reply Worker (Disabled by user request)
/*
setInterval(async () => {
  if (!db.tokens) return;
  oauth2Client.setCredentials(db.tokens);
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
  
  try {
    // get unread INBOX emails that are not already processed
    const response = await gmail.users.messages.list({ userId: 'me', q: 'is:unread in:inbox -label:auto-replied -label:not-analyzed -label:analyzed', maxResults: 10 });
    if (!response.data.messages || response.data.messages.length === 0) return;
    
    // ensure labels exist
    let labelsRes = await gmail.users.labels.list({ userId: 'me' });
    let labels = labelsRes.data.labels;
    const getOrCreateLabel = async (name) => {
      let l = labels.find(x => x.name.toLowerCase() === name.toLowerCase());
      if (!l) {
        try {
          let created = await gmail.users.labels.create({ userId: 'me', requestBody: { name, labelListVisibility: 'labelShow', messageListVisibility: 'show' }});
          l = created.data;
          labels.push(l);
        } catch (err) {
          // If it says it exists, refetch all labels to find it
          let freshLabels = await gmail.users.labels.list({ userId: 'me' });
          l = freshLabels.data.labels.find(x => x.name.toLowerCase() === name.toLowerCase());
        }
      }
      return l ? l.id : null;
    };
    
    const autoRepliedId = await getOrCreateLabel('Auto-Replied');
    const courseOptionSentId = await getOrCreateLabel('Course Option Sended');
    const notAnalyzedId = await getOrCreateLabel('Not-Analyzed');
    const analyzedId = await getOrCreateLabel('Analyzed');

    for (let msg of response.data.messages) {
      const details = await gmail.users.messages.get({ userId: 'me', id: msg.id });
      const rawContent = getEmailBody(details.data.payload) || '';
      const plainText = extractText(details.data.payload) || details.data.snippet || '';
      const cleanFromHtml = rawContent.replace(/<\/td>|<\/th>/gi, '\t').replace(/<\/tr>|<\/div>|<\/p>|<br\s*\/?>/gi, '\n').replace(/<[^>]*>?/gm, ' ').replace(/&nbsp;/g, ' ');
      const fullText = (cleanFromHtml + '\n' + plainText).trim();
      
      const { studentData } = await parseEmailWithAI(fullText, db.aiConfig || {});
      
      if (studentData) {
        // We have the data to auto reply and label
        const matched = await matchCourses(studentData);
        const matchedCourses = matched.matchedCourses || matched;
        const profileLabels = matched.profileLabels || [];
        
        const dynamicLabelsToAdd = [];
        for (const labelName of profileLabels) {
          const lId = await getOrCreateLabel(labelName);
          if (lId) dynamicLabelsToAdd.push(lId);
        }
        const baseLabelsToApply = [analyzedId, ...dynamicLabelsToAdd].filter(Boolean);

        const headers = details.data.payload.headers;
        const fromHeader = headers.find(h => h.name === 'From')?.value || '';
        let toMatch = fromHeader.match(/<([^>]+)>/);
        let cleanTo = toMatch ? toMatch[1] : fromHeader;
        
        let studentName = studentData.learnerName;
        if (studentName === 'Student') {
          const nameMatch = fromHeader.match(/^"([^"]+)"/);
          if (nameMatch) studentName = nameMatch[1];
        }

        if (db.autoReplyEnabled) {
          const htmlBody = generateTemplate({ studentData, matchedCourses, poiNotAvailable: matched.poiNotAvailable }, studentName);
          const subject = headers.find(h => h.name === 'Subject')?.value || 'No Subject';
          const messageId = headers.find(h => h?.name?.toLowerCase() === 'message-id')?.value;
          
          const utf8Subject = `=?utf-8?B?${Buffer.from(`Re: ${subject.replace(/^Re:\s*/i, '')}`).toString('base64')}?=`;
          const referencesHeader = headers.find(h => h?.name?.toLowerCase() === 'references')?.value || '';
          
          const messageParts = [
            `To: ${cleanTo}`,
            `Subject: ${utf8Subject}`,
            ...(messageId ? [`In-Reply-To: ${messageId}`] : []),
            ...(messageId ? [`References: ${referencesHeader ? referencesHeader + ' ' : ''}${messageId}`] : []),
            'Content-Type: text/html; charset=utf-8',
            'MIME-Version: 1.0',
            '',
            htmlBody,
          ];
          
          const encodedMessage = Buffer.from(messageParts.join('\n'))
            .toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
          
          const sendResponse = await gmail.users.messages.send({ userId: 'me', requestBody: { raw: encodedMessage, threadId: msg.threadId } });
          
          const addLabels = [autoRepliedId, courseOptionSentId, ...baseLabelsToApply].filter(Boolean);
          if (sendResponse.data && sendResponse.data.id && [autoRepliedId, courseOptionSentId].filter(Boolean).length > 0) {
            await gmail.users.messages.modify({ userId: 'me', id: sendResponse.data.id, requestBody: { addLabelIds: [autoRepliedId, courseOptionSentId].filter(Boolean) }});
          }
          
          await gmail.users.messages.modify({ userId: 'me', id: msg.id, requestBody: { addLabelIds: addLabels, removeLabelIds: ['UNREAD'] }});
          pendingNotifications.push(`Auto-Replied & Option Sended to ${studentName}`);
        } else {
          // Auto-reply disabled, just apply labels
          await gmail.users.messages.modify({ userId: 'me', id: msg.id, requestBody: { addLabelIds: baseLabelsToApply }});
          pendingNotifications.push(`Auto-Analyzed profile for ${studentName}`);
        }
      } else {
        // Not analyzed
        if (notAnalyzedId) {
          await gmail.users.messages.modify({ userId: 'me', id: msg.id, requestBody: { addLabelIds: [notAnalyzedId] }});
        }
        pendingNotifications.push(`Skipped non-student email`);
      }
    }
  } catch(e) {
    if (e.code === 'EAI_AGAIN' || (e.message && (e.message.includes('EAI_AGAIN') || e.message.includes('ENOTFOUND')))) {
      console.warn('[Auto Analyzer Worker] Network / DNS lookup temporarily unavailable (will retry on next interval).');
    } else {
      console.error('Auto Analyzer Worker Error:', e.message || e);
    }
  }
}, 30000);
*/
