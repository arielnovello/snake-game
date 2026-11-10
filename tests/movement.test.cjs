const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
function setup(saved = {}, blocked = false) {
  const storage = new Map(Object.entries(saved));
  const elements = new Map();
  const context2d = new Proxy({}, { get: (target, key) => target[key] || (() => {}), set: (target, key, value) => (target[key] = value, true) });
  const element = key => {
    if (!elements.has(key)) elements.set(key, { textContent: '', innerHTML: '', style: {}, clientWidth: 480, clientHeight: 480, classList: { add() {}, remove() {}, toggle() {} }, children: [], value: '', append(...nodes) { this.children.push(...nodes); }, replaceChildren(...nodes) { this.children = nodes; }, setAttribute() {}, addEventListener() {}, focus() {}, getContext: () => context2d });
    return elements.get(key);
  };
  const context = vm.createContext({ document: { querySelector: element, createElement: name => element(Symbol(name)), addEventListener() {} }, window: { devicePixelRatio: 1, addEventListener() {} }, localStorage: { getItem: key => storage.get(key) ?? null, setItem(key, value) { if (blocked) throw Error('Sin almacenamiento'); storage.set(key, String(value)); }, removeItem: key => storage.delete(key) }, Audio: class { play() { return Promise.resolve(); } }, ResizeObserver: class { observe() {} }, requestAnimationFrame() {} });
  vm.runInContext(fs.readFileSync('script.js', 'utf8'), context);
  // Las escenas de movimiento usan un punto de partida fijo; resetGame se prueba aparte.
  vm.runInContext('continueLevel(); awaitingDirection = false; snakeBody = [[8,8]]; previousBody = [[8,8]];', context);
  return code => vm.runInContext(code, context);
}
test('interpola el movimiento en lugar de saltar una casilla', () => {
  const run = setup();
  run('fruitsOnBoard = []; queueDirection([1,0]);');
  assert.equal(run('getRenderPath(0)[0][0]'), 7.5);
  assert.equal(run('getRenderPath(.5)[0][0]'), 8);
  assert.equal(run('getRenderPath(1)[0][0]'), 8.5);
});
test('respeta las esquinas del recorrido al doblar', () => {
  const run = setup();
  run('started = true; snakeBody = [[9,7],[9,8],[8,8]]; previousBody = [[9,8],[8,8],[7,8]];');
  assert.equal(run('JSON.stringify(getRenderPath(.5))'), '[[8.5,7],[8.5,7.5],[7.5,7.5],[7,7.5]]');
});
test('encola dos giros rápidos sin permitir invertir la dirección', () => {
  const run = setup();
  run('fruitsOnBoard = []; queueDirection([1,0]); queueDirection([-1,0]);');
  assert.equal(run('turnQueue.length'), 0);
  run('queueDirection([0,-1]); queueDirection([-1,0]); advance();');
  assert.equal(run('JSON.stringify(snakeBody[0])'), '[9,7]');
  run('advance()');
  assert.equal(run('JSON.stringify(snakeBody[0])'), '[8,7]');
});
test('resuelve la comida al llegar, permite preparar el siguiente giro y crece', () => {
  const run = setup();
  run('fruitsOnBoard = [{x:9,y:8,isCorrect:true}]; queueDirection([1,0]); queueDirection([0,-1]);');
  assert.equal(run('score'), 0);
  assert.equal(run('turnQueue.length'), 1);
  run('resolveArrival()');
  assert.equal(run('score'), 1);
  assert.equal(run('snakeBody.length'), 2);
});
test('la victoria final no intenta acceder a un sexto bioma', () => {
  const run = setup();
  run('currentLevel = 4; score = totalObjectivePoints - 1; currentBiomeProgress = requiredProgress - 1; fruitsOnBoard = [{x:9,y:8,isCorrect:true}]; queueDirection([1,0]); resolveArrival();');
  assert.equal(run('finished && score === totalObjectivePoints && currentLevel === 4'), true);
});
test('una fruta incorrecta termina la partida al llegar a su casilla', () => {
  const run = setup();
  run('fruitsOnBoard = [{x:9,y:8,isCorrect:false}]; queueDirection([1,0]);');
  assert.equal(run('finished'), false);
  run('resolveArrival()');
  assert.equal(run('finished && score === 0'), true);
});
test('permite ocupar la cola que se mueve, pero detecta el resto del cuerpo', () => {
  const run = setup();
  run('snakeBody = [[8,8],[9,8],[9,9],[8,9]]; fruitsOnBoard = []; queueDirection([0,1]);');
  assert.equal(run('finished'), false);
  const collision = setup();
  collision('snakeBody = [[8,8],[9,8],[9,9],[8,9]]; queueDirection([1,0]);');
  assert.equal(collision('finished'), true);
});
test('pausar congela el progreso y volver no acumula el tiempo de pausa', () => {
  const run = setup();
  run('fruitsOnBoard = []; queueDirection([1,0]); frame(0); frame(50); togglePause(); frame(5000);');
  assert.equal(run('accumulator'), 50);
  run('togglePause(); frame(10000);');
  assert.equal(run('accumulator'), 50);
});
test('el movimiento depende del tiempo y no de la frecuencia de la pantalla', () => {
  const runAt = times => {
    const run = setup();
    run('fruitsOnBoard = []; queueDirection([1,0]);');
    for (const time of times) run(`frame(${time})`);
    return run('snakeBody[0][0] + accumulator / stepDuration');
  };
  const sixty = Array.from({length: 19}, (_, i) => i * 300 / 18);
  const fast = Array.from({length: 44}, (_, i) => i * 300 / 43);
  assert.ok(Math.abs(runAt(sixty) - runAt(fast)) < 1e-8);
});
test('reiniciar limpia la animación, la cola y el puntaje', () => {
  const run = setup();
  run('queueDirection([1,0]); score = 8; togglePause(); resetGame();');
  assert.equal(run('score === 0 && !started && !paused && !finished && turnQueue.length === 0 && accumulator === 0'), true);
  assert.equal(run('JSON.stringify(snakeBody)'), '[[6,6]]');
});
test('las frutas no se superponen y siempre hay opciones correctas', () => {
  const run = setup();
  for (let biome = 0; biome < 5; biome++) {
    run(`currentLevel = ${biome}; startLevel();`);
    for (let i = 0; i < 50; i++) {
      run('generateFruits()');
      assert.equal(run('new Set(fruitsOnBoard.map(f => `${f.x},${f.y}`)).size'), 5);
      assert.equal(run('fruitsOnBoard.filter(f => f.isCorrect).length === minimumCorrect()'), true);
      assert.equal(run('fruitsOnBoard.some(f => snakeBody.some(([x,y]) => x === f.x && y === f.y))'), false);
    }
  }
});

test('al comer se conserva la ubicación y el número de las otras bolitas', () => {
  const run = setup();
  run('fruitsOnBoard = [{x:9,y:8,value:2,isCorrect:true}, {x:3,y:3,value:7,isCorrect:false}]; queueDirection([1,0]); resolveArrival();');
  assert.equal(run('JSON.stringify(fruitsOnBoard)'), '[{"x":3,"y":3,"value":7,"isCorrect":false}]');
  assert.equal(run('refillAt'), 650);
});
test('la reposición espera y la bolita nueva no se puede comer mientras se forma', () => {
  const run = setup();
  run('fruitsOnBoard = [{x:9,y:8,value:2,isCorrect:true}]; queueDirection([1,0]); resolveArrival(); gameTime = 649; updateFruits();');
  assert.equal(run('fruitsOnBoard.length'), 0);
  run('gameTime = 650; updateFruits();');
  assert.equal(run('fruitsOnBoard.length'), 1);
  assert.equal(run('isFruitReady(fruitsOnBoard[0])'), false);
  run('gameTime = 1200; updateFruits();');
  assert.equal(run('isFruitReady(fruitsOnBoard[0])'), true);
});
test('las nuevas bolitas guardan distancia de la cabeza, el cuerpo y entre sí', () => {
  const run = setup();
  for (let i = 0; i < 200; i++) {
    run('generateFruits();');
    assert.equal(run('fruitsOnBoard.every(f => distance([f.x,f.y], snakeBody[0]) >= 5)'), true);
    assert.equal(run('fruitsOnBoard.every((f,i) => fruitsOnBoard.slice(i+1).every(other => distance([f.x,f.y],[other.x,other.y]) >= 3))'), true);
  }
});
test('una bolita en formación no causa una muerte o un acierto inesperado', () => {
  const run = setup();
  run('fruitsOnBoard = [{x:9,y:8,value:1,isCorrect:false,bornAt:0,readyAt:550}]; queueDirection([1,0]); resolveArrival();');
  assert.equal(run('!finished && score === 0 && pendingFinish === null'), true);
});
test('si la viborita ocupa una aparición, su activación se posterga', () => {
  const run = setup();
  run('fruitsOnBoard = [{x:8,y:8,value:1,isCorrect:false,bornAt:0,readyAt:550}]; gameTime = 550; updateFruits();');
  assert.equal(run('isFruitReady(fruitsOnBoard[0])'), false);
  run('snakeBody = [[2,2]]; gameTime = 700; updateFruits();');
  assert.equal(run('isFruitReady(fruitsOnBoard[0])'), true);
});
test('al cambiar de bioma se da tiempo para leer sin avanzar la cabeza', () => {
  const run = setup();
  run('score = requiredProgress - 1; currentBiomeProgress = requiredProgress - 1; fruitsOnBoard = [{x:9,y:8,value:2,isCorrect:true}]; queueDirection([1,0]); resolveArrival();');
  assert.equal(run('currentLevel'), 1);
  assert.equal(run('waitingForLevel'), true);
  run('frame(0); frame(100); frame(200);');
  assert.equal(run('JSON.stringify(snakeBody[0])'), '[9,8]');
});
test('pausar también congela la aparición de comida y la pausa entre biomas', () => {
  const run = setup();
  run('queueDirection([1,0]); togglePause(); frame(0); frame(100);');
  assert.equal(run('gameTime'), 0);
});

test('la única velocidad es 206.25 ms en todos los biomas y no acelera por aciertos', () => {
  const run = setup();
  assert.equal(run('stepDuration'), 206.25);
  for (let biome = 0; biome < 5; biome++) {
    run('currentLevel = ' + biome + '; startLevel(); currentBiomeProgress = 4;');
    assert.equal(run('stepDuration'), 206.25);
  }
  run('resetGame();');
  assert.equal(run('stepDuration'), 206.25);
});
test('todos los biomas ofrecen tres opciones correctas entre cinco', () => {
  const run = setup();
  for (let biome = 0; biome < 5; biome++) {
    run('currentLevel = ' + biome + '; startLevel();');
    assert.equal(run('fruitsOnBoard.filter(f => f.isCorrect).length'), 3);
    assert.equal(run('fruitsOnBoard.length'), 5);
  }
});

test('los ejemplos del objetivo cumplen la regla de cada bioma', () => {
  const run = setup();
  for (let biome = 0; biome < 5; biome++) {
    run('currentLevel = ' + biome + '; startLevel();');
    assert.equal(run('getChallenge().examples.every(checkIsCorrect)'), true);
    assert.equal(run('getChallenge().title.length > 0 && getChallenge().explanation.length > 0'), true);
  }
});
test('el siguiente bioma espera confirmación, aunque pase mucho tiempo', () => {
  const run = setup();
  run('score = requiredProgress - 1; currentBiomeProgress = requiredProgress - 1; fruitsOnBoard = [{x:9,y:8,value:2,isCorrect:true}]; queueDirection([1,0]); resolveArrival(); frame(0);');
  for (let time = 100; time <= 5000; time += 100) run('frame(' + time + ');');
  assert.equal(run('waitingForLevel'), true);
  assert.equal(run('JSON.stringify(snakeBody[0])'), '[9,8]');
  run('continueLevel(); frame(5100); frame(5200);');
  assert.equal(run('waitingForLevel'), false);
  assert.equal(run('JSON.stringify(snakeBody[0])'), '[9,8]');
  assert.equal(run('awaitingDirection'), true);
  run('queueDirection([0,-1]);');
  assert.equal(run('JSON.stringify(snakeBody[0])'), '[9,7]');
});
test('el error de un número explica por qué no cumple el objetivo', () => {
  const run = setup();
  run('currentChallengeParam = 3; fruitsOnBoard = [{x:9,y:8,value:7,isCorrect:false}]; queueDirection([1,0]); resolveArrival();');
  assert.match(run('document.querySelector("#final-score").innerHTML'), /7 no es múltiplo de 3/);
});
test('una partida completa atraviesa los cinco objetivos y termina en victoria', () => {
  const run = setup();
  for (let point = 0; point < 50; point++) {
    run('direction = snakeBody[0][1] % 2 === 0 ? (snakeBody[0][0] < boardSize ? [1,0] : [0,1]) : (snakeBody[0][0] > 1 ? [-1,0] : [0,1]); fruitsOnBoard = [{x:snakeBody[0][0]+direction[0], y:snakeBody[0][1]+direction[1], value:getChallenge().examples[0], isCorrect:true}]; started = true; advance(); resolveArrival();');
    assert.equal(run('score'), point + 1);
    if (point < 49) {
      assert.equal(run('finished'), false);
      if (run('waitingForLevel')) run('continueLevel(); needsAdvance = false; awaitingDirection = false;');
    }
  }
  assert.equal(run('finished && currentLevel === 4 && score === 50'), true);
});

test('las flechas durante el cambio de bioma no cierran el objetivo ni guardan giros', () => {
  const run = setup();
  run('score = requiredProgress - 1; currentBiomeProgress = requiredProgress - 1; fruitsOnBoard = [{x:9,y:8,value:2,isCorrect:true}]; queueDirection([1,0]); resolveArrival();');
  for (const direction of ['[1,0]','[0,-1]','[-1,0]','[0,1]']) run('queueDirection(' + direction + ');');
  assert.equal(run('waitingForLevel'), true);
  assert.equal(run('turnQueue.length'), 0);
  assert.equal(run('JSON.stringify(snakeBody[0])'), '[9,8]');
  run('continueLevel();');
  assert.equal(run('waitingForLevel'), false);
});
test('la grilla es compacta y las frutas nuevas no aparecen al otro extremo', () => {
  const run = setup();
  assert.equal(run('boardSize'), 12);
  for (let i=0; i<100; i++) {
    run('generateFruits();');
    assert.equal(run('fruitsOnBoard.every(f => f.x <= boardSize && f.y <= boardSize && distance([f.x,f.y],snakeBody[0]) <= 10)'), true);
  }
});
test('los últimos objetivos son impares, mayores que un número y menores que seis', () => {
  const run = setup();
  run('currentLevel = 2;');
  assert.equal(run('checkIsCorrect(7) && !checkIsCorrect(8)'), true);
  run('currentLevel = 3; currentChallengeParam = 6;');
  assert.equal(run('checkIsCorrect(7) && !checkIsCorrect(6) && !checkIsCorrect(5)'), true);
  run('currentLevel = 4;');
  assert.equal(run('checkIsCorrect(1) && checkIsCorrect(5) && !checkIsCorrect(6)'), true);
});
test('confirmar cerca del borde no mueve hasta elegir una dirección segura', () => {
  const run = setup();
  run('snakeBody = [[12,8],[11,8]]; previousBody = snakeBody.map(s => [...s]); direction = [1,0]; started = true; waitingForLevel = true; continueLevel(); frame(0); frame(100); frame(200);');
  assert.equal(run('finished'), false);
  assert.equal(run('JSON.stringify(snakeBody[0])'), '[12,8]');
  run('queueDirection([0,-1]);');
  assert.equal(run('awaitingDirection'), false);
  assert.equal(run('JSON.stringify(snakeBody[0])'), '[12,7]');
});

function win(run, time = 123450) {
  run('currentLevel = 4; currentBiomeProgress = requiredProgress; score = totalObjectivePoints; activeTime = ' + time + '; finishGame(true);');
}
test('cada bioma dura diez aciertos y la partida completa suma cincuenta', () => {
  const run = setup();
  assert.equal(run('requiredProgress'), 10);
  assert.equal(run('totalObjectivePoints'), 50);
  run('currentBiomeProgress = 4; score = 4; fruitsOnBoard = [{x:9,y:8,value:2,isCorrect:true}]; queueDirection([1,0]); resolveArrival();');
  assert.equal(run('currentLevel === 0 && currentBiomeProgress === 5 && !waitingForLevel'), true);
});
test('el tiempo de ranking cuenta solo mientras se está jugando', () => {
  const run = setup();
  run('frame(0); frame(100);');
  assert.equal(run('activeTime'), 0);
  run('fruitsOnBoard = []; queueDirection([1,0]); frame(200); frame(300);');
  assert.equal(run('activeTime'), 100);
  run('togglePause(); frame(5000); togglePause(); frame(6000); waitingForLevel = true; frame(6100); waitingForLevel = false; awaitingDirection = true; frame(6200);');
  assert.equal(run('activeTime'), 100);
});
test('un ganador guarda su nombre y tiempo y el ranking persiste al abrir de nuevo', () => {
  const run = setup(); win(run);
  run('playerName.value = "  Ana   Pérez  "; saveWinner();');
  assert.equal(run('readWinners()[0].name'), 'Ana Pérez');
  assert.equal(run('readWinners()[0].timeMs'), 123450);
  const stored = run('localStorage.getItem(rankingKey)');
  const reopened = setup({'viborita-winners-v1': stored});
  assert.equal(reopened('readWinners().length'), 1);
  assert.equal(reopened('readWinners()[0].name'), 'Ana Pérez');
});
test('una derrota no se puede guardar como victoria y un ganador no se duplica', () => {
  const loser = setup(); loser('finishGame(false); playerName.value = "Ana"; saveWinner();');
  assert.equal(loser('readWinners().length'), 0);
  const run = setup(); win(run);
  run('playerName.value = "Ana"; saveWinner(); saveWinner();');
  assert.equal(run('readWinners().length'), 1);
});
test('el ranking ordena los diez mejores y mantiene el orden de llegada en empates', () => {
  const rows = Array.from({length:12}, (_,i) => ({id:'seed-'+i,name:'Jugador '+i,timeMs:12000-i*100,at:i,points:50}));
  rows.push({id:'tie', name:'Empate',timeMs:10900,at:99,points:50});
  const run = setup({'viborita-winners-v1':JSON.stringify(rows)});
  assert.equal(run('readWinners().length'),10);
  assert.equal(run('readWinners()[0].name'),'Jugador 11');
  assert.equal(run('readWinners()[1].name'),'Empate');
});
test('datos dañados o registros inválidos no rompen el ranking', () => {
  assert.equal(setup({'viborita-winners-v1':'{roto'})('readWinners().length'),0);
  assert.equal(setup({'viborita-winners-v1':JSON.stringify([null,{name:'X',timeMs:-1}, {id:'x',name:'X',timeMs:1,at:1,points:25}])})('readWinners().length'),0);
});
test('si el navegador bloquea el guardado, se informa y permite reintentar', () => {
  const run = setup({}, true); win(run);
  run('playerName.value = "Ana"; saveWinner();');
  assert.equal(run('canSaveWin'),true);
  assert.match(run('rankingStatus.textContent'),/No se pudo guardar/);
});
test('los nombres se muestran como texto y los nombres vacíos no se guardan', () => {
  const run = setup(); win(run);
  run('playerName.value = "   "; saveWinner();');
  assert.equal(run('readWinners().length'),0);
  run('playerName.value = "<b>Ana</b>"; saveWinner();');
  assert.equal(run('document.querySelector("#ranking-body").children[0].children[1].textContent'),'<b>Ana</b>');
});

 test('al iniciar y reiniciar muestra el primer objetivo y espera confirmación', () => {
  const run = setup();
  run('resetGame(); queueDirection([1,0]); frame(0); frame(100);');
  assert.equal(run('waitingForLevel && !started && score === 0 && activeTime === 0'), true);
  assert.equal(run('JSON.stringify(snakeBody[0])'), '[6,6]');
  run('continueLevel(); frame(200); frame(300);');
  assert.equal(run('awaitingDirection && !started'), true);
  run('queueDirection([1,0]);');
  assert.equal(run('started && !waitingForLevel && !awaitingDirection'), true);
});

test('la renovación conserva los objetivos y aparece lejos con aviso previo', () => {
  const run = setup();
  run('gameTime = 2000; fruitsOnBoard.forEach(f => { f.readyAt = 0; }); globalThis.targets = fruitsOnBoard.filter(f => f.isCorrect); globalThis.oldWrong = fruitsOnBoard.filter(f => !f.isCorrect); globalThis.refreshed = refreshDistractor();');
  assert.equal(run('refreshed'), true);
  assert.equal(run('targets.every(f => fruitsOnBoard.includes(f))'), true);
  assert.equal(run('fruitsOnBoard.filter(f => !targets.includes(f) && !oldWrong.includes(f)).length'), 1);
  assert.equal(run('fruitsOnBoard.length === 5 && fruitsOnBoard.filter(f => f.isCorrect).length === 3'), true);
  assert.equal(run('fruitsOnBoard.filter(f => !targets.includes(f) && !oldWrong.includes(f)).every(f => !isFruitReady(f) && distance([f.x,f.y],snakeBody[0]) >= 5)'), true);
});
test('la renovación automática espera mientras se lee o se pausa', () => {
  const run = setup();
  run('gameTime = 10000; nextFruitRefresh = 0; waitingForLevel = true; globalThis.before = fruitsOnBoard.slice(); updateFruits();');
  assert.equal(run('before.every(f => fruitsOnBoard.includes(f))'), true);
  run('waitingForLevel = false; started = true; paused = true; updateFruits();');
  assert.equal(run('before.every(f => fruitsOnBoard.includes(f))'), true);
  run('paused = false; updateFruits();');
  assert.equal(run('nextFruitRefresh === gameTime + fruitRefreshInterval'), true);
});
