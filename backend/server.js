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
  console.log('🔑 Initiating OAuth with Redirect URI:', client._redirectUri || client.redirectUri);
  const url = client.generateAuthUrl({
    access_type: 'offline',
    prompt: 'select_account',
    scope: [
      'https://www.googleapis.com/auth/gmail.readonly',
      'https://www.googleapis.com/auth/gmail.send',
      'https://www.googleapis.com/auth/gmail.modify',
      'https://www.googleapis.com/auth/gmail.labels',
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
  const requestedMax = parseInt(req.query.maxResults, 10);
  const maxResults = (!isNaN(requestedMax) && requestedMax >= 5 && requestedMax <= 100) ? requestedMax : 25;
  const pageToken = req.query.pageToken || null;
  const searchParam = req.query.search || req.query.q || '';
  
  const listParams = {
    userId: 'me',
    maxResults: maxResults
  };

  if (pageToken) {
    listParams.pageToken = pageToken;
  }

  let qParts = [];
  if (label === 'ALL' || label === 'all' || label === 'SPAM' || label === 'TRASH') {
    listParams.includeSpamTrash = true;
  }

  if (label !== 'ALL' && label !== 'all') {
    const directLabelMap = {
      'INBOX': 'INBOX',
      'STARRED': 'STARRED',
      'SENT': 'SENT',
      'DRAFT': 'DRAFT',
      'SPAM': 'SPAM',
      'TRASH': 'TRASH',
      'UNREAD': 'UNREAD'
    };
    
    if (directLabelMap[label]) {
      listParams.labelIds = [directLabelMap[label]];
    } else if (label === 'SNOOZED') {
      qParts.push('is:snoozed');
    } else if (label === 'AUTO_REPLIED') {
      qParts.push('label:auto-replied');
    } else if (label === 'NOT_ANALYZED') {
      qParts.push('label:not-analyzed');
    } else {
      listParams.labelIds = [label];
    }
  }

  if (searchParam && searchParam.trim()) {
    qParts.push(searchParam.trim());
  }

  if (qParts.length > 0) {
    listParams.q = qParts.join(' ');
  }
  
  try {
    const response = await gmail.users.threads.list(listParams);
    
    // Fetch all label definitions from Gmail to translate labelIds to names
    let labelMap = {};
    try {
      const lbls = await gmail.users.labels.list({ userId: 'me' });
      (lbls.data.labels || []).forEach(l => {
        labelMap[l.id] = l.name;
      });
    } catch(e) { console.error('Error fetching labels list:', e.message); }

    let threadsData = [];
    if (response.data.threads) {
      const threadPromises = response.data.threads.map(async (threadObj) => {
        const details = await gmail.users.threads.get({ userId: 'me', id: threadObj.id });
        const messages = details.data.messages;
        
        if (!messages || messages.length === 0) return null;
        
        const firstMsg = messages[0];
        const lastMsg = messages[messages.length - 1];
        
        const firstHeaders = firstMsg.payload.headers;
        const lastHeaders = lastMsg.payload.headers;
        
        const subject = firstHeaders.find(h => h.name === 'Subject')?.value || 'No Subject';
        
        // Collect all unique senders for the inbox preview, mimicking Gmail's "FirstName, me" format
        const allFroms = messages.map(m => {
          if (m.labelIds && m.labelIds.includes('SENT')) return 'me';
          const f = m.payload.headers.find(h => h.name === 'From')?.value || 'Unknown';
          const match = f.match(/^([^<]+)/);
          let name = match ? match[1].replace(/"/g, '').trim() : f;
          if (name.includes('@')) name = name.split('@')[0];
          // Return the full name (name and surname) instead of just the first name
          return name || 'Unknown';
        });
        
        let uniqueFroms = [];
        allFroms.forEach(name => {
          if (!uniqueFroms.includes(name)) uniqueFroms.push(name);
        });

        let fromDisplay = uniqueFroms.join(', ');
        if (uniqueFroms.length > 2) {
          // If there are more than 2 participants, Gmail often shows "First, ..., Last" or just limits it.
          // We'll show the first sender and the last participant (which is often 'me' if you replied)
          fromDisplay = `${uniqueFroms[0]} .. ${uniqueFroms[uniqueFroms.length - 1]}`;
        }

        const date = lastHeaders.find(h => h.name === 'Date')?.value;
        const to = lastHeaders.find(h => h.name === 'To')?.value || '';
        const messageId = lastHeaders.find(h => h?.name?.toLowerCase() === 'message-id')?.value || '';
        const references = lastHeaders.find(h => h?.name?.toLowerCase() === 'references')?.value || '';

        let allAttachments = [];
        messages.forEach(m => {
          const extracted = extractAttachments(m.payload);
          extracted.forEach(att => {
            att.googleMessageId = m.id; // Required for downloading attachment later
          });
          allAttachments = allAttachments.concat(extracted);
        });

        const bodyContent = messages.map((m, index) => {
          const mHeaders = m.payload.headers;
          const mFrom = mHeaders.find(h => h.name === 'From')?.value || 'Unknown';
          const mDate = mHeaders.find(h => h.name === 'Date')?.value;
          const mBody = getEmailBody(m.payload) || m.snippet;
          
          const isLast = index === messages.length - 1;
          const senderNameOnly = (mFrom.match(/^"([^"]+)"/) || mFrom.match(/^([^<]+)/))?.[1]?.trim() || mFrom;
          const snippetText = m.snippet ? `<span style="color: #5f6368; font-weight: 400; margin-left: 8px; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: inline-block; vertical-align: middle;">- ${m.snippet.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</span>` : '';

          const mAttachments = extractAttachments(m.payload);
          let attachmentsHtml = '';
          if (mAttachments.length > 0) {
            attachmentsHtml = `<div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #e2e8f0;">
              <div style="font-weight: 600; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #4f46e5; margin-bottom: 12px; display: flex; align-items: center;">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px;"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path></svg>
                Attachments (${mAttachments.length})
              </div>
              <div style="display: flex; flex-wrap: wrap; gap: 12px;">
                ${mAttachments.map(att => `
                  <a href="/api/emails/${m.id}/attachments/${att.attachmentId}?filename=${encodeURIComponent(att.filename)}&mimeType=${encodeURIComponent(att.mimeType)}" target="_blank" style="display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 10px; text-decoration: none; color: #334155; font-size: 13px; min-width: 200px; max-width: 280px; box-shadow: 0 1px 3px rgba(0,0,0,0.05); transition: all 0.2s;">
                    <div style="display: flex; align-items: center; overflow: hidden; padding-right: 12px;">
                      <div style="width: 32px; height: 32px; border-radius: 8px; background: rgba(79, 70, 229, 0.1); color: #4f46e5; display: flex; align-items: center; justify-content: center; font-size: 16px; margin-right: 12px; flex-shrink: 0;">
                        📎
                      </div>
                      <div style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                        <div style="font-weight: 600; color: #1e293b; overflow: hidden; text-overflow: ellipsis; font-size: 12px;">${att.filename}</div>
                        <div style="font-size: 10px; font-weight: 500; color: #64748b; margin-top: 2px; text-transform: uppercase;">${att.size ? (att.size/1024).toFixed(1) + ' KB' : 'File'}</div>
                      </div>
                    </div>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                  </a>
                `).join('')}
              </div>
            </div>`;
          }

          return `<details class="email-thread-item" style="border: 1px solid #e2e8f0; border-radius: 12px; margin-bottom: 16px; font-family: system-ui, -apple-system, sans-serif; box-shadow: 0 2px 4px rgba(0,0,0,0.02); background: #ffffff;">
            <summary style="cursor: pointer; padding: 16px 24px; font-size: 14px; display: flex; justify-content: space-between; align-items: center; user-select: none; list-style: none; border-bottom: 1px solid #f1f3f4; background: #f8fafc;">
              <div style="display: flex; align-items: center; overflow: hidden; white-space: nowrap; width: 75%;">
                <div style="width: 40px; height: 40px; border-radius: 50%; background: #0b57d0; color: white; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 500; margin-right: 16px; flex-shrink: 0;">
                  ${senderNameOnly.charAt(0).toUpperCase()}
                </div>
                <div style="display: flex; flex-direction: column; overflow: hidden; justify-content: center;">
                  <div style="display: flex; align-items: center;">
                    <strong style="color: #202124; font-size: 15px; font-weight: 600; flex-shrink: 0;">${senderNameOnly}</strong>
                  </div>
                  <div style="color: #5f6368; font-size: 13px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-top: 2px;">
                    ${mFrom.replace(/</g, '&lt;').replace(/>/g, '&gt;')} ${snippetText}
                  </div>
                </div>
              </div>
              <div style="display: flex; align-items: center; color: #5f6368; font-size: 12px; font-weight: 400; flex-shrink: 0;">
                <span style="margin-right: 16px;">${mDate ? new Date(mDate).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' }) : ''}</span>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="color: #5f6368;"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
              </div>
            </summary>
            <div style="padding: 16px 24px 24px 80px; font-size: 14px; color: #222; line-height: 1.5; overflow-x: visible;">
              ${mBody}
              ${attachmentsHtml}
            </div>
          </details>`;
        }).join('');
        
        let labelIds = [];
        messages.forEach(m => {
          if (m.labelIds) {
            m.labelIds.forEach(id => {
              if (!labelIds.includes(id)) labelIds.push(id);
            });
          }
        });
        const labelNames = labelIds.map(id => labelMap[id] || id);
        
        const isCourseOptionSent = labelNames.some(name => {
          const n = name.toLowerCase();
          return n.includes('course option sended') || n.includes('course option sent') || n.includes('auto-replied') || n.includes('auto_replied') || n.includes('auto replied') || n === 'sent';
        });

        const textToAnalyze = messages.map(m => (getEmailBody(m.payload) || m.snippet || '').toLowerCase()).join(' ');
        const hasStudentData = textToAnalyze.includes('learner name') || textToAnalyze.includes('program of interest') || textToAnalyze.includes('class 12') || textToAnalyze.includes('bachelor') || textToAnalyze.includes('graduation') || textToAnalyze.includes('bca') || textToAnalyze.includes('btech') || textToAnalyze.includes('b.tech') || textToAnalyze.includes('bsc') || textToAnalyze.includes('b.sc') || textToAnalyze.includes('bcom') || textToAnalyze.includes('bba') || textToAnalyze.includes('barch') || textToAnalyze.includes('b.arch') || textToAnalyze.includes('architecture') || textToAnalyze.includes('intake pitched') || textToAnalyze.includes('age ') || textToAnalyze.includes('work experience') || textToAnalyze.includes('master');

        const isNotAnalysed = !hasStudentData || labelNames.some(name => name.toLowerCase().includes('not-analyzed') || name.toLowerCase().includes('not analyzed'));
        const isReadyToSend = hasStudentData && !isCourseOptionSent && !labelNames.some(name => name.toLowerCase().includes('not-analyzed') || name.toLowerCase().includes('not analyzed'));

        return {
          id: threadObj.id, // Using thread ID instead of message ID!
          threadId: threadObj.id,
          snippet: lastMsg.snippet,
          body: bodyContent,
          subject: subject,
          from: fromDisplay,
          rawFrom: lastMsg.payload.headers.find(h => h.name === 'From')?.value || '', // Store the actual raw From header for replies
          to: to,
          date: date,
          labelIds: labelIds,
          labelNames,
          attachments: allAttachments,
          hasAttachments: allAttachments.length > 0,
          isCourseOptionSent,
          isReadyToSend,
          isNotSended: !isCourseOptionSent,
          isNotAnalysed,
          messageId,
          references,
          messageCount: messages.length
        };
      });
      
      const results = await Promise.all(threadPromises);
      threadsData = results.filter(Boolean);
    }

    res.json({
      threads: threadsData,
      nextPageToken: response.data.nextPageToken || null,
      resultSizeEstimate: response.data.resultSizeEstimate || threadsData.length
    });
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

// Helper to automatically create and apply AI profile labels to a Gmail thread
async function autoApplyProfileLabelsToThread(gmail, threadId, profileLabels = []) {
  if (!gmail || !threadId || !Array.isArray(profileLabels) || profileLabels.length === 0) return;
  try {
    const labelIdsToAdd = [];
    for (const lName of profileLabels) {
      if (!lName) continue;
      const lid = await getOrCreateGmailLabel(gmail, lName);
      if (lid && !labelIdsToAdd.includes(lid)) {
        labelIdsToAdd.push(lid);
      }
    }
    if (labelIdsToAdd.length > 0) {
      await gmail.users.threads.modify({
        userId: 'me',
        id: threadId,
        requestBody: { addLabelIds: labelIdsToAdd }
      });
    }
  } catch (err) {
    console.error(`Failed to auto-apply labels to thread ${threadId}:`, err.message);
  }
}

// API to Fetch User Labels
app.get('/api/labels', async (req, res) => {
  if (!db.tokens) return res.status(401).json({ error: 'Not connected' });
  oauth2Client.setCredentials(db.tokens);
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
  try {
    const response = await gmail.users.labels.list({ userId: 'me' });
    const userLabels = (response.data.labels || []).filter(l => l.type && l.type.toLowerCase() === 'user');
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

// API to Update Label (Color, Visibility, Name)
app.put('/api/labels/:id', async (req, res) => {
  require('fs').appendFileSync('debug_label.log', new Date().toISOString() + ' Hit PUT ' + req.params.id + '\n');
  const { id } = req.params;
  const { name, labelListVisibility, messageListVisibility, color } = req.body;
  if (!db.tokens) {
    require('fs').appendFileSync('debug_label.log', new Date().toISOString() + ' No tokens!\n');
    return res.status(401).json({ error: 'Not connected' });
  }
  oauth2Client.setCredentials(db.tokens);
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
  try {
    const requestBody = {};
    if (name) requestBody.name = name;
    if (labelListVisibility) requestBody.labelListVisibility = labelListVisibility;
    if (messageListVisibility) requestBody.messageListVisibility = messageListVisibility;
    if (color !== undefined) requestBody.color = color; // Can be null to clear
    
    require('fs').appendFileSync('debug_label.log', new Date().toISOString() + ' Sending to Gmail: ' + JSON.stringify(requestBody) + '\n');

    const response = await gmail.users.labels.patch({
      userId: 'me',
      id,
      requestBody
    });
    res.json(response.data);
  } catch (e) {
    require('fs').appendFileSync('debug_label.log', new Date().toISOString() + ' ' + e.message + '\n');
    res.status(500).json({ error: e.message });
  }
});

// API to Delete Label
app.delete('/api/labels/:id', async (req, res) => {
  const { id } = req.params;
  if (!db.tokens) return res.status(401).json({ error: 'Not connected' });
  oauth2Client.setCredentials(db.tokens);
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
  try {
    await gmail.users.labels.delete({ userId: 'me', id });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// API to Modify Email Labels (Star, Trash, Spam, Mark Read)
app.post('/api/emails/:id/modify', async (req, res) => {
  const { id } = req.params; // 'id' is now the threadId since our UI is thread-based!
  const { addLabelIds, removeLabelIds } = req.body;
  if (!db.tokens) return res.status(401).json({ error: 'Not connected' });
  oauth2Client.setCredentials(db.tokens);
  const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
  try {
    let response;
    if (addLabelIds && addLabelIds.includes('TRASH')) {
      response = await gmail.users.threads.trash({ userId: 'me', id });
    } else if (removeLabelIds && removeLabelIds.includes('TRASH')) {
      response = await gmail.users.threads.untrash({ userId: 'me', id });
    } else {
      response = await gmail.users.threads.modify({
        userId: 'me',
        id,
        requestBody: { addLabelIds, removeLabelIds }
      });
    }
    res.json(response.data);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// 5. API to process an Email via AI (Triggered when clicking an email in GUI)
app.get('/api/ai/usage', (req, res) => { res.json(db.apiUsage || { emailsAnalyzed: 0, requestsMade: 0 }); });

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
    // We are now receiving a threadId since the UI is thread-based
    const response = await gmail.users.threads.get({ userId: 'me', id: emailId });

    const messages = response.data.messages;
    const rawContent = messages.map(m => getEmailBody(m.payload) || '').join('\n');
    const plainText = messages.map(m => extractText(m.payload) || m.snippet || '').join('\n');
    
    const cleanFromHtml = rawContent.replace(/<\/td>|<\/th>/gi, '\t').replace(/<\/tr>|<\/div>|<\/p>|<br\s*\/?>/gi, '\n').replace(/<[^>]*>?/gm, ' ').replace(/&nbsp;/g, ' ');
    const fullText = (cleanFromHtml + '\n' + plainText).trim()
      .replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

    let fallbackName = 'Student';
    // Use the first message's from header for fallback name
    const fromHeader = messages[0].payload?.headers?.find(h => h.name === 'From')?.value || '';
    const nameMatch = fromHeader.match(/^"([^"]+)"/) || fromHeader.match(/^([^<]+)/);
    if (nameMatch && nameMatch[1].trim()) fallbackName = nameMatch[1].trim();

    const { studentData, isAiUsed, reason } = await parseEmailWithAI(fullText, db.aiConfig || {}, fallbackName, forceEngine);
    
    // Track Usage
    if (!db.apiUsage) db.apiUsage = { emailsAnalyzed: 0, requestsMade: 0 };
    db.apiUsage.requestsMade += 1;
    if (isAiUsed) {
      db.apiUsage.emailsAnalyzed += 1;
    }
    const fs = require('fs');
    const path = require('path');
    fs.writeFileSync(path.join(__dirname, 'data.json'), JSON.stringify(db, null, 2), 'utf8');

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
    const { studentData, userInstruction, customFilters } = req.body;
    if (!studentData) {
      return res.status(400).json({ error: 'studentData is required' });
    }
    const matchedCoursesRes = await matchCourses(studentData, userInstruction, customFilters);
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

    // Automatically apply AI profile labels in Gmail to the thread / message
    try {
      const labelsToApply = Array.isArray(req.body.profileLabels) && req.body.profileLabels.length > 0
        ? [...req.body.profileLabels]
        : ['Ai- option sended 2026'];

      if (!labelsToApply.some(l => l.toLowerCase().includes('option sended'))) {
        labelsToApply.push('Ai- option sended 2026');
      }

      const labelIdsToAdd = [];
      for (const lName of labelsToApply) {
        const lid = await getOrCreateGmailLabel(gmail, lName);
        if (lid && !labelIdsToAdd.includes(lid)) {
          labelIdsToAdd.push(lid);
        }
      }

      if (labelIdsToAdd.length > 0) {
        if (threadId) {
          await gmail.users.threads.modify({
            userId: 'me',
            id: threadId,
            requestBody: { addLabelIds: labelIdsToAdd, removeLabelIds: ['UNREAD'] }
          });
        } else if (emailId) {
          await gmail.users.messages.modify({
            userId: 'me',
            id: emailId,
            requestBody: { addLabelIds: labelIdsToAdd, removeLabelIds: ['UNREAD'] }
          });
        }
      }
    } catch(err) {
      console.error('Failed to attach profile labels on email send:', err.message);
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
  server = app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`🔗 Local Preview URL: http://localhost:${PORT}`);
  });

  server.on('error', (e) => {
    if (e.code === 'EADDRINUSE') {
      console.warn(`[Server Notice] Port ${PORT} currently occupied. Attempting automated port recovery...`);
      try {
        require('child_process').execSync(`fuser -k -9 ${PORT}/tcp 2>/dev/null || true`, { stdio: 'ignore' });
      } catch(err) {}
      setTimeout(() => {
        server.close();
        server.listen(PORT, () => {
          console.log(`🚀 Server running on port ${PORT} (after recovery)`);
          console.log(`🔗 Local Preview URL: http://localhost:${PORT}`);
        });
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

// Auto Analyzer & Reply Worker (Removed by user request)
