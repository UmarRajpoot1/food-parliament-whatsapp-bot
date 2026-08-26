require('dotenv').config();

const express = require('express');
const webhookRoutes = require('./src/routes/webhook');
const adminRoutes = require('./src/routes/admin');

const app = express();
const port = Number(process.env.PORT || 3000);
const runtimeConfig = ['GROQ_API_KEY', 'SUPABASE_URL', 'SUPABASE_KEY', 'WHATSAPP_TOKEN', 'WHATSAPP_PHONE_NUMBER_ID'];
console.log('[config] runtime environment:', Object.fromEntries(runtimeConfig.map((name) => [name, {
  present: Boolean(process.env[name]),
  length: process.env[name]?.length || 0
}])));

app.use(express.json({ limit: '1mb' }));
app.get('/health', (_req, res) => res.json({ ok: true }));
app.use('/webhook', webhookRoutes);
app.use('/admin', adminRoutes);

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: 'Internal server error' });
});

if (require.main === module) {
  app.listen(port, '0.0.0.0', () => console.log(`WhatsApp assistant listening on port ${port}`));
}

module.exports = app;
