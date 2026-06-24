# Instrument Inventory App

Quick scaffold demonstrating inventory, booking/return, calibration, and learning pages.

Run:

1. Install dependencies:

```bash
cd inventory-app
npm install
```

2. Seed DB:

```bash
npm run seed
```

3. Start server:

```bash
npm start
```

Open http://localhost:3000

Notes:
- The app uses SQLite (data.sqlite) and seeds the instruments provided.
- Booking generates an Excel file in the `public` folder.
- Learning content is stored on the instrument records and can be edited via the UI.

Docker (no local Node required)

1. Make sure Docker Desktop is installed and running.
2. From the `inventory-app` folder run:

```powershell
docker compose up --build
```

The service will be available at http://localhost:3000

Remote build via GitHub Actions (no build required locally)

1. Create a GitHub repository and push the contents of this `inventory-app` folder to the repo's root.
2. On push to `main` (or `master`) the included GitHub Actions workflow will build and publish a Docker image to GitHub Container Registry `ghcr.io/${{github.repository_owner}}/instrument-inventory:latest`.
3. To pull and run the published image on any machine with Docker:

```powershell
docker pull ghcr.io/<your-username>/instrument-inventory:latest
docker run -p 3000:3000 ghcr.io/<your-username>/instrument-inventory:latest
```

Note: The workflow uses the repository owner's GHCR permissions. If you prefer Docker Hub, I can add a workflow to push there instead (requires `DOCKERHUB_USERNAME` and `DOCKERHUB_TOKEN` secrets).
