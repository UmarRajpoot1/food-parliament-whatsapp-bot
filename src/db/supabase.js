const { createClient } = require('@supabase/supabase-js');

const required = ['SUPABASE_URL', 'SUPABASE_KEY'];
const missing = required.filter((name) => !process.env[name]);
if (missing.length) {
  console.warn(`Missing Supabase configuration: ${missing.join(', ')}`);
}

const supabase = createClient(
  process.env.SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.SUPABASE_KEY || 'placeholder-key'
);

async function getBusinessByPhoneNumberId(phoneNumberId) {
  const { data, error } = await supabase
    .from('businesses')
    .select('*')
    .eq('whatsapp_phone_number_id', phoneNumberId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function getConversationHistory(businessId, customerPhone) {
  const { data, error } = await supabase
    .from('conversations')
    .select('message_direction, message_text, created_at')
    .eq('business_id', businessId)
    .eq('customer_phone', customerPhone)
    .order('created_at', { ascending: false })
    .limit(6);
  if (error) throw error;
  return (data || []).reverse();
}

async function logMessage(businessId, customerPhone, direction, text) {
  const { error } = await supabase.from('conversations').insert({
    business_id: businessId,
    customer_phone: customerPhone,
    message_direction: direction,
    message_text: text
  });
  if (error) throw error;
}

async function createLead(businessId, customerPhone, leadData) {
  const { error } = await supabase.from('leads').insert({
    business_id: businessId,
    customer_phone: customerPhone,
    customer_name: leadData.customer_name || null,
    requested_service: leadData.requested_service || null,
    requested_datetime: leadData.requested_datetime || null,
    order_items: leadData.order_items || null,
    delivery_address: leadData.delivery_address || null,
    contact_number: leadData.contact_number || null,
    status: 'new'
  });
  if (error) throw error;
}

module.exports = { supabase, getBusinessByPhoneNumberId, getConversationHistory, logMessage, createLead };
