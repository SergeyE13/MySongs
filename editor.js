// ====== ПРОСТОЙ РЕДАКТОР БЕЗ ТОКЕНА ======
const EDITOR_PASSWORD = '13579'; // Пароль для входа в редактор

let isEditorMode = false;
let editedSongs = {}; // Хранит отредактированные тексты

// Загружаем сохранённые правки из localStorage
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

// Сохраняем правки в localStorage
function saveEditedSongs() {
    try {
        localStorage.setItem('edited_songs', JSON.stringify(editedSongs));
        console.log('💾 Правки сохранены');
    } catch (e) {
        console.warn('Ошибка сохранения:', e);
    }
}

// ====== КНОПКА ВХОДА В РЕДАКТОР ======
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

// ====== ВКЛЮЧИТЬ/ВЫКЛЮЧИТЬ РЕДАКТОР ======
function toggleEditor() {
    if (!isEditorMode) {
        // Пытаемся войти
        const pwd = prompt('🔑 Введите пароль для редактирования:');
        if (pwd === EDITOR_PASSWORD) {
            isEditorMode = true;
            document.getElementById('editorToggleBtn').textContent = '🔒 Закрыть';
            document.getElementById('editorToggleBtn').style.background = '#e74c3c';
            showEditorUI();
            alert('✅ Режим редактирования включен!');
        } else if (pwd !== null) {
            alert('❌ Неверный пароль!');
        }
    } else {
        // Выходим из режима
        isEditorMode = false;
        document.getElementById('editorToggleBtn').textContent = '✏️ Редактор';
        document.getElementById('editorToggleBtn').style.background = '#f39c12';
        hideEditorUI();
        closeEditorPanel();
    }
}

// ====== ПОКАЗАТЬ ИНТЕРФЕЙС РЕДАКТОРА ======
function showEditorUI() {
    // Показываем иконку редактирования у текущей песни
    updateEditorIcon();
    
    // Добавляем кнопку "Сбросить правки"
    const toolbar = document.querySelector('.toolbar .controls');
    const resetBtn = document.createElement('button');
    resetBtn.id = 'resetEditsBtn';
    resetBtn.textContent = '↺ Сбросить';
    resetBtn.style.cssText = 'background:#95a5a6;color:white;padding:8px 16px;border:none;border-radius:40px;cursor:pointer;font-size:0.9rem;font-weight:600;font-family:system-ui,sans-serif;';
    resetBtn.onclick = resetCurrentSong;
    toolbar.appendChild(resetBtn);
}

// ====== СКРЫТЬ ИНТЕРФЕЙС РЕДАКТОРА ======
function hideEditorUI() {
    const resetBtn = document.getElementById('resetEditsBtn');
    if (resetBtn) resetBtn.remove();
}

// ====== ОБНОВИТЬ ИКОНКУ РЕДАКТИРОВАНИЯ ======
function updateEditorIcon() {
    // Удаляем старые иконки
    document.querySelectorAll('.edit-icon').forEach(el => el.remove());
    
    if (!isEditorMode) return;
    
    // Добавляем иконку к текущей песне
    const activeItem = document.querySelector('.song-item.active');
    if (activeItem) {
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
}

// ====== ОТКРЫТЬ ПАНЕЛЬ РЕДАКТОРА ======
function openEditorPanel() {
    if (!isEditorMode || !currentSongId) {
        alert('❌ Сначала включите режим редактирования и выберите песню');
        return;
    }
    
    const song = songsList.find(s => s.id === currentSongId);
    if (!song) return;
    
    // Берём текст: если есть правка — её, иначе оригинал
    const savedText = editedSongs[currentSongId] || currentRawOriginal;
    
    document.getElementById('editSongTitle').textContent = `✏️ ${song.title}`;
    document.getElementById('editTextarea').value = savedText;
    document.getElementById('adminPanel').classList.add('active');
    document.body.style.overflow = 'hidden';
    
    setTimeout(() => {
        document.getElementById('editTextarea').focus();
    }, 300);
}

// ====== СОХРАНИТЬ ПРАВКУ ======
function saveEditedSong() {
    if (!currentSongId) return;
    
    const content = document.getElementById('editTextarea').value;
    if (!content.trim()) {
        if (!confirm('⚠️ Текст пустой! Сохранить пустую песню?')) return;
    }
    
    // Сохраняем правку в памяти и localStorage
    editedSongs[currentSongId] = content;
    saveEditedSongs();
    
    // Обновляем отображение
    if (currentSongId === editingSongId) {
        // Перезагружаем песню с учётом правки
        loadSongWithEdits(currentSongId);
    }
    
    alert('✅ Правки сохранены!');
    closeEditorPanel();
}

// ====== ЗАГРУЗИТЬ ПЕСНЮ С УЧЁТОМ ПРАВОК ======
async function loadSongWithEdits(songId) {
    const song = songsList.find(s => s.id === songId);
    if (!song) return;
    
    try {
        const response = await fetch(`songs/${encodeURIComponent(song.fileName)}?t=${Date.now()}`);
        const originalText = await response.text();
        
        // Сохраняем оригинал, если ещё не сохранён
        if (!editedSongs[songId + '_original']) {
            editedSongs[songId + '_original'] = originalText;
        }
        
        // Берём правку или оригинал
        const displayText = editedSongs[songId] || originalText;
        
        currentRawOriginal = displayText;
        currentSongId = songId;
        transposeShift = songTransposes[songId] || 0;
        updateSongDisplay();
        
        // Обновляем иконку
        updateEditorIcon();
        
    } catch (e) {
        console.error('Ошибка загрузки песни:', e);
    }
}

// ====== СБРОСИТЬ ПРАВКИ ТЕКУЩЕЙ ПЕСНИ ======
function resetCurrentSong() {
    if (!currentSongId) return;
    if (!confirm('❗ Вернуть оригинальный текст песни?')) return;
    
    const originalKey = currentSongId + '_original';
    if (editedSongs[originalKey]) {
        editedSongs[currentSongId] = editedSongs[originalKey];
        saveEditedSongs();
        loadSongWithEdits(currentSongId);
        alert('✅ Оригинальный текст восстановлен');
    } else {
        alert('❌ Оригинал не найден');
    }
}

// ====== ЗАКРЫТЬ ПАНЕЛЬ РЕДАКТОРА ======
function closeEditorPanel() {
    document.getElementById('adminPanel').classList.remove('active');
    document.body.style.overflow = 'auto';
}

// ====== ПЕРЕХВАТЫВАЕМ ЗАГРУЗКУ ПЕСЕН ======
// Сохраняем оригиналы при загрузке
const originalLoadSong = loadSongById;
loadSongById = async function(id, saveToStorage, forceRefresh) {
    await originalLoadSong(id, saveToStorage, forceRefresh);
    
    // Сохраняем оригинал
    if (currentSongId && currentRawOriginal) {
        const originalKey = currentSongId + '_original';
        if (!editedSongs[originalKey]) {
            editedSongs[originalKey] = currentRawOriginal;
            saveEditedSongs();
        }
        
        // Если есть правка — применяем её
        if (editedSongs[currentSongId]) {
            currentRawOriginal = editedSongs[currentSongId];
            updateSongDisplay();
        }
    }
    
    updateEditorIcon();
};

// ====== ИНИЦИАЛИЗАЦИЯ ======
document.addEventListener('DOMContentLoaded', function() {
    loadEditedSongs();
    addEditorButton();
    console.log('📝 Простой редактор загружен!');
    console.log('🔑 Пароль:', EDITOR_PASSWORD);
    console.log('💾 Правок в памяти:', Object.keys(editedSongs).length);
});