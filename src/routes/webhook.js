const express = require('express');
const {
  getBusinessByPhoneNumberId,
  getConversationHistory,
  logMessage,
  createLead
} = require('../db/supabase');
const { generateReply } = require('../services/ai');
const { sendWhatsAppMessage } = require('../services/whatsapp');

const router = express.Router();

router.get('/', (req, res) => {
  // Meta sends hub.challenge during setup. Return it as plain text only after matching our token.
  const isValid = req.query['hub.verify_token'] === process.env.WHATSAPP_VERIFY_TOKEN;
  if (!isValid) return res.sendStatus(403);
  return res.status(200).send(req.query['hub.challenge']);
});

router.post('/', (req, res) => {
  // Acknowledge quickly: Meta retries deliveries when it does not receive HTTP 200 promptly.
  res.sendStatus(200);
  processIncomingWebhook(req.body).catch((error) => console.error('Webhook processing failed:', error));
});

async function processIncomingWebhook(payload) {
  const changes = payload?.entry?.flatMap((entry) => entry.changes || []) || [];
  for (const change of changes) {
    const value = change.value;
    const phoneNumberId = value?.metadata?.phone_number_id;
    const messages = value?.messages || [];
    if (!phoneNumberId || !messages.length) continue;

    const business = await getBusinessByPhoneNumberId(phoneNumberId);
    if (!business) {
      console.warn(`No business configured for WhatsApp phone number ${phoneNumberId}`);
      continue;
    }

    for (const message of messages) {
      // This starter handles text messages; media/status notifications are safely ignored.
      if (message.type !== 'text' || !message.text?.body || !message.from) continue;
      const customerPhone = message.from;
      const incomingText = message.text.body;
      const history = await getConversationHistory(business.id, customerPhone);
      await logMessage(business.id, customerPhone, 'in', incomingText);
      const result = await generateReply(business, history, incomingText);

      if (result.isLead) await createLead(business.id, customerPhone, result.leadData);
      await sendWhatsAppMessage(phoneNumberId, customerPhone, result.reply);
      await logMessage(business.id, customerPhone, 'out', result.reply);
    }
  }
}

module.exports = router;
