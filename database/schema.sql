-- =============================================================
-- Sistema Web para la Optimización de la Gestión Comercial Interna
-- del Área Comercial de Plaza Vea (caso de estudio académico)
-- Curso: Interacción Hombre-Máquina · UTP
-- Script de creación de la base de datos (MySQL 8.x)
-- =============================================================

CREATE DATABASE IF NOT EXISTS plazavea_ihm
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE plazavea_ihm;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS reportes;
DROP TABLE IF EXISTS promocion_marcas;
DROP TABLE IF EXISTS promociones;
DROP TABLE IF EXISTS movimientos;
DROP TABLE IF EXISTS productos;
DROP TABLE IF EXISTS modelos;
DROP TABLE IF EXISTS marcas;
DROP TABLE IF EXISTS subcategorias;
DROP TABLE IF EXISTS categorias;
DROP TABLE IF EXISTS borradores;
DROP TABLE IF EXISTS preferencias_accesibilidad;
DROP TABLE IF EXISTS usuarios;
DROP TABLE IF EXISTS roles;

SET FOREIGN_KEY_CHECKS = 1;

-- -------------------------------------------------------------
-- Seguridad y usuarios
-- -------------------------------------------------------------
CREATE TABLE roles (
  id     INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(50) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE usuarios (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  nombre        VARCHAR(100) NOT NULL,
  correo        VARCHAR(120) NOT NULL UNIQUE,
  password_hash VARCHAR(100) NOT NULL,
  rol_id        INT NOT NULL,
  CONSTRAINT fk_usuarios_rol FOREIGN KEY (rol_id) REFERENCES roles(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Módulos nuevos: «Apoyo visual» y «Ayuda en formularios».
-- El tamaño del texto ya no se guarda: depende solo del zoom del navegador (Ctrl + / Ctrl + rueda).
CREATE TABLE preferencias_accesibilidad (
  usuario_id        INT PRIMARY KEY,
  alto_contraste    BOOLEAN NOT NULL DEFAULT FALSE,
  foco_reforzado    BOOLEAN NOT NULL DEFAULT FALSE,
  guardar_borradores BOOLEAN NOT NULL DEFAULT TRUE,
  ayuda_formularios BOOLEAN NOT NULL DEFAULT TRUE,
  aviso_sesion      BOOLEAN NOT NULL DEFAULT TRUE,
  atajos_teclado    BOOLEAN NOT NULL DEFAULT TRUE,
  CONSTRAINT fk_pref_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Borradores de formularios (autoguardado)
CREATE TABLE borradores (
  id             INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id     INT NOT NULL,
  formulario     VARCHAR(60) NOT NULL,
  datos          JSON NOT NULL,
  actualizado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT uq_borrador UNIQUE (usuario_id, formulario),
  CONSTRAINT fk_borrador_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- Catálogos
-- -------------------------------------------------------------
CREATE TABLE categorias (
  id     INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(80) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE subcategorias (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  categoria_id INT NOT NULL,
  nombre       VARCHAR(80) NOT NULL,
  CONSTRAINT fk_subcat_categoria FOREIGN KEY (categoria_id) REFERENCES categorias(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE marcas (
  id     INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(80) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Modelos (variantes de envase o formato) de cada marca. Ej.: Gloria › Lata 400 g
CREATE TABLE modelos (
  id       INT AUTO_INCREMENT PRIMARY KEY,
  marca_id INT NOT NULL,
  nombre   VARCHAR(80) NOT NULL,
  CONSTRAINT uq_modelo_marca UNIQUE (marca_id, nombre),
  CONSTRAINT fk_modelo_marca FOREIGN KEY (marca_id) REFERENCES marcas(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- Productos e inventario
-- -------------------------------------------------------------
CREATE TABLE productos (
  id              INT AUTO_INCREMENT PRIMARY KEY,
  codigo          VARCHAR(20) NOT NULL UNIQUE,
  nombre          VARCHAR(120) NOT NULL,
  marca_id        INT NOT NULL,
  modelo_id       INT NULL,              -- opcional
  subcategoria_id INT NOT NULL,
  presentacion    VARCHAR(80),
  precio          DECIMAL(10,2) NOT NULL,
  contenido       DECIMAL(10,2),
  unidad          VARCHAR(10),
  stock           INT NOT NULL DEFAULT 0,
  stock_minimo    INT NOT NULL DEFAULT 20,
  estado          ENUM('Activo','Inactivo') NOT NULL DEFAULT 'Activo',
  fecha_registro  DATE NOT NULL,
  imagen          MEDIUMTEXT NULL,       -- data URL JPG/PNG (máx. 2 MB); NULL = sin imagen
  CONSTRAINT fk_producto_marca FOREIGN KEY (marca_id) REFERENCES marcas(id),
  CONSTRAINT fk_producto_modelo FOREIGN KEY (modelo_id) REFERENCES modelos(id) ON DELETE SET NULL,
  CONSTRAINT fk_producto_subcat FOREIGN KEY (subcategoria_id) REFERENCES subcategorias(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE movimientos (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  producto_id INT NOT NULL,
  usuario_id  INT NOT NULL,
  tipo        ENUM('Entrada','Salida') NOT NULL,
  cantidad    INT NOT NULL,
  motivo      VARCHAR(150),
  fecha       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_mov_producto FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE,
  CONSTRAINT fk_mov_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- Promociones
-- -------------------------------------------------------------
CREATE TABLE promociones (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  codigo       VARCHAR(30) NOT NULL UNIQUE,
  nombre       VARCHAR(120) NOT NULL,
  tipo         VARCHAR(40) NOT NULL,
  valor        DECIMAL(10,2) NOT NULL DEFAULT 0,
  fecha_inicio DATE NOT NULL,
  fecha_fin    DATE NOT NULL,
  estado       ENUM('Activo','Programado','Inactivo') NOT NULL DEFAULT 'Programado',
  prioridad    VARCHAR(10) NOT NULL DEFAULT 'Media',
  canales      VARCHAR(120)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE promocion_marcas (
  promocion_id INT NOT NULL,
  marca_id     INT NOT NULL,
  PRIMARY KEY (promocion_id, marca_id),
  CONSTRAINT fk_pm_promocion FOREIGN KEY (promocion_id) REFERENCES promociones(id) ON DELETE CASCADE,
  CONSTRAINT fk_pm_marca FOREIGN KEY (marca_id) REFERENCES marcas(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- -------------------------------------------------------------
-- Reportes: historial de reportes generados y exportados
-- -------------------------------------------------------------
CREATE TABLE reportes (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id  INT NOT NULL,
  tipo        ENUM('productos','inventario','promociones') NOT NULL,
  fecha_desde DATE NULL,
  fecha_hasta DATE NULL,
  filtros     VARCHAR(255),
  registros   INT NOT NULL DEFAULT 0,
  generado_en DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_rep_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
