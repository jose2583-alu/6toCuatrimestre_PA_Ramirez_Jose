<?php
$numbers = array(5, 3, 8, 1, 4);
function buscarMenor($arreglo) {
   if (count($arreglo) === 1){
    return $arreglo[0]; //caso base
   }
   $resto = array_slice($arreglo, 1);
   $menorDelResto = buscarMenor($resto);//llamada recursiva
   return min($arreglo[0], $menorDelResto);
}
echo "El numero menor es: " . buscarMenor($numbers);
?>