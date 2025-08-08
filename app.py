import os
import io
import shutil
import zipfile
from datetime import datetime
from flask import (
    Flask,
    render_template,
    request,
    send_from_directory,
    flash,
    jsonify,
    send_file,
    abort,
)
from werkzeug.utils import secure_filename
from werkzeug.exceptions import RequestEntityTooLarge

UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {
    'txt', 'pdf', 'png', 'jpg', 'jpeg', 'gif', 'zip',
    'mp4', 'mp3', 'csv', 'xlsx', 'docx'
}
IMAGE_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}

app = Flask(__name__)
app.secret_key = "file-sharing-secret-key"
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = 50 * 1024 * 1024  # 50MB limit

if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)


def safe_path(*paths):
    base = os.path.abspath(app.config['UPLOAD_FOLDER'])
    final = os.path.abspath(os.path.join(base, *paths))
    if os.path.commonpath([final, base]) != base:
        raise ValueError("Unsafe path")
    return final

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def get_files(path=""):
    directory = safe_path(path)
    entries = []
    for name in os.listdir(directory):
        full = os.path.join(directory, name)
        rel_path = os.path.join(path, name) if path else name
        stat = os.stat(full)
        is_folder = os.path.isdir(full)
        extension = name.rsplit('.', 1)[1].lower() if '.' in name else ''
        entries.append({
            'name': name,
            'path': rel_path.replace("\\", "/"),
            'size': stat.st_size,
            'date': datetime.fromtimestamp(stat.st_ctime).strftime("%Y-%m-%d %H:%M"),
            'is_image': extension in IMAGE_EXTENSIONS,
            'is_folder': is_folder,
        })
    entries.sort(key=lambda f: (not f['is_folder'], f['name'].lower()))
    return entries

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def index(path):
    files = get_files(path)
    breadcrumbs = []
    if path:
        parts = path.split('/')
        accum = ''
        for part in parts:
            accum = os.path.join(accum, part) if accum else part
            breadcrumbs.append({'name': part, 'path': accum.replace("\\", "/")})
    return render_template('index.html', files=files, path=path, breadcrumbs=breadcrumbs)


@app.route('/upload', methods=['POST'])
def upload():
    path = request.args.get('path', '')
    if 'file' not in request.files:
        return jsonify({'success': False, 'error': 'No file part'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'success': False, 'error': 'No selected file'}), 400
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        dest = safe_path(path, filename)
        os.makedirs(os.path.dirname(dest), exist_ok=True)
        file.save(dest)
        return jsonify({'success': True, 'filename': filename})
    return jsonify({'success': False, 'error': 'File type not allowed'}), 400


@app.errorhandler(RequestEntityTooLarge)
def file_too_large(e):
    return jsonify({'success': False, 'error': 'File too large (max 50MB)'}), 413

@app.route('/uploads/<path:filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

@app.route('/delete/<path:filepath>', methods=['POST'])
def delete_file(filepath):
    try:
        path = safe_path(filepath)
    except ValueError:
        return jsonify({'success': False}), 400
    if os.path.isdir(path):
        shutil.rmtree(path, ignore_errors=True)
        flash(f"Deleted {filepath}.", "success")
        return jsonify({'success': True})
    if os.path.exists(path):
        os.remove(path)
        flash(f"Deleted {filepath}.", "success")
        return jsonify({'success': True})
    flash("File not found.", "danger")
    return jsonify({'success': False}), 404


@app.route('/rename/<path:filepath>', methods=['POST'])
def rename_file(filepath):
    data = request.get_json() or {}
    new_name = secure_filename(data.get('new_name', ''))
    if not new_name:
        return jsonify({'success': False, 'error': 'Invalid name'}), 400
    directory = os.path.dirname(filepath)
    try:
        src = safe_path(filepath)
        dest = safe_path(directory, new_name)
    except ValueError:
        return jsonify({'success': False}), 400
    if os.path.exists(src):
        os.rename(src, dest)
        return jsonify({'success': True})
    return jsonify({'success': False, 'error': 'Not found'}), 404


@app.route('/create_folder', methods=['POST'])
def create_folder():
    data = request.get_json() or {}
    path = data.get('path', '')
    name = secure_filename(data.get('folder_name', ''))
    if not name:
        return jsonify({'success': False, 'error': 'Invalid name'}), 400
    try:
        folder_path = safe_path(path, name)
    except ValueError:
        return jsonify({'success': False}), 400
    if os.path.exists(folder_path):
        return jsonify({'success': False, 'error': 'Exists'}), 400
    os.makedirs(folder_path)
    return jsonify({'success': True})


@app.route('/bulk_delete', methods=['POST'])
def bulk_delete():
    paths = request.get_json().get('paths', [])
    for rel in paths:
        try:
            target = safe_path(rel)
        except ValueError:
            continue
        if os.path.isdir(target):
            shutil.rmtree(target, ignore_errors=True)
        elif os.path.exists(target):
            os.remove(target)
    return jsonify({'success': True})


@app.route('/bulk_download', methods=['POST'])
def bulk_download():
    paths = request.get_json().get('paths', [])
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, 'w') as zf:
        for rel in paths:
            try:
                target = safe_path(rel)
            except ValueError:
                continue
            if os.path.isdir(target):
                for root, dirs, files in os.walk(target):
                    for f in files:
                        full = os.path.join(root, f)
                        arcname = os.path.relpath(full, app.config['UPLOAD_FOLDER'])
                        zf.write(full, arcname)
            elif os.path.exists(target):
                zf.write(target, rel)
    buf.seek(0)
    return send_file(buf, mimetype='application/zip', as_attachment=True, download_name='files.zip')

if __name__ == '__main__':
    app.run(host="0.0.0.0", port=5050, debug=True)

