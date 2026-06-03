-- ============================================================
--  CAJERO ATM — Script de base de datos
--  PostgreSQL
-- ============================================================

-- Para resetear completamente, ejecuta primero:
-- DROP TABLE IF EXISTS transferencias, retiros, transacciones, sesiones_atm, cuentas, tarjetas, usuarios CASCADE;

-- ============================================================
--  TABLAS
-- ============================================================

CREATE TABLE usuarios (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombres VARCHAR(100) NOT NULL,
    apellidos VARCHAR(100) NOT NULL,
    dpi VARCHAR(20) UNIQUE NOT NULL,
    telefono VARCHAR(20),
    correo VARCHAR(100),
    direccion TEXT,
    estado BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tarjetas (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    usuario_id INT NOT NULL REFERENCES usuarios(id),
    numero_tarjeta VARCHAR(16) UNIQUE NOT NULL,
    pin VARCHAR(10) NOT NULL,
    fecha_vencimiento VARCHAR(5) NOT NULL,
    cvv VARCHAR(4),
    tipo_tarjeta VARCHAR(10) NOT NULL DEFAULT 'debito',
    intentos_fallidos INT DEFAULT 0,
    bloqueada BOOLEAN DEFAULT false,
    activa BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE cuentas (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    usuario_id INT NOT NULL REFERENCES usuarios(id),
    tarjeta_id INT REFERENCES tarjetas(id),
    numero_cuenta VARCHAR(20) UNIQUE NOT NULL,
    tipo_cuenta VARCHAR(20) NOT NULL,
    moneda VARCHAR(10) DEFAULT 'GTQ',
    saldo DECIMAL(12,2) DEFAULT 0,
    limite_diario DECIMAL(12,2) DEFAULT 3000,
    activa BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE sesiones_atm (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tarjeta_id INT NOT NULL REFERENCES tarjetas(id),
    fecha_inicio TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fecha_fin TIMESTAMP,
    atm_codigo VARCHAR(50),
    ip_maquina VARCHAR(50),
    activa BOOLEAN DEFAULT true
);

CREATE TABLE transacciones (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    cuenta_id INT NOT NULL REFERENCES cuentas(id),
    tipo_transaccion VARCHAR(30) NOT NULL,
    monto DECIMAL(12,2) NOT NULL,
    saldo_anterior DECIMAL(12,2),
    saldo_nuevo DECIMAL(12,2),
    descripcion TEXT,
    referencia VARCHAR(100),
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE retiros (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    cuenta_id INT NOT NULL REFERENCES cuentas(id),
    transaccion_id INT NOT NULL REFERENCES transacciones(id),
    monto DECIMAL(12,2) NOT NULL,
    billetes_100 INT DEFAULT 0,
    billetes_50 INT DEFAULT 0,
    billetes_20 INT DEFAULT 0,
    billetes_10 INT DEFAULT 0,
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE transferencias (
    id INT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    cuenta_origen INT NOT NULL REFERENCES cuentas(id),
    cuenta_destino INT NOT NULL REFERENCES cuentas(id),
    monto DECIMAL(12,2) NOT NULL,
    estado VARCHAR(20) DEFAULT 'completada',
    referencia VARCHAR(100),
    fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================
--  DATOS DE PRUEBA
-- ============================================================

-- Usuario 1: Marco Antonio Cifuentes Escobar
INSERT INTO usuarios (nombres, apellidos, dpi, telefono, correo, direccion, estado)
VALUES ('Marco Antonio', 'Cifuentes Escobar', '00000000', '31412653', 'escobarcifuentesantoniomarco@gmail.com', 'Avenida Circunvalación', true);

INSERT INTO tarjetas (usuario_id, numero_tarjeta, pin, fecha_vencimiento, cvv, tipo_tarjeta)
VALUES (1, '1000100010001000', '3141', '11/30', '124', 'debito');

INSERT INTO cuentas (usuario_id, numero_cuenta, tipo_cuenta, moneda, saldo)
VALUES (1, '001000000011', 'Ahorro', 'GTQ', 5000);

INSERT INTO cuentas (usuario_id, numero_cuenta, tipo_cuenta, moneda, saldo)
VALUES (1, '001000000012', 'Monetaria', 'GTQ', 2500);

INSERT INTO tarjetas (usuario_id, numero_tarjeta, pin, fecha_vencimiento, cvv, tipo_tarjeta)
VALUES (1, '2000200020002000', '3141', '11/30', '321', 'credito');

INSERT INTO cuentas (usuario_id, tarjeta_id, numero_cuenta, tipo_cuenta, moneda, saldo)
VALUES (1, 2, '002000000021', 'Credito', 'GTQ', 10000);

-- Usuario 2: Oscar Eulicer Lopez Ramirez
INSERT INTO usuarios (nombres, apellidos, dpi, telefono, correo, direccion, estado)
VALUES ('Oscar Eulicer', 'Lopez Ramirez', '3214567890101', '45781236', 'oscareulicerlopezram@gmail.com', 'Zona 1, Retalhuleu, Guatemala', true);

INSERT INTO tarjetas (usuario_id, numero_tarjeta, pin, fecha_vencimiento, cvv, tipo_tarjeta)
VALUES (2, '4556789012345678', '2589', '09/30', '417', 'debito');

INSERT INTO cuentas (usuario_id, numero_cuenta, tipo_cuenta, moneda, saldo)
VALUES (2, '001000000044', 'Ahorro', 'GTQ', 15000.75);

INSERT INTO cuentas (usuario_id, numero_cuenta, tipo_cuenta, moneda, saldo)
VALUES (2, '001000000045', 'Monetaria', 'GTQ', 8500.50);

INSERT INTO tarjetas (usuario_id, numero_tarjeta, pin, fecha_vencimiento, cvv, tipo_tarjeta)
VALUES (2, '5556789012345678', '2589', '09/30', '528', 'credito');

INSERT INTO cuentas (usuario_id, tarjeta_id, numero_cuenta, tipo_cuenta, moneda, saldo)
VALUES (2, 3, '002000000044', 'Credito', 'GTQ', 25000.00);

-- Usuario 3: Darlin Eunice Perez Aguilar
INSERT INTO usuarios (nombres, apellidos, dpi, telefono, correo, direccion, estado)
VALUES ('Darlin Eunice', 'Perez Aguilar', '11120000000', '36906188', 'Darlinaguilar522@gmail.com', 'Zona 1, Retalhuleu, Guatemala', true);

INSERT INTO tarjetas (usuario_id, numero_tarjeta, pin, fecha_vencimiento, cvv, tipo_tarjeta)
VALUES (3, '4234567899876543', '3690', '09/30', '417', 'debito');

INSERT INTO cuentas (usuario_id, numero_cuenta, tipo_cuenta, moneda, saldo)
VALUES (3, '001000011111', 'Ahorro', 'GTQ', 15000.75);

INSERT INTO cuentas (usuario_id, numero_cuenta, tipo_cuenta, moneda, saldo)
VALUES (3, '001000011112', 'Monetaria', 'GTQ', 6200.25);

INSERT INTO tarjetas (usuario_id, numero_tarjeta, pin, fecha_vencimiento, cvv, tipo_tarjeta)
VALUES (3, '5234567899876543', '3690', '09/30', '631', 'credito');

INSERT INTO cuentas (usuario_id, tarjeta_id, numero_cuenta, tipo_cuenta, moneda, saldo)
VALUES (3, 4, '002000011111', 'Credito', 'GTQ', 18000.00);
