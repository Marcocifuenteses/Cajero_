const express = require('express');
const cors    = require('cors');
const helmet  = require('helmet');
const rateLimit = require('express-rate-limit');
const fs   = require('fs');

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const atmRoutes    = require('./routes/atm.routes');
const atmController = require('./controllers/atm.controller');
const { LOG_PATH } = require('./services/logger');

const app = express();

// Trust first proxy (needed if behind Nginx, Railway, Render, etc.)
app.set('trust proxy', 1);

// Security headers
app.use(helmet());

// CORS — configurable por variable de entorno para portabilidad
const allowedOrigin = process.env.ALLOWED_ORIGIN || 'http://localhost:4200';
app.use(cors({
  origin: allowedOrigin,
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'sesion-id', 'x-admin-secret']
}));

app.use(express.json());

// Rate limiting en login: máximo 10 intentos por IP cada 15 minutos
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos. Intente de nuevo en 15 minutos.' }
});

app.use('/atm/login', loginLimiter);
app.post('/atm/admin/descargar-log', (req, res) => {
  const secret = req.headers['x-admin-secret'] || req.body?.admin_secret;
  if (!process.env.ADMIN_SECRET || secret !== process.env.ADMIN_SECRET) {
    return res.status(403).json({ error: 'Contraseña incorrecta' });
  }
  if (!fs.existsSync(LOG_PATH)) {
    return res.status(404).json({ error: 'No hay registros aún' });
  }
  const fecha = new Date().toISOString().slice(0, 10);
  res.setHeader('Content-Disposition', `attachment; filename="actividad_${fecha}.log"`);
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  fs.createReadStream(LOG_PATH).pipe(res);
});

app.post('/atm/admin/solicitar-codigo',    atmController.solicitarCodigoAdmin);
app.post('/atm/admin/verificar-codigo',    atmController.verificarCodigoAdmin);
app.post('/atm/admin/desbloquear-tarjeta', atmController.desbloquearTarjeta);
app.use('/atm', atmRoutes);

app.get('/', (req, res) => {
  res.send('ATM backend funcionando');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
