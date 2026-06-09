export function renderPage(
    title: string,
    body: string
): string {
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
            padding: 2rem;
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
    </style>
</head>
<body>
    <header>
        <h1>Mah-Jongg Scorer</h1>

        <nav>
            <a href="/">Current Game</a>
            <a href="/score-hand">Score Hand</a>
            <a href="/history">History</a>
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