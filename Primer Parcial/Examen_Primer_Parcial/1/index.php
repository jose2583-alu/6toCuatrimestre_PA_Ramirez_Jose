<?php
function contarDigitos($numero){
    $numero = abs($numero);

    if( $numero < 10){
    return 1;
    }
    return 1 + contarDigitos(intdiv ($numero, 10));
}
if ($_SERVER["REQUEST_METHOD"] == "POST") {
    
    if (isset($_POST['numero_input'])) {
        
    try {
        $numero_ingresado = intval($_POST['numero_input']);
        
        if (!is_numeric($numero_ingresado)) {
                throw new Exception("ingresa un número válido.");
            }

            $numero_ingresado = intval($numero_ingresado);

        $totalDigitos = contarDigitos($numero_ingresado);
        
        echo "El número tiene: " . $totalDigitos . " dígitos.";
   } 
        catch (Exception $e) {
            $mensaje_resultado = "Error: " . $e->getMessage();
        } 
        catch (Error $err) {
            $mensaje_resultado = "Ocurrió un error en el sistema: " . $err->getMessage();
        }
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link rel="stylesheet" href="style.css">
    <title>contador de digitos</title>
</head>
<body>
    <h1>contador de digitos</h1>
    <form id="formulario" method="POST" action="">
        <label for="numero">Ingresa un número:</label>
        
        <input type="number" id="numero" name="numero_input" required>
        
        <button type="submit">Contar</button>
    </form>
    <div id="resultado">
        <?php 
            if (!empty($mensaje_resultado)) {
                echo $mensaje_resultado; 
            }
        ?>
    </div>
</body>
</html>