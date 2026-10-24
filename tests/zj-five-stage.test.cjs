const fs = require('fs'), vm = require('vm'), assert = require('assert');
const src = fs.readFileSync(require('path').join(__dirname, '../zj-mode.js'), 'utf8');
const course = [0, 1, 10, 11, 23];
function setup(hash, initial = {}) {
  const store = { ...initial }, els = {}, callbacks = {}, played = [];
  const element = id => els[id] || (els[id] = {
    innerHTML: '', textContent: '', className: '', href: '', style: {}, dataset: {}, disabled: false,
    append() {}, prepend() {}, before() {}, after() {}, focus() {}, setAttribute() {}, remove() {},
    querySelector(sel) { return element(id + sel); }, querySelectorAll() { return []; }
  });
  const originalFinish = win => { if (win) box.prog[box.cur.i] = 3; }, originalMap = () => 10, originalGame = () => 'original';
  const scenes = Array.from({ length: 132 }, () => ({ n: 'other', d: 0 }));
  ['巷口的家', '高樓夾縫', '電塔下的家', '左右高低', '大樓之間'].forEach((n, j) => { scenes[course[j]] = { n, d: j < 2 ? 0 : j < 4 ? 1 : 2 }; });
  const box = {
    URLSearchParams, URL, Intl, Date, Uint32Array, crypto: require('crypto').webcrypto,
    location: { hash, href: 'https://example.test/' + hash, reload() {} },
    localStorage: { getItem: k => store[k] ?? null, setItem: (k, v) => store[k] = v, removeItem: k => delete store[k] },
    document: { createElement: element, head: element('head'), body: element('body'), getElementById: element, querySelector: () => null, querySelectorAll: () => [] },
    MutationObserver: class { observe() {} }, S: scenes, REF: 'OriginalABC', cur: { i: 0 },
    GAME_URL: 'https://xunfeng-game.vercel.app/', app: element('app'), ovl: element('ovl'),
    finish: originalFinish, mapScreen: originalMap, gameLink: originalGame, shareURL: () => 'originalShare',
    quickStart: () => 'originalStart', resumeMid: () => 'resumed', midSave: null, tabD: 0,
    prog: {}, ORDER: Array.from({ length: 132 }, (_, i) => i), levels: () => 'allLevels',
    badKeys: () => ['target'], play: i => played.push(i), navigator: {},
    addEventListener: (e, fn) => callbacks[e] = fn
  };
  box.window = box; vm.createContext(box); vm.runInContext(src, box);
  return { box, store, els, played, originalFinish, originalMap, originalGame };
}
async function main() {
  for (const hash of ['#r=OriginalABC', '', '#r=rose&m=zj']) {
    const t = setup(hash, { zjMode: 'zj' });
    assert.strictEqual(t.box.finish, t.originalFinish); assert.strictEqual(t.box.mapScreen, t.originalMap);
    assert.strictEqual(t.box.gameLink, t.originalGame); assert.equal(t.box.REF, 'OriginalABC'); assert(!t.els.link);
  }
  console.log('PASS ordinary functions, 10-piece map and referral preserved; exact Rose required');
  const off = setup('#m=off', { zjMode: 'zj', 'xunfeng-zj-reward-v1': '{"redeemedAt":"keep"}' });
  assert(!off.store.zjMode); assert.equal(off.store['xunfeng-zj-reward-v1'], '{"redeemedAt":"keep"}');
  const t = setup('#r=Rose&m=zj');
  assert.equal(t.box.REF, 'Rose'); assert(t.box.gameLink().endsWith('#r=Rose&m=zj'));
  t.box.quickStart(); assert.deepEqual(t.played, [0]);
  t.box.finish(false); assert(!t.store['xunfeng-zj-reward-v1']);
  for (let j = 0; j < 4; j++) {
    t.box.cur.i = course[j]; t.box.finish(true); t.box.finish(true);
    assert(!JSON.parse(t.store['xunfeng-zj-reward-v1']).code);
    t.box.quickStart(); assert.equal(t.played.at(-1), course[j + 1]);
  }
  t.box.cur.i = 2; t.box.finish(true); assert(!JSON.parse(t.store['xunfeng-zj-reward-v1']).code);
  const resumed = setup('#r=Rose&m=zj', t.store); resumed.box.quickStart(); assert.deepEqual(resumed.played, [23]);
  t.box.cur.i = 23; t.box.finish(true);
  let state = JSON.parse(t.store['xunfeng-zj-reward-v1']);
  assert(/^\d{6}$/.test(state.code)); assert(state.earnedAt); assert(t.box.ovl.innerHTML.includes('五關完成'));
  assert(t.box.ovl.innerHTML.includes('完整遊戲共有 132 關'));
  assert(t.box.ovl.innerHTML.includes('還有 126 關'));
  assert(t.box.ovl.innerHTML.indexOf('zj-moreplay') < t.box.ovl.innerHTML.indexOf('<picture>'));
  const ticketBeforePlay = t.store['xunfeng-zj-reward-v1'];
  t.els['zj-play-more'].onclick(); assert.equal(t.played.at(-1), 3);
  assert.equal(t.store['xunfeng-zj-reward-v1'], ticketBeforePlay);
  assert.equal(t.els['zj-all-levels'].onclick(), undefined);
  t.box.midSave = { i: 42, f: [] }; assert.equal(t.box.quickStart(), 'resumed'); t.box.midSave = null;
  console.log('PASS 3/4 wins stay locked; failures, repeats and unrelated levels cannot bypass final stage; progress resumes');
  t.els['zj-confirm'].dataset.staffConfirmed = 'yes'; await t.els['zj-confirm'].onclick();
  state = JSON.parse(t.store['xunfeng-zj-reward-v1']); assert(state.redeemedAt);
  const next = setup('#r=Rose&m=zj', t.store); next.box.mapScreen();
  assert(next.box.ovl.innerHTML.includes('已兌換 · 不可再次領取'));
  assert(next.box.ovl.innerHTML.includes('完整遊戲共有 132 關'));
  next.box.prog = { ...t.box.prog };
  next.box.quickStart(); assert.equal(next.played.at(-1), 3);
  assert.equal(JSON.parse(next.store['xunfeng-zj-reward-v1']).code, state.code);
  const redeemedBeforePlay = next.store['xunfeng-zj-reward-v1'];
  next.box.cur.i = 3; next.box.finish(true);
  assert.equal(JSON.parse(next.store['xunfeng-zj-reward-v1']).redeemedAt, JSON.parse(redeemedBeforePlay).redeemedAt);
  next.box.prog = Object.fromEntries(next.box.ORDER.map(i => [i, 3]));
  assert.equal(next.box.quickStart(), 'allLevels');
  console.log('PASS 132-level invitation above poster; continue before/after redeem, saved game, all-levels fallback, ticket retained');
  for (const redeemedAt of ['', state.redeemedAt]) {
    const legacy = { version: 1, cleared: [0, 1, 2], code: '012345', earnedAt: state.earnedAt, redeemedAt };
    const old = setup('#r=Rose&m=zj', { 'xunfeng-zj-reward-v1': JSON.stringify(legacy) });
    old.box.mapScreen(); assert(old.box.ovl.innerHTML.includes('012345'));
    if (redeemedAt) assert(old.box.ovl.innerHTML.includes('已兌換 · 不可再次領取'));
    else { old.els['zj-confirm'].dataset.staffConfirmed = 'yes'; await old.els['zj-confirm'].onclick(); assert(JSON.parse(old.store['xunfeng-zj-reward-v1']).redeemedAt); }
  }
  console.log('PASS redemption persistence, mode-off and legacy issued codes retained');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
