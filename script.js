// SELECCIÓN DE ELEMENTOS DEL DOM
const game = document.querySelector(".game");
const scoreElement = document.querySelector(".score");
const highScoreElement = document.querySelector(".high-score");
const biomeName = document.querySelector(".biome-name");
const objective = document.querySelector(".objective");

// EFECTOS DE SONIDO
const eatSound = new Audio("assets/sounds/eat.mp3");
const deathSound = new Audio("assets/sounds/death.mp3");

// VARIABLES DE VICTORIA/DERROTA
let gameOver = false;
let gameWon = false;

// VARIABLES GENERALES DE LA SERPIENTE Y JUEGO
let snakeX = 8,
  snakeY = 8;
let snakeBody = [[8, 8]];
let velocityX = 0,
  velocityY = 0;
let setIntervalId;
let score = 0;
let canChangeDirection = true;

// SISTEMA DE BIOMAS Y NIVELES (10 objetivos por bioma, total 50)
let currentLevel = 0;
let currentBiomeProgress = 0;
const requiredProgress = 5;
const totalObjectivePoints = 25;

let currentChallengeParam = 0;
let fruitsOnBoard = [];

// Obtiene el récord guardado en el almacenamiento local o inicia en 0
let highScore = localStorage.getItem("high-score") || 0;
highScoreElement.innerHTML = `Récord: ${highScore}`;

// CONFIGURACIÓN DE LOS 5 BIOMAS
const levels = [
  { biomeClass: "", biomeLabel: "Pradera", foodType: "apple" },
  { biomeClass: "desierto", biomeLabel: "Desierto", foodType: "orange" },
  { biomeClass: "nieve", biomeLabel: "Nieve", foodType: "berry" },
  { biomeClass: "espacio", biomeLabel: "Espacio", foodType: "space" },
  { biomeClass: "volcan", biomeLabel: "Volcán", foodType: "lava" },
];

const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

const isPrime = (num) => {
  if (num < 2) return false;
  for (let i = 2; i <= Math.sqrt(num); i++) {
    if (num % i === 0) return false;
  }
  return true;
};

const initBiomeChallenge = () => {
  if (currentLevel === 0) {
    const options = [2, 3, 4];
    currentChallengeParam = options[Math.floor(Math.random() * options.length)];
  } else if (currentLevel === 1) {
    currentChallengeParam = randInt(1, 4);
  } else if (currentLevel === 2) {
    currentChallengeParam = 0;
  } else if (currentLevel === 3) {
    currentChallengeParam = randInt(4, 7);
  } else if (currentLevel === 4) {
    currentChallengeParam = 2;
  }
};

const updateObjective = () => {
  let text = "";

  if (currentLevel === 0) {
    text = `Come números múltiplos de ${currentChallengeParam} (${currentBiomeProgress}/${requiredProgress})`;
  } else if (currentLevel === 1) {
    text = `Come números pares (${currentBiomeProgress}/${requiredProgress})`;
  } else if (currentLevel === 2) {
    text = `Come solo números primos (${currentBiomeProgress}/${requiredProgress})`;
  } else if (currentLevel === 3) {
    text = `Come números mayores a ${currentChallengeParam} (${currentBiomeProgress}/${requiredProgress})`;
  } else if (currentLevel === 4) {
    text = `Come números menores a 6 (${currentBiomeProgress}/${requiredProgress})`;
  }

  objective.textContent = text;
};

const checkIsCorrect = (val) => {
  if (currentLevel === 0) return val !== 0 && val % currentChallengeParam === 0;
  if (currentLevel === 1) return val !== 0 && val % 2 === 0;
  if (currentLevel === 2) return isPrime(val);
  if (currentLevel === 3) return val > currentChallengeParam;
  if (currentLevel === 4) return val > 0 && val < 6;
  return false;
};

const generateFruits = () => {
  fruitsOnBoard = [];
  const fruitCount = 5;
  let correctCreated = 0;

  const occupied = snakeBody.map((seg) => `${seg[0]},${seg[1]}`);
  occupied.push(`${snakeX},${snakeY}`);

  const nextX = snakeX + velocityX;
  const nextY = snakeY + velocityY;
  occupied.push(`${nextX},${nextY}`);
  occupied.push(`${nextX + velocityX},${nextY + velocityY}`);

  for (let i = 0; i < fruitCount; i++) {
    let x, y, value, isCorrect;
    let tries = 0;

    do {
      x = randInt(1, 16);
      y = randInt(1, 16);
      tries++;
    } while (occupied.includes(`${x},${y}`) && tries < 100);

    occupied.push(`${x},${y}`);

    if (correctCreated < 2 && i >= fruitCount - 2) {
      if (currentLevel === 0) value = currentChallengeParam * randInt(1, 3);
      else if (currentLevel === 1) value = randInt(1, 5) * 2;
      else if (currentLevel === 2) {
        const primes = [2, 3, 5, 7, 11, 13];
        value = primes[Math.floor(Math.random() * primes.length)];
      } else if (currentLevel === 3)
        value = currentChallengeParam + randInt(1, 3);
      else if (currentLevel === 4) value = randInt(1, 5);

      isCorrect = true;
      correctCreated++;
    } else {
      value = randInt(1, 12);
      isCorrect = checkIsCorrect(value);
      if (isCorrect) correctCreated++;
    }

    fruitsOnBoard.push({ x, y, value, isCorrect });
  }
};

const startLevel = () => {
  game.className = "game";
  const wrapper = document.querySelector(".wrapper");
  wrapper.className = "wrapper";

  const level = levels[currentLevel];
  if (level.biomeClass) {
    game.classList.add(level.biomeClass);
    wrapper.classList.add(level.biomeClass);
  }
  biomeName.textContent = level.biomeLabel;

  game.classList.add("glow-effect");
  setTimeout(() => game.classList.remove("glow-effect"), 800);

  currentBiomeProgress = 0;
  initBiomeChallenge();
  generateFruits();
  updateObjective();

  let htmlMarkup = fruitsOnBoard
    .map(
      (fruit) =>
        `<div class="food ${levels[currentLevel].foodType}" data-value="${fruit.value}" style="grid-area: ${fruit.y} / ${fruit.x}"></div>`,
    )
    .join("");

  for (let i = 0; i < snakeBody.length; i++) {
    htmlMarkup += `<div class="snake" style="grid-area: ${snakeBody[i][1]} / ${snakeBody[i][0]}"></div>`;
  }
  game.innerHTML = htmlMarkup;
};

const handleGameOver = () => {
  clearInterval(setIntervalId);
  deathSound.play();
  const gameOverModal = document.querySelector(".game-over");
  gameOverModal.classList.remove("hidden");
  gameOverModal.classList.remove("victory-mode");
  document.getElementById("game-over-title").textContent = "¡Perdiste!";
  document.getElementById("final-score").innerHTML = `
    <p>Bioma alcanzado: <span>${levels[currentLevel].biomeLabel}</span></p>
    <p>Puntaje total: <span>${score} / ${totalObjectivePoints}</span></p>
    <p>Récord: <span>${highScore}</span></p>
  `;
};

const handleVictory = () => {
  clearInterval(setIntervalId);
  const gameOverModal = document.querySelector(".game-over");
  gameOverModal.classList.remove("hidden");
  gameOverModal.classList.add("victory-mode");
  document.getElementById("game-over-title").textContent = "¡Felicidades!";
  document.getElementById("final-score").innerHTML = `
    <p>Estado: <span>Completado</span></p>
    <p>Puntaje final: <span>${score} / ${totalObjectivePoints}</span></p>
    <p>Récord: <span>${highScore}</span></p>
  `;
};

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

const initGame = () => {
  if (gameWon) return handleVictory();
  if (gameOver) return handleGameOver();

  if (velocityX === 0 && velocityY === 0) {
    let htmlMarkup = fruitsOnBoard
      .map(
        (fruit) =>
          `<div class="food ${levels[currentLevel].foodType}" data-value="${fruit.value}" style="grid-area: ${fruit.y} / ${fruit.x}"></div>`,
      )
      .join("");

    for (let i = 0; i < snakeBody.length; i++) {
      htmlMarkup += `<div class="snake" style="grid-area: ${snakeBody[i][1]} / ${snakeBody[i][0]}"></div>`;
    }
    game.innerHTML = htmlMarkup;
    return;
  }

  if (snakeX <= 0 || snakeX > 16 || snakeY <= 0 || snakeY > 16) {
    gameOver = true;
    handleGameOver();
    return;
  }

  for (let i = snakeBody.length - 1; i > 0; i--) {
    snakeBody[i] = [...snakeBody[i - 1]];
  }
  snakeBody[0] = [snakeX, snakeY];

  snakeX += velocityX;
  snakeY += velocityY;

  const eatenIndex = fruitsOnBoard.findIndex(
    (fruit) => fruit.x === snakeX && fruit.y === snakeY,
  );

  if (eatenIndex !== -1) {
    const eaten = fruitsOnBoard[eatenIndex];

    if (eaten.isCorrect) {
      eatSound.currentTime = 0;
      eatSound.play();
      score += 1;
      currentBiomeProgress++;

      // ACTUALIZAMOS EL PUNTAJE EN PANTALLA AL INSTANTE
      highScore = score >= highScore ? score : highScore;
      localStorage.setItem("high-score", highScore);
      scoreElement.innerHTML = `Puntaje: ${score} / ${totalObjectivePoints}`;
      highScoreElement.innerHTML = `Récord: ${highScore}`;

      const lastSegment = snakeBody[snakeBody.length - 1];
      snakeBody.push([...lastSegment]);

      if (currentBiomeProgress >= requiredProgress) {
        currentLevel++;
        if (currentLevel >= levels.length) {
          gameWon = true;
        } else {
          startLevel();
          return;
        }
      } else {
        updateObjective();
        generateFruits();
      }
    } else {
      deathSound.play();
      gameOver = true;
      highScore = score >= highScore ? score : highScore;
      localStorage.setItem("high-score", highScore);
    }
  }

  let htmlMarkup = fruitsOnBoard
    .map(
      (fruit) =>
        `<div class="food ${levels[currentLevel].foodType}" data-value="${fruit.value}" style="grid-area: ${fruit.y} / ${fruit.x}"></div>`,
    )
    .join("");

  for (let i = 0; i < snakeBody.length; i++) {
    htmlMarkup += `<div class="snake" style="grid-area: ${snakeBody[i][1]} / ${snakeBody[i][0]}"></div>`;

    if (i !== 0 && snakeX === snakeBody[i][0] && snakeY === snakeBody[i][1]) {
      gameOver = true;
    }
  }

  game.innerHTML = htmlMarkup;
  canChangeDirection = true;
};

// INICIALIZACIÓN
setIntervalId = setInterval(initGame, 200);
startLevel();
document.addEventListener("keydown", changeDirection);
