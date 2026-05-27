const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

require('dotenv').config();

const atmRoutes = require('./routes/atm.routes');

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
  allowedHeaders: ['Content-Type', 'sesion-id']
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
app.use('/atm', atmRoutes);

app.get('/', (req, res) => {
  res.send('ATM backend funcionando');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});
