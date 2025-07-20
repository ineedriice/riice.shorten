const signup = '/sign-up/index.html';
const token = localStorage.getItem('token');
let currentEditId = null;
let locationChart = null;

window.addEventListener('load', () => {
  if (!token) {
    alert('Please login first!');
    window.location.href = signup;
    return;
  }
  document.getElementById("greeting-user").innerText = `Hi, ${localStorage.getItem('username') || 'user'}!`;
  loadMyUrls();
});

function showSpinner() {
  document.getElementById('spinner')?.classList.remove('hidden');
}
function hideSpinner() {
  document.getElementById('spinner')?.classList.add('hidden');
}

document.getElementById('logoutBtn')?.addEventListener('click', () => {
  localStorage.removeItem('token');
  window.location.href = signup;
});

document.getElementById('shortenBtn')?.addEventListener('click', shortenUrl);
document.getElementById('saveEdit')?.addEventListener('click', saveEdit);
document.getElementById('cancelEdit')?.addEventListener('click', closeModal);

function escapeHTML(str) {
  return str.replace(/[&<>"']/g, match => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[match]);
}

async function shortenUrl() {
  const longUrl = document.getElementById('longUrl').value.trim();
  const customId = document.getElementById('customId').value.trim();
  const result = document.getElementById('result');
  const btn = document.getElementById('shortenBtn');

  const urlRegex = /^(https?:\/\/)(localhost(:\d+)?|([\w-]+\.)+[\w-]{2,})([\/?#].*)?$/i;
  const customIdRegex = /^[a-zA-Z0-9_-]*$/;

  if (!longUrl || !urlRegex.test(longUrl)) {
    result.textContent = "Please enter a valid URL!";
    result.className = "text-red-500 text-center";
    return;
  }

  if (customId && !customIdRegex.test(customId)) {
    result.textContent = "Custom ID can only have letters, numbers, - or _";
    result.className = "text-red-500 text-center";
    return;
  }

  btn.disabled = true;
  btn.classList.add('opacity-50', 'cursor-not-allowed');
  setTimeout(() => {
    btn.disabled = false;
    btn.classList.remove('opacity-50', 'cursor-not-allowed');
  }, 5000);

  showSpinner();

  const body = { longUrl };
  if (customId) body.customId = customId;

  const res = await fetch('/shorten', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(body)
  });

  hideSpinner();

  const data = await res.json();
  result.textContent = "Link successfully created!";
  result.className = "text-center text-green-500";
  loadMyUrls();
  clearTimeout(result._clearTimeout);
  clearTimeout(result._clearTimeout);
  result._clearTimeout = setTimeout(() => {
    result.textContent = '';
  }, 3000);
}

async function loadMyUrls() {
  showSpinner();
  const res = await fetch('/my-urls', {
    headers: { 'Authorization': `Bearer ${token}` }
  });
  hideSpinner();

  const urls = await res.json();
  const list = document.getElementById('urlList');
  list.innerHTML = '';

  const locCount = {};

  urls.forEach(url => {
    url.locations?.forEach(loc => {
      locCount[loc] = (locCount[loc] || 0) + 1;
    });

    const li = document.createElement('li');
    li.className = 'bg-gray-800 p-3 rounded flex flex-col sm:flex-row sm:items-center justify-between gap-2';

    const info = document.createElement('div');
    const shortUrl = `${window.location.origin}/${escapeHTML(url.shortId)}`;

    // QR Button
    const qrBtn = document.createElement('button');
    qrBtn.className = 'text-cyan-400 hover:text-white text-lg';
    qrBtn.innerHTML = `<i class="fa-solid fa-qrcode"></i>`;
    qrBtn.addEventListener('click', () => showQRModal(shortUrl));

    // Copy Link
    const copyEl = document.createElement('strong');
    copyEl.className = 'text-cyan-400 underline cursor-pointer copy-link';
    copyEl.dataset.link = shortUrl;
    copyEl.innerHTML = `/${escapeHTML(url.shortId)} <i class="fa-regular fa-copy text-sm ml-1"></i>`;

    const linkRow = document.createElement('div');
    linkRow.className = 'flex items-center gap-2';
    linkRow.append(copyEl, qrBtn);

    info.appendChild(linkRow);

    const longUrlSpan = document.createElement('span');
    longUrlSpan.textContent = escapeHTML(url.longUrl);
    longUrlSpan.className = 'block break-words break-all w-full sm:max-w-md';

    const clickInfo = document.createElement('em');
    clickInfo.className = 'block text-sm text-gray-400 mt-1';
    clickInfo.textContent = `(Clicks: ${url.clicks || 0})`;

    info.append(longUrlSpan, clickInfo);

    // Copy icon click
    const copyIcon = copyEl.querySelector('i');
    copyIcon?.addEventListener('click', () => {
      navigator.clipboard.writeText(shortUrl).then(() => {
        copyIcon.classList.remove('fa-regular', 'fa-copy');
        copyIcon.classList.add('fa-solid', 'fa-check');
        setTimeout(() => {
          copyIcon.classList.remove('fa-solid', 'fa-check');
          copyIcon.classList.add('fa-regular', 'fa-copy');
        }, 1500);
      });
    });

    // Buttons
    const btns = document.createElement('div');
    btns.className = 'flex gap-2';

    const editBtn = document.createElement('button');
    editBtn.textContent = 'Edit';
    editBtn.className = 'bg-yellow-600 hover:bg-yellow-700 text-white px-3 py-1 rounded text-sm';
    editBtn.addEventListener('click', () => editUrl(url._id, url.longUrl, url.shortId));

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'Delete';
    deleteBtn.className = 'bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded text-sm';
    deleteBtn.addEventListener('click', () => deleteUrl(url._id));

    btns.append(editBtn, deleteBtn);
    li.append(info, btns);
    list.appendChild(li);
  });

  if (urls.length === 0) {
    list.innerHTML = '<li class="text-gray-400">No URLs yet</li>';
    document.getElementById('locationChart').classList.add('hidden');
    return;
  }

  const totalClicks = urls.reduce((sum, url) => sum + (url.clicks || 0), 0);
  const chart = document.getElementById('locationChart');
  if (totalClicks < 1) {
    chart.classList.add('hidden');
  } else {
    chart.classList.remove('hidden');
    renderLocationChart(locCount);
  }
}

// QR modal functions
function showQRModal(link) {
  const qrImg = document.getElementById('qrImage');
  qrImg.src = `https://quickchart.io/qr?text=${encodeURIComponent(link)}&size=200`;
  const modal = document.getElementById('qrModal');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

function closeQRModal() {
  const modal = document.getElementById('qrModal');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
}

document.getElementById('qrCloseBtn')?.addEventListener('click', closeQRModal);

function renderLocationChart(data) {
  const ctx = document.getElementById('locationChart').getContext('2d');

  if (locationChart?.destroy) locationChart.destroy();

  locationChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: Object.keys(data),
      datasets: [{
        label: 'Clicks by Country',
        data: Object.values(data),
        backgroundColor: 'rgba(34, 211, 238, 0.7)'
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } }
    }
  });
}

function editUrl(id, currentUrl, currentShortId) {
  currentEditId = id;
  document.getElementById('editLongUrl').value = currentUrl;
  document.getElementById('editCustomId').value = currentShortId;

  const modal = document.getElementById('editModal');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

function closeModal() {
  const modal = document.getElementById('editModal');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
}

async function saveEdit() {
  const longUrl = document.getElementById('editLongUrl').value;
  const customId = document.getElementById('editCustomId').value;

  await fetch(`/edit/${currentEditId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ longUrl, customId })
  });

  closeModal();
  loadMyUrls();
}

async function deleteUrl(id) {
  await fetch(`/delete/${id}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${token}` }
  });

  loadMyUrls();
}