const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { once } = require('node:events');
const root = path.resolve(__dirname, '..');
const originalCwd = process.cwd();
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'mjscore-cleanup-'));
process.chdir(dir);
const p = require(path.join(root, 'dist/services/persistence-service'));
const cleanup = require(path.join(root, 'dist/services/saved-game-cleanup'));
const { createGame } = require(path.join(root, 'dist/services/game-service'));
const { registerSaveLoadRoute } = require(path.join(root, 'dist/web/routes/save-load-route'));
const express = require('express');

test('protected removal and restoration preserve files and the current game', async () => {
 const game = createGame(['<Alice>', 'B', 'C', 'D'], 0);
 p.saveGame(game); p.saveGameAs(game, 'old-game'); p.saveGameAs(game, 'keep-me');
 const current = fs.readFileSync('data/current-game.json');
 const original = fs.readFileSync('data/saved-games/old-game.json');
 const app = express(); app.use(express.urlencoded({extended:true}));
 registerSaveLoadRoute(app, () => game, () => { throw Error('Cleanup must not change active game'); });
 const server = app.listen(0, '127.0.0.1');
 await once(server, 'listening');
 const base = `http://127.0.0.1:${server.address().port}`;
 const get = async route => (await fetch(base+route)).text();
 const post = (route, body) => fetch(base+route, {method:'POST', redirect:'manual', headers:{'Content-Type':'application/x-www-form-urlencoded'}, body:new URLSearchParams(body)});
 const token = html => html.match(/name="token" value="([a-f0-9]+)"/)[1];
 try {
  assert.match(await get('/load-game'), /Remove…/);
  const page = await get('/remove-saved-game?name=old-game');
  assert.match(page, /&lt;Alice&gt;/); assert.match(page, /Completed hands/);
  const first = token(page);
  assert.equal((await post('/remove-saved-game',{token:first,confirmation:'keep-me'})).status,400);
  assert.ok(fs.existsSync('data/saved-games/old-game.json'));
  assert.equal((await post('/remove-saved-game',{confirmation:'old-game'})).status,400);
  fs.appendFileSync('data/saved-games/old-game.json','\n');
  assert.equal((await post('/remove-saved-game',{token:first,confirmation:'old-game'})).status,400);
  assert.ok(fs.existsSync('data/saved-games/old-game.json'));
  fs.writeFileSync('data/saved-games/old-game.json',original);
  const expired = token(await get('/remove-saved-game?name=old-game'));
  const realNow = Date.now;
  try {
   Date.now = () => realNow() + 16 * 60 * 1000;
   assert.equal((await post('/remove-saved-game',{token:expired,confirmation:'old-game'})).status,400);
  } finally { Date.now = realNow; }
  const next = token(await get('/remove-saved-game?name=old-game'));
  assert.equal((await post('/restore-saved-game',{token:next})).status,400);
  assert.equal((await post('/remove-saved-game',{token:next,confirmation:'old-game'})).status,303);
  assert.equal((await post('/remove-saved-game',{token:next,confirmation:'old-game'})).status,400);
  assert.equal(fs.existsSync('data/saved-games/old-game.json'),false);
  assert.ok(fs.existsSync('data/saved-games/keep-me.json'));
  assert.deepEqual(fs.readFileSync('data/current-game.json'),current);
  assert.equal(cleanup.listRemovedGames()[0].name,'old-game');
  p.saveGameAs(game,'old-game');
  const restoreConflict = token(await get('/removed-games'));
  assert.equal((await post('/restore-saved-game',{token:restoreConflict})).status,400);
  assert.equal(cleanup.listRemovedGames().length,1);
  fs.unlinkSync('data/saved-games/old-game.json');
  const restore = token(await get('/removed-games'));
  assert.equal((await post('/restore-saved-game',{token:restore})).status,303);
  assert.deepEqual(fs.readFileSync('data/saved-games/old-game.json'),original);
  assert.deepEqual(cleanup.listRemovedGames(),[]);
  for (const name of ['../current-game', 'old game', 'OLD-GAME', '', '/tmp/test']) {
   assert.throws(()=>cleanup.inspectSavedGame(name));
  }
  fs.symlinkSync(path.resolve('data/current-game.json'),'data/saved-games/symlink.json');
  assert.throws(()=>cleanup.inspectSavedGame('symlink'));
  fs.writeFileSync('data/saved-games/broken.json','invalid JSON');
  const broken = cleanup.inspectSavedGame('broken');
  cleanup.removeSavedGame('broken',broken.fingerprint);
  cleanup.restoreSavedGame(cleanup.listRemovedGames()[0].id);
  assert.equal(fs.readFileSync('data/saved-games/broken.json','utf8'),'invalid JSON');
  p.saveGameAs(game,'name_with_underscores');
  cleanup.removeSavedGame('name_with_underscores',cleanup.inspectSavedGame('name_with_underscores').fingerprint);
  const item=cleanup.listRemovedGames()[0];assert.equal(item.name,'name_with_underscores');cleanup.restoreSavedGame(item.id);
  assert.deepEqual(fs.readFileSync('data/current-game.json'),current);
 } finally {
  await new Promise(resolve=>server.close(resolve));
  process.chdir(originalCwd);
  fs.rmSync(dir,{recursive:true,force:true});
 }
});
