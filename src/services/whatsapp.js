async function sendWhatsAppMessage(phoneNumberId, customerPhone, text) {
  console.log(`[whatsapp] sending message phone_number_id=${phoneNumberId} recipient=${customerPhone} text_length=${text.length} token_present=${Boolean(process.env.WHATSAPP_TOKEN)}`);
  if (!process.env.WHATSAPP_TOKEN) throw new Error('Set WHATSAPP_TOKEN');
  const response = await fetch(`https://graph.facebook.com/v20.0/${phoneNumberId}/messages`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ messaging_product: 'whatsapp', to: customerPhone, type: 'text', text: { body: text } })
  });
  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`[whatsapp] send failed status=${response.status} body=${errorBody}`);
    throw new Error(`WhatsApp send failed (${response.status}): ${errorBody}`);
  }
  console.log(`[whatsapp] API response received status=${response.status}`);
}

module.exports = { sendWhatsAppMessage };
