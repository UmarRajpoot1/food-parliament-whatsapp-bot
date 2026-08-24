async function sendWhatsAppMessage(phoneNumberId, customerPhone, text) {
  if (!process.env.WHATSAPP_TOKEN) throw new Error('Set WHATSAPP_TOKEN');
  const response = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', to: customerPhone, type: 'text', text: { body: text } })
  });
  if (!response.ok) throw new Error(`WhatsApp send failed (${response.status}): ${await response.text()}`);
}

module.exports = { sendWhatsAppMessage };
