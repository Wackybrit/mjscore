const {test}=require('node:test');
const assert=require('node:assert/strict');
const express=require('express');
const {once}=require('node:events');
const {createGame,recordHand}=require('../dist/services/game-service');
const v=require('../dist/services/validation-service');
test('validation rejects invalid enum choices, winners and unsafe scores',()=>{
 assert.equal(v.validateStartingWinds(['East','South','West','Fake']).valid,false);
 assert.equal(v.validateStartingWinds(['East','South','West','North']).valid,true);
 assert.equal(v.validateRackColors(['Red','Blue','Green','Fake']).valid,false);
 assert.equal(v.validateRackColors(['Red','Blue','Green','Yellow']).valid,true);
 assert.equal(v.validateMahJonggWinner('other',['1','2','3','4']).valid,false);
 assert.equal(v.validateHandScores([NaN,Infinity,2**54,1.5,-2,3]).valid,false);
 assert.equal(v.validateHandScores([0,22,100,200]).valid,true);
});
test('pages escape names and editing uses historical East',async()=>{
 const name='<img src=x onerror="alert(1)">';
 let game=createGame([name,'B','C','D'],0);
 game=recordHand(game,{handNumber:1,roundWind:'East',eastPlayerId:'1',players:game.players.map((p,i)=>({playerId:p.id,handScore:i===1?22:0,mahJongg:i===1}))});
 assert.equal(game.eastPlayerIndex,1);
 const app=express();app.use(express.urlencoded({extended:true}));
 const setter=()=>{throw Error('Invalid submission changed game');};
 for(const [file,fn] of [['home','registerHomeRoute'],['history','registerHistoryRoute'],['hand-detail','registerHandDetailRoute'],['edit-players','registerEditPlayersRoute'],['edit-last-hand','registerEditLastHandRoute'],['score-hand','registerScoreHandRoute']])require(`../dist/web/routes/${file}-route`)[fn](app,()=>game,setter);
 require('../dist/web/routes/new-game-route').registerNewGameRoute(app,()=>game,setter);
 const server=app.listen(0,'127.0.0.1');await once(server,'listening');
 const base=`http://127.0.0.1:${server.address().port}`;
 try{
 for(const route of ['/','/history','/hand/1','/edit-players','/edit-last-hand','/score-hand']){
 const res=await fetch(base+route);assert.equal(res.status,200);
 const html=await res.text();assert.ok(!html.includes(name),route);assert.match(html,/&lt;img src=x onerror=&quot;alert\(1\)&quot;&gt;/);
 if(route==='/edit-last-hand')assert.match(html,/&lt;img[^]*?<td>East \(1\)<\/td>/);
 }
 for(const route of ['/score-hand','/edit-last-hand']){
 const form=await(await fetch(base+route)).text();
 const token=form.match(/name="gameToken" value="([a-f0-9]+)"/)[1];
 const res=await fetch(base+route,{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:'gameToken='+token+'&score_1=&score_2=22&score_3=0&score_4=0&winnerId=invalid'});
 assert.equal(res.status,200);const html=await res.text();assert.match(html,/current players/);assert.match(html,/safe whole number/);
 }
 const res=await fetch(base+'/new-game',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:'startingWind_0=East&startingWind_1=South&startingWind_2=West&startingWind_3=North&rackColor_0=Red&rackColor_1=Blue&rackColor_2=Green&rackColor_3=Yellow'});
 assert.match(await res.text(),/name cannot be blank/);
 }finally{await new Promise(resolve=>server.close(resolve));}
});
