// ====== НАСТРОЙКИ РЕДАКТОРА ======
// ВСТАВЬТЕ СЮДА НОВЫЙ ТОКЕН!
const GITHUB_TOKEN = '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';

const REPO_OWNER = 'SergeyE13';
const REPO_NAME = 'MySongs';
const BRANCH = 'main';
const ADMIN_PASSWORD = '13579';

let isAdmin = false;
let editingSongId = null;
let editingFileName = null;

console.log('🔐 Токен установлен:', GITHUB_TOKEN ? '✅ Да' : '❌ Нет');
console.log(`📂 Репозиторий: ${REPO_OWNER}/${REPO_NAME}`);

// ====== КНОПКА ВХОДА В АДМИНКУ ======
function addAdminButton() {
    const toolbar = document.querySelector('.toolbar .controls');
    if (!toolbar) return;
    if (document.getElementById('adminToggleBtn')) return;
    
    const btn = document.createElement('button');
    btn.id = 'adminToggleBtn';
    btn.className = 'admin-toggle-btn';
    btn.textContent = '🔐 Админка';
    btn.onclick = toggleLogin;
    toolbar.prepend(btn);
    console.log('✅ Кнопка "Админка" добавлена');
}

function toggleLogin() {
    const overlay = document.getElementById('loginOverlay');
    overlay.classList.toggle('active');
    if (overlay.classList.contains('active')) {
        document.getElementById('adminPasswordInput').value = '';
        setTimeout(() => {
            document.getElementById('adminPasswordInput').focus();
        }, 300);
    }
}

// ====== ВХОД ======
document.getElementById('adminPasswordSubmit').addEventListener('click', () => {
    const pwd = document.getElementById('adminPasswordInput').value;
    if (pwd === ADMIN_PASSWORD) {
        isAdmin = true;
        document.getElementById('loginOverlay').classList.remove('active');
        enterAdminMode();
    } else {
        alert('❌ Неверный пароль!');
        document.getElementById('adminPasswordInput').value = '';
        document.getElementById('adminPasswordInput').focus();
    }
});

document.getElementById('adminPasswordInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        document.getElementById('adminPasswordSubmit').click();
    }
});

document.getElementById('loginOverlay').addEventListener('click', function(e) {
    if (e.target === this) {
        this.classList.remove('active');
    }
});

// ====== РЕЖИМ АДМИНИСТРАТОРА ======
function enterAdminMode() {
    const btn = document.getElementById('adminToggleBtn');
    btn.textContent = '🔓 Админ';
    btn.classList.add('active');
    btn.onclick = exitAdminMode;
    showEditControls();
    alert('✅ Режим редактирования включен!');
    console.log('✅ Режим администратора активирован');
}

function exitAdminMode() {
    isAdmin = false;
    const btn = document.getElementById('adminToggleBtn');
    btn.textContent = '🔐 Админка';
    btn.classList.remove('active');
    btn.onclick = toggleLogin;
    const editBtn = document.getElementById('editCurrentSongBtn');
    if (editBtn) editBtn.remove();
    const addBtn = document.querySelector('.add-song-btn');
    if (addBtn) addBtn.remove();
    closeEditor();
    console.log('🔒 Режим администратора выключен');
}

// ====== КНОПКИ РЕДАКТИРОВАНИЯ ======
function showEditControls() {
    const toolbar = document.querySelector('.toolbar .controls');
    if (!toolbar) return;
    if (document.getElementById('editCurrentSongBtn')) return;
    
    const editBtn = document.createElement('button');
    editBtn.id = 'editCurrentSongBtn';
    editBtn.textContent = '✏️ Редактировать';
    editBtn.style.cssText = 'background:#f39c12;color:white;padding:8px 16px;border:none;border-radius:40px;cursor:pointer;font-size:0.9rem;font-weight:600;font-family:system-ui,sans-serif;';
    editBtn.onclick = editCurrentSong;
    toolbar.appendChild(editBtn);
    
    const addBtn = document.createElement('button');
    addBtn.textContent = '+ Новая';
    addBtn.className = 'add-song-btn';
    addBtn.style.cssText = 'background:#27ae60;color:white;padding:8px 16px;border:none;border-radius:40px;cursor:pointer;font-size:0.9rem;font-weight:600;font-family:system-ui,sans-serif;';
    addBtn.onclick = createNewSong;
    toolbar.appendChild(addBtn);
}

function editCurrentSong() {
    if (!isAdmin) {
        alert('❌ Сначала войдите в режим администратора!');
        return;
    }
    if (!currentSongId) {
        alert('❌ Сначала выберите песню!');
        return;
    }
    const song = songsList.find(s => s.id === currentSongId);
    if (!song) return;
    openEditor(song);
}

// ====== ОТКРЫТЬ РЕДАКТОР ======
async function openEditor(song) {
    editingSongId = song.id;
    editingFileName = song.fileName;
    
    try {
        const response = await fetch(`songs/${encodeURIComponent(song.fileName)}?t=${Date.now()}`);
        const text = await response.text();
        document.getElementById('editSongTitle').textContent = `✏️ ${song.title}`;
        document.getElementById('editTextarea').value = text;
        document.getElementById('adminPanel').classList.add('active');
        document.body.style.overflow = 'hidden';
        setTimeout(() => {
            document.getElementById('editTextarea').focus();
        }, 300);
    } catch (e) {
        alert('❌ Не удалось загрузить песню');
        console.error(e);
    }
}

// ====== СОХРАНИТЬ ПЕСНЮ (исправленная версия) ======
async function saveEditedSong() {
    if (!editingFileName) return;
    
    const content = document.getElementById('editTextarea').value;
    if (!content.trim()) {
        if (!confirm('⚠️ Текст пустой! Сохранить пустую песню?')) return;
    }
    
    // Проверяем токен перед сохранением
    if (!GITHUB_TOKEN || GITHUB_TOKEN.length < 10) {
        alert('❌ Токен не настроен! Проверьте GITHUB_TOKEN в editor.js');
        return;
    }
    
    try {
        const encodedFileName = encodeURIComponent(editingFileName);
        const apiUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/songs/${encodedFileName}`;
        
        console.log('🔍 Сохраняем:', apiUrl);
        console.log('🔑 Токен начинается с:', GITHUB_TOKEN.substring(0, 10) + '...');
        
        // Получаем SHA файла
        let sha = null;
        try {
            const shaResponse = await fetch(apiUrl, {
                method: 'GET',
                headers: {
                    'Authorization': `token ${GITHUB_TOKEN}`,
                    'Accept': 'application/vnd.github.v3+json'
                }
            });
            if (shaResponse.ok) {
                const data = await shaResponse.json();
                sha = data.sha;
                console.log('📄 SHA найден:', sha);
            } else {
                console.log('📄 Файл не найден, статус:', shaResponse.status);
            }
        } catch (e) {
            console.log('📄 Файл не найден, создаём новый');
        }
        
        const encodedContent = btoa(unescape(encodeURIComponent(content)));
        
        const response = await fetch(apiUrl, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Content-Type': 'application/json',
                'Accept': 'application/vnd.github.v3+json'
            },
            body: JSON.stringify({
                message: `Обновление песни: ${editingFileName}`,
                content: encodedContent,
                sha: sha,
                branch: BRANCH
            })
        });
        
        console.log('📊 Статус ответа:', response.status);
        
        if (!response.ok) {
            const error = await response.json();
            console.error('❌ Полная ошибка API:', error);
            throw new Error(error.message || 'Ошибка сохранения');
        }
        
        const result = await response.json();
        console.log('✅ Сохранено!', result);
        alert('✅ Песня сохранена!');
        closeEditor();
        await loadSongById(editingSongId, true, true);
        
    } catch (e) {
        alert(`❌ Ошибка: ${e.message}`);
        console.error('❌ Ошибка:', e);
    }
}

// ====== ЗАКРЫТЬ РЕДАКТОР ======
function closeEditor() {
    document.getElementById('adminPanel').classList.remove('active');
    document.body.style.overflow = 'auto';
    editingSongId = null;
    editingFileName = null;
}

// ====== СОЗДАТЬ НОВУЮ ПЕСНЮ ======
async function createNewSong() {
    if (!isAdmin) return;
    
    const title = prompt('🎵 Название песни:');
    if (!title) return;
    const artist = prompt('🎤 Исполнитель:');
    if (!artist) return;
    
    const template = `[Куплет 1]\n\n[Am]Текст песни...\n\n[Припев]\n\n[Am]Текст припева...`;
    const fileName = `${artist} - ${title}.txt`.replace(/[^а-яА-Яa-zA-Z0-9 \-]/g, '');
    
    try {
        const encodedFileName = encodeURIComponent(fileName);
        const apiUrl = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/songs/${encodedFileName}`;
        
        const response = await fetch(apiUrl, {
            method: 'PUT',
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Content-Type': 'application/json',
                'Accept': 'application/vnd.github.v3+json'
            },
            body: JSON.stringify({
                message: `Добавлена песня: ${fileName}`,
                content: btoa(unescape(encodeURIComponent(template))),
                branch: BRANCH
            })
        });
        
        if (!response.ok) throw new Error('Не удалось создать файл');
        
        const csvLine = `"${artist}","${title}","${fileName}"\n`;
        await appendToCSV(csvLine);
        
        alert('✅ Песня создана!');
        await refreshSongsList();
        
    } catch (e) {
        alert(`❌ Ошибка: ${e.message}`);
    }
}

// ====== ДОБАВИТЬ В CSV ======
async function appendToCSV(line) {
    let sha = null;
    let currentContent = '';
    
    try {
        const response = await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/songs.csv`, {
            headers: { 
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json'
            }
        });
        if (response.ok) {
            const data = await response.json();
            sha = data.sha;
            currentContent = atob(data.content);
        }
    } catch (e) {
        console.log('CSV не найден, создаём новый');
    }
    
    const newContent = currentContent + line;
    
    await fetch(`https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents/songs.csv`, {
        method: 'PUT',
        headers: {
            'Authorization': `token ${GITHUB_TOKEN}`,
            'Content-Type': 'application/json',
            'Accept': 'application/vnd.github.v3+json'
        },
        body: JSON.stringify({
            message: 'Обновление списка песен',
            content: btoa(unescape(encodeURIComponent(newContent))),
            sha: sha || undefined,
            branch: BRANCH
        })
    });
}

// ====== ИНИЦИАЛИЗАЦИЯ ======
document.addEventListener('DOMContentLoaded', function() {
    addAdminButton();
    console.log('📝 Редактор песен загружен!');
    console.log('🔑 Нажмите кнопку "Админка" для входа');
    console.log(`🔐 Пароль: ${ADMIN_PASSWORD}`);
    console.log(`📂 Репозиторий: ${REPO_OWNER}/${REPO_NAME}`);
    console.log('✏️ После входа нажмите "Редактировать" для правки текущей песни');
});