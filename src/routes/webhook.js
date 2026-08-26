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

router.post('/', async (req, res, next) => {
  console.log('[webhook] POST received');
  try {
    await processIncomingWebhook(req.body);
    console.log('[webhook] processing complete');
    return res.sendStatus(200);
  } catch (error) {
    console.error('[webhook] processing failed:', error);
    return next(error);
  }
});

async function processIncomingWebhook(payload) {
  const changes = payload?.entry?.flatMap((entry) => entry.changes || []) || [];
  console.log(`[webhook] received ${changes.length} change(s)`);
  for (const change of changes) {
    const value = change.value;
    const phoneNumberId = value?.metadata?.phone_number_id;
    const messages = value?.messages || [];
    console.log(`[webhook] change phone_number_id=${phoneNumberId || 'missing'} messages=${messages.length}`);
    if (!phoneNumberId || !messages.length) {
      console.log('[webhook] skipping change without a phone number ID or messages');
      continue;
    }

    if (process.env.WHATSAPP_PHONE_NUMBER_ID && phoneNumberId !== process.env.WHATSAPP_PHONE_NUMBER_ID) {
      console.warn(`[webhook] received phone number ID ${phoneNumberId}, expected configured ID ${process.env.WHATSAPP_PHONE_NUMBER_ID}`);
    }

    console.log(`[webhook] looking up business for phone_number_id=${phoneNumberId}`);
    const business = await getBusinessByPhoneNumberId(phoneNumberId);
    if (!business) {
      console.warn(`No business configured for WhatsApp phone number ${phoneNumberId}`);
      continue;
    }
    console.log(`[webhook] business found id=${business.id} name=${business.name}`);

    for (const message of messages) {
      // This starter handles text messages; media/status notifications are safely ignored.
      if (message.type !== 'text' || !message.text?.body || !message.from) {
        console.log(`[webhook] skipping unsupported message type=${message.type || 'missing'}`);
        continue;
      }
      const customerPhone = message.from;
      const incomingText = message.text.body;
      console.log(`[webhook] text message received from=${customerPhone} length=${incomingText.length}`);
      const history = await getConversationHistory(business.id, customerPhone);
      await logMessage(business.id, customerPhone, 'in', incomingText);
      console.log(`[webhook] calling AI provider history_messages=${history.length} groq_key_present=${Boolean(process.env.GROQ_API_KEY)}`);
      const result = await generateReply(business, history, incomingText);
      console.log(`[webhook] AI reply received length=${result.reply.length} is_lead=${result.isLead}`);

      if (result.isLead) await createLead(business.id, customerPhone, result.leadData);
      console.log(`[webhook] sending reply via WhatsApp phone_number_id=${phoneNumberId}`);
      await sendWhatsAppMessage(phoneNumberId, customerPhone, result.reply);
      console.log('[webhook] WhatsApp reply sent');
      await logMessage(business.id, customerPhone, 'out', result.reply);
    }
  }
}

module.exports = router;
