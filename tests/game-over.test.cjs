const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { once } = require('node:events');
const cwd = process.cwd();
const dir = fs.mkdtempSync(path.join(os.tmpdir(),'mjscore-game-over-'));
process.chdir(dir);
const { createGame, recordHand, advanceAfterHand, rebuildGameFromHands, isGameOver } = require('../dist/services/game-service');
const { validateSavedGame } = require('../dist/services/saved-game-validation');
const { createApp } = require('../dist/web/server');
const { renderGameOverPage } = require('../dist/web/routes/game-over-route');
const p = require('../dist/services/persistence-service');
after(()=>{process.chdir(cwd);fs.rmSync(dir,{recursive:true,force:true});});
function hand(game,winner,score=22){
 return {handNumber:game.handNumber,roundWind:game.roundWind,eastPlayerId:game.players[game.eastPlayerIndex].id,players:game.players.map(p=>({playerId:p.id,handScore:p.id===winner?score:0,mahJongg:p.id===winner}))};
}
function beforeFinal(starting=0){
 let game=createGame(['<Alice>','Bob','Carol','Dan'],starting);
 for(let i=0;i<31;i++)game=recordHand(game,hand(game,game.players[(game.eastPlayerIndex+1)%4].id));
 return game;
}
function complete(starting=0,score=22){
 const game=beforeFinal(starting);
 return recordHand(game,hand(game,game.players[(game.eastPlayerIndex+1)%4].id,score));
}
async function serve(initial,run){
 p.saveGame(initial);
 const server=createApp().listen(0,'127.0.0.1');await once(server,'listening');
 const base=`http://127.0.0.1:${server.address().port}`;
 const get=route=>fetch(base+route,{redirect:'manual'});
 const post=(route,body)=>fetch(base+route,{method:'POST',redirect:'manual',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams(body)});
 const token=async route=>(await(await get(route)).text()).match(/name="gameToken" value="([a-f0-9]+)"/)[1];
 try{await run({get,post,token});}finally{await new Promise(resolve=>server.close(resolve));}
}

test('first North finishes into second East; only fourth East loss in second North ends the game',()=>{
 for(let starting=0;starting<4;starting++){
  let game=createGame(['A','B','C','D'],starting);
  for(let losses=1;losses<=31;losses++){
   game=recordHand(game,hand(game,game.players[(game.eastPlayerIndex+1)%4].id));
   assert.equal(isGameOver(game),false,`starting seat ${starting}, losses ${losses}`);
   if(losses===16){assert.equal(game.roundNumber,5);assert.equal(game.roundWind,'East');}
  }
  assert.equal(game.roundNumber,8);assert.equal(game.roundWind,'North');assert.equal(game.eastAdvancementsThisRound,3);
  const finalEast=game.players[game.eastPlayerIndex].id;
  for(let repeat=0;repeat<3;repeat++){
   game=recordHand(game,hand(game,finalEast));
   assert.equal(isGameOver(game),false);assert.equal(game.roundNumber,8);assert.equal(game.roundWind,'North');assert.equal(game.eastAdvancementsThisRound,3);
  }
  game=recordHand(game,hand(game,game.players[(game.eastPlayerIndex+1)%4].id));
  assert.equal(isGameOver(game),true);assert.equal(game.hands.length,35);assert.equal(game.hands.at(-1).roundWind,'North');
  validateSavedGame(game);
 }
});

test('completed game rejects further recording or progression and survives save/load/rebuild',()=>{
 const game=complete(2,100);const before=structuredClone(game);
 assert.throws(()=>recordHand(game,hand(game,'1')),/game is over/);
 assert.throws(()=>advanceAfterHand(game,'1'),/game is over/);
 assert.deepEqual(game,before);
 assert.deepEqual(rebuildGameFromHands(game,game.hands),game);
 p.saveGame(game);p.saveGameAs(game,'finished');
 assert.deepEqual(p.loadGame(),game);assert.deepEqual(p.loadSavedGame('finished'),game);
 assert.equal(isGameOver(p.loadSavedGame('finished')),true);
});

test('final screen ranks actual totals, escapes winner names and declares joint winners',()=>{
 const single=complete(0,100);assert.deepEqual(single.players.map(p=>p.score),[312,-78,-78,-156]);
 const before=structuredClone(single);
 const html=renderGameOverPage(single);
 assert.match(html,/&lt;Alice&gt; wins!/);assert.ok(!html.includes('<Alice>'));assert.match(html,/\+312 points/);
 assert.match(html,/<td>1<\/td>[\s\S]*?&lt;Alice&gt;[\s\S]*?\+312/);
 assert.ok(html.indexOf('Bob',html.indexOf('<tbody>'))<html.indexOf('Dan',html.indexOf('<tbody>')));
 assert.deepEqual(single,before);
 const tie=complete();assert.deepEqual(tie.players.map(p=>p.score),[0,0,0,0]);
 const tied=renderGameOverPage(tie);assert.match(tied,/Joint winners/);assert.match(tied,/&lt;Alice&gt; &amp; Bob &amp; Carol &amp; Dan/);assert.match(tied,/0 points each/);
 assert.equal((tied.match(/class="winning-row"/g)||[]).length,4);
});

test('final hand offers Game Over, clicking shows results, and further scoring is blocked',async()=>{
 await serve(beforeFinal(),async({get,post,token})=>{
  const before=await get('/game-over');assert.equal(before.status,303);assert.equal(before.headers.get('location'),'/');
  const gameToken=await token('/score-hand');
  const scored=await post('/score-hand',{gameToken,winnerId:'1',score_1:'100',score_2:'0',score_3:'0',score_4:'0'});
  assert.equal(scored.status,302);assert.equal(scored.headers.get('location'),'/hand/32');
  const detail=await(await get('/hand/32')).text();assert.match(detail,/>\s*Game Over\s*</);assert.ok(!detail.includes('Next Hand'));assert.ok(!detail.includes('Score Hand'));
  assert.match(detail,/Edit Last Hand/);
  const home=await(await get('/')).text();assert.match(home,/Game complete/);assert.ok(!home.includes('MAH-JONGG!'));assert.ok(!home.includes('Score Hand'));
  const final=await get('/game-over');assert.equal(final.status,200);assert.equal(final.headers.get('cache-control'),'no-store');
  const html=await final.text();assert.match(html,/&lt;Alice&gt; wins!/);assert.match(html,/Final player scores/);assert.ok(!html.includes('Score Hand'));
  const saved=fs.readFileSync('data/current-game.json');
  for(const response of [await get('/score-hand'),await post('/score-hand',{gameToken,winnerId:'1',score_1:'100',score_2:'0',score_3:'0',score_4:'0'})]){
   assert.equal(response.status,303);assert.equal(response.headers.get('location'),'/game-over');
  }
  assert.deepEqual(fs.readFileSync('data/current-game.json'),saved);assert.equal(p.loadGame().hands.length,32);
  const historical=await(await get('/hand/1')).text();assert.ok(!historical.includes('Next Hand'));
 });
});

test('completed game still displays final results after app restart',async()=>{
 const finished=complete();
 await serve(finished,async({get})=>{const response=await get('/game-over');assert.equal(response.status,200);assert.match(await response.text(),/Joint winners/);});
 await serve(p.loadGame(),async({get})=>{assert.match(await(await get('/')).text(),/Game complete/);assert.match(await(await get('/game-over')).text(),/Joint winners/);});
});

test('correcting final winner back to East reopens play and removes the winner screen',async()=>{
 await serve(complete(),async({get,post,token})=>{
  const gameToken=await token('/edit-last-hand');
  const response=await post('/edit-last-hand',{gameToken,winnerId:'4',score_1:'0',score_2:'0',score_3:'0',score_4:'22'});
  assert.equal(response.status,302);assert.equal(isGameOver(p.loadGame()),false);
  assert.equal(p.loadGame().roundNumber,8);assert.equal(p.loadGame().roundWind,'North');assert.equal(p.loadGame().eastAdvancementsThisRound,3);
  assert.equal((await get('/game-over')).status,303);
  const detail=await(await get('/hand/32')).text();assert.match(detail,/Next Hand/);
  const nextToken=await token('/score-hand');
  assert.equal((await post('/score-hand',{gameToken:nextToken,winnerId:'1',score_1:'22',score_2:'0',score_3:'0',score_4:'0'})).status,302);
  assert.equal(isGameOver(p.loadGame()),true);assert.equal(p.loadGame().hands.length,33);
  const final=await(await get('/game-over')).text();assert.match(final,/Dan wins!/);
 });
});

test('correcting the final score updates the banner while preserving completion',async()=>{
 await serve(complete(),async({get,post,token})=>{
  assert.match(await(await get('/game-over')).text(),/Joint winners/);
  const gameToken=await token('/edit-last-hand');
  assert.equal((await post('/edit-last-hand',{gameToken,winnerId:'1',score_1:'100',score_2:'0',score_3:'0',score_4:'0'})).status,302);
  assert.equal(isGameOver(p.loadGame()),true);assert.match(await(await get('/game-over')).text(),/&lt;Alice&gt; wins!/);
 });
});
