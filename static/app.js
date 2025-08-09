function postJSON(url, data) {
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  }).then(res => res.json());
}

function showAlert(msg, type = 'danger') {
  const container = document.querySelector('.container');
  if (!container) return;
  const div = document.createElement('div');
  div.className = `alert alert-${type} alert-dismissible fade`;
  div.role = 'alert';
  div.innerHTML = `${msg}<button type="button" class="btn-close" data-bs-dismiss="alert"></button>`;
  container.prepend(div);
  new bootstrap.Alert(div);
  requestAnimationFrame(() => div.classList.add('show'));
}

let deletePaths = [];
const confirmModalEl = document.getElementById('confirmModal');
const confirmMessage = document.getElementById('confirmMessage');
const confirmOkBtn = document.getElementById('confirmOkBtn');
const confirmModal = confirmModalEl ? new bootstrap.Modal(confirmModalEl) : null;

if (confirmOkBtn) {
  confirmOkBtn.onclick = function () {
    if (!deletePaths.length) return;
    const paths = deletePaths.slice();
    if (paths.length > 1) {
      postJSON('/bulk_delete', { paths }).then(() => location.reload());
    } else {
      fetch('/delete/' + encodeURIComponent(paths[0]), { method: 'POST' })
        .then(res => res.json())
        .then(() => location.reload());
    }
  };
}

document.querySelectorAll('.delete-btn').forEach(btn => {
  btn.onclick = function () {
    deletePaths = [this.dataset.path];
    if (confirmMessage) confirmMessage.textContent = 'Delete "' + this.dataset.path.split('/').pop() + '"?';
    if (confirmModal) confirmModal.show();
  };
});

let renamePath = null;
const renameModalEl = document.getElementById('renameModal');
const renameModal = renameModalEl ? new bootstrap.Modal(renameModalEl) : null;
const renameInput = document.getElementById('renameInput');
const renameSaveBtn = document.getElementById('renameSaveBtn');

document.querySelectorAll('.rename-btn').forEach(btn => {
  btn.onclick = function () {
    renamePath = this.dataset.path;
    if (renameInput) renameInput.value = renamePath.split('/').pop();
    if (renameModal) renameModal.show();
  };
});

if (renameSaveBtn) {
  renameSaveBtn.onclick = function () {
    const newName = renameInput.value.trim();
    if (!newName) return;
    fetch('/rename/' + encodeURIComponent(renamePath), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ new_name: newName })
    }).then(res => res.json()).then(d => {
      if (d.success) location.reload();
      else showAlert('Rename failed');
    });
  };
}

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
      showAlert('Upload failed');
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

const folderModalEl = document.getElementById('folderModal');
const folderModal = folderModalEl ? new bootstrap.Modal(folderModalEl) : null;
const folderNameInput = document.getElementById('folderNameInput');
const folderCreateBtn = document.getElementById('folderCreateBtn');

const newFolderBtn = document.getElementById('newFolderBtn');
if (newFolderBtn && folderModal) {
  newFolderBtn.onclick = function () {
    if (folderNameInput) folderNameInput.value = '';
    folderModal.show();
  };
}

if (folderCreateBtn) {
  folderCreateBtn.onclick = function () {
    const name = folderNameInput.value.trim();
    if (!name) return;
    postJSON('/create_folder', { path: CURRENT_PATH, folder_name: name })
      .then(d => { if (d.success) location.reload(); else showAlert('Failed to create folder'); });
  };
}

const bulkDeleteBtn = document.getElementById('bulkDeleteBtn');
if (bulkDeleteBtn) {
  bulkDeleteBtn.onclick = function () {
    const selected = Array.from(document.querySelectorAll('.select-box:checked')).map(cb => cb.value);
    if (!selected.length) return;
    deletePaths = selected;
    if (confirmMessage) confirmMessage.textContent = 'Delete selected items?';
    if (confirmModal) confirmModal.show();
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
