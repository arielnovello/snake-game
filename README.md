# Viborita

Juego de la viborita con consignas numéricas, hecho con HTML, CSS y JavaScript para Programación II.

## Cómo se juega

Movete con las flechas o WASD y comé los números que cumplen la consigna del panel. Son ocho aciertos por bioma: cuarenta para ganar.

- Pradera: múltiplos de 2, 3 o 4.
- Desierto: números pares.
- Nieve: números impares.
- Espacio: números mayores que el indicado.
- Volcán: números menores que 6.

El borde, el cuerpo y un número incorrecto terminan la partida. Espacio pausa el juego y M activa o silencia el sonido. Al cambiar de ventana también se pausa.

Para cambiar de bioma hay que pulsar Enter o Seguir. Las flechas no cierran el objetivo. Después de confirmar, elegí una dirección para retomar.

La grilla es de 12 × 12 y la velocidad es fija. Hay cinco frutas visibles; se repone solamente la que comiste. Las nuevas se forman antes de poder comerse y no aparecen pegadas a la viborita.

## Ranking local

Cuando completás los cinco biomas, podés escribir tu nombre y guardar tu tiempo. Se muestran los diez mejores tiempos de ganadores, del menor al mayor. Solo se cuenta el tiempo jugando: quedan fuera las pausas, la lectura entre biomas y la espera antes de empezar.

Se guarda en LocalStorage y sigue disponible al cerrar y volver a abrir. Cada navegador, perfil y aplicación mantiene su propio ranking. No se comparte por Internet y puede perderse si se borran los datos del navegador.

## Abrir en Windows

Descargá `Snake-Game-1.7.0-Windows.exe` de la Release. Es portable y no necesita instalar Node ni Electron.

## Desarrollo

```sh
npm ci
npm run dev
```

También se puede jugar abriendo `index.html` en el navegador.

```sh
npm test
npm run test:electron
npm run dist
```

El ejecutable se genera en `dist/`. Hay más detalles en [ELECTRON.md](ELECTRON.md).

## Créditos

Ariel. Proyecto educativo.

Logo de la escuela e identificación TSDS: Técnico Superior en Desarrollo de Software.

Efectos de sonido de [Pixabay](https://pixabay.com/sound-effects/), bajo su licencia de contenido.
