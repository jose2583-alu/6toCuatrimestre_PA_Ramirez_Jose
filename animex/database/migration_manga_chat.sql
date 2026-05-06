-- ============================================================
--  AnimeX - Migración: Manga y Chat Comunitario
-- ============================================================

USE animex;

-- ── MANGA ────────────────────────────────────────────────────
-- Capítulos de manga por anime
CREATE TABLE IF NOT EXISTS manga_capitulos (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    anime_id    INT NOT NULL,
    numero      DECIMAL(6,1) NOT NULL DEFAULT 1,
    titulo      VARCHAR(200) DEFAULT NULL,
    descripcion TEXT DEFAULT NULL,
    portada_path VARCHAR(255) DEFAULT NULL,
    activo      TINYINT(1) NOT NULL DEFAULT 1,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_manga_cap (anime_id, numero),
    FOREIGN KEY (anime_id) REFERENCES animes(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Páginas de cada capítulo de manga
CREATE TABLE IF NOT EXISTS manga_paginas (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    capitulo_id INT NOT NULL,
    numero      INT NOT NULL DEFAULT 1,
    imagen_path VARCHAR(255) NOT NULL,
    UNIQUE KEY uq_pag (capitulo_id, numero),
    FOREIGN KEY (capitulo_id) REFERENCES manga_capitulos(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Progreso de lectura de manga por usuario
CREATE TABLE IF NOT EXISTS manga_progreso (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id  INT NOT NULL,
    capitulo_id INT NOT NULL,
    pagina      INT NOT NULL DEFAULT 1,
    updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_progreso (usuario_id, capitulo_id),
    FOREIGN KEY (usuario_id)  REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (capitulo_id) REFERENCES manga_capitulos(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ── CHAT COMUNITARIO ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS chat_mensajes (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id  INT NOT NULL,
    anime_id    INT DEFAULT NULL,          -- NULL = chat global
    mensaje     TEXT NOT NULL,
    activo      TINYINT(1) NOT NULL DEFAULT 1,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (anime_id)   REFERENCES animes(id)   ON DELETE SET NULL
) ENGINE=InnoDB;

-- Índice para paginación rápida
CREATE INDEX idx_chat_anime  ON chat_mensajes (anime_id, created_at DESC);
CREATE INDEX idx_chat_global ON chat_mensajes (created_at DESC);
