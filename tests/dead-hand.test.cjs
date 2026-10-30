const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { once } = require('node:events');
const cwd = process.cwd();
const directory = fs.mkdtempSync(path.join(os.tmpdir(),'mjscore-dead-hands-'));
process.chdir(directory);
const { createGame, recordHand, recordDeadHand, rebuildGameFromHands, isReplayHand, isGameOver } = require('../dist/services/game-service');
const { calculateSettlements } = require('../dist/services/scoring-service');
const { buildHandSummaryReport, buildHandHistoryReport } = require('../dist/services/reporting-service');
const { validateSavedGame } = require('../dist/services/saved-game-validation');
const { createApp } = require('../dist/web/server');
const p = require('../dist/services/persistence-service');
after(()=>{process.chdir(cwd);fs.rmSync(directory,{recursive:true,force:true});});
const fresh = () => createGame(['<A>','B','C','D'],0);
const winds = game => [game.eastPlayerIndex,game.eastAdvancementsThisRound,game.roundWind,game.roundNumber];
function hand(game,winner,score=22){return {handNumber:game.handNumber,roundWind:game.roundWind,eastPlayerId:game.players[game.eastPlayerIndex].id,players:game.players.map(p=>({playerId:p.id,handScore:p.id===winner?score:0,mahJongg:p.id===winner}))};}
function beforeBoundary(losses){let game=fresh();for(let i=0;i<losses;i++)game=recordHand(game,hand(game,game.players[(game.eastPlayerIndex+1)%4].id));return game;}
async function serve(initial,run){
 p.saveGame(initial);
 const server=createApp().listen(0,'127.0.0.1');await once(server,'listening');
 const base=`http://127.0.0.1:${server.address().port}`;
 const get=route=>fetch(base+route,{redirect:'manual'});
 const post=(route,body)=>fetch(base+route,{method:'POST',redirect:'manual',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams(body)});
 const token=async route=>(await(await get(route)).text()).match(/name="gameToken" value="([a-f0-9]+)"/)[1];
 try{await run({get,post,token});}finally{await new Promise(resolve=>server.close(resolve));}
}

test('dead hands record zero scores and no winner, preserve existing totals and winds, and can repeat',()=>{
 let game=recordHand(fresh(),hand(fresh(),'2',100));const before=structuredClone(game);
 for(let i=0;i<3;i++){
  const snapshot=structuredClone(game);game=recordDeadHand(game);
  assert.deepEqual(winds(game),winds(before));assert.deepEqual(game.players,before.players);
  assert.equal(game.handNumber,snapshot.handNumber+1);assert.equal(game.hands.length,snapshot.hands.length+1);
  assert.equal(isReplayHand(game),true);assert.equal(game.hands.at(-1).deadHand,true);
  assert.deepEqual(game.hands.at(-1).players.map(p=>[p.handScore,p.mahJongg]),[[0,false],[0,false],[0,false],[0,false]]);
  assert.deepEqual(calculateSettlements(game.hands.at(-1)),[]);
  validateSavedGame(game);
 }
 assert.match(buildHandSummaryReport(game,game.hands.at(-1)),/None — Dead Hand/);
 assert.match(buildHandHistoryReport(game),/Dead Hand/);
});

test('East winning the replay receives normal double payments but passes East exactly once',()=>{
 const game=recordDeadHand(recordDeadHand(fresh()));
 const replay=recordHand(game,hand(game,'1',100));
 assert.deepEqual(replay.players.map(p=>p.score),[600,-200,-200,-200]);
 assert.deepEqual(winds(replay),[1,1,'East',1]);assert.equal(isReplayHand(replay),false);
 const ordinary=recordHand(replay,hand(replay,'2'));
 assert.deepEqual(ordinary.players.map(p=>p.score),[556,-68,-244,-244]);
 assert.deepEqual(winds(ordinary),[1,1,'East',1]);
});

test('non-East winning a replay advances only once and uses ordinary settlement amounts',()=>{
 const game=recordDeadHand(fresh());
 const result={...hand(game,'2',100),players:[{playerId:'1',handScore:40,mahJongg:false},{playerId:'2',handScore:100,mahJongg:true},{playerId:'3',handScore:20,mahJongg:false},{playerId:'4',handScore:0,mahJongg:false}]};
 const replay=recordHand(game,result);
 assert.deepEqual(replay.players.map(p=>p.score),[-80,400,-120,-200]);assert.deepEqual(winds(replay),[1,1,'East',1]);
});

test('save/load and history rebuilding preserve replay status and reject malformed dead hands',()=>{
 const pending=recordDeadHand(recordDeadHand(fresh()));
 p.saveGame(pending);p.saveGameAs(pending,'pending-replay');
 assert.deepEqual(p.loadGame(),pending);assert.deepEqual(p.loadSavedGame('pending-replay'),pending);
 const rebuilt=rebuildGameFromHands(pending,pending.hands);assert.deepEqual(rebuilt,pending);
 const completed=recordHand(rebuilt,hand(rebuilt,'1'));assert.deepEqual(winds(completed),[1,1,'East',1]);
 assert.deepEqual(rebuildGameFromHands(completed,completed.hands),completed);
 for(const mutate of [g=>g.hands[0].players[0].handScore=2,g=>g.hands[0].players[0].mahJongg=true,g=>g.hands[0].deadHand='yes',g=>delete g.hands[0].deadHand]){
  const invalid=structuredClone(pending);mutate(invalid);assert.throws(()=>validateSavedGame(invalid));
 }
 const invalid=structuredClone(pending.hands[0]);invalid.players[0].handScore=2;assert.throws(()=>recordHand(fresh(),invalid),/zero scores/);
});

test('dead hands delay round and game boundaries; East winning their replay completes the boundary',()=>{
 for(const losses of [15,31]){
  const before=beforeBoundary(losses);const pending=recordDeadHand(recordDeadHand(before));
  assert.deepEqual(winds(pending),winds(before));assert.equal(isGameOver(pending),false);
  const finished=recordHand(pending,hand(pending,pending.players[pending.eastPlayerIndex].id));
  assert.equal(finished.roundNumber,losses===15?5:9);assert.equal(isGameOver(finished),losses===31);
  validateSavedGame(finished);
  if(losses===31)assert.throws(()=>recordDeadHand(finished),/game is over/);
 }
});

test('dead-hand button, history and details work; double taps and old scoring pages cannot submit twice',async()=>{
 await serve(fresh(),async({get,post,token})=>{
  const home=await(await get('/')).text();assert.match(home,/action="\/dead-hand"/);
  const scoreToken=await token('/score-hand');const gameToken=await token('/');
  const responses=await Promise.all([post('/dead-hand',{gameToken}),post('/dead-hand',{gameToken})]);
  assert.deepEqual(responses.map(r=>r.status).sort(),[303,409]);assert.equal(p.loadGame().hands.length,1);
  const snapshot=fs.readFileSync('data/current-game.json');
  assert.equal((await post('/score-hand',{gameToken:scoreToken,winnerId:'1',score_1:'22',score_2:'0',score_3:'0',score_4:'0'})).status,409);
  assert.deepEqual(fs.readFileSync('data/current-game.json'),snapshot);
  const detail=await get('/hand/1');assert.equal(detail.status,200);const html=await detail.text();assert.match(html,/None — Dead Hand/);assert.match(html,/No payments/);assert.ok(!html.includes('<A>'));
  const history=await(await get('/history')).text();assert.match(history,/Dead Hand/);assert.match(history,/Mah-Jongg Count<\/strong><\/td>\s*<td><strong>0/);
  assert.match(await(await get('/')).text(),/Replay hand/);assert.match(await(await get('/score-hand')).text(),/East passes/);
  const replayToken=await token('/score-hand');assert.equal((await post('/score-hand',{gameToken:replayToken,winnerId:'1',score_1:'22',score_2:'0',score_3:'0',score_4:'0'})).status,302);
  assert.deepEqual(winds(p.loadGame()),[1,1,'East',1]);assert.match(await(await get('/history')).text(),/Replay/);
 });
});

test('failed dead-hand save leaves active game unchanged and allows the same token to retry',async()=>{
 await serve(fresh(),async({post,token})=>{
  const gameToken=await token('/');const snapshot=fs.readFileSync('data/current-game.json');
  const rename=fs.renameSync;fs.renameSync=()=>{throw Error('Simulated storage failure');};
  try{assert.equal((await post('/dead-hand',{gameToken})).status,503);}finally{fs.renameSync=rename;}
  assert.deepEqual(fs.readFileSync('data/current-game.json'),snapshot);
  assert.equal((await post('/dead-hand',{gameToken})).status,303);assert.equal(p.loadGame().hands.length,1);
 });
});

test('correcting dead to completed or completed to dead rebuilds replay and wind progression',async()=>{
 await serve(recordDeadHand(recordDeadHand(fresh())),async({get,post,token})=>{
  assert.match(await(await get('/edit-last-hand')).text(),/value="dead" selected/);
  let gameToken=await token('/edit-last-hand');
  assert.equal((await post('/edit-last-hand',{gameToken,handOutcome:'completed',winnerId:'1',score_1:'22',score_2:'0',score_3:'0',score_4:'0'})).status,302);
  assert.deepEqual(winds(p.loadGame()),[1,1,'East',1]);assert.equal(isReplayHand(p.loadGame()),false);
  gameToken=await token('/edit-last-hand');
  assert.equal((await post('/edit-last-hand',{gameToken,handOutcome:'dead'})).status,302);
  assert.deepEqual(winds(p.loadGame()),[0,0,'East',1]);assert.deepEqual(p.loadGame().players.map(p=>p.score),[0,0,0,0]);assert.equal(isReplayHand(p.loadGame()),true);
 });
});

test('dead replay state survives app restart and final North replay can end the game even when East wins',async()=>{
 const pending=recordDeadHand(beforeBoundary(31));
 for(let restart=0;restart<2;restart++)await serve(pending,async({get})=>{assert.match(await(await get('/')).text(),/Replay hand/);});
 await serve(pending,async({get,post,token})=>{
  const gameToken=await token('/score-hand');
  assert.equal((await post('/score-hand',{gameToken,winnerId:'4',score_1:'0',score_2:'0',score_3:'0',score_4:'22'})).status,302);
  assert.equal(isGameOver(p.loadGame()),true);assert.match(await(await get('/hand/33')).text(),/Game Over/);
  const before=fs.readFileSync('data/current-game.json');assert.equal((await post('/dead-hand',{gameToken})).status,303);assert.deepEqual(fs.readFileSync('data/current-game.json'),before);
 });
});
