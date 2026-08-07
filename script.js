// SELECCIÓN DE ELEMENTOS DEL DOM
const game = document.querySelector(".game");
const scoreElement = document.querySelector(".score");
const highScoreElement = document.querySelector(".high-score");

// EFECTOS DE SONIDO
const eatSound = new Audio("assets/sounds/eat.mp3");
const deathSound = new Audio("assets/sounds/death.mp3");

// VARIABLES GENERALES
let gameOver = false;
let foodX, foodY;
let snakeX = 8,
  snakeY = 8;
let snakeBody = [];
let velocityX = 0,
  velocityY = 0;
let setIntervalId;
let score = 0;
let canChangeDirection = true;

// Obtiene el récord guardado en el almacenamiento local o inicia en 0
let highScore = localStorage.getItem("high-score") || 0;
highScoreElement.innerHTML = `High Score: ${highScore}`;

// FUNCIONES PRINCIPALES

// Generación aleatoria de la manzana
const changeFoodPosition = () => {
  let validPosition = false;

  while (!validPosition) {
    // Se le asigna una posición aleatoria entre 1 y 16
    foodX = Math.floor(Math.random() * 16) + 1;
    foodY = Math.floor(Math.random() * 16) + 1;

    validPosition = true;

    // Evita que aparezca sobre la cabeza
    if (snakeX === foodX && snakeY === foodY) {
      validPosition = false;
      continue;
    }

    // Evita que aparezca sobre el cuerpo
    for (let i = 0; i < snakeBody.length; i++) {
      if (snakeBody[i][0] === foodX && snakeBody[i][1] === foodY) {
        validPosition = false;
        break;
      }
    }
  }
};

// Al perder, se detiene el juego y muestra en pantalla los resultados finales
const handleGameOver = () => {
  clearInterval(setIntervalId);
  deathSound.play();

  document.querySelector(".game-over").classList.remove("hidden");

  document.getElementById("final-score").innerHTML = `
    <p>Puntaje: ${score}</p>
    <p>Récord: ${highScore}</p>
`;
};

// Control de cambios de dirección (evitando que gire en 180°)
const changeDirection = (e) => {
  if (!canChangeDirection) return;

  if (e.key === "ArrowUp" && velocityY != 1) {
    velocityX = 0;
    velocityY = -1;
    canChangeDirection = false;
  } else if (e.key === "ArrowDown" && velocityY != -1) {
    velocityX = 0;
    velocityY = 1;
    canChangeDirection = false;
  } else if (e.key === "ArrowLeft" && velocityX != 1) {
    velocityX = -1;
    velocityY = 0;
    canChangeDirection = false;
  } else if (e.key === "ArrowRight" && velocityX != -1) {
    velocityX = 1;
    velocityY = 0;
    canChangeDirection = false;
  }
};

// Función principal de ejecución del juego
const initGame = () => {
  if (gameOver) return handleGameOver();

  // Genera la manzana en la posición actual
  let htmlMarkup = `<div class="food" style="grid-area: ${foodY} / ${foodX}"></div>`;

  // Comprobamos si la serpiente comió la manzana
  if (snakeX === foodX && snakeY === foodY) {
    eatSound.currentTime = 0;
    eatSound.play();

    changeFoodPosition();
    snakeBody.push([foodX, foodY]); // Aumentamos tamaño del cuerpo
    score++;

    // Actualizamos el récord si se supera
    highScore = score >= highScore ? score : highScore;
    localStorage.setItem("high-score", highScore);

    scoreElement.innerHTML = `Score: ${score}`;
    highScoreElement.innerHTML = `High Score: ${highScore}`;
  }

  // Desplaza el cuerpo de la serpiente hacia la posición anterior
  for (let i = snakeBody.length - 1; i > 0; i--) {
    snakeBody[i] = snakeBody[i - 1];
  }

  // El primer elemento del cuerpo toma la posición anterior de la cabeza
  snakeBody[0] = [snakeX, snakeY];

  // Actualiza la posición de la cabeza según la dirección actual
  snakeX += velocityX;
  snakeY += velocityY;

  // Si choca contra los bordes del tablero, game over
  if (snakeX <= 0 || snakeX > 16 || snakeY <= 0 || snakeY > 16) {
    gameOver = true;
  }

  // Generamos la serpiente y verificamos las colisiones consigo misma
  for (let i = 0; i < snakeBody.length; i++) {
    htmlMarkup += `<div class="snake" style="grid-area: ${snakeBody[i][1]} / ${snakeBody[i][0]}"></div>`;

    // Si la cabeza choca con cualquier parte de su cuerpo
    if (
      i !== 0 &&
      snakeBody[0][1] === snakeBody[i][1] &&
      snakeBody[0][0] === snakeBody[i][0]
    ) {
      gameOver = true;
    }
  }

  // Renderiza los elementos en el contenedor del juego
  game.innerHTML = htmlMarkup;
  canChangeDirection = true; // Habilita nuevamente el cambio de dirección para el próximo tick
};

// INICIALIZACIÓN DE EVENTOS Y BUCLE
setIntervalId = setInterval(initGame, 125); // Velocidad de la serpiente
changeFoodPosition();
document.addEventListener("keydown", changeDirection);
