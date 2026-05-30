const express = require('express');
const router = express.Router();

const atmController = require('../controllers/atm.controller');
const validarSesion = require('../middleware/session.middleware');


router.post('/login', atmController.login);
router.post('/logout', atmController.logout);
router.post('/validate-card', atmController.validateCard);
router.get('/cuentas/:usuario_id', validarSesion, atmController.getCuentas);
router.post('/cambiar-pin', validarSesion, atmController.cambiarPin);
router.post('/retiro', validarSesion, atmController.retiro);
router.get('/buscar-cuenta', validarSesion, atmController.buscarCuenta);
router.get('/historial/:cuenta_id', validarSesion, atmController.historial);
router.post('/transferencia', validarSesion, atmController.transferencia);
router.get('/test-email', atmController.testEmail);
module.exports = router;