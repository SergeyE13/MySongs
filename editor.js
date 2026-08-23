// ====== ВОССТАНОВЛЕНИЕ ПЕСНИ ПОСЛЕ ПЕРЕЗАГРУЗКИ ======
function restoreSongAfterReload() {
    const songId = localStorage.getItem('song_to_restore');
    if (!songId) {
        console.log('ℹ️ Нет сохранённой песни для восстановления');
        return;
    }
    
    localStorage.removeItem('song_to_restore');
    console.log(`🔄 Восстановление песни с ID: ${songId}`);
    
    // Функция проверки и загрузки
    function tryLoadSong() {
        // Проверяем, что список песен загружен
        if (!songsList || songsList.length === 0) {
            console.log('⏳ Список песен ещё не загружен, ждём...');
            return false;
        }
        
        // Ищем песню в списке
        const song = songsList.find(s => s.id === songId);
        if (!song) {
            console.warn(`⚠️ Песня с ID ${songId} не найдена в списке`);
            return false;
        }
        
        console.log(`✅ Найдена песня: "${song.title}", загружаем с GitHub...`);
        
        // ЗАГРУЖАЕМ ПЕСНЮ С GITHUB
        loadSongById(songId, true, true);
        return true;
    }
    
    // Пытаемся загрузить сразу
    if (tryLoadSong()) {
        console.log('✅ Песня восстановлена сразу');
        return;
    }
    
    // Если не получилось — ждём загрузки списка
    let attempts = 0;
    const maxAttempts = 30; // 3 секунды максимум
    
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
    // Даём небольшую задержку для загрузки списка песен
    setTimeout(() => {
        restoreSongAfterReload();
    }, 200);
});