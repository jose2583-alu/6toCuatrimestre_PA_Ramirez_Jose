-- ============================================================
--  AnimeX Platform - Base de Datos Completa v2
-- ============================================================

CREATE DATABASE IF NOT EXISTS animex CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE animex;

CREATE TABLE IF NOT EXISTS usuarios (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    username   VARCHAR(50)  NOT NULL UNIQUE,
    email      VARCHAR(100) NOT NULL UNIQUE,
    password   VARCHAR(255) NOT NULL,
    rol        ENUM('admin','user') NOT NULL DEFAULT 'user',
    avatar     VARCHAR(255) DEFAULT NULL,
    activo     TINYINT(1)   NOT NULL DEFAULT 1,
    created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_login DATETIME     DEFAULT NULL
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS animes (
    id          INT AUTO_INCREMENT PRIMARY KEY,
    nombre      VARCHAR(200) NOT NULL,
    descripcion TEXT         DEFAULT NULL,
    anio        YEAR         NOT NULL,
    episodios   INT          NOT NULL DEFAULT 1,
    estado      ENUM('En emisión','Finalizado','Próximamente') NOT NULL DEFAULT 'En emisión',
    rating      DECIMAL(3,1) NOT NULL DEFAULT 0.0,
    es_nuevo    TINYINT(1)   NOT NULL DEFAULT 1,
    cover_path  VARCHAR(255) DEFAULT NULL,
    created_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS generos (
    id     INT AUTO_INCREMENT PRIMARY KEY,
    nombre VARCHAR(80) NOT NULL UNIQUE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS anime_generos (
    anime_id  INT NOT NULL,
    genero_id INT NOT NULL,
    PRIMARY KEY (anime_id, genero_id),
    FOREIGN KEY (anime_id)  REFERENCES animes(id)  ON DELETE CASCADE,
    FOREIGN KEY (genero_id) REFERENCES generos(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- ▶ episodio agregado para saber a qué capítulo pertenece el video
CREATE TABLE IF NOT EXISTS anime_videos (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    anime_id   INT NOT NULL,
    episodio   INT NOT NULL DEFAULT 1,
    idioma     ENUM('esp_lat','jpn_esp','eng_esp') NOT NULL,
    video_path VARCHAR(255) NOT NULL,
    UNIQUE KEY uq_anime_ep_idioma (anime_id, episodio, idioma),
    FOREIGN KEY (anime_id) REFERENCES animes(id) ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS favoritos (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    anime_id   INT NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_fav (usuario_id, anime_id),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (anime_id)   REFERENCES animes(id)   ON DELETE CASCADE
) ENGINE=InnoDB;

CREATE TABLE IF NOT EXISTS historial_visto (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    usuario_id INT NOT NULL,
    anime_id   INT NOT NULL,
    episodio   INT NOT NULL DEFAULT 1,
    progreso   INT NOT NULL DEFAULT 0,
    idioma     ENUM('esp_lat','jpn_esp','eng_esp') DEFAULT 'esp_lat',
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY uq_historial (usuario_id, anime_id),
    FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
    FOREIGN KEY (anime_id)   REFERENCES animes(id)   ON DELETE CASCADE
) ENGINE=InnoDB;

-- Usuarios por defecto (hashes bcrypt verificados)
-- admin  → admin123
-- usuario → user123
INSERT INTO usuarios (username, email, password, rol) VALUES
('admin',   'admin@animex.com',   '$2y$10$qW7mjkZoOn.T/VnsAHKFsuyWu5dg0FE60LfWvwTgHf0kTAEPXx/Ii', 'admin'),
('usuario', 'usuario@animex.com', '$2y$10$n/XpmUlFRdlDIwZdEFc4p.OLk4In5UFWPgVZOS8f0q5X8w9irZiVi', 'user');

-- Géneros base
INSERT IGNORE INTO generos (nombre) VALUES
('Acción'),('Aventura'),('Comedia'),('Drama'),('Fantasía'),
('Horror'),('Misterio'),('Romance'),('Ciencia Ficción'),
('Sobrenatural'),('Slice of Life'),('Deportes'),('Psicológico'),('Mecha');

-- Animes de ejemplo
INSERT IGNORE INTO animes (id, nombre, descripcion, anio, episodios, estado, rating, es_nuevo) VALUES
(1,'Demon Slayer: Kimetsu no Yaiba','Tanjiro Kamado inicia un viaje para vengar a su familia masacrada por demonios y encontrar una cura para su hermana.',2019,44,'Finalizado',9.4,0),
(2,'Attack on Titan','La humanidad vive encerrada en ciudades rodeadas de enormes muros para protegerse de los titanes.',2013,87,'Finalizado',9.0,0),
(3,'Jujutsu Kaisen','Yuji Itadori ingesta el dedo de Sukuna, un poderoso espectro maldito, uniéndose a los hechiceros.',2020,47,'En emisión',8.6,1),
(4,'My Hero Academia','En un mundo donde casi todos tienen superpoderes, Izuku Midoriya nace sin ninguno pero sueña con ser héroe.',2016,138,'En emisión',8.4,0),
(5,'One Piece','Monkey D. Luffy se embarca en un viaje para convertirse en el Rey de los Piratas.',1999,1100,'En emisión',9.1,0),
(6,'Chainsaw Man','Denji funde su cuerpo con su mascota demoniaca y se convierte en el hombre motosierra.',2022,12,'Finalizado',8.5,1);

INSERT IGNORE INTO anime_generos (anime_id, genero_id) VALUES
(1,1),(1,2),(1,5),(2,1),(2,3),(2,4),(3,1),(3,6),(3,10),
(4,1),(4,2),(4,3),(5,2),(5,3),(5,5),(6,1),(6,6),(6,10);
