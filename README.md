# SignComms

A real-time sign language recognition and translation app.

## Features
- Real-time hand sign detection (Camera + ML)
- Text and speech output
- User authentication (register/login)
- Modern dark/green UI

## Setup

### Backend (Flask)
```sh
python -m venv .venv
source .venv/bin/activate  # or .venv\\Scripts\\activate on Windows
pip install -r requirements.txt
python reset_db.py
python app.py
```

### Frontend (React)
```sh
cd src
npm install
npm run dev
```

## Deployment

- For static frontend: use GitHub Pages or Vercel/Netlify.
- For backend: deploy to Heroku, Render, or your own server.

## License
MIT
