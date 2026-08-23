// ====== ВОССТАНОВЛЕНИЕ ПЕСНИ ПОСЛЕ ПЕРЕЗАГРУЗКИ ======
function restoreSongAfterReload() {
    const songId = localStorage.getItem('song_to_restore');
    if (!songId) return;
    
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
        
        console.log(`✅ Найдена песня: ${song.title}, загружаем...`);
        
        // ЗАГРУЖАЕМ ПЕСНЮ С GITHUB
        loadSongById(songId, true, true);
        return true;
    }
    
    // Пытаемся загрузить сразу
    if (tryLoadSong()) return;
    
    // Если не получилось — ждём загрузки списка
    let attempts = 0;
    const maxAttempts = 20; // 2 секунды максимум
    
    const interval = setInterval(() => {
        attempts++;
        if (tryLoadSong()) {
            clearInterval(interval);
            return;
        }
        if (attempts >= maxAttempts) {
            clearInterval(interval);
            console.warn('⚠️ Не удалось восстановить песню после перезагрузки');
        }
    }, 100);
}