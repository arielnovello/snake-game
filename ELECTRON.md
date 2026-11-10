# Electron

El portable de Windows se genera en `dist/Viborita-Matematica-1.7.0-Windows.exe`.

## Desarrollo y compilación

```sh
npm ci
npm start
npm test
npm run test:electron
npm run dist
```

`npm run dev` también abre el juego. `npm run package` genera una copia desempaquetada en `dist/win-unpacked/`, que puede borrarse cuando ya no se necesita.

`scripts/build.cjs` ejecuta electron-builder con compresión intermedia. El portable no tiene firma digital. Los archivos del juego y sus recursos se incluyen en `resources/app.asar`.

## Partida

Grilla de 12 × 12, 206,25 ms por casilla, diez aciertos en cada uno de los cinco biomas. La lógica usa casillas y la animación interpola el recorrido con requestAnimationFrame. El tablero conserva cinco frutas; las apariciones quedan entre cinco y diez casillas de la cabeza, separadas del cuerpo y de otras frutas.

Las frutas nuevas esperan 650 ms para reponerse y se forman durante 550 ms antes de poder comerse. Si la viborita ocupa la zona, se posterga su activación.

Entre biomas se confirma con Enter o el botón Seguir. Las flechas y la repetición de Enter no cierran esa lectura. Al confirmar se espera una dirección antes de mover nuevamente.

El logo original está en `assets/images/logo-escuela.jpg` y se integra visualmente al panel mediante CSS.

## Ranking

LocalStorage guarda los diez mejores ganadores en la clave `viborita-winners-v1`. Cada entrada tiene identificador, nombre, tiempo en milisegundos, fecha de registro y puntos. Solo se admiten victorias de cincuenta puntos. Se ordenan por tiempo ascendente y, si empatan, por fecha de registro.

El reloj cuenta el tiempo real durante el movimiento. No cuenta la espera inicial, las pausas, la lectura de biomas, la espera de una dirección ni la escritura del nombre. El formulario solo aparece al ganar y cada partida se puede guardar una sola vez.

Los nombres se muestran con textContent. Los registros inválidos se ignoran y un bloqueo de almacenamiento se informa sin interrumpir el juego ni indicar un guardado falso.

El ranking del navegador y el de Electron son independientes. También dependen del perfil y del origen desde el que se abra el juego. Borrar los datos del navegador elimina el ranking. No hay servidor ni clasificación compartida.

## Verificación

Las pruebas de lógica cubren la partida completa, las transiciones, la comida, los tiempos, el ranking, registros dañados y almacenamiento bloqueado. Las pruebas de Electron comprueban controles, objetivos, imagen de la escuela, ventana mínima y persistencia tras recargar. Las capturas `preview-*.png` no se incluyen en Git ni en el ejecutable.
