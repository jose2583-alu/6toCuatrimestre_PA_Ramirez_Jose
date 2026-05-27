<?php
function repetirTexto($cadena, $veces) {
    if ($veces <= 0) {
        return ""; // Caso base
    }
    return $cadena . repetirTexto($cadena, $veces - 1); // Llamada recursiva
}
echo repetirTexto("Hola ", 3);
?>