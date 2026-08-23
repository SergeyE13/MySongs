// ============================================================
//  РЕДАКТОР С АСИНХРОННЫМ СОХРАНЕНИЕМ НА GITHUB
//  Сначала сохраняем в localStorage (мгновенно),
//  потом асинхронно отправляем на GitHub.
//  Если версии совпали — убираем пометку "локально".
//  БЕЗ ПЕРЕЗАГРУЗКИ СТРАНИЦЫ!
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

// ====== ПРОВЕРКА СИНХРОНИЗАЦИИ ======
async function checkAndClearLocalIfSynced(songId, content) {
    if (!isTokenValid()) return false;
    
    const song = songsList.find(s => s.id === songId);
    if (!song) return false;
    
    try {
        const url = `songs/${encodeURIComponent(song.fileName)}?t=${Date.now()}`;
        const response = await fetch(url, {
            cache: 'no-store',
            headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
        });
        if (!response.ok) return false;
        
        const freshText = await response.text();
        
        if (freshText === content) {
            delete editedSongs[songId];
            saveEditedSongs();
            
            const originalKey = songId + '_original';
            editedSongs[originalKey] = freshText;
            saveEditedSongs();
            
            const searchInput = document.getElementById('searchInput');
            const filterText = searchInput ? searchInput.value : '';
            if (typeof renderSongList === 'function') {
                renderSongList(filterText);
            }
            
            if (currentSongId === songId) {
                currentRawOriginal = freshText;
                updateSongDisplay();
            }
            
            console.log(`✅ Песня "${song.title}" синхронизирована с GitHub, пометка удалена`);
            return true;
        } else {
            console.log(`🔄 Версии не совпадают (GitHub задерживает обновление), повторная проверка через 3 сек...`);
            setTimeout(async () => {
                await checkAndClearLocalIfSynced(songId, content);
            }, 3000);
            return false;
        }
    } catch (e) {
        console.warn('⚠️ Ошибка проверки синхронизации:', e);
        setTimeout(async () => {
            await checkAndClearLocalIfSynced(songId, content);
        }, 5000);
        return false;
    }
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
    
    const song = songsList.find(s => s.id