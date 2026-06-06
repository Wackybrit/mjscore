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
            font-family: Consolas, "Courier New", monospace;
            margin: 2rem;
        }

        .report {
            border: 1px solid #cccccc;
            padding: 1rem;
            display: inline-block;
            background-color: #f8f8f8;
        }

        button {
            padding: 0.5rem 1rem;
            cursor: pointer;
        }

        input {
            margin: 0.25rem;
        }

        table {
            border-collapse: collapse;
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
    </style>
</head>
<body>
${body}
</body>
</html>
`;
}