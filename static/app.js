function postJSON(url, data) {
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(res => res.json());
}

document.querySelectorAll('.delete-btn').forEach(btn => {
  btn.onclick = function () {
    if (confirm('Delete "' + this.dataset.path + '"?')) {
      fetch('/delete/' + encodeURIComponent(this.dataset.path), { method: 'POST' })
        .then(res => res.json())
        .then(() => location.reload());
    }
  };
});

document.querySelectorAll('.rename-btn').forEach(btn => {
  btn.onclick = function () {
    const current = this.dataset.path.split('/').pop();
    const newName = prompt('Rename to:', current);
    if (!newName) return;
    fetch('/rename/' + encodeURIComponent(this.dataset.path), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ new_name: newName })
    }).then(res => res.json()).then(d => {
      if (d.success) location.reload();
      else alert('Rename failed');
    });
  };
});

document.querySelectorAll('.qr-btn').forEach(btn => {
  btn.onclick = function () {
    const url = this.dataset.url;
    const container = document.getElementById('qrContainer');
    if (!container) return;
    container.innerHTML = '';
    new QRCode(container, url);
    if (typeof bootstrap !== 'undefined') {
      new bootstrap.Modal(document.getElementById('qrModal')).show();
    }
  };
});

const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const progress = document.getElementById('uploadProgress');
const progressBar = progress ? progress.querySelector('.progress-bar') : null;

function handleFiles(files) {
  if (!files || !files.length) return;
  uploadFile(files[0]);
}

function uploadFile(file) {
  const formData = new FormData();
  formData.append('file', file);
  const xhr = new XMLHttpRequest();
  xhr.open('POST', '/upload?path=' + encodeURIComponent(CURRENT_PATH));
  xhr.upload.addEventListener('progress', (e) => {
    if (e.lengthComputable && progress && progressBar) {
      progress.classList.remove('d-none');
      const percent = (e.loaded / e.total) * 100;
      progressBar.style.width = percent + '%';
    }
  });
  xhr.onload = () => {
    if (progress && progressBar) {
      progress.classList.add('d-none');
      progressBar.style.width = '0%';
    }
    if (xhr.status === 200) {
      location.reload();
    } else {
      alert('Upload failed');
    }
  };
  xhr.send(formData);
}

if (dropZone && fileInput) {
  dropZone.addEventListener('click', () => fileInput.click());
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('dragover');
  });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    handleFiles(e.dataTransfer.files);
  });
  fileInput.addEventListener('change', () => handleFiles(fileInput.files));
}

const newFolderBtn = document.getElementById('newFolderBtn');
if (newFolderBtn) {
  newFolderBtn.onclick = function () {
    const name = prompt('Folder name?');
    if (!name) return;
    postJSON('/create_folder', { path: CURRENT_PATH, folder_name: name })
      .then(d => { if (d.success) location.reload(); else alert('Failed to create folder'); });
  };
}

const bulkDeleteBtn = document.getElementById('bulkDeleteBtn');
if (bulkDeleteBtn) {
  bulkDeleteBtn.onclick = function () {
    const selected = Array.from(document.querySelectorAll('.select-box:checked')).map(cb => cb.value);
    if (!selected.length) return;
    if (!confirm('Delete selected items?')) return;
    postJSON('/bulk_delete', { paths: selected }).then(() => location.reload());
  };
}

const bulkDownloadBtn = document.getElementById('bulkDownloadBtn');
if (bulkDownloadBtn) {
  bulkDownloadBtn.onclick = function () {
    const selected = Array.from(document.querySelectorAll('.select-box:checked')).map(cb => cb.value);
    if (!selected.length) return;
    fetch('/bulk_download', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ paths: selected })
    }).then(res => res.blob()).then(blob => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'files.zip';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    });
  };
}
