export const clubTableStyles = `
:root { --paper:#133227; --panel:#254c3b; --ink:#fff4da; --muted:#d3decb; --line:#526f58; --green:#efdbac; --gold:#e6cb88; --gold-soft:#3b573e; }
* { box-sizing:border-box; }
body { margin:0; color:var(--ink); background:var(--paper); font:17px/1.4 -apple-system,BlinkMacSystemFont,"Segoe UI",Arial,sans-serif; }
a { color:var(--green); }
header { background:#102e24; color:#fff4da; }
.brand-row { max-width:1260px; margin:auto; padding:16px 28px; display:flex; align-items:center; justify-content:space-between; gap:16px; }
header h1 { margin:0; font-size:27px; letter-spacing:-.7px; }
header h1 a { text-decoration:none; color:inherit; }
.brand-tag { color:#efdbac; font-size:12px; letter-spacing:.15em; margin-left:12px; font-weight:500; }
.brand-description { font-size:13px; color:#d3decb; }
nav { display:flex; flex-wrap:wrap; gap:4px; padding:7px max(20px,calc((100% - 1220px)/2)); background:var(--panel); border-bottom:1px solid var(--line); }
nav a { display:inline-flex; align-items:center; min-height:44px; padding:8px 12px; border-radius:8px; color:var(--muted); text-decoration:none; font-size:15px; font-weight:600; }
nav a[aria-current="page"], nav a:hover { background:var(--gold-soft); color:var(--ink); }
main { max-width:1260px; padding:24px 28px 32px; margin:0 auto; }
.completed-game { padding-top:16px; padding-bottom:16px; }
h2 { margin:0 0 18px; font-size:30px; line-height:1.2; letter-spacing:-.5px; }
h3 { margin:18px 0 12px; font-size:21px; }
p { margin:12px 0; }
.eyebrow { margin:0 0 7px; color:var(--muted); font-size:13px; text-transform:uppercase; letter-spacing:.1em; }
.page-heading { display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:16px; margin-bottom:22px; }
.page-heading h2 { margin:0; }
.round-summary { display:flex; align-items:center; gap:14px; padding:12px 18px; background:var(--panel); border:1px solid var(--line); border-radius:18px; }
.round-glyph { font-family:"Apple Symbols","Segoe UI Symbol","Noto Sans Symbols 2",sans-serif; font-size:64px; line-height:1; color:var(--green); }
.round-summary strong { display:block; }
.round-summary small { color:var(--muted); }
.player-cards { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:16px; }
.player-card { min-width:0; padding:20px; border:1px solid var(--line); border-top:10px solid var(--rack); border-radius:18px; background:var(--panel); }
.player-card-heading { display:flex; gap:8px; align-items:center; justify-content:space-between; flex-wrap:wrap; }
.player-card h3 { margin:0; font-size:25px; overflow-wrap:anywhere; }
.east-badge { color:var(--ink); background:var(--gold-soft); border-radius:5px; padding:4px 7px; font-size:11px; font-weight:700; letter-spacing:.06em; }
.seat-wind { margin:16px 0 10px; font-size:23px; font-weight:650; white-space:nowrap; }
.wind-number { color:var(--green); font-weight:700; }
.player-total { font-size:50px; font-weight:700; line-height:1.12; letter-spacing:-1.5px; font-variant-numeric:tabular-nums; overflow-wrap:anywhere; }
.score-caption { color:var(--muted); font-size:13px; margin-top:5px; }
.round-progress { list-style:none; display:flex; flex-wrap:wrap; gap:6px; padding:0; margin:22px 0; color:var(--muted); font-size:13px; }
.round-progress li { padding:6px 10px; border-radius:6px; }
.round-progress li[aria-current="step"] { color:var(--ink); background:var(--gold-soft); font-weight:700; }
.round-progress li.completed { color:var(--green); }
button,.button { display:inline-flex; justify-content:center; align-items:center; gap:8px; min-height:48px; padding:11px 20px; border:1px solid var(--line); border-radius:10px; background:var(--panel); color:var(--ink); font-family:inherit; font-size:17px; font-weight:600; line-height:1.3; text-decoration:none; cursor:pointer; }
button:hover,.button:hover { border-color:var(--green); }
.button-primary,.primary-action>a:first-child>button,.actions>button:first-child,.next-hand-action button { background:var(--green); border-color:var(--green); color:#193e30; }
.primary-action { margin:24px 0 0; }
.primary-action button { min-height:62px; min-width:230px; padding:14px 26px; font-size:20px; }
.game-actions { display:flex; flex-wrap:wrap; gap:14px; align-items:flex-start; }
.game-actions form { margin:0; }
.game-actions button { min-height:64px; }
.actions { display:flex; gap:12px; flex-wrap:wrap; align-items:center; margin-top:20px; }
.actions a { text-decoration:none; }
.next-hand-action { margin:24px 0 0; }
.next-hand-action button { font-size:20px; min-width:230px; min-height:56px; }
.card { display:inline-block; padding:16px 20px; margin-bottom:20px; border:1px solid var(--line); border-radius:16px; background:var(--panel); max-width:100%; }
.status-table { border:0; background:transparent; }
.status-table td { border:0; padding:4px 20px 4px 0; text-align:left; }
.status-table td:last-child { padding-right:0; }
table { border-collapse:collapse; background:var(--panel); max-width:100%; }
th,td { padding:10px 12px; border-bottom:1px solid var(--line); text-align:center; font-variant-numeric:tabular-nums; }
th { color:var(--muted); background:#2d5541; font-size:15px; font-weight:600; }
td { font-size:17px; }
.no-border { border:0!important; background:transparent; }
.spacer-column { border:0!important; width:20px; min-width:20px; background:var(--paper)!important; }
.three-column-section { display:flex; flex-wrap:wrap; gap:28px; align-items:flex-start; }
.three-column-section table { min-width:190px; }
.hand-summary + .three-column-section h3 { margin-top:6px; }
.hand-actions .button-primary { min-width:230px; min-height:56px; font-size:20px; }
.hand-value { font-size:22px; font-weight:650; }
.rack-highlight { color:#133227; }
.rack-highlight .payment-note { color:#244231; }
.payment-note { display:block; font-size:12px; color:var(--muted); font-weight:400; margin-top:4px; }
input,select { font:inherit; color:var(--ink); background:var(--panel); border:1px solid #80967c; border-radius:8px; padding:9px 10px; margin:4px; min-height:44px; max-width:100%; }
input[type="number"] { width:145px; font-size:22px; font-variant-numeric:tabular-nums; }
input[type="radio"],input[type="checkbox"] { width:22px; height:22px; min-height:22px; accent-color:var(--green); }
input:disabled { opacity:.5; }
.replay-notice { padding:12px 16px; margin:0 0 20px; border-left:4px solid var(--gold); background:var(--gold-soft); border-radius:0 8px 8px 0; }
.muted { color:var(--muted); }
.entry-table { width:100%; }
.entry-table input { margin:0; }
.outcome-controls { display:flex; flex-wrap:wrap; align-items:center; gap:16px; margin-bottom:18px; }
.settings-section .muted { font-size:16px; }
.entry-table td { padding:12px 16px; }
.entry-table .entry-player { text-align:left; font-size:22px; font-weight:650; }
.entry-table td:nth-child(2),.entry-wind { font-size:23px; font-weight:650; }
.winner-choice { display:flex; align-items:center; justify-content:center; gap:7px; min-height:48px; }
.settings-form { max-width:800px; }
.settings-section { padding:18px 22px; background:var(--panel); border:1px solid var(--line); border-radius:16px; margin-bottom:18px; }
.settings-section h3 { margin-top:0; }
.toggle-label { display:flex; gap:12px; align-items:center; min-height:48px; font-size:20px; font-weight:600; }
.settings-section input[type="number"] { display:block; margin:10px 0; width:180px; }
.report { white-space:pre-wrap; background:var(--panel); border:1px solid var(--line); padding:16px; }
.coin { display:inline-flex; align-items:center; justify-content:center; width:29px; height:29px; border-radius:50%; margin-right:4px; font-size:13px; font-weight:700; border:1px solid #626c61; }
.coin-red { background:#c3544f; color:white; }.coin-yellow { background:#ead57c; color:#213b30; }.coin-green { background:#86bd91; color:#213b30; }.coin-blue { background:#3b78ac; color:white; }.coin-white { background:white; color:#213b30; }
.table-scroll { max-width:100%; overflow-x:auto; }
.history-table { width:100%; }
:focus-visible { outline:3px solid #e6cb88; outline-offset:3px; }
@media(max-width:800px) { .player-cards { grid-template-columns:repeat(2,minmax(0,1fr)); }.brand-description { display:none; }.three-column-section { gap:18px; }.entry-table td { padding:10px 8px; }.entry-player { font-size:19px; } }
@media(max-width:520px) { main { padding:20px 14px; }.brand-row { padding:16px; }.brand-tag { display:none; }nav { padding:6px; }nav a { padding:8px 10px; font-size:14px; }.player-card { padding:16px 12px; }.player-card h3 { font-size:22px; }.player-total { font-size:38px; }.seat-wind { font-size:20px; }.page-heading h2 { font-size:26px; }.primary-action { margin-top:20px; }.game-actions>a,.game-actions form,.game-actions button { width:100%; }.status-table td { padding:4px 10px 4px 0; }.entry-table th { font-size:12px; }.entry-table td { padding:9px 4px; }.entry-table .entry-player { font-size:16px; }.entry-wind { font-size:17px; }.entry-table input[type="number"] { width:82px; margin:0; padding:8px 5px; font-size:20px; }.winner-choice { font-size:0; }.winner-choice input { min-width:24px; }.settings-section { padding:18px; } }
`;
