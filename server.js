require('dotenv').config();

const express = require('express');
const webhookRoutes = require('./src/routes/webhook');
const adminRoutes = require('./src/routes/admin');

const app = express();
const port = Number(process.env.PORT || 3000);

app.use(express.json({ limit: '1mb' }));
app.get('/health', (_req, res) => res.json({ ok: true }));
app.use('/webhook', webhookRoutes);
app.use('/admin', adminRoutes);

app.use((error, _req, res, _next) => {
  console.error(error);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(port, () => console.log(`WhatsApp assistant listening on port ${port}`));
