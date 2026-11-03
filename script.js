const game = document.querySelector('.game');
const scoreElement = document.querySelector('.score');
const highScoreElement = document.querySelector('.high-score');
const biomeName = document.querySelector('.biome-name');
const statusElement = document.querySelector('.status');
const pauseButton = document.querySelector('#pause');
const soundButton = document.querySelector('#sound');
const modal = document.querySelector('.game-over');
const continueButton = document.querySelector('#continue');
const canvas = document.createElement('canvas');
canvas.setAttribute('aria-label', 'Tablero de la viborita de 12 por 12');
game.append(canvas);
const ctx = canvas.getContext('2d');
const eatSound = new Audio('assets/sounds/eat.mp3');
const deathSound = new Audio('assets/sounds/death.mp3');
const boardSize = 12;
const stepDuration = 165;
const minimumCorrect = () => currentLevel < 2 ? 2 : 1;
const requiredProgress = 8;
const fruitCount = 5;
const spawnDuration = 550;
const refillDelay = 650;
const levels = [
  { biomeClass: '', biomeLabel: 'Pradera', color: '#e7471d' },
  { biomeClass: 'desierto', biomeLabel: 'Desierto', color: '#f49b25' },
  { biomeClass: 'nieve', biomeLabel: 'Nieve', color: '#3978db' },
  { biomeClass: 'espacio', biomeLabel: 'Espacio', color: '#b56cff' },
  { biomeClass: 'volcan', biomeLabel: 'Volcán', color: '#ff602d' },
];
const totalObjectivePoints = levels.length * requiredProgress;
let snakeBody, previousBody, direction, turnQueue, fruitsOnBoard;
let score, currentLevel, currentBiomeProgress, currentChallengeParam;
let started, paused, finished, pendingFinish, accumulator = 0, lastTime = null;
let boardWidth = 0, boardHeight = 0;
let gameTime = 0, refillAt = 0, needsAdvance = false;
let waitingForLevel = false;
let awaitingDirection = false;
let effects = [];
let activeTime = 0;
let canSaveWin = false;
let completedTime = 0;
const rankingKey = 'viborita-winners-v1';
const rankingLimit = 10;
const winnerForm = document.querySelector('#winner-form');
const playerName = document.querySelector('#player-name');
const rankingStatus = document.querySelector('#ranking-status');
const formatTime = (ms, precise = true) => {
  const seconds = Math.floor(ms / 1000);
  const main = Math.floor(seconds / 60) + ':' + String(seconds % 60).padStart(2, '0');
  return precise ? main + '.' + String(Math.floor(ms % 1000 / 10)).padStart(2, '0') : main;
};
const updateTimer = () => {
  const value = 'Tiempo: ' + formatTime(activeTime, false);
  const timer = document.querySelector('.run-time');
  if (timer.textContent !== value) timer.textContent = value;
};
const readWinners = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(rankingKey) || '[]');
    if (!Array.isArray(saved)) return [];
    return saved.filter(entry => entry && typeof entry.id === 'string' && typeof entry.name === 'string'
      && entry.name.trim().length > 0 && entry.name.length <= 24
      && Number.isSafeInteger(entry.timeMs) && entry.timeMs > 0
      && Number.isFinite(entry.at) && entry.at >= 0 && entry.points === totalObjectivePoints)
      .sort((a, b) => a.timeMs - b.timeMs || a.at - b.at).slice(0, rankingLimit);
  } catch { return []; }
};
const renderRanking = (highlight = '') => {
  const rows = readWinners();
  const body = document.querySelector('#ranking-body');
  body.replaceChildren();
  document.querySelector('#ranking-empty').classList.toggle('hidden', rows.length > 0);
  document.querySelector('.ranking-table-wrap').classList.toggle('hidden', rows.length === 0);
  rows.forEach((entry, index) => {
    const row = document.createElement('tr');
    if (entry.id === highlight) row.classList.add('your-result');
    for (const value of [String(index + 1), entry.name, formatTime(entry.timeMs)]) {
      const cell = document.createElement('td');
      cell.textContent = value;
      row.append(cell);
    }
    body.append(row);
  });
};
const saveWinner = () => {
  if (!canSaveWin || !finished || score !== totalObjectivePoints) return;
  const name = playerName.value.trim().replace(/\s+/g, ' ').slice(0, 24);
  if (!name) { rankingStatus.textContent = 'Escribí tu nombre.'; playerName.focus(); return; }
  const entry = { id: Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 9), name, timeMs: completedTime, at: Date.now(), points: totalObjectivePoints };
  const rows = [...readWinners(), entry].sort((a, b) => a.timeMs - b.timeMs || a.at - b.at).slice(0, rankingLimit);
  try { localStorage.setItem(rankingKey, JSON.stringify(rows)); }
  catch { rankingStatus.textContent = 'No se pudo guardar en este navegador. Podés volver a intentar.'; return; }
  canSaveWin = false;
  winnerForm.classList.add('hidden');
  rankingStatus.textContent = rows.some(row => row.id === entry.id) ? 'Tiempo guardado.' : 'Tu tiempo quedó fuera de los diez mejores.';
  renderRanking(entry.id);
};
let muted = false;
try { muted = localStorage.getItem('muted') === 'true'; } catch {}
const updateSound = () => {
  soundButton.textContent = muted ? 'Sin sonido' : 'Sonido';
  soundButton.setAttribute('aria-pressed', String(muted));
};
const toggleSound = () => {
  muted = !muted;
  if (muted) { eatSound.pause(); deathSound.pause(); }
  try { localStorage.setItem('muted', String(muted)); } catch {}
  updateSound();
};
let highScore = 0;
try {
  const saved = Number(localStorage.getItem('high-score'));
  if (Number.isFinite(saved) && saved >= 0) highScore = Math.floor(saved);
} catch {}
const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
const playSound = (sound) => {
  if (muted) return;
  sound.currentTime = 0;
  sound.play().catch(() => {});
};
const checkIsCorrect = (value) => {
  if (currentLevel === 0) return value > 0 && value % currentChallengeParam === 0;
  if (currentLevel === 1) return value > 0 && value % 2 === 0;
  if (currentLevel === 2) return value > 0 && value % 2 !== 0;
  if (currentLevel === 3) return value > currentChallengeParam;
  return value > 0 && value < 6;
};
const getChallenge = () => {
  if (currentLevel === 0) return {
    title: 'Múltiplos de ' + currentChallengeParam,
    explanation: 'Números de la tabla del ' + currentChallengeParam + '.',
    examples: Array.from({length: Math.floor(12 / currentChallengeParam)}, (_, i) => (i + 1) * currentChallengeParam),
    reject: value => value + ' no es múltiplo de ' + currentChallengeParam + '.',
  };
  if (currentLevel === 1) return {
    title: 'Números pares', explanation: 'Terminan en 0, 2, 4, 6 u 8.', examples: [2, 4, 6, 8],
    reject: value => value + ' es impar. En este bioma tenés que comer números pares.',
  };
  if (currentLevel === 2) return {
    title: 'Números impares', explanation: 'Terminan en 1, 3, 5, 7 o 9.', examples: [1, 3, 5, 7],
    reject: value => value + ' es par. En este bioma tenés que comer números impares.',
  };
  if (currentLevel === 3) return {
    title: 'Mayores que ' + currentChallengeParam,
    explanation: 'El ' + currentChallengeParam + ' no cuenta: tiene que ser más grande.',
    examples: [currentChallengeParam + 1, currentChallengeParam + 2, currentChallengeParam + 3],
    reject: value => value + ' no es mayor que ' + currentChallengeParam + '.',
  };
  return {
    title: 'Menores que 6', explanation: 'Del 1 al 5. El 6 no cuenta.', examples: [1, 2, 3, 4, 5],
    reject: value => value + ' no es menor que 6.',
  };
};
const updateObjective = () => {
  const challenge = getChallenge();
  document.querySelector('#objective-title').textContent = challenge.title;
  document.querySelector('.objective-explanation').textContent = challenge.explanation;
  document.querySelector('.objective-examples').textContent = 'Por ejemplo: ' + challenge.examples.join(', ') + '.';
  document.querySelector('.objective-progress').textContent = currentBiomeProgress + ' de ' + requiredProgress;
  document.querySelector('.progress-fill').style.width = (score / totalObjectivePoints * 100) + '%';
};
const continueLevel = () => {
  if (!waitingForLevel || finished) return;
  waitingForLevel = false;
  awaitingDirection = true;
  needsAdvance = false;
  accumulator = 0;
  lastTime = null;
  continueButton.classList.add('hidden');
  pauseButton.disabled = true;
  statusElement.textContent = 'Flechas / WASD';
};
const updateScore = () => {
  scoreElement.textContent = `Puntaje: ${score} / ${totalObjectivePoints}`;
  highScoreElement.textContent = `Récord: ${highScore}`;
};
const distance = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]);
const isFruitReady = fruit => gameTime >= (fruit.readyAt ?? 0);
const createFruit = (delay = 0) => {
  const head = snakeBody[0];
  const free = [];
  for (let y = 1; y <= boardSize; y++) {
    for (let x = 1; x <= boardSize; x++) {
      const cell = [x, y];
      if (distance(cell, head) < 5 || distance(cell, head) > boardSize - 2) continue;
      if (snakeBody.some(segment => distance(cell, segment) < 2)) continue;
      if (fruitsOnBoard.some(fruit => distance(cell, [fruit.x, fruit.y]) < 3)) continue;
      free.push(cell);
    }
  }
  // Si no hay un lugar seguro, esperamos; nunca la ponemos encima del jugador.
  if (!free.length) return false;
  const [x, y] = free[randInt(0, free.length - 1)];
  const correctCount = fruitsOnBoard.filter(fruit => fruit.isCorrect).length;
  const needsCorrect = correctCount < minimumCorrect();
  const values = Array.from({ length: 12 }, (_, i) => i + 1).filter(value =>
    checkIsCorrect(value) === needsCorrect);
  const value = values[randInt(0, values.length - 1)];
  fruitsOnBoard.push({ x, y, value, isCorrect: checkIsCorrect(value), bornAt: gameTime + delay, readyAt: gameTime + delay + spawnDuration });
  return true;
};
const generateFruits = () => {
  fruitsOnBoard = [];
  for (let i = 0; i < fruitCount; i++) if (!createFruit(i * 65)) break;
  refillAt = gameTime + refillDelay;
};
const updateFruits = () => {
  for (const fruit of fruitsOnBoard) {
    // Una bolita que se está formando no se activa debajo de la viborita.
    if (fruit.readyAt !== undefined && !fruit.active && gameTime >= fruit.readyAt) {
      const position = [fruit.x, fruit.y];
      if (snakeBody.some(segment => distance(segment, position) < 2)) fruit.readyAt = gameTime + 150;
      else fruit.active = true;
    }
  }
  if (gameTime >= refillAt && fruitsOnBoard.length < fruitCount) {
    createFruit();
    refillAt = gameTime + refillDelay;
  }
  effects = effects.filter(effect => gameTime - effect.bornAt < 600);
};
const startLevel = () => {
  const level = levels[currentLevel];
  game.className = `game ${level.biomeClass}`;
  document.querySelector('.wrapper').className = `wrapper ${level.biomeClass}`;
  biomeName.textContent = level.biomeLabel;
  document.querySelector('.biome-step').textContent = `${currentLevel + 1} / ${levels.length}`;
  currentBiomeProgress = 0;
  currentChallengeParam = currentLevel === 0 ? randInt(2, 4) : currentLevel === 3 ? randInt(4, 7) : 0;
  generateFruits();
  updateObjective();
};
const finishGame = (won, reason = '') => {
  finished = true;
  pendingFinish = null;
  if (!won) playSound(deathSound);
  modal.classList.remove('hidden');
  modal.classList.toggle('victory-mode', won);
  document.querySelector('#game-over-title').textContent = won ? '¡Ganaste!' : '¡Perdiste!';
  document.querySelector('#final-score').innerHTML = won
    ? `<p>Completaste los cinco biomas: ${totalObjectivePoints} puntos.</p><p>Tu tiempo: <strong>${formatTime(activeTime)}</strong></p>`
    : `<p>${reason}</p><p>Bioma: <strong>${levels[currentLevel].biomeLabel}</strong></p><p>Puntaje: <strong>${score} / ${totalObjectivePoints}</strong></p><p>Tiempo jugado: <strong>${formatTime(activeTime)}</strong></p>`;
  completedTime = Math.max(1, Math.round(activeTime));
  canSaveWin = won && score === totalObjectivePoints && currentLevel === levels.length - 1 && currentBiomeProgress === requiredProgress;
  winnerForm.classList.toggle('hidden', !canSaveWin);
  playerName.value = '';
  rankingStatus.textContent = '';
  renderRanking();
  pauseButton.disabled = true;
  statusElement.textContent = won ? 'Partida completada' : '';
  if (canSaveWin) playerName.focus();
  else document.querySelector('#restart').focus();
};
const resetGame = () => {
  const center = Math.ceil(boardSize / 2);
  snakeBody = [[center, center]];
  previousBody = [[center, center]];
  direction = [0, 0];
  turnQueue = [];
  score = 0;
  currentLevel = 0;
  started = paused = finished = false;
  pendingFinish = null;
  accumulator = 0;
  lastTime = null;
  gameTime = refillAt = 0;
  waitingForLevel = false;
  awaitingDirection = false;
  continueButton.classList.add('hidden');
  needsAdvance = false;
  effects = [];
  activeTime = completedTime = 0;
  canSaveWin = false;
  winnerForm.classList.add('hidden');
  rankingStatus.textContent = '';
  updateTimer();
  modal.classList.add('hidden');
  pauseButton.disabled = false;
  pauseButton.textContent = 'Pausar';
  pauseButton.setAttribute('aria-pressed', 'false');
  statusElement.textContent = 'Flechas / WASD';
  updateScore();
  updateSound();
  startLevel();
  render(1);
};
const togglePause = () => {
  if (finished || !started || waitingForLevel || awaitingDirection) return;
  paused = !paused;
  lastTime = null;
  pauseButton.textContent = paused ? 'Seguir' : 'Pausar';
  pauseButton.setAttribute('aria-pressed', String(paused));
  statusElement.textContent = paused ? 'En pausa · Espacio para seguir' : 'Flechas / WASD · Espacio: pausa';
};
const queueDirection = (next) => {
  if (paused || finished || pendingFinish?.type === 'lose') return;
  if (waitingForLevel) return;
  const last = turnQueue.at(-1) || direction;
  if ((!awaitingDirection && next[0] === last[0] && next[1] === last[1]) || (next[0] === -last[0] && next[1] === -last[1])) return;
  if (turnQueue.length >= 2) return;
  turnQueue.push(next);
  if (!started || awaitingDirection) {
    started = true;
    awaitingDirection = false;
    needsAdvance = false;
    pauseButton.disabled = false;
    statusElement.textContent = 'Flechas / WASD · Espacio: pausa';
    advance();
    accumulator = 0;
    lastTime = null;
  }
};
const advance = () => {
  if (turnQueue.length) direction = turnQueue.shift();
  const [x, y] = snakeBody[0];
  const nx = x + direction[0], ny = y + direction[1];
  if (nx < 1 || nx > boardSize || ny < 1 || ny > boardSize) return finishGame(false, 'Te chocaste con el borde');
  const eaten = fruitsOnBoard.find(f => f.x === nx && f.y === ny && isFruitReady(f));
  const body = eaten?.isCorrect ? snakeBody : snakeBody.slice(0, -1);
  if (body.some(([bx, by]) => bx === nx && by === ny)) return finishGame(false, 'Te chocaste con tu cuerpo');
  previousBody = snakeBody.map(segment => [...segment]);
  snakeBody.unshift([nx, ny]);
  if (!eaten?.isCorrect) snakeBody.pop();
  // La comida y el resultado se resuelven cuando la animación llega a la casilla.
  if (eaten) pendingFinish = eaten.isCorrect ? { type: 'eat', fruit: eaten } : { type: 'lose', fruit: eaten };
};
const resolveArrival = () => {
  if (!pendingFinish) return;
  const arrival = pendingFinish;
  pendingFinish = null;
  if (arrival.type === 'lose') return finishGame(false, getChallenge().reject(arrival.fruit.value));
  fruitsOnBoard = fruitsOnBoard.filter(fruit => fruit !== arrival.fruit);
  refillAt = gameTime + refillDelay;
  effects.push({ x: arrival.fruit.x, y: arrival.fruit.y, bornAt: gameTime, color: levels[currentLevel].color });
  playSound(eatSound);
  score++;
  currentBiomeProgress++;
  highScore = Math.max(highScore, score);
  try { localStorage.setItem('high-score', String(highScore)); } catch {}
  updateScore();
  if (currentBiomeProgress === requiredProgress) {
    if (currentLevel === levels.length - 1) {
      fruitsOnBoard = [];
      updateObjective();
      return finishGame(true);
    }
    currentLevel++;
    startLevel();
    previousBody = snakeBody.map(segment => [...segment]);
    turnQueue = [];
    waitingForLevel = true;
    continueButton.classList.remove('hidden');
    pauseButton.disabled = true;
    needsAdvance = true;
    statusElement.textContent = 'Flechas / WASD · Espacio: pausa';
  } else {
    updateObjective();
  }
};
// Interpolamos sobre el recorrido real, incluyendo sus esquinas.
const getRenderPath = (alpha) => {
  if (!started || waitingForLevel || awaitingDirection) return snakeBody.map(([x, y]) => [x - .5, y - .5]);
  const route = [snakeBody[0], ...previousBody];
  const sample = (distance) => {
    const index = Math.floor(distance);
    const a = route[Math.min(index, route.length - 1)];
    const b = route[Math.min(index + 1, route.length - 1)];
    const fraction = distance - index;
    return [a[0] + (b[0] - a[0]) * fraction - .5, a[1] + (b[1] - a[1]) * fraction - .5];
  };
  const from = 1 - alpha;
  const to = Math.min(from + snakeBody.length - 1, route.length - 1);
  const points = [sample(from)];
  for (let i = Math.floor(from) + 1; i < to; i++) points.push(sample(i));
  if (to > from) points.push(sample(to));
  return points;
};
const render = (alpha) => {
  if (!boardWidth || !boardHeight) return;
  const cw = boardWidth / boardSize, ch = boardHeight / boardSize;
  const cell = Math.min(cw, ch);
  ctx.clearRect(0, 0, boardWidth, boardHeight);
  for (const fruit of fruitsOnBoard) {
    const age = gameTime - (fruit.bornAt ?? -spawnDuration);
    if (age < 0) continue;
    const progress = Math.min(1, age / spawnDuration);
    const ready = isFruitReady(fruit);
    ctx.save();
    ctx.globalAlpha = ready ? 1 : .25 + progress * .4;
    const x = (fruit.x - .5) * cw, y = (fruit.y - .5) * ch;
    ctx.beginPath();
    ctx.arc(x, y, cell * (.22 + .16 * progress), 0, Math.PI * 2);
    ctx.fillStyle = levels[currentLevel].color;
    ctx.shadowColor = 'rgba(0,0,0,.25)';
    ctx.shadowBlur = 5;
    ctx.shadowOffsetY = 2;
    ctx.fill();
    ctx.shadowBlur = ctx.shadowOffsetY = 0;
    ctx.fillStyle = '#fff';
    ctx.font = `700 ${Math.max(10, cell * .48)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(fruit.value), x, y + .5);
    if (!ready) {
      ctx.setLineDash([cell * .1, cell * .1]);
      ctx.lineWidth = 1.5;
      ctx.strokeStyle = levels[currentLevel].color;
      ctx.beginPath(); ctx.arc(x, y, cell * .46, 0, Math.PI * 2); ctx.stroke();
    }
    ctx.restore();
  }
  const points = getRenderPath(alpha);
  ctx.beginPath();
  points.forEach(([x, y], i) => i ? ctx.lineTo(x * cw, y * ch) : ctx.moveTo(x * cw, y * ch));
  ctx.lineWidth = cell * .76;
  ctx.lineCap = ctx.lineJoin = 'round';
  ctx.strokeStyle = '#3883d6';
  ctx.stroke();
  const [hx, hy] = points[0];
  ctx.beginPath();
  ctx.arc(hx * cw, hy * ch, cell * .42, 0, Math.PI * 2);
  ctx.fillStyle = '#2264b4';
  ctx.fill();
  const [dx, dy] = direction[0] || direction[1] ? direction : [1, 0];
  for (const side of [-1, 1]) {
    const ex = hx * cw + (dx * .16 - dy * .19 * side) * cell;
    const ey = hy * ch + (dy * .16 + dx * .19 * side) * cell;
    ctx.beginPath(); ctx.arc(ex, ey, cell * .105, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.fill();
    ctx.beginPath(); ctx.arc(ex + dx * cell * .035, ey + dy * cell * .035, cell * .05, 0, Math.PI * 2); ctx.fillStyle = '#132b45'; ctx.fill();
  }
  for (const effect of effects) {
    const age = (gameTime - effect.bornAt) / 600;
    if (age < 0 || age >= 1) continue;
    ctx.save();
    ctx.globalAlpha = 1 - age;
    ctx.strokeStyle = effect.color;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc((effect.x - .5) * cw, (effect.y - .5) * ch, cell * (.25 + age * .6), 0, Math.PI * 2); ctx.stroke();
    ctx.font = `700 ${cell * .48}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.fillStyle = currentLevel === 3 || currentLevel === 4 ? '#fff5d9' : '#243d27';
    ctx.fillText('+1', (effect.x - .5) * cw, (effect.y - 1 - age) * ch);
    ctx.restore();
  }
  if (waitingForLevel && !paused) {
    ctx.fillStyle = 'rgba(10,20,15,.78)';
    ctx.fillRect(0, boardHeight * .34, boardWidth, boardHeight * .32);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#fff6df';
    ctx.font = `700 ${cell * 1.05}px sans-serif`;
    ctx.fillText(levels[currentLevel].biomeLabel, boardWidth / 2, boardHeight * .46);
    ctx.font = `${Math.max(10, cell * .47)}px sans-serif`;
    ctx.fillText(getChallenge().title, boardWidth / 2, boardHeight * .54);
    ctx.fillStyle = '#fff6df';
    ctx.font = `${Math.max(10, cell * .4)}px sans-serif`;
    ctx.fillText('Enter para seguir', boardWidth / 2, boardHeight * .61);
  }
  if (paused) {
    ctx.fillStyle = 'rgba(8,24,18,.35)';
    ctx.fillRect(0, 0, boardWidth, boardHeight);
    ctx.fillStyle = '#fff'; ctx.font = `700 ${cell}px sans-serif`;
    ctx.fillText('En pausa', boardWidth / 2, boardHeight / 2);
  }
};
const frame = (time) => {
  if (lastTime === null) lastTime = time;
  const realElapsed = Math.max(0, time - lastTime);
  const elapsed = Math.min(realElapsed, 100);
  lastTime = time;
  if (!paused && !finished) {
    gameTime += elapsed;
    updateFruits();
  }
  if (started && !paused && !finished && !waitingForLevel && !awaitingDirection) {
    activeTime += realElapsed;
    updateTimer();
    if (needsAdvance) {
      needsAdvance = false;
      accumulator = 0;
      statusElement.textContent = 'Flechas / WASD · Espacio: pausa';
      advance();
    }
    accumulator += elapsed;
    while (accumulator >= stepDuration && !finished) {
      accumulator -= stepDuration;
      resolveArrival();
      if (waitingForLevel) { accumulator = 0; break; }
      if (!finished) advance();
    }
  }
  render(finished || waitingForLevel || awaitingDirection ? 1 : started ? accumulator / stepDuration : 1);
  requestAnimationFrame(frame);
};
const resize = () => {
  boardWidth = game.clientWidth;
  boardHeight = game.clientHeight;
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.round(boardWidth * ratio);
  canvas.height = Math.round(boardHeight * ratio);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  render(started ? accumulator / stepDuration : 1);
};
document.addEventListener('keydown', event => {
  if (['INPUT', 'TEXTAREA', 'SELECT'].includes(event.target.tagName) || event.target.isContentEditable) return;
  if (event.key === 'Enter' && waitingForLevel) { event.preventDefault(); if (!event.repeat) continueLevel(); return; }
  if (event.key.toLowerCase() === 'm' && !event.repeat) { toggleSound(); return; }
  if (event.key === ' ' && event.target.tagName !== 'BUTTON') {
    event.preventDefault();
    if (!event.repeat) togglePause();
    return;
  }
  const keys = { arrowup: [0,-1], w: [0,-1], arrowdown: [0,1], s: [0,1], arrowleft: [-1,0], a: [-1,0], arrowright: [1,0], d: [1,0] };
  const next = keys[event.key.toLowerCase()];
  if (next) { event.preventDefault(); if (!event.repeat) queueDirection(next); }
});
winnerForm.addEventListener('submit', event => { event.preventDefault(); saveWinner(); });
continueButton.addEventListener('click', continueLevel);
pauseButton.addEventListener('click', togglePause);
soundButton.addEventListener('click', toggleSound);
document.querySelector('#restart').addEventListener('click', resetGame);
window.addEventListener('blur', () => { if (started && !paused && !finished && !waitingForLevel) togglePause(); });
document.addEventListener('visibilitychange', () => { if (document.hidden && started && !paused && !finished) togglePause(); });
new ResizeObserver(resize).observe(game);
resetGame();
resize();
requestAnimationFrame(frame);
