const {test,after}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const os=require('node:os');
const path=require('node:path');
const {once}=require('node:events');
const cwd=process.cwd();const dir=fs.mkdtempSync(path.join(os.tmpdir(),'mjscore-settings-'));process.chdir(dir);
const settings=require('../dist/services/settings-service');
const p=require('../dist/services/persistence-service');
const {createGame,recordHand,rebuildGameFromHands,recordDeadHand}=require('../dist/services/game-service');
const {calculateSettlementSummary}=require('../dist/services/scoring-service');
const {validateSavedGame}=require('../dist/services/saved-game-validation');
const {createApp}=require('../dist/web/server');
after(()=>{process.chdir(cwd);fs.rmSync(dir,{recursive:true,force:true});});
const game=()=>createGame(['<A>','B','C','D'],0);
function hand(scores,winner='1',cap=500){return {handNumber:1,roundWind:'East',eastPlayerId:'1',...(cap===null?{}:{maxHandScore:cap}),players:scores.map((score,i)=>({playerId:String(i+1),handScore:score,mahJongg:String(i+1)===winner}))};}
const net=h=>Object.fromEntries(calculateSettlementSummary(h).netResults.map(p=>[p.playerId,p.amount]));
async function serve(initial,run){
 settings.saveSettings({...settings.DEFAULT_SETTINGS});p.saveGame(initial);
 const server=createApp().listen(0,'127.0.0.1');await once(server,'listening');const base=`http://127.0.0.1:${server.address().port}`;
 const get=route=>fetch(base+route,{redirect:'manual'});
 const post=(route,body)=>fetch(base+route,{method:'POST',redirect:'manual',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams(body)});
 const token=async(route,name='gameToken')=>(await(await get(route)).text()).match(new RegExp(`name="${name}" value="([a-f0-9]+)"`))[1];
 try{await run({get,post,token});}finally{await new Promise(resolve=>server.close(resolve));}
}

test('settings default to visible coins and a 500 point cap without creating data',()=>{
 assert.deepEqual(settings.loadSettings(),{showCoinSettlements:true,maxHandScore:500});assert.equal(fs.existsSync('data/settings.json'),false);
});

test('payment cap preserves raw score, applies before East doubling, and caps both non-winners before comparison',()=>{
 const east=hand([800,0,0,0]);const original=structuredClone(east);
 assert.deepEqual(net(east),{'1':3000,'2':-1000,'3':-1000,'4':-1000});assert.deepEqual(east,original);
 assert.deepEqual(net(hand([800,1200,700,100],'2')),{'1':-200,'2':2000,'3':-100,'4':-1700});
 const summary=calculateSettlementSummary(hand([800,1200,700,100],'2'));
 assert.ok(!summary.settlements.some(s=>s.reason==='Hand comparison'&&['1','3'].includes(s.fromPlayerId)&&['1','3'].includes(s.toPlayerId)));
 assert.deepEqual(net(hand([500,0,0,0])),net(hand([800,0,0,0])));
 assert.deepEqual(net(hand([800,0,0,0],'1',1000)),{'1':4800,'2':-1600,'3':-1600,'4':-1600});
});

test('uncapped legacy hands and capped new hands rebuild, save and load without changing past totals',()=>{
 const old=recordHand(game(),hand([800,0,0,0],'1',null));assert.equal(old.players[0].score,4800);
 const nextHand={...hand([800,0,0,0]),handNumber:2};const combined=recordHand(old,nextHand);
 assert.deepEqual(combined.players.map(p=>p.score),[7800,-2600,-2600,-2600]);
 assert.deepEqual(rebuildGameFromHands(combined,combined.hands),combined);validateSavedGame(combined);
 p.saveGame(combined);p.saveGameAs(combined,'raw-scores');assert.deepEqual(p.loadSavedGame('raw-scores'),combined);
 assert.equal(p.loadGame().hands[0].maxHandScore,undefined);assert.equal(p.loadGame().hands[1].players[0].handScore,800);
 for(const cap of [0,-2,23,'500',null]){const invalid=structuredClone(combined);invalid.hands[1].maxHandScore=cap;assert.throws(()=>validateSavedGame(invalid));}
});

test('invalid settings and failed atomic replacements preserve the previous settings file',()=>{
 settings.saveSettings({showCoinSettlements:false,maxHandScore:600});const before=fs.readFileSync('data/settings.json');
 for(const maxHandScore of [0,-2,21,501,NaN,Infinity,2.5,'500'])assert.throws(()=>settings.saveSettings({showCoinSettlements:true,maxHandScore}));
 assert.throws(()=>settings.saveSettings({showCoinSettlements:'yes',maxHandScore:500}));
 for(const operation of ['writeFileSync','fsyncSync','renameSync']){
  const original=fs[operation];fs[operation]=()=>{throw Error('Simulated failure');};
  try{assert.throws(()=>settings.saveSettings({showCoinSettlements:true,maxHandScore:500}),/Previous settings were kept/);}finally{fs[operation]=original;}
  assert.deepEqual(fs.readFileSync('data/settings.json'),before);assert.ok(!fs.readdirSync('data').some(n=>n.endsWith('.tmp')));
 }
 fs.writeFileSync('data/settings.json','broken');assert.throws(()=>settings.loadSettings(),/damaged/);assert.equal(fs.readFileSync('data/settings.json','utf8'),'broken');fs.writeFileSync('data/settings.json',before);
});

test('settings screen saves, survives a new app instance, rejects stale forms and leaves game data unchanged',async()=>{
 await serve(game(),async({get,post,token})=>{
  const before=fs.readFileSync('data/current-game.json');const settingsToken=await token('/settings','settingsToken');
  const response=await post('/settings',{settingsToken,maxHandScore:'600'});assert.equal(response.status,303);
  assert.deepEqual(settings.loadSettings(),{showCoinSettlements:false,maxHandScore:600});
  assert.equal((await post('/settings',{settingsToken,maxHandScore:'700',showCoinSettlements:'on'})).status,409);
  const html=await(await get('/settings')).text();assert.match(html,/value="600"/);assert.ok(!/name="showCoinSettlements"[^>]*checked/.test(html));
  assert.deepEqual(fs.readFileSync('data/current-game.json'),before);assert.doesNotThrow(()=>createApp());assert.deepEqual(settings.loadSettings(),{showCoinSettlements:false,maxHandScore:600});
 });
});

test('new hand stores the cap and real score; settings changes cannot recalculate it or silently affect an old scoring form',async()=>{
 await serve(game(),async({get,post,token})=>{
  let gameToken=await token('/score-hand');
  assert.equal((await post('/score-hand',{gameToken,winnerId:'1',score_1:'800',score_2:'0',score_3:'0',score_4:'0'})).status,302);
  assert.equal(p.loadGame().hands[0].maxHandScore,500);assert.equal(p.loadGame().hands[0].players[0].handScore,800);assert.equal(p.loadGame().players[0].score,3000);
  assert.match(await(await get('/hand/1')).text(),/800/);assert.match(await(await get('/history')).text(),/settles as 500/);
  gameToken=await token('/score-hand');let settingsToken=await token('/settings','settingsToken');
  assert.equal((await post('/settings',{settingsToken,maxHandScore:'600',showCoinSettlements:'on'})).status,303);
  const before=fs.readFileSync('data/current-game.json');
  assert.equal((await post('/score-hand',{gameToken,winnerId:'1',score_1:'800',score_2:'0',score_3:'0',score_4:'0'})).status,409);assert.deepEqual(fs.readFileSync('data/current-game.json'),before);
  const correctionToken=await token('/edit-last-hand');
  assert.equal((await post('/edit-last-hand',{gameToken:correctionToken,handOutcome:'completed',winnerId:'1',score_1:'1000',score_2:'0',score_3:'0',score_4:'0'})).status,302);
  assert.equal(p.loadGame().hands[0].maxHandScore,500);assert.equal(p.loadGame().players[0].score,3000);
  gameToken=await token('/score-hand');assert.equal((await post('/score-hand',{gameToken,winnerId:'1',score_1:'800',score_2:'0',score_3:'0',score_4:'0'})).status,302);
  assert.equal(p.loadGame().hands[1].maxHandScore,600);assert.equal(p.loadGame().players[0].score,6600);
 });
});

test('coin preference hides only the payments section without changing balances and can restore it',async()=>{
 const initial=recordHand(game(),hand([800,0,0,0]));
 await serve(initial,async({get,post,token})=>{
  const before=fs.readFileSync('data/current-game.json');assert.match(await(await get('/hand/1')).text(),/<h3>Payments<\/h3>/);
  let settingsToken=await token('/settings','settingsToken');await post('/settings',{settingsToken,maxHandScore:'500'});
  const hidden=await(await get('/hand/1')).text();assert.ok(!hidden.includes('<h3>Payments</h3>'));assert.ok(!hidden.includes('class="coin-settlements"'));assert.match(hidden,/Hand Results/);assert.match(hidden,/Current Totals/);assert.match(hidden,/3000/);
  settingsToken=await token('/settings','settingsToken');await post('/settings',{settingsToken,maxHandScore:'500',showCoinSettlements:'on'});
  assert.match(await(await get('/hand/1')).text(),/<h3>Payments<\/h3>/);assert.deepEqual(fs.readFileSync('data/current-game.json'),before);
 });
});

test('Club Table retains prominent wind numbers, eight round steps, and Settings navigation',async()=>{
 await serve(game(),async({get})=>{
  const html=await(await get('/')).text();assert.match(html,/class="player-cards"/);
  for(const [wind,number] of [['East',1],['South',2],['West',3],['North',4]])assert.match(html,new RegExp(`class="seat-wind">${wind} <span class="wind-number">\\(${number}\\)</span>`));
  const progress=html.match(/<ol class="round-progress"[\s\S]*?<\/ol>/)[0];assert.equal((progress.match(/<li/g)||[]).length,8);assert.match(progress,/aria-current="step"/);assert.match(html,/href="\/settings"/);
 });
});

test('legacy hand correction keeps uncapped rules and converting a dead hand takes the current limit',async()=>{
 const legacy=recordHand(game(),hand([800,0,0,0],'1',null));
 await serve(legacy,async({post,token})=>{
  const gameToken=await token('/edit-last-hand');await post('/edit-last-hand',{gameToken,winnerId:'1',score_1:'900',score_2:'0',score_3:'0',score_4:'0'});
  assert.equal(p.loadGame().hands[0].maxHandScore,undefined);assert.equal(p.loadGame().players[0].score,5400);
 });
 await serve(recordDeadHand(game()),async({post,token})=>{
  const gameToken=await token('/edit-last-hand');await post('/edit-last-hand',{gameToken,handOutcome:'completed',winnerId:'1',score_1:'800',score_2:'0',score_3:'0',score_4:'0'});
  assert.equal(p.loadGame().hands[0].maxHandScore,500);assert.equal(p.loadGame().players[0].score,3000);assert.equal(p.loadGame().eastPlayerIndex,0);
 });
});
