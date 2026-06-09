const state = {
  ratio: window.innerWidth > window.innerHeight ? '3:2' : '2:3',
  references: [],
  selectedReferenceId: null,
  opacity: 45,
  showReference: true,
  photos: [],
  guides: {
    crosshair: true,
    diagonal: false,
    thirds: false,
    twelfths: false,
  },
};

const els = {
  cameraFrame: document.getElementById('cameraFrame'),
  video: document.getElementById('cameraVideo'),
  fallback: document.getElementById('cameraFallback'),
  overlay: document.getElementById('referenceOverlay'),
  guideCanvas: document.getElementById('guideCanvas'),
  referenceInput: document.getElementById('referenceInput'),
  referenceList: document.getElementById('referenceList'),
  referenceCount: document.getElementById('referenceCount'),
  ratioButtons: document.querySelectorAll('[data-ratio]'),
  opacityRange: document.getElementById('opacityRange'),
  opacityValue: document.getElementById('opacityValue'),
  showReference: document.getElementById('showReference'),
  guideCrosshair: document.getElementById('guideCrosshair'),
  guideDiagonal: document.getElementById('guideDiagonal'),
  guideThirds: document.getElementById('guideThirds'),
  guideTwelfths: document.getElementById('guideTwelfths'),
  captureButton: document.getElementById('captureButton'),
  photoList: document.getElementById('photoList'),
  photoEmpty: document.getElementById('photoEmpty'),
  photoCount: document.getElementById('photoCount'),
  previewDialog: document.getElementById('previewDialog'),
  previewImage: document.getElementById('previewImage'),
  closePreview: document.getElementById('closePreview'),
};

async function startCamera() {
  if (!navigator.mediaDevices?.getUserMedia) {
    showCameraError('当前浏览器不支持摄像头调用');
    return;
  }

  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: 'environment' },
        width: { ideal: 1920 },
        height: { ideal: 1280 },
      },
      audio: false,
    });
    els.video.srcObject = stream;
    els.fallback.classList.add('is-hidden');
  } catch (error) {
    console.error(error);
    showCameraError('摄像头启动失败，请检查浏览器权限或设备摄像头');
  }
}

function showCameraError(message) {
  els.fallback.classList.remove('is-hidden');
  els.fallback.innerHTML = `<strong>${message}</strong><span>仍可上传参考图并查看页面交互。</span>`;
}

function setRatio(ratio) {
  state.ratio = ratio;
  els.cameraFrame.dataset.ratio = ratio;
  els.ratioButtons.forEach((button) => {
    button.classList.toggle('is-active', button.dataset.ratio === ratio);
  });
  requestAnimationFrame(drawGuides);
}

function addReferences(files) {
  const imageFiles = [...files].filter((file) => file.type.startsWith('image/'));
  imageFiles.forEach((file) => {
    const url = URL.createObjectURL(file);
    const reference = {
      id: crypto.randomUUID(),
      name: file.name,
      url,
    };
    state.references.push(reference);
    if (!state.selectedReferenceId) state.selectedReferenceId = reference.id;
  });
  renderReferences();
  updateReferenceOverlay();
}

function renderReferences() {
  els.referenceList.innerHTML = '';
  state.references.forEach((reference) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'reference-thumb';
    button.classList.toggle('is-selected', reference.id === state.selectedReferenceId);
    button.setAttribute('aria-label', `选择参考图 ${reference.name}`);
    const image = document.createElement('img');
    image.src = reference.url;
    image.alt = reference.name;
    button.appendChild(image);
    button.addEventListener('click', () => {
      state.selectedReferenceId = reference.id;
      renderReferences();
      updateReferenceOverlay();
    });
    els.referenceList.appendChild(button);
  });
  els.referenceCount.textContent = `${state.references.length} 张`;
}

function getSelectedReference() {
  return state.references.find((reference) => reference.id === state.selectedReferenceId);
}

function updateReferenceOverlay() {
  const selected = getSelectedReference();
  if (!selected || !state.showReference) {
    els.overlay.hidden = true;
    return;
  }
  els.overlay.src = selected.url;
  els.overlay.style.opacity = String(state.opacity / 100);
  els.overlay.hidden = false;
}

function updateOpacity(value) {
  state.opacity = Number(value);
  els.opacityValue.textContent = `${state.opacity}%`;
  updateReferenceOverlay();
}

function drawGuides(targetCanvas = els.guideCanvas) {
  const rect = els.cameraFrame.getBoundingClientRect();
  const width = Math.round(rect.width);
  const height = Math.round(rect.height);
  if (!width || !height) return;

  const dpr = window.devicePixelRatio || 1;
  targetCanvas.width = width * dpr;
  targetCanvas.height = height * dpr;
  targetCanvas.style.width = `${width}px`;
  targetCanvas.style.height = `${height}px`;

  const ctx = targetCanvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);
  drawGuideLines(ctx, width, height);
}

function drawGuideLines(ctx, width, height) {
  ctx.lineWidth = 1;

  if (state.guides.thirds) {
    drawGrid(ctx, width, height, 3, 3, 'rgba(255,255,255,0.48)');
  }
  if (state.guides.twelfths) {
    drawGrid(ctx, width, height, 4, 3, 'rgba(74,222,128,0.42)');
  }
  if (state.guides.crosshair) {
    drawLine(ctx, width / 2, 0, width / 2, height, 'rgba(20,99,255,0.72)');
    drawLine(ctx, 0, height / 2, width, height / 2, 'rgba(20,99,255,0.72)');
  }
  if (state.guides.diagonal) {
    drawLine(ctx, 0, 0, width, height, 'rgba(255,183,77,0.68)');
    drawLine(ctx, width, 0, 0, height, 'rgba(255,183,77,0.68)');
  }
}

function drawGrid(ctx, width, height, columns, rows, color) {
  for (let col = 1; col < columns; col += 1) {
    drawLine(ctx, (width / columns) * col, 0, (width / columns) * col, height, color);
  }
  for (let row = 1; row < rows; row += 1) {
    drawLine(ctx, 0, (height / rows) * row, width, (height / rows) * row, color);
  }
}

function drawLine(ctx, x1, y1, x2, y2, color) {
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
}

function drawImageCover(ctx, image, width, height) {
  const sourceWidth = image.videoWidth || image.naturalWidth;
  const sourceHeight = image.videoHeight || image.naturalHeight;
  if (!sourceWidth || !sourceHeight) return;

  const sourceRatio = sourceWidth / sourceHeight;
  const targetRatio = width / height;
  let sx = 0;
  let sy = 0;
  let sw = sourceWidth;
  let sh = sourceHeight;

  if (sourceRatio > targetRatio) {
    sw = sourceHeight * targetRatio;
    sx = (sourceWidth - sw) / 2;
  } else {
    sh = sourceWidth / targetRatio;
    sy = (sourceHeight - sh) / 2;
  }

  ctx.drawImage(image, sx, sy, sw, sh, 0, 0, width, height);
}

function drawImageContain(ctx, image, width, height, opacity = 1) {
  const sourceWidth = image.naturalWidth;
  const sourceHeight = image.naturalHeight;
  if (!sourceWidth || !sourceHeight) return;

  const scale = Math.min(width / sourceWidth, height / sourceHeight);
  const targetWidth = sourceWidth * scale;
  const targetHeight = sourceHeight * scale;
  const dx = (width - targetWidth) / 2;
  const dy = (height - targetHeight) / 2;

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.drawImage(image, dx, dy, targetWidth, targetHeight);
  ctx.restore();
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

async function capturePhoto() {
  const rect = els.cameraFrame.getBoundingClientRect();
  const width = Math.round(rect.width);
  const height = Math.round(rect.height);
  if (!width || !height) return;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (els.video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
    drawImageCover(ctx, els.video, width, height);
  } else {
    ctx.fillStyle = '#111827';
    ctx.fillRect(0, 0, width, height);
  }

  const selected = getSelectedReference();
  if (selected && state.showReference) {
    try {
      const referenceImage = await loadImage(selected.url);
      drawImageContain(ctx, referenceImage, width, height, state.opacity / 100);
    } catch (error) {
      console.error('参考图绘制失败', error);
    }
  }

  drawGuideLines(ctx, width, height);
  const url = canvas.toDataURL('image/png');
  state.photos.unshift({ id: crypto.randomUUID(), url });
  renderPhotos();
}

function renderPhotos() {
  els.photoList.innerHTML = '';
  els.photoEmpty.hidden = state.photos.length > 0;
  els.photoCount.textContent = `${state.photos.length} 张`;
  state.photos.forEach((photo, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'photo-thumb';
    button.setAttribute('aria-label', `预览第 ${state.photos.length - index} 张照片`);
    const image = document.createElement('img');
    image.src = photo.url;
    image.alt = '已拍照片缩略图';
    button.appendChild(image);
    button.addEventListener('click', () => openPreview(photo.url));
    els.photoList.appendChild(button);
  });
}

function openPreview(url) {
  els.previewImage.src = url;
  if (typeof els.previewDialog.showModal === 'function') {
    els.previewDialog.showModal();
  } else {
    window.open(url, '_blank', 'noopener');
  }
}

function closePreview() {
  els.previewDialog.close();
  els.previewImage.removeAttribute('src');
}

function bindEvents() {
  els.referenceInput.addEventListener('change', (event) => {
    addReferences(event.target.files);
    event.target.value = '';
  });

  els.ratioButtons.forEach((button) => {
    button.addEventListener('click', () => setRatio(button.dataset.ratio));
  });

  els.opacityRange.addEventListener('input', (event) => updateOpacity(event.target.value));
  els.showReference.addEventListener('change', (event) => {
    state.showReference = event.target.checked;
    updateReferenceOverlay();
  });

  const guideBindings = [
    [els.guideCrosshair, 'crosshair'],
    [els.guideDiagonal, 'diagonal'],
    [els.guideThirds, 'thirds'],
    [els.guideTwelfths, 'twelfths'],
  ];
  guideBindings.forEach(([input, key]) => {
    input.addEventListener('change', (event) => {
      state.guides[key] = event.target.checked;
      drawGuides();
    });
  });

  els.captureButton.addEventListener('click', capturePhoto);
  els.closePreview.addEventListener('click', closePreview);
  els.previewDialog.addEventListener('click', (event) => {
    if (event.target === els.previewDialog) closePreview();
  });
  window.addEventListener('resize', drawGuides);
}

function init() {
  bindEvents();
  setRatio(state.ratio);
  updateOpacity(state.opacity);
  updateReferenceOverlay();
  renderPhotos();
  drawGuides();
  startCamera();
}

init();
