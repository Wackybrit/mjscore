const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { once } = require('node:events');
const originalCwd = process.cwd();
const temporary = fs.mkdtempSync(path.join(os.tmpdir(), 'mjscore-persistence-'));
process.chdir(temporary);
const p = require(path.join(__dirname, '../dist/services/persistence-service'));
const { createGame, recordHand } = require(path.join(__dirname, '../dist/services/game-service'));
const { createApp } = require(path.join(__dirname, '../dist/web/server'));
const game = createGame(['A','B','C','D'],0);
const next = recordHand(game, {handNumber:1,roundWind:'East',eastPlayerId:'1',maxHandScore:500,players:game.players.map((player,index)=>({playerId:player.id,handScore:index===1?22:0,mahJongg:index===1}))});
after(()=>{process.chdir(originalCwd);fs.rmSync(temporary,{recursive:true,force:true});});

function assertNoTemps() {
 for(const directory of ['data','data/saved-games']) {
  if(fs.existsSync(directory))assert.ok(!fs.readdirSync(directory).some(name=>name.endsWith('.tmp')));
 }
}

test('active and named games round trip, including existing compatible data',()=>{
 assert.equal(p.loadGame(),null);
 p.saveGame(game);p.saveGameAs(game,'Evening Game');
 assert.deepEqual(p.loadGame(),game);assert.deepEqual(p.loadSavedGame('Evening Game'),game);
 p.saveGame(next);p.saveGameAs(next,'Evening Game');
 assert.deepEqual(p.loadGame(),next);assert.deepEqual(p.loadSavedGame('evening-game'),next);
 assert.deepEqual(p.listSavedGames(),['evening-game']);assertNoTemps();
});

test('partial writes, flush failures and rename failures preserve both types of save',()=>{
 for(const named of [false,true])for(const operation of ['writeFileSync','fsyncSync','renameSync']) {
  const save=g=>named?p.saveGameAs(g,'failure-test'):p.saveGame(g);
  const filename=named?'data/saved-games/failure-test.json':'data/current-game.json';
  save(game);const before=fs.readFileSync(filename);
  const original=fs[operation];
  fs[operation]=(...args)=>{
   assert.deepEqual(fs.readFileSync(filename),before);
   if(operation==='writeFileSync')original(args[0],'{"partial":', 'utf8');
   const error=new Error('Simulated full disk or failed replacement');error.code='ENOSPC';throw error;
  };
  try{assert.throws(()=>save(next),/previous save was kept/);}finally{fs[operation]=original;}
  assert.deepEqual(fs.readFileSync(filename),before);assertNoTemps();
 }
});

test('invalid and inconsistent saves are rejected without changing active data',()=>{
 p.saveGame(next);const before=fs.readFileSync('data/current-game.json');
 const mutations=[
  ()=>null,()=>[],()=>({}),
  g=>{g.players.pop();return g;},
  g=>{g.players[1].id=g.players[0].id;return g;},
  g=>{g.players[0].rackColor='Purple';return g;},
  g=>{g.players[0].name=2;return g;},
  g=>{g.players[0].score+=2;return g;},
  g=>{g.eastPlayerIndex=9;return g;},
  g=>{g.eastAdvancementsThisRound=3;return g;},
  g=>{g.hands[0].eastPlayerId='unknown';return g;},
  g=>{g.hands[0].players[0].handScore=-2;return g;},
  g=>{g.hands[0].players[0].playerId='unknown';return g;},
  g=>{g.hands[0].players[0].mahJongg=true;return g;},
  g=>{g.hands[0].roundWind='South';return g;},
  g=>{g.handNumber=100;return g;}
 ];
 for(const mutate of mutations){
  fs.writeFileSync('data/saved-games/bad.json',JSON.stringify(mutate(structuredClone(next))));
  const bad=fs.readFileSync('data/saved-games/bad.json');
  assert.throws(()=>p.loadSavedGame('bad'),/damaged or incompatible/);
  assert.deepEqual(fs.readFileSync('data/saved-games/bad.json'),bad);
 }
 fs.writeFileSync('data/saved-games/bad.json','{"truncated":');
 assert.throws(()=>p.loadSavedGame('bad'),/damaged or incompatible/);
 assert.deepEqual(fs.readFileSync('data/current-game.json'),before);
 assert.throws(()=>p.saveGame({}),/data is invalid/);
 assert.deepEqual(fs.readFileSync('data/current-game.json'),before);
 assert.throws(()=>p.loadSavedGame('missing'),/could not be read/);
 assert.throws(()=>p.saveGameAs(game,undefined),/save name/);
});

async function serve(app,run){
 const server=app.listen(0,'127.0.0.1');await once(server,'listening');
 const base=`http://127.0.0.1:${server.address().port}`;
 const post=async(route,body)=>{
  if(route==='/score-hand'){
   const html=await(await fetch(base+route)).text();
   body+='&gameToken='+html.match(/name="gameToken" value="([a-f0-9]+)"/)[1];
  }
  const result=await fetch(base+route,{method:'POST',redirect:'manual',headers:{'Content-Type':'application/x-www-form-urlencoded'},body});
  if(route==='/load-game' && result.status===200){
   const html=await result.clone().text();
   const match=html.match(/name="confirmationToken" value="([a-f0-9]+)"/);
   if(match)return fetch(base+'/confirm-saved-game',{method:'POST',redirect:'manual',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({confirmationToken:match[1],decision:'confirm'})});
  }
  return result;
 };
 try{await run(base,post);}finally{await new Promise(resolve=>server.close(resolve));}
}

test('HTTP failures show useful errors and keep the visible and saved active game unchanged',async()=>{
 p.saveGame(game);const before=fs.readFileSync('data/current-game.json');
 await serve(createApp(),async(base,post)=>{
  const bad=await post('/load-game','saveName=bad');assert.equal(bad.status,400);assert.match(await bad.text(),/damaged or incompatible/);
  const original=fs.renameSync;
  fs.renameSync=()=>{throw Error('Simulated replacement failure');};
  try{
   const failed=await post('/score-hand','winnerId=2&score_1=0&score_2=22&score_3=0&score_4=0');
   assert.equal(failed.status,503);assert.match(await failed.text(),/previous save was kept/);
   // Named saves and loading must report the same storage failure.
   for(const [route,body] of [['/save-game','saveName=failed-save'],['/load-game','saveName=evening-game']]) {
    const result=await post(route,body);assert.equal(result.status,503);assert.match(await result.text(),/previous save was kept/);
   }
  }finally{fs.renameSync=original;}
  const home=await(await fetch(base+'/')).text();assert.match(home,/<strong>Hand Number:<\/strong>\s*1/);
  assert.deepEqual(fs.readFileSync('data/current-game.json'),before);
  const success=await post('/score-hand','winnerId=2&score_1=0&score_2=22&score_3=0&score_4=0');
  assert.equal(success.status,302);assert.deepEqual(p.loadGame(),next);
 });
});

test('damaged current game starts a recovery page and cannot be overwritten',async()=>{
 fs.writeFileSync('data/current-game.json','broken current game');
 const log=console.error;let app;
 try{console.error=()=>{};app=createApp();}finally{console.error=log;}
 await serve(app,async(base,post)=>{
  const response=await fetch(base+'/');assert.equal(response.status,503);assert.match(await response.text(),/current-game.json/);
  const response2=await post('/new-game','');assert.equal(response2.status,503);
  assert.equal(fs.readFileSync('data/current-game.json','utf8'),'broken current game');
 });
});
