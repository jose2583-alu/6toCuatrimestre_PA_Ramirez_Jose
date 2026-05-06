<?php
require_once 'conexion.php';

?>
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="style.css">
    <title>TO DO List</title>
</head>
<body>
    <h1>lista de pendientes</h1>
    <div class="contenedor">
        <div class="contador">
            <p>Pendientes: <span id="contadorDeTareas">0</span></p>
        </div>
        <div class="filter-buttons">
            <button class="filter-btn active" data-filter="all">Todas</button>
            <button class="filter-btn" data-filter="pending">Pendientes</button>
            <button class="filter-btn" data-filter="completed">Completadas</button>
        </div>

        <form id="todoForm" class="input-group">
            <input type="text" id="inputTodo" placeholder="¿Qué hay que hacer hoy?" required autocomplete="off">
            <button type="submit" class="add-btn">+</button>
        </form>

        <ul id="todoList"></ul>
    </div>
    <script src="script.js"></script>
</body>
</html>
