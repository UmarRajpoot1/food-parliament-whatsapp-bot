const MODEL = 'openai/gpt-oss-120b';

function buildSystemPrompt(business) {
  return `You are the WhatsApp assistant for ${business.name}, a ${business.type}. Follow the custom instructions below as well as these rules:\n- Keep replies warm, natural, and short: 2-4 lines unless listing menu items.\n- Use casual Urdu-English mix when the customer does. Never mention being an AI unless directly asked.\n- Always end with a helpful next step or question.\n- Only use the business data below. Never invent menu items, prices, hours, availability, delivery charges, policies, or payment methods. If information is missing, say a team member will confirm shortly.\n\nBUSINESS DATA:\n${JSON.stringify(business.business_data || {}, null, 2)}\n\nIf the customer wants to order, collect items and quantities, then collect their name, complete delivery address, and contact number. Confirm that the team will process the order.\n${business.system_prompt_extra ? `\nCUSTOM INSTRUCTIONS:\n${business.system_prompt_extra}` : ''}\n\nReturn only valid JSON with this exact shape: {"reply":"string","is_lead":true|false,"lead_data":{"customer_name":"string or null","requested_service":"string or null","requested_datetime":"string or null","order_items":[{"name":"string","quantity":1}],"delivery_address":"string or null","contact_number":"string or null"}}. Set is_lead true only when the customer expresses booking or order intent.`;
}

async function requestCompletion(messages, apiKey, baseUrl, model) {
  console.log(`[ai] calling ${baseUrl} model=${model} messages=${messages.length} api_key_present=${Boolean(apiKey)}`);
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, temperature: 0.2, response_format: { type: 'json_object' }, messages })
  });
  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`[ai] request failed status=${response.status} body=${errorBody}`);
    throw new Error(`AI request failed (${response.status}): ${errorBody}`);
  }
  console.log(`[ai] response received status=${response.status}`);
  return response.json();
}

async function generateReply(business, history, incomingText) {
  const apiKey = process.env.OPENAI_API_KEY || process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.error(`[ai] missing API key groq_key_present=${Boolean(process.env.GROQ_API_KEY)} openai_key_present=${Boolean(process.env.OPENAI_API_KEY)}`);
    throw new Error('Set GROQ_API_KEY or OPENAI_API_KEY');
  }
  const baseUrl = process.env.OPENAI_API_KEY
    ? 'https://api.openai.com/v1'
    : 'https://api.groq.com/openai/v1';
  const model = process.env.OPENAI_API_KEY ? 'gpt-4o-mini' : MODEL;
  const messages = [
    { role: 'system', content: buildSystemPrompt(business) },
    ...history.map((message) => ({ role: message.message_direction === 'in' ? 'user' : 'assistant', content: message.message_text })),
    { role: 'user', content: incomingText }
  ];
  const result = await requestCompletion(messages, apiKey, baseUrl, model);
  const content = result.choices?.[0]?.message?.content;
  if (!content) throw new Error('AI returned an empty response');
  try {
    const parsed = JSON.parse(content);
    return { reply: String(parsed.reply || 'A team member will follow up shortly.'), isLead: Boolean(parsed.is_lead), leadData: parsed.lead_data || {} };
  } catch {
    return { reply: content, isLead: false, leadData: {} };
  }
}

module.exports = { generateReply };
