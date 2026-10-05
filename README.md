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
