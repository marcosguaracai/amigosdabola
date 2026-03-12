# Copilot Instructions for Amigos da Bola

This project is a web system for the "Amigos da Bola" club, focused on member management, news/blog, and financial control, built with vanilla JavaScript, Firebase, and Tailwind CDN. Use these guidelines to maximize AI agent productivity in this codebase.

## Architecture Overview
- **Frontend only**: All business logic is in ES6 modules under `y/scripts/`, loaded directly in the browser.
- **No build step**: Scripts are referenced via `<script type="module">` in HTML. No bundler or transpiler is used.
- **Firebase integration**: Uses Firestore, Authentication, and Storage. Credentials are set in `y/scripts/firebase-config.js`.
- **UI**: Tailwind CSS (via CDN) for styling, Chart.js (via CDN) for charts.
- **Key HTML pages**: 
  - `index.html` (public/news)
  - `dashboard.html` (post-login overview)
  - `members.html` (member management)
  - `finance.html` (financial dashboard)
  - `gallery.html` (member gallery)

## Developer Workflows
- **No build or test commands**: Edit HTML/JS/CSS directly and reload in browser.
- **Firebase setup**: See `README.md` for step-by-step project and rules setup.
- **First admin**: Create via Firebase Authentication; app auto-creates admin document on first login.
- **CSV import/export**: Use scripts in `tools/` for batch operations (e.g., `build_import_unificado.py`).

## Project Conventions
- **ES6 modules**: All scripts in `y/scripts/` use `export`/`import`.
- **Direct DOM manipulation**: No frameworks (React/Vue/etc). Use plain JS and query selectors.
- **Data access**: All Firestore/Storage access is via the Firebase JS SDK in `firebase-client.js`.
- **Auth checks**: Always check `firebase.auth().currentUser` before sensitive operations.
- **Role management**: Member roles (`admin`, `diretor`, `socio`, etc) are set in Firestore under `members/{uid}`.
- **Assets**: Static assets (logos, config) are in `y/assets/`.

## Integration Points
- **Firebase**: All data and auth flows depend on correct Firebase config and rules.
- **CSV tools**: For bulk member/payment import, use Python scripts in `tools/`.
- **No backend/server**: All logic is client-side except for Firebase.

## Examples
- To add a new member field: update Firestore rules, `members.html`, and `members.js`.
- To add a new dashboard chart: update `dashboard.html` and `dashboard.js`, using Chart.js via CDN.

## References
- See `README.md` for Firebase setup and security rules.
- See `y/scripts/` for all business logic modules.
- See `tools/` for import/export utilities.

---
For any unclear conventions or missing documentation, check `README.md` or ask for clarification.
