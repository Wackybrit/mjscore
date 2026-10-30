const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { once } = require('node:events');
const cwd = process.cwd();
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mjscore-confirmations-'));
process.chdir(dir);
const p = require('../dist/services/persistence-service');
const { createGame, recordHand } = require('../dist/services/game-service');
const { createApp } = require('../dist/web/server');
const initial = createGame(['<A>','B','C','D'],0);
const current = recordHand(initial,{handNumber:1,roundWind:'East',eastPlayerId:'1',players:initial.players.map((player,i)=>({playerId:player.id,handScore:i===1?22:0,mahJongg:i===1}))});
const newPlayers={playerName_0:'New A',playerName_1:'B',playerName_2:'C',playerName_3:'D',startingWind_0:'East',startingWind_1:'South',startingWind_2:'West',startingWind_3:'North',rackColor_0:'Red',rackColor_1:'Blue',rackColor_2:'Green',rackColor_3:'Yellow'};
after(()=>{process.chdir(cwd);fs.rmSync(dir,{recursive:true,force:true});});
const activeBytes=()=>fs.readFileSync('data/current-game.json');
async function serve(run, game=current){
 p.saveGame(game);
 const server=createApp().listen(0,'127.0.0.1');await once(server,'listening');
 const base=`http://127.0.0.1:${server.address().port}`;
 const post=(route,body)=>fetch(base+route,{method:'POST',redirect:'manual',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams(body)});
 const review=async(route,body)=>{
  const response=await post(route,body);assert.equal(response.status,200);
  assert.equal(response.headers.get('cache-control'),'no-store');
  const html=await response.text();
  assert.ok(!html.includes('<A>'));assert.match(html,/Completed hands/);
  const token=html.match(/name="confirmationToken" value="([a-f0-9]+)"/)[1];
  const endpoint=route==='/new-game'?'/confirm-new-game':'/confirm-saved-game';
  return {html, token, confirm:(extra={})=>post(endpoint,{confirmationToken:token,decision:'confirm',...extra}),cancel:()=>post(endpoint,{confirmationToken:token,decision:'cancel'})};
 };
 const changeGame=async()=>{
  const html=await(await fetch(base+'/score-hand')).text();
  const gameToken=html.match(/name="gameToken" value="([a-f0-9]+)"/)[1];
  assert.equal((await post('/score-hand',{winnerId:'2',score_1:'0',score_2:'22',score_3:'0',score_4:'0',gameToken})).status,302);
 };
 try{await run({post,review,changeGame});}finally{await new Promise(resolve=>server.close(resolve));}
}

test('new save is immediate; normalized name collision requires review and cancel keeps both games',async()=>{
 await serve(async({post,review})=>{
  const before=activeBytes();
  const created=await post('/save-game',{saveName:'Fresh Save'});assert.equal(created.status,200);assert.match(await created.text(),/Game Saved/);
  assert.deepEqual(p.loadSavedGame('fresh-save'),current);
  p.saveGameAs(initial,'collision');
  const saved=fs.readFileSync('data/saved-games/collision.json');
  const pending=await review('/save-game',{saveName:' COLLISION! ',confirmed:'true'});
  assert.match(pending.html,/Replace existing saved game/);assert.match(pending.html,/Existing save: collision/);
  assert.deepEqual(activeBytes(),before);assert.deepEqual(fs.readFileSync('data/saved-games/collision.json'),saved);
  assert.equal((await pending.cancel()).status,303);assert.equal((await pending.confirm()).status,409);
  assert.deepEqual(p.loadSavedGame('collision'),initial);assert.deepEqual(activeBytes(),before);
  const fresh=await review('/save-game',{saveName:'collision'});
  assert.equal((await fresh.confirm({saveName:'fresh-save'})).status,303);
  assert.deepEqual(p.loadSavedGame('collision'),current);assert.deepEqual(activeBytes(),before);
  assert.equal((await fresh.confirm()).status,409);
 });
});

test('load requires confirmation, cancel preserves current game, confirm only replaces active game',async()=>{
 await serve(async({review})=>{
  p.saveGameAs(initial,'to-load');const saved=fs.readFileSync('data/saved-games/to-load.json');
  const before=activeBytes();const pending=await review('/load-game',{saveName:'to-load'});
  assert.match(pending.html,/replace current game/);assert.deepEqual(activeBytes(),before);
  assert.equal((await pending.cancel()).status,303);assert.equal((await pending.confirm()).status,409);assert.deepEqual(activeBytes(),before);
  const fresh=await review('/load-game',{saveName:'to-load'});
  assert.equal((await fresh.confirm()).status,303);assert.deepEqual(p.loadGame(),initial);
  assert.deepEqual(fs.readFileSync('data/saved-games/to-load.json'),saved);
  assert.equal((await fresh.confirm()).status,409);
 });
});

test('new game previews validated players, cancel preserves history and confirmation ignores tampered players',async()=>{
 await serve(async({review})=>{
  const before=activeBytes();const pending=await review('/new-game',newPlayers);
  assert.match(pending.html,/New A/);assert.deepEqual(activeBytes(),before);
  assert.equal((await pending.cancel()).status,303);assert.deepEqual(activeBytes(),before);
  const fresh=await review('/new-game',newPlayers);
  assert.equal((await fresh.confirm({playerName_0:'Tampered'})).status,303);
  assert.equal(p.loadGame().players[0].name,'New A');assert.equal(p.loadGame().hands.length,0);
  assert.equal((await fresh.confirm()).status,409);
 });
});

test('all confirmations refuse to replace a game changed after review',async()=>{
 await serve(async({review,changeGame})=>{
  p.saveGameAs(initial,'stale');
  for(const [route,body] of [['/save-game',{saveName:'stale'}],['/load-game',{saveName:'stale'}],['/new-game',newPlayers]]){
   const pending=await review(route,body);await changeGame();const before=activeBytes();
   assert.equal((await pending.confirm()).status,409);assert.deepEqual(activeBytes(),before);assert.deepEqual(p.loadSavedGame('stale'),initial);
  }
 });
});

test('changed, removed or damaged save after review requires another review',async()=>{
 await serve(async({review})=>{
  for(const route of ['/save-game','/load-game'])for(const change of ['changed','removed','damaged']){
   p.saveGameAs(initial,'changing');const pending=await review(route,{saveName:'changing'});const before=activeBytes();
   if(change==='changed')p.saveGameAs(current,'changing');
   else if(change==='removed')fs.unlinkSync('data/saved-games/changing.json');
   else fs.writeFileSync('data/saved-games/changing.json','broken');
   assert.equal((await pending.confirm()).status,409);assert.deepEqual(activeBytes(),before);
   if(change==='damaged')assert.equal(fs.readFileSync('data/saved-games/changing.json','utf8'),'broken');
  }
 });
});

test('damaged save may be replaced only after review; damaged loads remain blocked',async()=>{
 await serve(async({post,review})=>{
  p.saveGameAs(initial,'broken-save');fs.writeFileSync('data/saved-games/broken-save.json','broken');
  assert.equal((await post('/load-game',{saveName:'broken-save'})).status,400);
  const pending=await review('/save-game',{saveName:'broken-save'});assert.match(pending.html,/details are unavailable/);
  assert.equal(fs.readFileSync('data/saved-games/broken-save.json','utf8'),'broken');
  assert.equal((await pending.confirm()).status,303);assert.deepEqual(p.loadSavedGame('broken-save'),current);
 });
});

test('expired, missing, wrong-route and pre-restart confirmations cannot change game',async()=>{
 let old;
 await serve(async({post,review})=>{
  const before=activeBytes();const pending=await review('/new-game',newPlayers);old=pending.token;
  assert.equal((await post('/confirm-new-game',{decision:'confirm'})).status,409);
  assert.equal((await post('/confirm-saved-game',{decision:'confirm',confirmationToken:old})).status,409);
  const now=Date.now;
  try{Date.now=()=>now()+16*60*1000;assert.equal((await pending.confirm()).status,409);}finally{Date.now=now;}
  assert.deepEqual(activeBytes(),before);
 });
 await serve(async({post})=>{
  const before=activeBytes();assert.equal((await post('/confirm-new-game',{confirmationToken:old,decision:'confirm'})).status,409);assert.deepEqual(activeBytes(),before);
 });
});

test('storage failures preserve files and allow confirmation retry; double tap applies once',async()=>{
 await serve(async({review})=>{
  p.saveGameAs(initial,'retry');
  for(const [route,body] of [['/save-game',{saveName:'retry'}],['/load-game',{saveName:'retry'}],['/new-game',newPlayers]]){
   const pending=await review(route,body);const before=activeBytes();const saved=fs.readFileSync('data/saved-games/retry.json');
   const rename=fs.renameSync;fs.renameSync=()=>{throw Error('Simulated storage failure');};
   try{assert.equal((await pending.confirm()).status,503);}finally{fs.renameSync=rename;}
   assert.deepEqual(activeBytes(),before);assert.deepEqual(fs.readFileSync('data/saved-games/retry.json'),saved);
   const responses=await Promise.all([pending.confirm(),pending.confirm()]);assert.deepEqual(responses.map(r=>r.status).sort(),[303,409]);
  }
 });
});
