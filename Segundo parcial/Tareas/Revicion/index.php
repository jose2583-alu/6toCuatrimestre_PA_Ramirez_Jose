<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    exit(0);
}

?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Gestor de Videojuegos</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <h1>Gestor de Videojuegos</h1>
    <form id="formulario">
        <label for="titulo">Título:</label>
        <input type="text" id="titulo" required>
        <label for="descripcion">Descripción:</label>
        <textarea id="descripcion" required></textarea>
        <label for="precio">Precio:</label>
        <input type="number" id="precio" step="0.01" required>
        <label for="lanzamiento">Fecha de Lanzamiento:</label>
        <input type="date" id="lanzamiento" required>
        <label for="calificacion">Calificación:</label>
        <input type="number" id="calificacion" step="0.1" min="0" max="10" required>
        <label for="id_genero">Género:</label>
        <select id="id_genero" required>
            <option value="">-- Selecciona un género --</option>
        </select>
        <label for="id_plataforma">Plataforma:</label>
        <select id="id_plataforma" required>
            <option value="">-- Selecciona una plataforma --</option>
        </select>
        <label for="imagen">Imagen (Opcional):</label>
        <input type="file" id="imagen" accept="image/*">
        <button type="submit" id="btnGuardar">Guardar Videojuego</button>
    </form>
    <hr>
    <h2>Catálogo</h2>
    <div id="filtros">
        <input type="text" id="buscarTitulo" placeholder="Buscar por título...">
        <button id="btnBuscar">Buscar</button>
    </div>
    <div id="loading" style="display: none;">Cargando datos...</div>
    <table border="1" id="tablaVideojuegos">
        <thead>
            <tr>
                <th>Imagen</th>
                <th>Título</th>
                <th>Precio</th>
                <th>Calificación</th>
                <th>Acciones</th>
            </tr>
        </thead>
        <tbody id="listaVideojuegos">
            </tbody>
    </table>
    <script src="script.js"></script>
</body>
</html>