// ====== ПОЛНАЯ ВЕРСИЯ С ИСПРАВЛЕНИЕМ ======
// (код идентичен предыдущему, но с исправленной функцией checkForUpdates)

// ... весь остальной код остаётся без изменений ...

// ====== АСИНХРОННАЯ ПРОВЕРКА ОБНОВЛЕНИЙ НА GITHUB ======
async function checkForUpdates(id, attempt = 1) {
    const song = songsList.find(s => s.id === id);
    if (!song) return;
    
    debugLog(`🔍 ПРОВЕРКА #${attempt} для "${song.title}"`);
    
    try {
        // ====== СНАЧАЛА ПРОВЕРЯЕМ, ЕСТЬ ЛИ ЛОКАЛЬНАЯ ВЕРСИЯ ======
        const localText = editedSongs && editedSongs[id] ? editedSongs[id] : null;
        
        if (!localText) {
            debugLog(`ℹ️ Локальная версия уже удалена для "${song.title}"`);
            return;
        }
        
        debugLog(`📄 Локальная версия существует: ${localText.length} символов`);
        debugLog(`📄 Локальная preview: ${localText.substring(0, 80)}...`);
        
        // ====== ЗАПРАШИВАЕМ GITHUB ======
        const url = `songs/${encodeURIComponent(song.fileName)}?t=${Date.now()}`;
        debugLog(`📡 Запрос к GitHub: ${url}`);
        
        const response = await fetch(url, {
            cache: 'no-store',
            headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' }
        });
        
        if (!response.ok) {
            debugLog(`❌ Ошибка запроса: ${response.status}`);
            return;
        }
        
        const freshText = await response.text();
        debugLog(`📄 GitHub версия: ${freshText.length} символов`);
        debugLog(`📄 GitHub preview: ${freshText.substring(0, 80)}...`);
        
        // ====== ПОВТОРНО ПРОВЕРЯЕМ ЛОКАЛЬНУЮ ВЕРСИЮ ======
        const localTextNow = editedSongs && editedSongs[id] ? editedSongs[id] : null;
        
        if (!localTextNow) {
            debugLog(`ℹ️ Локальная версия была удалена во время запроса к GitHub`);
            return;
        }
        
        // ====== СРАВНИВАЕМ ======
        if (localTextNow === freshText) {
            debugLog(`✅ СИНХРОНИЗИРОВАНО! Удаляем локальную версию для "${song.title}"`);
            delete editedSongs[id];
            if (typeof saveEditedSongs === 'function') saveEditedSongs();
            
            if (currentSongId === id) {
                debugLog(`🔄 Обновляем список и отображение для "${song.title}"`);
                const searchInput = document.getElementById('searchInput');
                const filterText = searchInput ? searchInput.value : '';
                renderSongList(filterText);
                currentRawOriginal = freshText;
                updateSongDisplay();
                debugLog(`✅ Песня "${song.title}" обновлена на экране`);
            }
        } else {
            debugLog(`🔄 Версии НЕ совпадают (${localTextNow.length} vs ${freshText.length})`);
            debugLog(`🔄 Повторная проверка через 3 секунды...`);
            setTimeout(() => checkForUpdates(id, attempt + 1), 3000);
        }
    } catch (e) {
        debugLog(`⚠️ Ошибка проверки обновлений: ${e.message}`);
        setTimeout(() => checkForUpdates(id, attempt + 1), 5000);
    }
}