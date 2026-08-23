// ============================================================
//  РЕДАКТОР С АВТОСОХРАНЕНИЕМ НА GITHUB
// ============================================================

console.log('📂 editor.js загружен');

// ====== ПЕРЕМЕННЫЕ ======
let editedSongs = {};
let editingSongId = null;
let editingFileName = null;
let GITHUB_TOKEN = localStorage.getItem('github_token') || '';

// ====== РЕПОЗИТОРИЙ ======
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

// ====== ОБНОВЛЕНИЕ ЦВЕТА КНОПКИ "РЕДАКТОР" ======
function updateEditorButtonColor() {
    const btn = document.getElementById('editorToggleBtn');
    if (!btn) return;
    
    if (isTokenValid()) {
        btn.style.background = '#27ae60';
        btn.textContent = '✏️ Редактор';
    } else {
        btn.style.background = '#f39c12';
        btn.textContent = '✏️ Редактор (токен)';
    }
}

// ====== КНОПКА "РЕДАКТОР" ======
function addEditorButton() {
    const toolbar = document.querySelector('.toolbar .controls');
    if (!toolbar) return;
    if (document.getElementById('editorToggleBtn')) return;

    const btn = document.createElement('button');
    btn.id = 'editorToggleBtn';
    btn.textContent = '✏️ Редактор';
    btn.style.cssText = 'color:white;padding:8px 16px;border:none;border-radius:40px;cursor:pointer;font-size:0.9rem;font-weight:600;font-family:system-ui,sans-serif;';
    btn.onclick = openEditorPanel;
    toolbar.prepend(btn);
    
    updateEditorButtonColor();
    console.log('✅ Кнопка "Редактор" добавлена');
}

// ====== ПОКАЗАТЬ КНОПКИ В САЙДБАРЕ ======
function showSidebarButtons() {
    const addBtn = document.getElementById('addSongBtn');
    const statusBtn = document.getElementById('syncStatusBtn');
    const zipBtn = document.getElementById('downloadZipBtn');
    
    if (addBtn) addBtn.style.display = 'flex';
    if (statusBtn) statusBtn.style.display = 'flex';
    if (zipBtn) zipBtn.style.display = 'flex';
}

// ====== ОТКРЫТЬ ПАНЕЛЬ РЕДАКТОРА ======
function openEditorPanel() {
    if (!isTokenValid()) {
        const token = prompt('🔑 Введите ваш GitHub-токен (начинается с ghp_):');
        if (token && token.startsWith('ghp_') && token.length > 20) {
            localStorage.setItem('github_token', token);
            GITHUB_TOKEN = token;
            alert('✅ Токен сохранён в браузере!');
            updateEditorButtonColor();
            openEditorPanel();
        } else if (token !== null) {
            alert('❌ Неверный формат токена. Попробуйте снова.');
        }
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

    const savedText = editedSongs[currentSongId] || currentRawOriginal;
    document.getElementById('editSongTitle').textContent = `✏️ ${song.title}`;
    document.getElementById('editTextarea').value = savedText;
    document.getElementById('adminPanel').classList.add('active');
    document.body.style.overflow = 'hidden';
    setTimeout(() => document.getElementById('editTextarea').focus(), 300);
}

// ====== ЗАКРЫТЬ РЕДАКТОР ======
function closeEditorPanel() {
    console.log('🔒 closeEditorPanel() вызвана');
    const panel = document.getElementById('adminPanel');
    if (panel) {
        panel.classList.remove('active');
    }
    document.body.style.overflow = 'auto';
    editingSongId = null;
    editingFileName = null;
}

// ====== АЛИАС ДЛЯ СОВМЕСТИМОСТИ С HTML ======
function closeEditor() {
    closeEditorPanel();
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
    } catch (e) {
        console.error('Ошибка загрузки песни:', e);
    }
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

    closeEditorPanel();

    if (!isTokenValid()) {
        editedSongs[editingSongId] = content;
        const originalKey = editingSongId + '_original';
        if (!editedSongs[originalKey]) {
            editedSongs[originalKey] = currentRawOriginal;
        }
        saveEditedSongs();
        renderSongList(document.getElementById('searchInput')?.value || '');
        alert('💾 Токен не найден. Песня сохранена только локально.');
        await loadSongWithEdits(editingSongId);
        return;
    }

    let savedOnGitHub = false;
    try {
        await saveFileToGitHub(`songs/${song.fileName}`, content, `Обновление ${song.fileName}`);
        savedOnGitHub = true;
        console.log(`✅ Песня "${song.title}" сохранена на GitHub`);
    } catch (e) {
        console.warn('⚠️ Не удалось сохранить на GitHub:', e.message);
        alert(`⚠️ Ошибка GitHub: ${e.message}. Песня сохранена локально.`);
    }

    if (savedOnGitHub) {
        delete editedSongs[editingSongId];
        saveEditedSongs();
        
        alert('✅ Песня сохранена на GitHub!');
        
        // ====== СОХРАНЯЕМ ИМЯ ФАЙЛА ======
        const fileNameToRestore = song.fileName;
        localStorage.setItem('song_to_restore', fileNameToRestore);
        console.log(`🔄 Сохранено имя файла для восстановления: ${fileNameToRestore}`);
        
        console.log(`🔄 Перезагрузка страницы...`);
        location.reload();
    } else {
        editedSongs[editingSongId] = content;
        const originalKey = editingSongId + '_original';
        if (!editedSongs[originalKey]) {
            editedSongs[originalKey] = currentRawOriginal;
        }
        saveEditedSongs();
        renderSongList(document.getElementById('searchInput')?.value || '');
        await loadSongWithEdits(editingSongId);
        alert('💾 Песня сохранена локально (не на GitHub)');
    }
}

// ====== ДОБАВЛЕНИЕ НОВОЙ ПЕСНИ ======
async function createNewSong() {
    if (!isTokenValid()) {
        alert('❌ Токен не найден. Нажмите "Редактор" и введите токен.');
        return;
    }

    const title = prompt('🎵 Введите название песни:');
    if (!title) return;
    const artist = prompt('🎤 Введите исполнителя:');
    if (!artist) return;

    const fileName = `${artist} - ${title}.txt`.replace(/[^а-яА-Яa-zA-Z0-9 \-]/g, '');
    if (!fileName) {
        alert('❌ Некорректное имя файла');
        return;
    }

    const template = `[Куплет 1]\n\n[Am]Текст песни...\n\n[Припев]\n\n[Am]Текст припева...`;

    const newSong = {
        id: `song_${songsList.length}`,
        title: title,
        artist: artist,
        fileName: fileName,
        originUrl: null
    };

    let savedOnGitHub = false;
    try {
        await saveFileToGitHub(`songs/${fileName}`, template, `Добавлена песня: ${fileName}`);
        const csvLine = `"${artist}","${title}","${fileName}"\n`;
        await appendToCSV(csvLine);
        savedOnGitHub = true;
        console.log(`✅ Новая песня "${title}" создана на GitHub`);
    } catch (e) {
        console.warn('⚠️ Не удалось сохранить на GitHub:', e.message);
        alert(`⚠️ Ошибка GitHub: ${e.message}. Песня сохранена локально.`);
        savedOnGitHub = false;
    }

    if (!savedOnGitHub) {
        songsList.push(newSong);
        editedSongs[newSong.id] = template;
        editedSongs[newSong.id + '_original'] = template;
        saveEditedSongs();
        const custom = JSON.parse(localStorage.getItem('custom_songs') || '[]');
        custom.push(newSong);
        localStorage.setItem('custom_songs', JSON.stringify(custom));
        console.log(`💾 Новая песня "${title}" сохранена локально`);
    } else {
        songsList.push(newSong);
        // Сохраняем имя файла для восстановления
        localStorage.setItem('song_to_restore', fileName);
    }

    renderSongList(document.getElementById('searchInput')?.value || '');
    alert(savedOnGitHub ? '✅ Песня создана на GitHub!' : '💾 Песня создана локально (не на GitHub)');
    if (savedOnGitHub) {
        console.log(`🔄 Перезагрузка страницы...`);
        location.reload();
    } else {
        openEditorPanel();
    }
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

// ====== СТАТУС ======
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

// ====== СКАЧАТЬ ZIP ======
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

// ====== ПЕРЕХВАТ ЗАГРУЗКИ ПЕСЕН ======
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
};

// ====== РАСШИРЕННЫЙ RENDER ДЛЯ ПОМЕТОК ======
const originalRender = renderSongList;
renderSongList = function(filterText) {
    originalRender(filterText);
    document.querySelectorAll('.song-item').forEach(item => {
        const id = item.dataset.id;
        if (id && editedSongs[id]) {
            const originalKey = id + '_original';
            if (editedSongs[originalKey] && editedSongs[id] !== editedSongs[originalKey]) {
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

// ====== ВОССТАНОВЛЕНИЕ ПЕСНИ ПОСЛЕ ПЕРЕЗАГРУЗКИ ======
function restoreSongAfterReload() {
    const fileName = localStorage.getItem('song_to_restore');
    if (!fileName) {
        console.log('ℹ️ Нет сохранённой песни для восстановления');
        return;
    }
    
    localStorage.removeItem('song_to_restore');
    console.log(`🔄 Восстановление песни с именем файла: ${fileName}`);
    
    function tryLoadSong() {
        if (!songsList || songsList.length === 0) {
            console.log('⏳ Список песен ещё не загружен, ждём...');
            return false;
        }
        
        const song = songsList.find(s => s.fileName === fileName);
        if (!song) {
            console.warn(`⚠️ Песня с именем файла "${fileName}" не найдена`);
            return false;
        }
        
        console.log(`✅ Найдена песня: "${song.title}", загружаем с GitHub...`);
        loadSongById(song.id, true, true);
        return true;
    }
    
    if (tryLoadSong()) {
        console.log('✅ Песня восстановлена сразу');
        return;
    }
    
    let attempts = 0;
    const maxAttempts = 30;
    
    const interval = setInterval(() => {
        attempts++;
        if (tryLoadSong()) {
            clearInterval(interval);
            console.log(`✅ Песня восстановлена после ${attempts} попыток`);
            return;
        }
        if (attempts >= maxAttempts) {
            clearInterval(interval);
            console.warn('⚠️ Не удалось восстановить песню после перезагрузки');
        }
    }, 100);
}

// ====== ИНИЦИАЛИЗАЦИЯ ======
document.addEventListener('DOMContentLoaded', function() {
    loadEditedSongs();
    addEditorButton();
    
    document.getElementById('addSongBtn').addEventListener('click', createNewSong);
    document.getElementById('syncStatusBtn').addEventListener('click', showSyncStatus);
    document.getElementById('downloadZipBtn').addEventListener('click', downloadChangedSongsZip);
    
    showSidebarButtons();
    
    if (isTokenValid()) {
        console.log('✅ Токен найден, редактор активен');
    } else {
        console.log('ℹ️ Токен не найден, редактор работает в локальном режиме');
    }
    
    console.log('📝 Редактор загружен');
    console.log('🔑 Токен:', isTokenValid() ? '✅ есть' : '❌ нет');
    
    // Восстанавливаем песню после перезагрузки
    setTimeout(() => {
        restoreSongAfterReload();
    }, 300);
});