<?php
$numbers = array(1, 2, 3, 4, 5, 2, 1, 3, 1);
$objetivo = 1;
function contarOcurrencias($arreglo, $objetivo)
{
   if (count($arreglo) === 0){
    return 0; //caso base
   }
   $resto = array_slice($arreglo, 1);
   if ($arreglo[0] == $objetivo){
    return 1 + contarOcurrencias($resto, $objetivo);
   } else {
    return contarOcurrencias($resto, $objetivo);//llamada recursiva
   }
}
echo "el numero: " . $objetivo  . " se repite: " . contarOcurrencias($numbers, $objetivo). " veces.";
?>