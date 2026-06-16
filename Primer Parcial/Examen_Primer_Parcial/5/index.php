<?php
function sumaDigitos($n){
    $n = abs ($n);

    if( $numero < 10){
    return $n;
}
return ($n % 10) + sumaDigitos(intdiv ($n, 10));
}
$mensaje_resultado = "";
if($_SERVER["REQUEST_METHOD"]== "POST") {
    if (isset($_POST['numero_ingresado'])) {
        try {
            $numero = intval($_POST['numero_ingresado']);
            $resultadoSuma = sumaDigitos($numero);
            $mensaje_resultado = "La suma de los dígitos es: " . $resultadoSuma;
        } catch (Exception $e) {
            $mensaje_resultado = "Error: " . $e->getMessage();
        }
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>sumador de digitos</title>
</head>
<body>
    <h1>sumador de digitos</h1>
    <form method="POST" action="">
        <label for="numero">ingresa la secuencia de numeros:</label>
        <input type="number" name = numero_ingresado require>
        <button type="submit">sumar</button>
    </form>
    <div>
        <?php
        if (!empty($mensaje_resultado)) {
                echo $mensaje_resultado; 
            }
        ?>
    </div>
</body>
</html>