// ====== ПРОСТОЙ РЕДАКТОР БЕЗ ТОКЕНА ======
console.log('📂 editor.js загружен');

const EDITOR_PASSWORD = '13579'; // Пароль для входа в редактор

// ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ (объявлены в начале)
let isEditorMode = false;
let editedSongs = {}; // Хранит отредактированные тексты
let editingSongId = null; // ID песни, которую редактируем
let editingFileName = null; // Имя файла песни

console.log('📌 Переменные инициализированы:', {
    isEditorMode,
    editingSongId,
    editingFileName,
    editedSongsKeys: Object.keys(editedSongs).length
});

// Загружаем сохранённые правки из localStorage
function loadEditedSongs() {
    console.log('🔄 loadEditedSongs() вызвана');
    try {
        const saved = localStorage.getItem('edited_songs');
        console.log('📦 Данные из localStorage:', saved ? 'есть' : 'нет');
        if (saved) {
            editedSongs = JSON.parse(saved);
            console.log('📝 Загружено правок:', Object.keys(editedSongs).length);
            console.log('📝 Ключи правок:', Object.keys(editedSongs));
        }
    } catch (e) {
        console.warn('❌ Ошибка загрузки правок:', e);
    }
}

// Сохраняем правки в localStorage
function saveEditedSongs() {
    console.log('💾 saveEditedSongs() вызвана');
    try {
        localStorage.setItem('edited_songs', JSON.stringify(editedSongs));
        console.log('💾 Правки сохранены, всего:', Object.keys(editedSongs).length);
    } catch (e) {
        console.warn('❌ Ошибка сохранения:', e);
    }
}

// ====== КНОПКА ВХОДА В РЕДАКТОР ======
function addEditorButton() {
    console.log('🔧 addEditorButton() вызвана');
    const toolbar = document.querySelector('.toolbar .controls');
    if (!toolbar) {
        console.warn('⚠️ Toolbar не найден');
        return;
    }
    if (document.getElementById('editorToggleBtn')) {
        console.log('ℹ️ Кнопка уже существует');
        return;
    }
    
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
    console.log('🔄 toggleEditor() вызвана, текущий режим:', isEditorMode);
    
    if (!isEditorMode) {
        // Пытаемся войти
        console.log('🔑 Запрос пароля');
        const pwd = prompt('🔑 Введите пароль для редактирования:');
        console.log('🔑 Пароль введён:', pwd ? '***' : 'отмена');
        
        if (pwd === EDITOR_PASSWORD) {
            console.log('✅ Пароль верный');
            isEditorMode = true;
            document.getElementById('editorToggleBtn').textContent = '🔒 Закрыть';
            document.getElementById('editorToggleBtn').style.background = '#e74c3c';
            showEditorUI();
            alert('✅ Режим редактирования включен!');
        } else if (pwd !== null) {
            console.warn('❌ Неверный пароль');
            alert('❌ Неверный пароль!');
        }
    } else {
        // Выходим из режима
        console.log('🔒 Выход из режима редактирования');
        isEditorMode = false;
        document.getElementById('editorToggleBtn').textContent = '✏️ Редактор';
        document.getElementById('editorToggleBtn').style.background = '#f39c12';
        hideEditorUI();
        closeEditor(); // <-- ИСПРАВЛЕНО: теперь вызывается closeEditor()
    }
}

// ====== ПОКАЗАТЬ ИНТЕРФЕЙС РЕДАКТОРА ======
function showEditorUI() {
    console.log('🖥️ showEditorUI() вызвана');
    // Показываем иконку редактирования у текущей песни
    updateEditorIcon();
    
    // Добавляем кнопку "Сбросить правки"
    const toolbar = document.querySelector('.toolbar .controls');
    if (!document.getElementById('resetEditsBtn')) {
        const resetBtn = document.createElement('button');
        resetBtn.id = 'resetEditsBtn';
        resetBtn.textContent = '↺ Сбросить';
        resetBtn.style.cssText = 'background:#95a5a6;color:white;padding:8px 16px;border:none;border-radius:40px;cursor:pointer;font-size:0.9rem;font-weight:600;font-family:system-ui,sans-serif;';
        resetBtn.onclick = resetCurrentSong;
        toolbar.appendChild(resetBtn);
        console.log('✅ Кнопка "Сбросить" добавлена');
    }
}

// ====== СКРЫТЬ ИНТЕРФЕЙС РЕДАКТОРА ======
function hideEditorUI() {
    console.log('🖥️ hideEditorUI() вызвана');
    const resetBtn = document.getElementById('resetEditsBtn');
    if (resetBtn) {
        resetBtn.remove();
        console.log('✅ Кнопка "Сбросить" удалена');
    }
}

// ====== ОБНОВИТЬ ИКОНКУ РЕДАКТИРОВАНИЯ ======
function updateEditorIcon() {
    console.log('🔄 updateEditorIcon() вызвана, isEditorMode:', isEditorMode);
    // Удаляем старые иконки
    document.querySelectorAll('.edit-icon').forEach(el => {
        console.log('🗑️ Удаляем старую иконку');
        el.remove();
    });
    
    if (!isEditorMode) {
        console.log('ℹ️ Режим редактирования выключен, иконки не нужны');
        return;
    }
    
    // Добавляем иконку к активной песне
    const activeItem = document.querySelector('.song-item.active');
    console.log('🔍 Активный элемент:', activeItem ? 'найден' : 'не найден');
    
    if (activeItem) {
        const icon = document.createElement('button');
        icon.className = 'edit-icon';
        icon.textContent = '✏️';
        icon.style.cssText = 'position:absolute;right:40px;top:50%;transform:translateY(-50%);font-size:20px;cursor:pointer;background:#f39c12;color:white;border-radius:50%;width:34px;height:34px;display:flex;align-items:center;justify-content:center;border:none;';
        icon.onclick = (e) => {
            console.log('✏️ Нажата иконка редактирования');
            e.stopPropagation();
            openEditorPanel();
        };
        activeItem.style.position = 'relative';
        activeItem.appendChild(icon);
        console.log('✅ Иконка добавлена к песне');
    } else {
        console.warn('⚠️ Активная песня не найдена');
    }
}

// ====== ОТКРЫТЬ ПАНЕЛЬ РЕДАКТОРА ======
function openEditorPanel() {
    console.log('📝 openEditorPanel() вызвана');
    console.log('📌 isEditorMode:', isEditorMode);
    console.log('📌 currentSongId:', currentSongId);
    console.log('📌 songsList:', songsList ? songsList.length : 'нет');
    
    if (!isEditorMode) {
        console.warn('⚠️ Режим редактирования выключен');
        alert('❌ Сначала включите режим редактирования (кнопка "Редактор")');
        return;
    }
    
    if (!currentSongId) {
        console.warn('⚠️ Нет выбранной песни');
        alert('❌ Сначала выберите песню!');
        return;
    }
    
    const song = songsList.find(s => s.id === currentSongId);
    if (!song) {
        console.error('❌ Песня не найдена:', currentSongId);
        alert('❌ Песня не найдена');
        return;
    }
    
    console.log('🎵 Найдена песня:', song.title);
    
    // СОХРАНЯЕМ ID ПЕСНИ В ГЛОБАЛЬНУЮ ПЕРЕМЕННУЮ
    editingSongId = currentSongId;
    editingFileName = song.fileName;
    console.log('📌 editingSongId установлен:', editingSongId);
    console.log('📌 editingFileName установлен:', editingFileName);
    
    // Берём текст: если есть правка — её, иначе оригинал
    const savedText = editedSongs[currentSongId] || currentRawOriginal;
    console.log('📄 Текст для редактирования:', savedText ? savedText.substring(0, 50) + '...' : 'пусто');
    
    document.getElementById('editSongTitle').textContent = `✏️ ${song.title}`;
    document.getElementById('editTextarea').value = savedText;
    document.getElementById('adminPanel').classList.add('active');
    document.body.style.overflow = 'hidden';
    
    setTimeout(() => {
        document.getElementById('editTextarea').focus();
    }, 300);
    
    console.log('✅ Панель редактора открыта');
}

// ====== СОХРАНИТЬ ПРАВКУ ======
function saveEditedSong() {
    console.log('========================================');
    console.log('📝 saveEditedSong() ВЫЗВАНА!');
    console.log('📌 editingSongId:', editingSongId);
    console.log('📌 typeof editingSongId:', typeof editingSongId);
    console.log('📌 editingFileName:', editingFileName);
    console.log('📌 currentSongId:', currentSongId);
    console.log('========================================');
    
    // ПРОВЕРЯЕМ, ЧТО ПЕРЕМЕННАЯ ОПРЕДЕЛЕНА
    if (typeof editingSongId === 'undefined') {
        console.error('❌ editingSongId = undefined!');
        alert('❌ Ошибка: переменная editingSongId не определена');
        return;
    }
    
    if (editingSongId === null) {
        console.error('❌ editingSongId = null!');
        alert('❌ Ошибка: не выбрана песня для редактирования');
        return;
    }
    
    if (!editingSongId) {
        console.error('❌ editingSongId пустой!');
        alert('❌ Ошибка: ID песни пустой');
        return;
    }
    
    console.log('✅ editingSongId валиден:', editingSongId);
    
    const content = document.getElementById('editTextarea').value;
    console.log('📄 Содержимое текста:', content ? content.substring(0, 50) + '...' : 'пусто');
    
    if (!content.trim()) {
        console.warn('⚠️ Текст пустой');
        if (!confirm('⚠️ Текст пустой! Сохранить пустую песню?')) {
            console.log('❌ Сохранение отменено');
            return;
        }
    }
    
    // Сохраняем правку в памяти и localStorage
    console.log('💾 Сохраняем правку для:', editingSongId);
    editedSongs[editingSongId] = content;
    console.log('📝 editedSongs обновлён:', Object.keys(editedSongs));
    saveEditedSongs();
    
    // Обновляем отображение
    if (currentSongId === editingSongId) {
        console.log('🔄 Перезагружаем песню с правками');
        loadSongWithEdits(editingSongId);
    } else {
        console.warn('⚠️ currentSongId не совпадает с editingSongId');
    }
    
    alert('✅ Правки сохранены!');
    closeEditor(); // <-- ИСПРАВЛЕНО: теперь вызывается closeEditor()
    console.log('✅ saveEditedSong() завершена');
    console.log('========================================');
}

// ====== ЗАГРУЗИТЬ ПЕСНЮ С УЧЁТОМ ПРАВОК ======
async function loadSongWithEdits(songId) {
    console.log('🔄 loadSongWithEdits() вызвана для:', songId);
    const song = songsList.find(s => s.id === songId);
    if (!song) {
        console.error('❌ Песня не найдена:', songId);
        return;
    }
    
    try {
        const response = await fetch(`songs/${encodeURIComponent(song.fileName)}?t=${Date.now()}`);
        const originalText = await response.text();
        console.log('📄 Оригинал загружен, длина:', originalText.length);
        
        // Сохраняем оригинал, если ещё не сохранён
        const originalKey = songId + '_original';
        if (!editedSongs[originalKey]) {
            editedSongs[originalKey] = originalText;
            saveEditedSongs();
            console.log('💾 Оригинал сохранён');
        }
        
        // Берём правку или оригинал
        const displayText = editedSongs[songId] || originalText;
        console.log('📄 Текст для отображения:', displayText ? displayText.substring(0, 50) + '...' : 'пусто');
        
        currentRawOriginal = displayText;
        currentSongId = songId;
        transposeShift = songTransposes[songId] || 0;
        updateSongDisplay();
        
        // Обновляем иконку
        updateEditorIcon();
        console.log('✅ loadSongWithEdits() завершена');
        
    } catch (e) {
        console.error('❌ Ошибка загрузки песни:', e);
    }
}

// ====== СБРОСИТЬ ПРАВКИ ТЕКУЩЕЙ ПЕСНИ ======
function resetCurrentSong() {
    console.log('🔄 resetCurrentSong() вызвана');
    if (!currentSongId) {
        console.warn('⚠️ Нет выбранной песни');
        alert('❌ Нет выбранной песни');
        return;
    }
    
    if (!confirm('❗ Вернуть оригинальный текст песни?')) {
        console.log('❌ Сброс отменён');
        return;
    }
    
    const originalKey = currentSongId + '_original';
    console.log('🔍 Ищем оригинал по ключу:', originalKey);
    
    if (editedSongs[originalKey]) {
        // Удаляем правку
        delete editedSongs[currentSongId];
        saveEditedSongs();
        console.log('🗑️ Правка удалена');
        
        // Загружаем оригинал
        loadSongWithEdits(currentSongId);
        alert('✅ Оригинальный текст восстановлен');
    } else {
        console.warn('⚠️ Оригинал не найден');
        alert('❌ Оригинал не найден');
    }
}

// ====== ЗАКРЫТЬ ПАНЕЛЬ РЕДАКТОРА (ОСНОВНАЯ ФУНКЦИЯ) ======
function closeEditor() {
    console.log('🔒 closeEditor() вызвана');
    const panel = document.getElementById('adminPanel');
    if (panel) {
        panel.classList.remove('active');
    }
    document.body.style.overflow = 'auto';
    editingSongId = null;
    editingFileName = null;
    console.log('📌 editingSongId сброшен в null');
}

// ====== АЛИАС ДЛЯ СОВМЕСТИМОСТИ ======
// Если в HTML используется closeEditorPanel, то она будет работать
function closeEditorPanel() {
    console.log('🔒 closeEditorPanel() вызвана (алиас)');
    closeEditor();
}

// ====== ПЕРЕХВАТЫВАЕМ ЗАГРУЗКУ ПЕСЕН (сохраняем оригиналы) ======
console.log('🔄 Перехват loadSongById...');

// Сохраняем оригинальную функцию
const originalLoadSong = window.loadSongById;

if (typeof originalLoadSong === 'function') {
    console.log('✅ Оригинальная loadSongById найдена');
    
    window.loadSongById = async function(id, saveToStorage, forceRefresh) {
        console.log('🔄 loadSongById (перехвачен) вызвана для:', id);
        await originalLoadSong(id, saveToStorage, forceRefresh);
        console.log('✅ Оригинальная loadSongById выполнена');
        
        // Сохраняем оригинал
        if (currentSongId && currentRawOriginal) {
            const originalKey = currentSongId + '_original';
            if (!editedSongs[originalKey]) {
                editedSongs[originalKey] = currentRawOriginal;
                saveEditedSongs();
                console.log('💾 Оригинал сохранён (из перехвата)');
            }
            
            // Если есть правка — применяем её
            if (editedSongs[currentSongId]) {
                console.log('🔄 Применяем правку:', editedSongs[currentSongId].substring(0, 30) + '...');
                currentRawOriginal = editedSongs[currentSongId];
                updateSongDisplay();
            }
        }
        
        updateEditorIcon();
        console.log('✅ loadSongById (перехвачен) завершена');
    };
} else {
    console.warn('⚠️ Оригинальная loadSongById не найдена!');
}

// ====== КНОПКА СИНХРОНИЗАЦИИ ======

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
                fileName: song.fileName
            });
        }
    }
    return changed;
}

function showSyncStatus() {
    const changed = getChangedSongs();
    
    if (changed.length === 0) {
        alert('✅ Все песни синхронизированы с GitHub.\n\nЛокальные изменения отсутствуют.');
        return;
    }
    
    let msg = '📝 ИЗМЕНЕНЫ (в локальном хранилище):\n\n';
    changed.forEach((s, i) => {
        msg += `${i+1}. ${s.artist} — ${s.title}\n`;
    });
    
    msg += '\n🔄 ЧТО ДЕЛАТЬ:\n';
    msg += '1. Включите режим "Правка" у песни\n';
    msg += '2. Скопируйте текст из редактора\n';
    msg += '3. На GitHub откройте файл и вставьте текст\n';
    msg += '4. Сохраните изменения на GitHub\n';
    msg += '5. Нажмите "⟳ Обновить" в песеннике';
    
    alert(msg);
}

// Добавляем кнопку
function addSyncButtonToUI() {
    const toolbar = document.querySelector('.toolbar .controls');
    if (!toolbar || document.getElementById('syncStatusBtn')) return;
    
    const btn = document.createElement('button');
    btn.id = 'syncStatusBtn';
    btn.textContent = '📊 Статус';
    btn.style.cssText = 'background:#8e44ad;color:white;padding:8px 16px;border:none;border-radius:40px;cursor:pointer;font-size:0.9rem;font-weight:600;font-family:system-ui,sans-serif;';
    btn.onclick = showSyncStatus;
    toolbar.appendChild(btn);
}

// Расширяем showEditorUI
const originalShowUI = showEditorUI;
showEditorUI = function() {
    originalShowUI();
    addSyncButtonToUI();
};

// ====== ИНИЦИАЛИЗАЦИЯ ======
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 DOM загружен, инициализация редактора...');
    loadEditedSongs();
    addEditorButton();
    console.log('📝 Простой редактор загружен!');
    console.log('🔑 Пароль:', EDITOR_PASSWORD);
    console.log('💾 Правок в памяти:', Object.keys(editedSongs).length);
    console.log('📌 editingSongId:', editingSongId);
    console.log('📌 isEditorMode:', isEditorMode);
    console.log('✅ Инициализация завершена');
});

console.log('📂 editor.js полностью загружен');