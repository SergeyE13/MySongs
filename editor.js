// ============================================================
//  РЕДАКТОР С АВТОСОХРАНЕНИЕМ НА GITHUB
//  Токен хранится в localStorage.
//  При наличии токена — редактирование без пароля,
//  сохранение сразу на GitHub.
// ============================================================

console.log('📂 editor.js загружен');

// ====== ПЕРЕМЕННЫЕ ======
let isEditorMode = false;
let editedSongs = {};              // локальные правки (fallback)
let editingSongId = null;
let editingFileName = null;
let GITHUB_TOKEN = localStorage.getItem('github_token') || '';

// ====== РЕПОЗИТОРИЙ (захардкожен, но можно вынести в настройки) ======
const REPO_OWNER = 'SergeyE13';
const REPO_NAME = 'MySongs';
const BRANCH = 'main';

// ====== ЗАГРУЗКА / СОХРАНЕНИЕ ЛОКАЛЬНЫХ ПРАВОК ======
function loadEditedSongs() {
    try {
        const saved = localStorage.getItem('edited_songs');
        if (saved) {
            editedSongs = JSON.parse(saved);
            console.log('📝 Загружено правок:', Object.keys(editedSongs).length);
        }
    } catch (e) {
        console.warn('Ошибка загрузки правок:', e);
    }
}

function saveEditedSongs() {
    try {
        localStorage.setItem('edited_songs', JSON.stringify(editedSongs));
        console.log('💾 Правки сохранены локально');
    } catch (e) {
        console.warn('Ошибка сохранения:', e);
    }
}

// ====== РАБОТА С GITHUB API ======
async function getFileSha(path) {
    try {
        const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}`;
        const res = await fetch(url, {
            headers: { 'Authorization': `token ${GITHUB_TOKEN}` }
        });
        if (!res.ok) return null;
        const data = await res.json();
        return data.sha;
    } catch {
        return null;
    }
}

async function saveFileToGitHub(path, content, message) {
    const url = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}`;
    const sha = await getFileSha(path);
    const body = {
        message: message || `Обновление ${path}`,
        content: btoa(unescape(encodeURIComponent(content))),
        branch: BRANCH
    };
    if (sha) body.sha = sha;

    const res = await fetch(url, {
        method: 'PUT',
        headers: {
            'Authorization': `token ${GITHUB_TOKEN}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || 'Ошибка GitHub API');
    }
    return await res.json();
}

// ====== ПРОВЕРКА ТОКЕНА ======
function isTokenValid() {
    return GITHUB_TOKEN && GITHUB_TOKEN.startsWith('ghp_') && GITHUB_TOKEN.length > 20;
}

// ====== КНОПКА "РЕДАКТОР" (В ТУЛБАРЕ) ======
function addEditorButton() {
    const toolbar = document.querySelector('.toolbar .controls');
    if (!toolbar) return;
    if (document.getElementById('editorToggleBtn')) return;

    const btn = document.createElement('button');
    btn.id = 'editorToggleBtn';
    btn.textContent = '✏️ Редактор';
    btn.style.cssText = 'background:#f39c12;color:white;padding:8px 16px;border:none;border-radius:40px;cursor:pointer;font-size:0.9rem;font-weight:600;font-family:system-ui,sans-serif;';
    btn.onclick = toggleEditor;
    toolbar.prepend(btn);
    console.log('✅ Кнопка "Редактор" добавлена');
}

// ====== ВКЛЮЧЕНИЕ РЕЖИМА РЕДАКТИРОВАНИЯ ======
function toggleEditor() {
    if (!isEditorMode) {
        // Если токен есть — включаем сразу
        if (isTokenValid()) {
            isEditorMode = true;
            document.getElementById('editorToggleBtn').textContent = '🔒 Закрыть';
            document.getElementById('editorToggleBtn').style.background = '#e74c3c';
            showEditorUI();
            // Если есть текущая песня — сразу открываем редактор
            if (currentSongId) {
                openEditorPanel();
            } else {
                alert('ℹ️ Сначала выберите песню.');
            }
            return;
        }

        // Токена нет — запрашиваем
        const token = prompt('🔑 Введите ваш GitHub-токен (начинается с ghp_):');
        if (token && token.startsWith('ghp_') && token.length > 20) {
            localStorage.setItem('github_token', token);
            GITHUB_TOKEN = token;
            alert('✅ Токен сохранён в браузере!');
            // Повторно вызываем toggleEditor для входа
            toggleEditor();
        } else if (token !== null) {
            alert('❌ Неверный формат токена. Попробуйте снова.');
        }
    } else {
        // Выход из режима
        isEditorMode = false;
        document.getElementById('editorToggleBtn').textContent = '✏️ Редактор';
        document.getElementById('editorToggleBtn').style.background = '#f39c12';
        hideEditorUI();
        closeEditor();
    }
}

// ====== ПОКАЗАТЬ ИНТЕРФЕЙС РЕДАКТОРА ======
function showEditorUI() {
    // Добавляем кнопки управления
    const toolbar = document.querySelector('.toolbar .controls');
    if (!document.getElementById('addSongBtn')) {
        const addBtn = document.createElement('button');
        addBtn.id = 'addSongBtn';
        addBtn.textContent = '+ Новая';
        addBtn.style.cssText = 'background:#27ae60;color:white;padding:8px 16px;border:none;border-radius:40px;cursor:pointer;font-size:0.9rem;font-weight:600;font-family:system-ui,sans-serif;';
        addBtn.onclick = createNewSong;
        toolbar.appendChild(addBtn);
    }
    if (!document.getElementById('syncStatusBtn')) {
        const statusBtn = document.createElement('button');
        statusBtn.id = 'syncStatusBtn';
        statusBtn.textContent = '📊 Статус';
        statusBtn.style.cssText = 'background:#8e44ad;color:white;padding:8px 16px;border:none;border-radius:40px;cursor:pointer;font-size:0.9rem;font-weight:600;font-family:system-ui,sans-serif;';
        statusBtn.onclick = showSyncStatus;
        toolbar.appendChild(statusBtn);
    }
    if (!document.getElementById('downloadZipBtn')) {
        const zipBtn = document.createElement('button');
        zipBtn.id = 'downloadZipBtn';
        zipBtn.textContent = '📦 Скачать всё ZIP';
        zipBtn.style.cssText = 'background:#27ae60;color:white;padding:8px 16px;border:none;border-radius:40px;cursor:pointer;font-size:0.9rem;font-weight:600;font-family:system-ui,sans-serif;';
        zipBtn.onclick = downloadChangedSongsZip;
        toolbar.appendChild(zipBtn);
    }
    // Обновляем иконку у песни (если есть)
    updateEditorIcon();
}

// ====== СКРЫТЬ ИНТЕРФЕЙС ======
function hideEditorUI() {
    // Удаляем только дополнительные кнопки (кроме основной)
    ['addSongBtn', 'syncStatusBtn', 'downloadZipBtn'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.remove();
    });
}

// ====== ИКОНКА РЕДАКТИРОВАНИЯ У ПЕСНИ ======
function updateEditorIcon() {
    document.querySelectorAll('.edit-icon').forEach(el => el.remove());
    if (!isEditorMode) return;
    const activeItem = document.querySelector('.song-item.active');
    if (!activeItem) return;
    const icon = document.createElement('button');
    icon.className = 'edit-icon';
    icon.textContent = '✏️';
    icon.style.cssText = 'position:absolute;right:40px;top:50%;transform:translateY(-50%);font-size:20px;cursor:pointer;background:#f39c12;color:white;border-radius:50%;width:34px;height:34px;display:flex;align-items:center;justify-content:center;border:none;';
    icon.onclick = (e) => {
        e.stopPropagation();
        openEditorPanel();
    };
    activeItem.style.position = 'relative';
    activeItem.appendChild(icon);
}

// ====== ОТКРЫТЬ ПАНЕЛЬ РЕДАКТОРА ======
function openEditorPanel() {
    if (!isEditorMode) {
        alert('❌ Сначала включите режим редактора (кнопка "Редактор")');
        return;
    }
    if (!currentSongId) {
        alert('❌ Сначала выберите песню!');
        return;
    }
    const song = songsList.find(s => s.id === currentSongId);
    if (!song) return;

    editingSongId = currentSongId;
    editingFileName = song.fileName;

    // Берём текст: если есть локальная правка — её, иначе оригинал
    const savedText = editedSongs[currentSongId] || currentRawOriginal;
    document.getElementById('editSongTitle').textContent = `✏️ ${song.title}`;
    document.getElementById('editTextarea').value = savedText;
    document.getElementById('adminPanel').classList.add('active');
    document.body.style.overflow = 'hidden';
    setTimeout(() => document.getElementById('editTextarea').focus(), 300);
}

// ====== СОХРАНИТЬ ПЕСНЮ ======
async function saveEditedSong() {
    if (!editingSongId) {
        alert('❌ Не выбрана песня');
        return;
    }
    const content = document.getElementById('editTextarea').value;
    if (!content.trim() && !confirm('⚠️ Текст пустой! Сохранить?')) return;

    const song = songsList.find(s => s.id === editingSongId);
    if (!song) return;

    // Пытаемся сохранить на GitHub, если есть токен
    let savedOnGitHub = false;
    if (isTokenValid()) {
        try {
            await saveFileToGitHub(`songs/${song.fileName}`, content, `Обновление ${song.fileName}`);
            savedOnGitHub = true;
            // Удаляем локальную правку, если она есть
            delete editedSongs[editingSongId];
            saveEditedSongs();
            console.log(`✅ Песня "${song.title}" сохранена на GitHub`);
        } catch (e) {
            console.warn('⚠️ Не удалось сохранить на GitHub:', e.message);
            alert(`⚠️ Ошибка GitHub: ${e.message}. Песня сохранена локально.`);
            savedOnGitHub = false;
        }
    }

    // Если не сохранилось на GitHub — сохраняем локально
    if (!savedOnGitHub) {
        editedSongs[editingSongId] = content;
        // Сохраняем оригинал, если его нет
        const originalKey = editingSongId + '_original';
        if (!editedSongs[originalKey]) {
            editedSongs[originalKey] = currentRawOriginal;
        }
        saveEditedSongs();
        console.log(`💾 Песня "${song.title}" сохранена локально`);
        // Обновляем отображение (пометка появится)
        renderSongList(document.getElementById('searchInput')?.value || '');
    }

    // Обновляем отображение песни
    if (currentSongId === editingSongId) {
        await loadSongWithEdits(editingSongId);
    }

    closeEditor();
    alert(savedOnGitHub ? '✅ Песня сохранена на GitHub!' : '💾 Песня сохранена локально (не на GitHub)');
}

// ====== ЗАГРУЗКА ПЕСНИ С УЧЁТОМ ЛОКАЛЬНЫХ ПРАВОК ======
async function loadSongWithEdits(songId) {
    const song = songsList.find(s => s.id === songId);
    if (!song) return;
    try {
        const response = await fetch(`songs/${encodeURIComponent(song.fileName)}?t=${Date.now()}`);
        const originalText = await response.text();

        const originalKey = songId + '_original';
        if (!editedSongs[originalKey]) {
            editedSongs[originalKey] = originalText;
            saveEditedSongs();
        }

        const displayText = editedSongs[songId] || originalText;
        currentRawOriginal = displayText;
        currentSongId = songId;
        transposeShift = songTransposes[songId] || 0;
        updateSongDisplay();
        updateEditorIcon();
    } catch (e) {
        console.error('Ошибка загрузки песни:', e);
    }
}

// ====== ДОБАВЛЕНИЕ НОВОЙ ПЕСНИ ======
async function createNewSong() {
    if (!isEditorMode) {
        alert('❌ Сначала включите режим редактора');
        return;
    }

    const title = prompt('🎵 Введите название песни:');
    if (!title) return;
    const artist = prompt('🎤 Введите исполнителя:');
    if (!artist) return;

    // Формируем имя файла
    const fileName = `${artist} - ${title}.txt`.replace(/[^а-яА-Яa-zA-Z0-9 \-]/g, '');
    if (!fileName) {
        alert('❌ Некорректное имя файла');
        return;
    }

    // Шаблон
    const template = `[Куплет 1]\n\n[Am]Текст песни...\n\n[Припев]\n\n[Am]Текст припева...`;

    // Создаём объект песни
    const newSong = {
        id: `song_${songsList.length}`,
        title: title,
        artist: artist,
        fileName: fileName,
        originUrl: null
    };

    // Пытаемся сохранить на GitHub
    let savedOnGitHub = false;
    if (isTokenValid()) {
        try {
            // 1. Сохраняем файл песни
            await saveFileToGitHub(`songs/${fileName}`, template, `Добавлена песня: ${fileName}`);
            // 2. Обновляем CSV
            const csvLine = `"${artist}","${title}","${fileName}"\n`;
            await appendToCSV(csvLine);
            savedOnGitHub = true;
            console.log(`✅ Новая песня "${title}" создана на GitHub`);
        } catch (e) {
            console.warn('⚠️ Не удалось сохранить на GitHub:', e.message);
            alert(`⚠️ Ошибка GitHub: ${e.message}. Песня сохранена локально.`);
            savedOnGitHub = false;
        }
    }

    if (!savedOnGitHub) {
        // Сохраняем локально
        songsList.push(newSong);
        editedSongs[newSong.id] = template;
        editedSongs[newSong.id + '_original'] = template;
        saveEditedSongs();
        // Сохраняем в custom_songs для постоянства
        const custom = JSON.parse(localStorage.getItem('custom_songs') || '[]');
        custom.push(newSong);
        localStorage.setItem('custom_songs', JSON.stringify(custom));
        console.log(`💾 Новая песня "${title}" сохранена локально`);
    }

    // Перерисовываем список и выбираем новую песню
    renderSongList(document.getElementById('searchInput')?.value || '');
    await loadSongWithEdits(newSong.id);
    alert(savedOnGitHub ? '✅ Песня создана на GitHub!' : '💾 Песня создана локально (не на GitHub)');
    // Открываем редактор для новой песни
    openEditorPanel();
}

// ====== ОБНОВЛЕНИЕ CSV ======
async function appendToCSV(line) {
    const path = 'songs.csv';
    const sha = await getFileSha(path);
    let currentContent = '';
    if (sha) {
        const res = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}`, {
            headers: { 'Authorization': `token ${GITHUB_TOKEN}` }
        });
        const data = await res.json();
        currentContent = atob(data.content);
    }
    const newContent = currentContent + line;
    await saveFileToGitHub(path, newContent, 'Обновление списка песен');
}

// ====== СТАТУС И СКАЧИВАНИЕ ZIP (как раньше) ======
function getChangedSongs() {
    const changed = [];
    for (const song of songsList) {
        const originalKey = song.id + '_original';
        const savedText = editedSongs[song.id];
        const originalText = editedSongs[originalKey];
        if (savedText && originalText && savedText !== originalText) {
            changed.push({
                id: song.id,
                title: song.title,
                artist: song.artist,
                fileName: song.fileName,
                text: savedText
            });
        }
    }
    return changed;
}

function showSyncStatus() {
    const changed = getChangedSongs();
    if (changed.length === 0) {
        alert('✅ Все песни синхронизированы с GitHub.');
        return;
    }
    let msg = '📝 Локально изменены:\n\n';
    changed.forEach((s, i) => {
        msg += `${i+1}. ${s.artist} — ${s.title}\n`;
    });
    msg += '\n📦 Нажмите "Скачать всё ZIP" для скачивания.';
    alert(msg);
}

async function downloadChangedSongsZip() {
    const changed = getChangedSongs();
    if (changed.length === 0) {
        alert('✅ Нет локальных изменений.');
        return;
    }
    if (typeof JSZip === 'undefined') {
        await loadJSZip();
    }
    try {
        const zip = new JSZip();
        for (const song of changed) {
            zip.file(song.fileName, song.text);
        }
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(zipBlob);
        const date = new Date().toISOString().slice(0,10);
        link.href = url;
        link.download = `changed_songs_${date}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        alert(`✅ ZIP скачан (${changed.length} песен).`);
    } catch (e) {
        alert('❌ Ошибка: ' + e.message);
    }
}

function loadJSZip() {
    return new Promise((resolve, reject) => {
        if (typeof JSZip !== 'undefined') { resolve(); return; }
        const script = document.createElement('script');
        script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
        script.onload = resolve;
        script.onerror = reject;
        document.head.appendChild(script);
    });
}

// ====== ПЕРЕХВАТ ЗАГРУЗКИ ПЕСЕН ДЛЯ ОБНОВЛЕНИЯ ОРИГИНАЛОВ ======
const originalLoadSong = window.loadSongById || loadSongById;
window.loadSongById = async function(id, saveToStorage, forceRefresh) {
    await originalLoadSong(id, saveToStorage, forceRefresh);
    if (currentSongId && currentRawOriginal) {
        const originalKey = currentSongId + '_original';
        editedSongs[originalKey] = currentRawOriginal;
        if (editedSongs[currentSongId] && editedSongs[currentSongId] === currentRawOriginal) {
            delete editedSongs[currentSongId];
        }
        saveEditedSongs();
    }
    updateEditorIcon();
};

// ====== РАСШИРЕННЫЙ RENDER ДЛЯ ПОМЕТОК ======
const originalRender = renderSongList;
renderSongList = function(filterText) {
    originalRender(filterText);
    // Добавляем пометки о локальных правках
    document.querySelectorAll('.song-item').forEach(item => {
        const id = item.dataset.id;
        if (id && editedSongs[id]) {
            // Проверяем, что это не оригинал
            const originalKey = id + '_original';
            if (editedSongs[originalKey] && editedSongs[id] !== editedSongs[originalKey]) {
                // Удаляем старую пометку
                const old = item.querySelector('.local-badge');
                if (old) old.remove();
                const badge = document.createElement('span');
                badge.className = 'local-badge';
                badge.textContent = '💾 локально';
                badge.style.cssText = 'position:absolute;right:75px;top:50%;transform:translateY(-50%);background:#e67e22;color:white;font-size:0.65rem;padding:2px 8px;border-radius:20px;font-weight:bold;';
                item.style.position = 'relative';
                item.appendChild(badge);
            }
        }
    });
};

// ====== ИНИЦИАЛИЗАЦИЯ ======
document.addEventListener('DOMContentLoaded', function() {
    loadEditedSongs();
    addEditorButton();
    // Если токен есть — сразу включаем режим
    if (isTokenValid()) {
        isEditorMode = true;
        const btn = document.getElementById('editorToggleBtn');
        if (btn) {
            btn.textContent = '🔒 Закрыть';
            btn.style.background = '#e74c3c';
        }
        showEditorUI();
        console.log('✅ Автовход по токену');
    }
    console.log('📝 Редактор загружен');
    console.log('🔑 Токен:', isTokenValid() ? '✅ есть' : '❌ нет');
});