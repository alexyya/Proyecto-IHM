-- =============================================================
-- Datos de prueba · plazavea_ihm
-- Ejecutar DESPUÉS de schema.sql
-- Contraseñas (hash bcrypt generado con bcryptjs, costo 10):
--   admin@spsa.com.pe       / Admin123  (Administrador)
--   coordinador@spsa.com.pe / Coord123  (Coordinador Comercial)
--   inventario@spsa.com.pe  / Inv123    (Encargado de Inventario)
-- =============================================================

USE plazavea_ihm;
SET NAMES utf8mb4;

-- Roles ------------------------------------------------------
INSERT INTO roles (id, nombre) VALUES
  (1, 'Administrador'),
  (2, 'Coordinador Comercial'),
  (3, 'Encargado de Inventario');

-- Usuarios ---------------------------------------------------
INSERT INTO usuarios (id, nombre, correo, password_hash, rol_id) VALUES
  (1, 'Diana Rojas',     'admin@spsa.com.pe',       '$2a$10$R01oeLTBLC69KIxWoQ.5Eu9PluqgI33swQPNbkq3KOy9yYEkfBECu', 1),
  (2, 'Carlos Mendoza',  'coordinador@spsa.com.pe', '$2a$10$ISp5bqm6q8tm7qDr9Rk1heUrHEi4UwFSTtDOIMT.QeErClQ323a6G', 2),
  (3, 'Lucía Quispe',    'inventario@spsa.com.pe',  '$2a$10$K3Q8mKWuxJSFaGU.J8jFe.jLvmnEDB9Rpah0UWh9LhWZMYJWEr5h.', 3);

-- Preferencias de accesibilidad (valores por defecto) ---------
INSERT INTO preferencias_accesibilidad
  (usuario_id, alto_contraste, foco_reforzado, guardar_borradores, ayuda_formularios, aviso_sesion, atajos_teclado)
VALUES
  (1, FALSE, FALSE, TRUE, TRUE, TRUE, TRUE),
  (2, FALSE, FALSE, TRUE, TRUE, TRUE, TRUE),
  (3, FALSE, FALSE, TRUE, TRUE, TRUE, TRUE);

-- Categorías y subcategorías ------------------------------------
INSERT INTO categorias (id, nombre) VALUES
  (1, 'Lácteos'),
  (2, 'Abarrotes'),
  (3, 'Limpieza'),
  (4, 'Bebidas'),
  (5, 'Cuidado personal');

INSERT INTO subcategorias (id, categoria_id, nombre) VALUES
  (1, 1, 'Leche'),
  (2, 1, 'Yogurt'),
  (3, 1, 'Quesos'),
  (4, 2, 'Arroz'),
  (5, 2, 'Aceites'),
  (6, 2, 'Azúcar'),
  (7, 2, 'Conservas'),
  (8, 2, 'Fideos'),
  (9, 3, 'Detergentes'),
  (10, 3, 'Lavavajillas'),
  (11, 4, 'Gaseosas'),
  (12, 4, 'Aguas'),
  (13, 5, 'Shampoo'),
  (14, 5, 'Jabones');

-- Marcas ------------------------------------------------------
INSERT INTO marcas (id, nombre) VALUES
  (1, 'Gloria'),
  (2, 'Costeño'),
  (3, 'Primor'),
  (4, 'Ariel'),
  (5, 'Bells'),
  (6, 'Laive'),
  (7, 'Don Vittorio'),
  (8, 'Inca Kola'),
  (9, 'San Luis'),
  (10, 'Sapolio'),
  (11, 'Head & Shoulders'),
  (12, 'Bolívar');

-- Modelos (formato o envase de cada marca) --------------------
INSERT INTO modelos (id, marca_id, nombre) VALUES
  (1,  1,  'Lata 400 g'),
  (2,  1,  'Caja 1 L'),
  (3,  1,  'Botella 1 kg'),
  (4,  2,  'Bolsa 750 g'),
  (5,  2,  'Bolsa 5 kg'),
  (6,  3,  'Botella 900 ml'),
  (7,  3,  'Lata 170 g'),
  (8,  4,  'Bolsa 2 kg'),
  (9,  6,  'Caja 946 ml'),
  (10, 8,  'Botella 1.5 L'),
  (11, 9,  'Botella 2.5 L');

-- Productos ---------------------------------------------------
-- stock <= stock_minimo  => alerta de stock bajo
INSERT INTO productos
  (id, codigo, nombre, marca_id, modelo_id, subcategoria_id, presentacion, precio, contenido, unidad, stock, stock_minimo, estado, fecha_registro)
VALUES
  (1,  'SKU-10045', 'Leche Evaporada Entera',        1, 1,      1,  'Lata',     4.20,  400,  'g',   245, 20, 'Activo',   '2026-09-12'),
  (2,  'SKU-20991', 'Arroz Extra Superior',          2, 5,      4,  'Bolsa',    23.90, 5,    'kg',  12,  20, 'Activo',   '2026-09-15'),
  (3,  'SKU-33012', 'Aceite Vegetal Premium',        3, 6,      5,  'Botella',  11.50, 900,  'ml',  68,  20, 'Activo',   '2026-09-18'),
  (4,  'SKU-41005', 'Detergente en Polvo Floral',    4, 8,      9,  'Bolsa',    32.90, 2,    'kg',  150, 20, 'Activo',   '2026-09-20'),
  (5,  'SKU-52011', 'Atún en Trozos',                3, 7,      7,  'Lata',     6.90,  170,  'g',   85,  20, 'Activo',   '2026-09-22'),
  (6,  'SKU-61022', 'Azúcar Rubia',                  5, NULL,   6,  'Bolsa',    4.50,  1,    'kg',  120, 20, 'Activo',   '2026-09-25'),
  (7,  'SKU-70033', 'Arroz Integral',                2, 4,      4,  'Bolsa',    7.90,  750,  'g',   5,   20, 'Activo',   '2026-09-28'),
  (8,  'SKU-10052', 'Yogurt Bebible Fresa',          1, 3,      2,  'Botella',  7.20,  1,    'kg',  96,  20, 'Activo',   '2026-10-01'),
  (9,  'SKU-10078', 'Leche Fresca UHT Light',        6, 9,      1,  'Caja',     5.40,  946,  'ml',  18,  20, 'Activo',   '2026-10-03'),
  (10, 'SKU-23015', 'Fideo Spaghetti',               7, NULL,   8,  'Paquete',  3.80,  500,  'g',   210, 20, 'Activo',   '2026-10-06'),
  (11, 'SKU-80011', 'Gaseosa Inca Kola',             8, 10,     11, 'Botella',  7.50,  1.5,  'l',   132, 20, 'Activo',   '2026-10-09'),
  (12, 'SKU-80024', 'Agua de Mesa sin Gas',          9, 11,     12, 'Botella',  3.60,  2.5,  'l',   175, 20, 'Activo',   '2026-10-12'),
  (13, 'SKU-42018', 'Lavavajillas en Pasta Limón',   10, NULL,  10, 'Pote',     8.90,  900,  'g',   64,  20, 'Activo',   '2026-10-15'),
  (14, 'SKU-91007', 'Shampoo Control Caspa',         11, NULL,  13, 'Frasco',   19.90, 375,  'ml',  42,  20, 'Activo',   '2026-10-18'),
  (15, 'SKU-10091', 'Queso Fresco Pasteurizado',     6, NULL,   3,  'Paquete',  15.90, 500,  'g',   9,   20, 'Activo',   '2026-10-21'),
  (16, 'SKU-42033', 'Jabón de Lavar Bolívar',        12, NULL,  14, 'Barra',    3.20,  190,  'g',   88,  20, 'Inactivo', '2026-10-24');

-- Movimientos (fechas relativas para que el dashboard muestre los últimos 5 días)
INSERT INTO movimientos (producto_id, usuario_id, tipo, cantidad, motivo, fecha) VALUES
  (1,  3, 'Entrada', 120, 'Reposición de proveedor Gloria',        DATE_SUB(NOW(), INTERVAL 4 DAY)),
  (4,  3, 'Entrada', 60,  'Compra programada',                     DATE_SUB(NOW(), INTERVAL 4 DAY)),
  (6,  3, 'Entrada', 80,  'Reposición semanal',                    DATE_SUB(NOW(), INTERVAL 3 DAY)),
  (2,  2, 'Salida',  40,  'Venta en tienda',                       DATE_SUB(NOW(), INTERVAL 3 DAY)),
  (10, 3, 'Entrada', 150, 'Ingreso por campaña escolar',           DATE_SUB(NOW(), INTERVAL 2 DAY)),
  (11, 3, 'Entrada', 72,  'Reposición de bebidas',                 DATE_SUB(NOW(), INTERVAL 2 DAY)),
  (7,  2, 'Salida',  25,  'Transferencia a tienda Miraflores',     DATE_SUB(NOW(), INTERVAL 1 DAY)),
  (12, 3, 'Entrada', 96,  'Reposición de proveedor San Luis',      DATE_SUB(NOW(), INTERVAL 1 DAY)),
  (3,  3, 'Entrada', 48,  'Reposición de aceites',                 DATE_SUB(NOW(), INTERVAL 1 DAY)),
  (5,  3, 'Entrada', 36,  'Ingreso de mercadería',                 DATE_SUB(NOW(), INTERVAL 2 HOUR)),
  (15, 2, 'Salida',  12,  'Merma por fecha de vencimiento',        DATE_SUB(NOW(), INTERVAL 1 HOUR)),
  (1,  2, 'Salida',  30,  'Venta en tienda San Miguel',            DATE_SUB(NOW(), INTERVAL 2 DAY)),
  (11, 2, 'Salida',  24,  'Venta en tienda',                       DATE_SUB(NOW(), INTERVAL 4 DAY));

-- Promociones -------------------------------------------------
-- Fechas relativas a CURDATE(): al recargar el seed siempre hay una promoción
-- activa que termina en los próximos 3 días (dashboard: «1 termina en los próximos 3 días»).
INSERT INTO promociones (id, codigo, nombre, tipo, valor, fecha_inicio, fecha_fin, estado, prioridad, canales) VALUES
  (1, 'VERANO20',     'Temporada de verano', 'Descuento %',  20.00, DATE_SUB(CURDATE(), INTERVAL 1 DAY),   DATE_ADD(CURDATE(), INTERVAL 150 DAY), 'Activo',     'Alta',  'Tienda física,Web,App'),
  (2, 'PARRILLA26',   'Combo parrillero',    'Combo',        39.90, DATE_SUB(CURDATE(), INTERVAL 18 DAY),  DATE_ADD(CURDATE(), INTERVAL 59 DAY),  'Activo',     'Media', 'Tienda física,Web'),
  (3, 'LACTEOS2X1',   'Lácteos 2×1',         '2×1',          0.00,  DATE_ADD(CURDATE(), INTERVAL 13 DAY),  DATE_ADD(CURDATE(), INTERVAL 28 DAY),  'Programado', 'Alta',  'Tienda física,Web,App'),
  (4, 'INVIERNO50',   'Liquidación de invierno', 'Descuento %', 50.00, DATE_SUB(CURDATE(), INTERVAL 150 DAY), DATE_SUB(CURDATE(), INTERVAL 60 DAY), 'Inactivo', 'Baja', 'Tienda física'),
  (5, 'BIENVENIDA10', 'Bienvenida clientes App', 'Monto fijo', 10.00, DATE_SUB(CURDATE(), INTERVAL 62 DAY), DATE_ADD(CURDATE(), INTERVAL 2 DAY), 'Activo',   'Media', 'App'),
  (6, 'CYBER26',      'Cyber Wow 2026',      'Descuento %',  30.00, DATE_ADD(CURDATE(), INTERVAL 21 DAY),  DATE_ADD(CURDATE(), INTERVAL 24 DAY),  'Programado', 'Alta',  'Web,App');

INSERT INTO promocion_marcas (promocion_id, marca_id) VALUES
  (1, 8), (1, 9),
  (2, 3), (2, 8),
  (3, 1), (3, 6),
  (4, 11),
  (5, 1), (5, 2), (5, 3),
  (6, 4), (6, 11), (6, 10);

-- Historial de reportes generados (ejemplos)
INSERT INTO reportes (usuario_id, tipo, fecha_desde, fecha_hasta, filtros, registros, generado_en) VALUES
  (1, 'productos',   NULL,         NULL,         'Sin filtros',                  16, '2026-10-26 09:15:00'),
  (3, 'inventario',  '2026-10-20', '2026-10-26', 'Categoría: Abarrotes',          7, '2026-10-26 17:40:00'),
  (2, 'promociones', '2026-10-01', '2026-10-31', 'Estado: Activo',                3, '2026-10-27 11:05:00');
