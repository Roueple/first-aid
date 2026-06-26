import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';
import { BernardCore } from './bernardCore';
import {
  formatForWhatsApp,
  formatHelp,
  formatNotAuthorized,
  formatError,
} from './formatter';

const SESSION_TTL_HOURS = 24;
const MAX_HISTORY = 10; // keep last 10 messages for context

function buildTwiml(message: string): string {
  const escaped = message
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
  return `<?xml version="1.0" encoding="UTF-8"?><Response><Message>${escaped}</Message></Response>`;
}

export const whatsappWebhook = functions.https.onRequest(async (req, res) => {
    // Only accept POST
    if (req.method !== 'POST') {
      res.status(405).send('Method Not Allowed');
      return;
    }

    const db = admin.firestore();

    // Parse Twilio fields
    const rawFrom: string = req.body.From || '';
    const phone = rawFrom.replace('whatsapp:', '').trim();
    const messageBody: string = (req.body.Body || '').trim();

    if (!phone || !messageBody) {
      res.type('text/xml').send(buildTwiml('❌ Invalid request.'));
      return;
    }

    // --- 1. Whitelist check ---
    const whitelistDoc = await db.collection('wa_whitelist').doc(phone).get();
    if (!whitelistDoc.exists) {
      res.type('text/xml').send(buildTwiml(formatNotAuthorized()));
      return;
    }
    const whitelistData = whitelistDoc.data()!;
    const tier = (whitelistData.tier || 'tier-2') as 'tier-1' | 'tier-2';

    // --- 2. Help command ---
    const lowered = messageBody.toLowerCase();
    if (lowered === 'help' || lowered === 'bantuan' || lowered === '/help') {
      res.type('text/xml').send(buildTwiml(formatHelp()));
      return;
    }

    // --- 3. Load / create session ---
    const sessionRef = db.collection('wa_sessions').doc(phone);
    const sessionSnap = await sessionRef.get();

    let history: Array<{ role: string; content: string; ts: number }> = [];

    if (sessionSnap.exists) {
      const data = sessionSnap.data()!;
      // Expire sessions older than TTL
      const updatedAt: admin.firestore.Timestamp | undefined = data.updatedAt;
      if (updatedAt) {
        const ageHours = (Date.now() - updatedAt.toMillis()) / (1000 * 60 * 60);
        if (ageHours < SESSION_TTL_HOURS) {
          history = data.history || [];
        }
      }
    }

    // --- 4. Run Bernard query ---
    const geminiKey = process.env.GEMINI_API_KEY || '';
    if (!geminiKey) {
      console.error('GEMINI_API_KEY not configured');
      res.type('text/xml').send(buildTwiml(formatError()));
      return;
    }

    let replyText: string;
    try {
      const core = new BernardCore(geminiKey);
      const queryResult = await core.processQuery(
        messageBody,
        history.slice(-MAX_HISTORY),
        tier
      );
      replyText = formatForWhatsApp(queryResult);
    } catch (err) {
      console.error('Bernard processing error:', err);
      replyText = formatError();
    }

    // --- 5. Save session history ---
    const newHistory = [
      ...history,
      { role: 'user', content: messageBody, ts: Date.now() },
      { role: 'assistant', content: replyText, ts: Date.now() },
    ].slice(-MAX_HISTORY * 2); // keep last 20 entries (10 exchanges)

    await sessionRef.set({
      phone,
      tier,
      history: newHistory,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // --- 6. Log to auditLogs ---
    db.collection('auditLogs').add({
      userId: `wa:${phone}`,
      action: 'wa_query',
      resourceType: 'whatsapp',
      details: { query: messageBody, tier },
      timestamp: admin.firestore.FieldValue.serverTimestamp(),
    }).catch(e => console.warn('Audit log failed:', e));

    // --- 7. Reply ---
    res.type('text/xml').send(buildTwiml(replyText));
  });
