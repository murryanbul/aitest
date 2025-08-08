# FlashShare

A lightweight Flask app for sharing files with a drag-and-drop interface and glassmorphism UI.

## Features
- Drag-and-drop uploads with a progress bar
- Image thumbnails and generic icons for other files
- Glassmorphism styling
- Supports files up to 50 MB
- Delete and download files

## Local Development
1. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
2. Run the application:
   ```bash
   python app.py
   ```
   The server starts at `http://localhost:5050`.

## Deployment
### Replit
1. Create a new Replit and import this repository.
2. Install dependencies automatically or run `pip install -r requirements.txt`.
3. Set the Run command to `python app.py`.
4. Replit will provide a public URL to preview the app.

### Render
1. Push this repository to GitHub.
2. Create a new **Web Service** on Render and connect the repo.
3. Build command: `pip install -r requirements.txt`
4. Start command: `gunicorn app:app`
5. Render will deploy the service and supply a public URL.

Uploads are saved to the `uploads/` directory on the server.
