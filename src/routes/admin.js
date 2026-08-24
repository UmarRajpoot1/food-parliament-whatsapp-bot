const express = require('express');
const { supabase } = require('../db/supabase');

const router = express.Router();

function requireAdmin(req, res, next) {
  if (!process.env.ADMIN_API_KEY || req.get('x-admin-api-key') !== process.env.ADMIN_API_KEY) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  return next();
}

router.use(requireAdmin);

router.get('/leads', async (req, res, next) => {
  try {
    if (!req.query.business_id) return res.status(400).json({ error: 'business_id is required' });
    let query = supabase
      .from('leads')
      .select('*')
      .eq('business_id', req.query.business_id)
      .order('created_at', { ascending: false });
    if (req.query.status) query = query.eq('status', req.query.status);
    const { data, error } = await query;
    if (error) throw error;
    return res.json({ leads: data || [] });
  } catch (error) {
    return next(error);
  }
});

router.post('/business', async (req, res, next) => {
  try {
    const { id, name, type, whatsapp_phone_number_id, business_data, system_prompt_extra } = req.body;
    if (!name || !['salon', 'restaurant'].includes(type) || !whatsapp_phone_number_id) {
      return res.status(400).json({ error: 'name, type (salon or restaurant), and whatsapp_phone_number_id are required' });
    }
    const business = {
      name,
      type,
      whatsapp_phone_number_id,
      business_data: business_data || {},
      system_prompt_extra: system_prompt_extra || null
    };
    if (id) business.id = id;
    const { data, error } = await supabase
      .from('businesses')
      .upsert(business, { onConflict: id ? 'id' : 'whatsapp_phone_number_id' })
      .select()
      .single();
    if (error) throw error;
    return res.status(id ? 200 : 201).json({ business: data });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
