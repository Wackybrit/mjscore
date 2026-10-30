const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { once } = require('node:events');
const cwd = process.cwd();
const directory = fs.mkdtempSync(path.join(os.tmpdir(),'mjscore-forms-'));
process.chdir(directory);
const p = require('../dist/services/persistence-service');
const { createGame, recordHand } = require('../dist/services/game-service');
const { createApp } = require('../dist/web/server');
const game = createGame(['A','B','C','D'],0);
const firstHand = recordHand(game,{handNumber:1,roundWind:'East',eastPlayerId:'1',players:game.players.map((player,i)=>({playerId:player.id,handScore:i===1?22:0,mahJongg:i===1}))});
const scores = {winnerId:'2',score_1:'0',score_2:'22',score_3:'0',score_4:'0'};
after(()=>{process.chdir(cwd);fs.rmSync(directory,{recursive:true,force:true});});
async function serve(initial, run) {
 p.saveGame(initial);
 const server=createApp().listen(0,'127.0.0.1');await once(server,'listening');
 const base=`http://127.0.0.1:${server.address().port}`;
 const token=async route=>{
  const response=await fetch(base+route);assert.equal(response.status,200);
  assert.equal(response.headers.get('cache-control'),'no-store');
  return (await response.text()).match(/name="gameToken" value="([a-f0-9]+)"/)[1];
 };
 const send=(route,body)=>fetch(base+route,{method:'POST',redirect:'manual',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams(body)});
 const post=async(route,body)=>{
  const result=await send(route,body);
  if(['/load-game','/new-game'].includes(route) && result.status===200){
   const html=await result.clone().text();
   const match=html.match(/name="confirmationToken" value="([a-f0-9]+)"/);
   if(match)return send(route==='/new-game'?'/confirm-new-game':'/confirm-saved-game',{confirmationToken:match[1],decision:'confirm'});
  }
  return result;
 };
 try{await run({token,post});}finally{await new Promise(resolve=>server.close(resolve));}
}
async function rejected(response, before) {
 assert.equal(response.status,409);assert.match(await response.text(),/This form needs refreshing/);
 assert.deepEqual(fs.readFileSync('data/current-game.json'),before);
}

test('simultaneous double tap records exactly one hand and invalidates another open tab',async()=>{
 await serve(game,async({token,post})=>{
  const first=await token('/score-hand');const other=await token('/score-hand');
  const results=await Promise.all([post('/score-hand',{...scores,gameToken:first}),post('/score-hand',{...scores,gameToken:first})]);
  assert.deepEqual(results.map(r=>r.status).sort(),[302,409]);
  assert.deepEqual(p.loadGame(),firstHand);
  const before=fs.readFileSync('data/current-game.json');
  await rejected(await post('/score-hand',{...scores,gameToken:other}),before);
 });
});

test('stale correction cannot edit a newly recorded hand',async()=>{
 await serve(firstHand,async({token,post})=>{
  const edit=await token('/edit-last-hand');const score=await token('/score-hand');
  assert.equal((await post('/score-hand',{...scores,gameToken:score})).status,302);
  const before=fs.readFileSync('data/current-game.json');
  await rejected(await post('/edit-last-hand',{...scores,gameToken:edit}),before);
  assert.equal(p.loadGame().hands.length,2);
 });
});

test('even an unchanged correction invalidates all earlier score and correction forms',async()=>{
 await serve(firstHand,async({token,post})=>{
  const edit=await token('/edit-last-hand');const score=await token('/score-hand');
  assert.equal((await post('/edit-last-hand',{...scores,gameToken:edit})).status,302);
  assert.deepEqual(p.loadGame(),firstHand);
  const before=fs.readFileSync('data/current-game.json');
  await rejected(await post('/edit-last-hand',{...scores,gameToken:edit}),before);
  await rejected(await post('/score-hand',{...scores,gameToken:score}),before);
  const fresh=await token('/edit-last-hand');
  assert.equal((await post('/edit-last-hand',{...scores,score_2:'24',gameToken:fresh})).status,302);
  assert.equal(p.loadGame().hands[0].players[1].handScore,24);
 });
});

test('loading identical data, renaming players and starting a new game invalidate old forms',async()=>{
 await serve(game,async({token,post})=>{
  p.saveGameAs(game,'identical');
  for(const [route,body] of [
   ['/load-game',{saveName:'identical'}],
   ['/edit-players',{playerName_0:'AA',playerName_1:'B',playerName_2:'C',playerName_3:'D'}],
   ['/new-game',{playerName_0:'A',playerName_1:'B',playerName_2:'C',playerName_3:'D',startingWind_0:'East',startingWind_1:'South',startingWind_2:'West',startingWind_3:'North',rackColor_0:'Red',rackColor_1:'Blue',rackColor_2:'Green',rackColor_3:'Yellow'}]
  ]){
   const old=await token('/score-hand');assert.equal((await post(route,body)).status,route==='/edit-players'?302:303);
   const before=fs.readFileSync('data/current-game.json');
   await rejected(await post('/score-hand',{...scores,gameToken:old}),before);
   assert.equal(p.loadGame().hands.length,0);
  }
 });
});

test('missing, forged, wrong-route and pre-restart tokens are refused',async()=>{
 let old;
 await serve(firstHand,async({token,post})=>{
  old=await token('/score-hand');
  const before=fs.readFileSync('data/current-game.json');
  for(const invalid of [undefined,'forged',await token('/edit-last-hand')]) {
   await rejected(await post('/score-hand',{...scores,...(invalid===undefined?{}:{gameToken:invalid})}),before);
  }
 });
 await serve(firstHand,async({post})=>{
  await rejected(await post('/score-hand',{...scores,gameToken:old}),fs.readFileSync('data/current-game.json'));
 });
});

test('failed validation and failed storage do not consume the form',async()=>{
 await serve(game,async({token,post})=>{
  const gameToken=await token('/score-hand');const before=fs.readFileSync('data/current-game.json');
  const invalid=await post('/score-hand',{...scores,score_2:'3',gameToken});
  assert.equal(invalid.status,200);assert.match(await invalid.text(),/must be even/);
  const rename=fs.renameSync;
  fs.renameSync=()=>{throw Error('Simulated storage failure');};
  try{assert.equal((await post('/score-hand',{...scores,gameToken})).status,503);}finally{fs.renameSync=rename;}
  assert.deepEqual(fs.readFileSync('data/current-game.json'),before);
  assert.equal((await post('/score-hand',{...scores,gameToken})).status,302);
  assert.deepEqual(p.loadGame(),firstHand);
 });
});
