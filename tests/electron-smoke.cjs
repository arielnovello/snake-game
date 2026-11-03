const { app, BrowserWindow } = require('electron');
const fs = require('node:fs/promises');
const path = require('node:path');
app.whenReady().then(async () => {
  const win = new BrowserWindow({ show: false, width: 1040, height: 960, webPreferences: { offscreen: true, backgroundThrottling: false, contextIsolation: true, sandbox: true } });
  const errors = [];
  win.webContents.on('console-message', event => { if (event.level === 'error') errors.push(event.message); });
  const evaluate = source => win.webContents.executeJavaScript(source);
  const capture = async name => {
    await new Promise(resolve => setTimeout(resolve, 250));
    await fs.writeFile(path.join(__dirname, '..', name), (await win.webContents.capturePage()).toPNG());
  };
  try {
    await win.loadFile(path.join(__dirname, '..', 'index.html'));
    const motion = await evaluate(`(async () => {
      fruitsOnBoard = []; refillAt = Infinity;
      document.dispatchEvent(new KeyboardEvent('keydown', {key:'ArrowRight'}));
      const positions = [];
      for (let i = 0; i < 8; i++) {
        await new Promise(requestAnimationFrame);
        positions.push(getRenderPath(accumulator / stepDuration)[0][0]);
      }
      const smooth = new Set(positions.map(x => x.toFixed(3))).size > 3;
      const fractional = positions.some(x => Math.abs((x - .5) - Math.round(x - .5)) > .01);
      finishGame(false, 'Prueba'); document.querySelector('#restart').click();
      return {smooth, fractional, restarted: !finished && !started && score === 0 && modal.classList.contains('hidden')};
    })()`);
    if (!motion.smooth || !motion.fractional || !motion.restarted) throw Error(JSON.stringify(motion));
    const food = await evaluate(`(() => {
      resetGame(); snakeBody = [[8,8]]; previousBody = [[8,8]]; gameTime = 2000;
      fruitsOnBoard = [{x:9,y:8,value:2,isCorrect:true}, {x:3,y:3,value:7,isCorrect:false}, {x:12,y:3,value:4,isCorrect:true}, {x:3,y:12,value:11,isCorrect:false}, {x:12,y:12,value:6,isCorrect:true}];
      const survivors = fruitsOnBoard.slice(1);
      queueDirection([1,0]); resolveArrival(); paused = true;
      const persistent = survivors.every(f => fruitsOnBoard.includes(f)) && fruitsOnBoard.length === 4;
      gameTime = refillAt - 1; updateFruits();
      const delayed = fruitsOnBoard.length === 4;
      gameTime++; updateFruits();
      const added = fruitsOnBoard.find(f => !survivors.includes(f));
      const forming = !!added && !isFruitReady(added) && distance([added.x,added.y], snakeBody[0]) >= 5;
      const before = muted; document.querySelector('#sound').click();
      const soundWorks = muted !== before; document.querySelector('#sound').click();
      resetGame();
      return {persistent, delayed, forming, soundWorks};
    })()`);
    if (Object.values(food).some(value => !value)) throw Error(JSON.stringify(food));
    const objectiveCheck = await evaluate(`(() => {
      resetGame(); currentChallengeParam = 3; updateObjective();
      const clear = document.querySelector('#objective-title').textContent === 'Múltiplos de 3' && document.querySelector('.objective-examples').textContent.includes('3, 6, 9, 12');
      const stablePace = stepDuration === 165 && !document.querySelector("#pace");
      const logo = document.querySelector(".school-signature img");
      const schoolBrand = logo.complete && logo.naturalWidth > 0 && document.querySelector(".school-signature strong").textContent === "TSDS";
      started = true; currentLevel = 1; startLevel(); waitingForLevel = true; needsAdvance = true; continueButton.classList.remove('hidden');
      for (const key of ['ArrowUp','ArrowRight','w','d']) document.dispatchEvent(new KeyboardEvent('keydown',{key}));
      document.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter', repeat:true}));
      const guarded = waitingForLevel && turnQueue.length === 0;
      document.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter'}));
      const confirmedByEnter = !waitingForLevel;
      waitingForLevel = true;
      document.querySelector('#continue').click();
      const continued = !waitingForLevel;
      resetGame();
      return { clear, stablePace, continued, schoolBrand, guarded, confirmedByEnter };
    })()`);
    if (Object.values(objectiveCheck).some(value => !value)) throw Error(JSON.stringify(objectiveCheck));
    const layout = await evaluate(`({fits: document.body.scrollHeight <= innerHeight + 1, width: canvas.clientWidth, height: canvas.clientHeight})`);
    if (!layout.fits || layout.width < 650 || Math.abs(layout.width - layout.height) > 1) throw Error(JSON.stringify(layout));
    await evaluate(`gameTime = 2000; finished = true; started = true; direction = [1,0]; snakeBody = [[11,7],[10,7],[9,7],[8,7],[8,8],[8,9],[7,9]]; previousBody = [[10,7],[9,7],[8,7],[8,8],[8,9],[7,9],[6,9]]; fruitsOnBoard = [{x:3,y:3,value:3,isCorrect:false,bornAt:0,readyAt:0}, {x:12,y:3,value:4,isCorrect:true,bornAt:0,readyAt:0}, {x:4,y:12,value:6,isCorrect:true,bornAt:0,readyAt:0}, {x:12,y:12,value:11,isCorrect:false,bornAt:gameTime-200,readyAt:gameTime+350}, {x:12,y:7,value:8,isCorrect:true,bornAt:0,readyAt:0}]; currentChallengeParam = 2; score = 3; highScore = Math.max(highScore, score); currentBiomeProgress = 3; statusElement.textContent = 'Flechas / WASD · Espacio para pausar'; updateScore(); updateObjective();`);
    await capture('preview-current.png');
    await evaluate(`currentLevel = 1; startLevel(); waitingForLevel = true; continueButton.classList.remove('hidden');`);
    await capture('preview-biome.png');
    win.setSize(840, 640);
    await new Promise(resolve => setTimeout(resolve, 200));
    const biomeLayouts = [];
    for (let biome = 0; biome < 5; biome++) {
      const result = await evaluate(`currentLevel = ${biome}; startLevel(); waitingForLevel = true; continueButton.classList.remove('hidden'); ({biome:levels[currentLevel].biomeLabel, fits:document.body.scrollHeight <= innerHeight + 1})`);
      biomeLayouts.push(result);
      if (!result.fits) throw Error('Objetivo recortado en ventana mínima: ' + JSON.stringify(result));
    }
    win.setSize(380, 520);
    await new Promise(resolve => setTimeout(resolve, 300));
    const small = await evaluate(`({fits: document.body.scrollHeight <= innerHeight + 1, width: innerWidth, height: innerHeight})`);
    if (await evaluate('document.body.scrollWidth > innerWidth + 1')) throw Error('Desborde horizontal en ventana pequeña');
    await capture('preview-small.png');
    win.setSize(1040, 960);
    const rankingBackup = await evaluate('localStorage.getItem(rankingKey)');
    let rankingCheck;
    try {
      const saved = await evaluate(`(() => {
        const seeded = Array.from({length:10}, (_,i) => ({id:'test-'+i,name:'Jugador '+(i+1),timeMs:125000+i*1000,at:i,points:totalObjectivePoints}));
        localStorage.setItem(rankingKey,JSON.stringify(seeded));
        currentLevel=4; currentBiomeProgress=requiredProgress; score=totalObjectivePoints; activeTime=112340; finishGame(true);
        const beforeMute = muted;
        playerName.value='Prueba local';
        const key = new KeyboardEvent('keydown',{key:'m',bubbles:true,cancelable:true});
        playerName.dispatchEvent(key);
        const typingSafe = !key.defaultPrevented && muted === beforeMute;
        winnerForm.requestSubmit();
        const stored = readWinners();
        const nameIsText = document.querySelector('#ranking-body tr td:nth-child(2)').textContent === 'Prueba local';
        return {typingSafe, saved:stored.length===10 && stored[0].name==='Prueba local' && stored[0].timeMs===112340, nameIsText};
      })()`);
      if (Object.values(saved).some(value=>!value)) throw Error(JSON.stringify(saved));
      await new Promise(resolve => { win.webContents.once('did-finish-load',resolve); win.webContents.reload(); });
      const persisted = await evaluate(`readWinners()[0]?.name === 'Prueba local' && readWinners()[0]?.timeMs === 112340`);
      if (!persisted) throw Error('El ranking no persistió al recargar');
      await evaluate('currentLevel=4; currentBiomeProgress=requiredProgress; score=totalObjectivePoints; activeTime=124560; finishGame(true);');
      await capture('preview-ranking.png');
      const dialogFits = await evaluate('modal.getBoundingClientRect().top >= 0 && modal.getBoundingClientRect().bottom <= innerHeight + 1');
      if (!dialogFits) throw Error('El ranking no cabe en la ventana');
      rankingCheck = {...saved,persisted,dialogFits};
    } finally {
      await evaluate(rankingBackup === null ? 'localStorage.removeItem(rankingKey)' : 'localStorage.setItem(rankingKey,' + JSON.stringify(rankingBackup) + ')');
    }
    if (errors.length) throw Error(errors.join('\n'));
    console.log('Electron:', { motion, food, objectiveCheck, layout, biomeLayouts, small, rankingCheck });
    app.exit(0);
  } catch (error) { console.error(error); app.exit(1); }
});
setTimeout(() => { console.error('Tiempo de prueba agotado'); app.exit(1); }, 120000);
