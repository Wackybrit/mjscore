"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.renderPage = renderPage;
function renderPage(title, body) {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title}</title>

    <style>
        body {
            font-family: Arial, Helvetica, sans-serif;
            margin: 0;
            background-color: #f5f5f5;
            color: #222222;
        }

        header {
            background-color: #333333;
            color: white;
            padding: 1rem 2rem;
        }

        header h1 {
            margin: 0 0 0.75rem 0;
        }

        nav a {
            color: white;
            margin-right: 1rem;
            text-decoration: none;
            font-weight: bold;
        }

        nav a:hover {
            text-decoration: underline;
        }

        main {
            padding: 0.5rem 2rem 1rem 2rem;
        }

        .card {
            background-color: white;
            border: 1px solid #dddddd;
            border-radius: 6px;
            padding: 1rem;
            margin-bottom: 1rem;
            display: inline-block;
        }

        .report {
            font-family: Consolas, "Courier New", monospace;
            border: 1px solid #cccccc;
            padding: 1rem;
            display: inline-block;
            background-color: #f8f8f8;
        }

        button {
            padding: 0.5rem 1rem;
            cursor: pointer;
        }

        input,
        select {
            margin: 0.25rem;
            padding: 0.25rem;
        }

        table {
            border-collapse: collapse;
            background-color: white;
        }

        th,
        td {
            border: 1px solid #cccccc;
            padding: 0.5rem;
            text-align: center;
        }

        th {
            background-color: #f0f0f0;
        }

        .no-border {
            border: none !important;
            background-color: transparent;
        }

        .actions {
            margin-top: 1rem;
            text-decoration: none;
        }

        .actions a {
            margin-right: 0.5rem;
        }
        
        .status-table {
            border-collapse: collapse;
        }

        .status-table td {
            border: none;
            padding: 0 8rem 0 0;
            text-align: left;
        }

        .three-column-section {
            display: flex;
            gap: 6rem;
            align-items: flex-start;
        }

        .coin {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 1.75rem;
            height: 1.75rem;
            border-radius: 50%;
            margin-right: 0.25rem;
            font-size: 0.8rem;
            font-weight: bold;
            border: 1px solid #555555;
        }

        .coin-red {
            background-color: #d9534f;
            color: white;
        }

        .coin-yellow {
            background-color: #f0d94f;
            color: black;
        }

        .coin-green {
            background-color: #5cb85c;
            color: black;
        }

        .coin-blue {
            background-color: #337ab7;
            color: white;
        }

        .coin-white {
            background-color: white;
            color: black;
        }
        
        .primary-action {
            margin-top: 2rem;
            margin-left: 4rem;
        }

        .primary-action button {
            font-size: 1.25rem;
            font-weight: bold;
            padding: 0.75rem 3rem;
            min-width: 300px;

            border: 1px solid #666666;
            border-radius: 8px;

            background: linear-gradient(
                to bottom,
                #ffffff,
                #dddddd
            );

            box-shadow:
                0 4px 0 #999999,
                0 5px 10px rgba(0, 0, 0, 0.15);
        }
        .primary-action button:active {
            transform: translateY(3px);

            box-shadow:
                0 1px 0 #999999,
                0 2px 4px rgba(0, 0, 0, 0.15);
        }
        .primary-action button:hover {
            background: linear-gradient(
                to bottom,
                #ffffff,
                #d0d0d0
            );
        }

        .next-hand-action {
            margin-top: 2rem;
            margin-left: 6rem;
        }

        .next-hand-action button {
            font-size: 1.15rem;
            font-weight: bold;

            padding: 0.6rem 2.5rem;
            min-width: 220px;

            border: 1px solid #666666;
            border-radius: 8px;

            background: linear-gradient(
                to bottom,
                #ffffff,
                #dddddd
            );

            box-shadow:
                0 4px 0 #999999,
                0 5px 10px rgba(0, 0, 0, 0.15);
        }

        .next-hand-action button:active {
            transform: translateY(3px);

            box-shadow:
                0 1px 0 #999999,
                0 2px 4px rgba(0, 0, 0, 0.15);
        }

        .spacer-column {
            border: none !important;
            width: 2rem;
            min-width: 2rem;
            background: transparent !important;
        }
        
        </style>
</head>
<body>
    <header>
        <h1>Mah-Jongg Scorer</h1>

        <nav>
            <a href="/">Current Game</a>
            <a href="/score-hand">Score Hand</a>
            <a href="/history">History</a>
            <a href="/edit-players">Players</a>
            <a href="/save-game">Save</a>
            <a href="/load-game">Load</a>
            <a href="/new-game">New Game</a>
        </nav>
    </header>

    <main>
${body}
    </main>
</body>
</html>
`;
}
//# sourceMappingURL=page-template.js.map