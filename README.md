# MJScore

British Mahjong scoring application. Node 24, TypeScript, Express; HTTP port 3000.

## Development

```sh
npm ci
npm run build
npm start
```

Alternatively: `docker compose -f compose.dev.yaml up -d --build`.
Development uses local `data/`. Never point development at live Porky data.

## Published images

The existing repository is https://github.com/Wackybrit/mjscore.
Push reviewed changes to `main` to build and test an amd64 Linux image, then publish:

- `ghcr.io/wackybrit/mjscore:latest`
- `ghcr.io/wackybrit/mjscore:sha-<full-commit-id>` for rollback

Pull requests build and test without publishing. Manual runs publish only from main.
Actions uses its built-in `GITHUB_TOKEN` with `packages: write`; no publishing PAT is needed.
Enable Actions in the repository if disabled. After the first successful publish, check
package settings: new GHCR packages are private by default. For unauthenticated pulls,
explicitly make the package public if that is desired. Otherwise log in to GHCR on
Porky using a classic PAT with `read:packages`, supplied through `--password-stdin`.
Never put tokens in Compose, XML, or Git. Repository visibility need not change.

## Data and first migration on Porky

The app reads and writes `/app/data/current-game.json` and `/app/data/saved-games/`.
The image never copies development data. Both deployment options bind the existing
`/mnt/user/appdata/mjscore/data` directory. Check the LIVE container's mount first;
if different, use its real source directory in the new configuration.

```sh
docker inspect mjscore --format '{{json .Mounts}}'
docker inspect mjscore > /mnt/user/appdata/mjscore/container-before-migration.json
docker inspect mjscore --format '{{.Image}}'
```

Record the image ID and tag it `mjscore:pre-ghcr` before migration. Pull the new image
successfully before stopping the old container. Stop MJScore, then back up the entire
live data directory to a separate dated folder before replacing its container.
Keep the old image and saved configuration until the new deployment is verified.
Do not copy the Expansion drive's data onto Porky. Verify current game, history, and
named saves after migration. Only one running MJScore container may use live data.
The initial migration requires replacing the old container once; updates then use
the published image. Removing a container must not delete its host data directory.

## Option A: Unraid Docker page (recommended for Porky)

Use Unraid's existing MJScore template if present: change Repository to
`ghcr.io/wackybrit/mjscore:latest`, verify bridge networking, port `3000:3000`, and the
existing data mapping to `/app/data`, then Apply after the backup above.

If no template exists, copy `unraid/my-mjscore.xml` to
`/boot/config/plugins/dockerMan/templates-user/my-mjscore.xml` without overwriting an
existing template. After backing up and removing the old stopped container, choose
Docker > Add Container and select the mjscore user template. Verify its paths before
applying. Enable Autostart in Unraid.

Future updates: push code to main, wait for Actions to succeed, then use Unraid's
Check for Updates / Apply Update. No source copy or server-side build is needed.
Use native Unraid controls for this option; do not also manage it through Compose.

## Option B: Docker Compose

Requires Docker Compose v2 on Porky. Store `compose.yaml` in a dedicated deployment
folder, for example `/mnt/user/appdata/mjscore/deployment/`. Optionally copy
`.env.example` to `.env` there and adjust it. The data directory must already exist;
Compose deliberately fails instead of creating an empty folder for a mistyped path.
After the first-migration backup and removal of the old stopped container:

```sh
docker compose pull
docker compose up -d --wait
```

Use the same two commands for subsequent updates from that deployment directory.
Compose automatically recreates the container when the image changes and retains
the host data. A restart alone does not apply a new image. Do not use native Unraid
Apply Update to manage this Compose-owned container.

## Rollback

Stop the new container before rollback. For native Unraid, set Repository to the
previous `ghcr.io/wackybrit/mjscore:sha-<full-commit-id>` and Apply. For Compose, set
`MJSCORE_IMAGE` to that tag in `.env`, then run the pull/up commands above.
For the first migration, use the retained `mjscore:pre-ghcr` image with the saved
original settings (Compose: set the image and run `docker compose up -d --pull never`).
A code rollback does not revert saved data: if a future release changes data formats,
restore its compatible pre-update backup while the app is stopped.

## Repository hygiene

`data/`, `dist/`, `node_modules/`, and secrets are ignored. Older commits still contain
previously tracked data/build files; untracking them does not erase Git history.
Do not delete local game data when cleaning up tracking.

## Runtime compatibility

The runtime keeps the original image's root user for compatibility with existing
Unraid data permissions; this change does not recursively chown the data directory.
The service has no authentication; retain the existing trusted-LAN deployment.

## References

- https://docs.github.com/en/actions/tutorials/publish-packages/publish-docker-images
- https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry
- https://docs.docker.com/reference/compose-file/services/
- https://docs.unraid.net/unraid-os/using-unraid-to/run-docker-containers/managing-and-customizing-containers/

## Saved-game cleanup (1.2.0)

On Load Saved Game, select Remove beside a save. Review its name, players, hand
count and saved time, then type its exact name to confirm. A changed file or expired
confirmation must be reviewed again. Removing a saved copy never changes the active
game. Removed copies are stored under `/app/data/removed-games`, on the same persistent
volume as your saves, and can be restored from Removed games. Restore refuses to
overwrite an existing save of the same name. There is no permanent-delete button
or automatic expiry; removed copies still use disk space and should remain included
in data backups. This is intended for cleanup of the save list, not freeing storage.

`npm test` compiles and tests confirmation, file selection, persistence and restoration
using temporary data. Docker builds run these checks before publishing.

## Save integrity and recovery

Current-game and named saves are validated, written to a unique temporary file in
the destination directory, flushed, and then renamed over the destination. A
failed write leaves the previous save intact. The visible active game updates only
after its save succeeds. This reduces incomplete-save risks; keep regular backups
for hardware failures and power loss. An interrupted process can leave a hidden
`.mjscore-*.tmp` file, which is ignored by the saved-game list.

Loading validates player and hand structure and checks totals, East position and
round progression against the recorded hands. Invalid named saves show an error
without changing the active game or modifying the saved file. Existing compatible
JSON saves need no migration. Saving under an existing name requires confirmation before replacing that
named save.

If `current-game.json` is damaged, incompatible or unreadable at startup, MJScore
serves a recovery page and refuses game changes, preserving that file. Stop the
container, back up the data folder including the damaged file, restore a known good
`current-game.json` (or copy a known good named save to that filename), and restart.
For an access error, correct the data folder permissions while the app is stopped.
A missing current-game file still starts the usual default game.

The persistence tests use temporary directories and simulate partial writes, flush
and rename failures, invalid JSON/data, failed loads and startup recovery. They do
not write to development or Porky game data.

## Duplicate and outdated hand forms

Scoring and latest-hand correction forms belong to the game state shown when the
page was opened. A successful game change invalidates earlier forms, including
forms in another browser or tab. Double submissions, old forms after loading or
starting a game, and forms opened before a restart show a refresh message without
changing the game. Check Current game before opening a fresh form and re-entering
a hand. Validation and storage failures leave the form valid for a retry while the
game stays unchanged. Forms do not expire just because a playing session is long.

## Confirming replacements

Saving with a new name works immediately. If the name matches an existing save
(including differences in case, spaces or punctuation removed from filenames),
MJScore shows the actual saved name, existing players and completed-hand count,
and the current game that would replace it. A damaged existing save can also be
reviewed and replaced; its details are marked unavailable.

New Game and Load show the current game and its proposed replacement before
changing the active game or its automatic save. Save the current game under a name
first if you want to retain it. These actions never change named saved copies.

Choose the explicit replacement button to proceed, or Cancel to keep the existing
game. Confirmation pages do not change files. Confirmations are single-use, expire
after 15 minutes, and must be reviewed again if the current game or selected saved
file changes. They also expire on restart. Failed storage writes keep the previous
files and allow retrying the confirmation while the reviewed state is unchanged.

## Scoring and game-progression tests

Dedicated worked examples check exact payments and net balances when East wins or
loses, tied losing scores, and a winner whose raw score is below another player's.
They cover every combination of winner and East seat and verify that balances sum
to zero. Invalid winner counts are rejected without changing the game.

Progression tests cover all starting East positions, each seat wind, all four round
winds and the return to East, with repeated East wins delaying round changes. They
also check accumulated totals, preservation of earlier game snapshots, rebuilding
history, and corrections that change scores, change the winner, or undo a round
transition. Run them with the rest of the suite using `npm test`.

## Ending a full game

A full game consists of two East/South/West/North cycles. The game ends when East
advances for the fourth time in the second North round. East wins retain the turn
and can extend the game beyond 32 hands.

After the final hand, Game Over replaces Next Hand and opens a final scoreboard
with a winner banner. Players tied for the highest cumulative score are joint
winners. Completed games remain available for history, named saving, and loading;
additional hands cannot be scored. Correcting the latest hand recalculates the
results and reopens play if East should have retained the final turn.

Completion is derived from the existing round counter, so no new save-file fields
are needed. The final screen is designed to fit a landscape iPad and TV display.

## Dead hands and replays

Use Dead Hand beside MAH-JONGG on Current Game Status when no player wins before
the eligible tiles run out. History records a labelled dead hand with zero scores,
no winner and no payments. Totals, seat winds and round wind stay unchanged.
Repeated dead hands keep the same winds; they never count toward round completion.

The next properly completed hand is a replay: score it normally, including East's
doubled payments, but pass East even if East wins. Subsequent hands return to normal
rules. Replay notices appear on the current-game and score-entry screens, and
history labels the completed replay. The replay status is derived from the last
history entry and survives saving, loading and restarting.

Edit Last Hand offers Completed hand and Dead hand outcomes. Changing the outcome
rebuilds totals and winds, including replay behavior and whether the game is over.
Hand numbers identify history entries, so dead hands have their own numbered entry
without advancing winds. Older saves without a dead-hand marker remain compatible.
Dead hands cannot be declared after the game has ended.
