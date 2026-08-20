let songsList = [];
let currentSongId = null;
let currentRawOriginal = "";
let currentOriginUrl = null;
let transposeShift = 0;
let songTransposes = {};

const STORAGE_TRANSPOSES = 'songbook_transposes';
const STORAGE_LAST_SONG = 'songbook_last_song';

// ====== УЛУЧШЕННАЯ ФУНКЦИЯ РАСПОЗНАВАНИЯ АККОРДОВ ======
function isChordLike(str) {
    str = str.trim();
    if (str === "") return false;
    if (/[а-яА-Я]/.test(str)) return false;
    let baseChord = str.split('/')[0].trim();
    if (baseChord === "") return false;
    const pattern = /^[A-GH][#b]?(?:maj|min|m|sus|add|dim|aug|\+|-)?[0-9]*(?:[0-9])?(?:[0-9])?(?:[0-9])?(?:[0-9])?(?:[0-9])?(?:[0-9])?(?:[0-9])?(?:[0-9])?(?:[0-9])?(?:[0-9])?(?:[0-9])?(?:[0-9])?(?:[0-9])?(?:[0-9])?(?:[0-9])?(?:[0-9])?(?:[0-9])?$/i;
    if (!pattern.test(baseChord)) return false;
    const allowedSuffixes = ['maj', 'min', 'm', 'sus', 'add', 'dim', 'aug'];
    const chordWithoutRoot = baseChord.replace(/^[A-GH][#b]?/, '');
    if (chordWithoutRoot.length > 0) {
        let testStr = chordWithoutRoot;
        for (const suffix of allowedSuffixes) {
            testStr = testStr.replace(new RegExp(suffix, 'ig'), '');
        }
        if (testStr && !/^[0-9+\-]*$/.test(testStr)) {
            return false;
        }
    }
    return true;
}

function isHeaderLike(str) {
    str = str.trim();
    if (str === "") return false;
    if (/[а-яА-Я]/.test(str)) return true;
    if (/^(Intro|Verse|Chorus|Bridge|Outro|Solo|Вступление|Куплет|Припев|Кода|Переход)/i.test(str)) return true;
    return false;
}

function transposeChord(chord, semitones) {
    if (!chord || semitones === 0) return chord;
    let slashIndex = chord.indexOf('/');
    let mainPart = slashIndex === -1 ? chord : chord.substring(0, slashIndex);
    let bassPart = slashIndex === -1 ? '' : chord.substring(slashIndex);
    let match = mainPart.match(/^([A-GH][#b]?)(.*)$/i);
    if (!match) return chord;
    let root = match[1].toUpperCase();
    let rootForTranspose = root === 'H' ? 'B' : root;
    let suffix = match[2];
    const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
    let index = notes.findIndex(n => n === rootForTranspose);
    if (index === -1) return chord;
    let newIndex = (index + semitones + 12) % 12;
    let newRoot = notes[newIndex];
    return newRoot + suffix + bassPart;
}

function formatSongWithChordsFixed(rawText) {
    const lines = rawText.split(/\r?\n/);
    let resultHtml = '';
    const chordRegex = /\[([^\]]+)\]/g;
    for (let line of lines) {
        if (line.trim() === '') { 
            resultHtml += '<div style="height: 0.6rem;"></div>'; 
            continue; 
        }
        if (!line.includes('[')) {
            resultHtml += `<div class="song-line"><div class="lyric-row">${escapeHtml(line)}</div></div>`;
            continue;
        }
        let headerMatch = line.match(/^\[([^\]]+)\]$/);
        if (headerMatch && isHeaderLike(headerMatch[1])) {
            resultHtml += `<div class="section-label">${escapeHtml(headerMatch[1])}</div>`;
            continue;
        }
        let onlyChords = true;
        let lastIdx = 0;
        let tempMatch;
        while ((tempMatch = chordRegex.exec(line)) !== null) {
            if (tempMatch.index > lastIdx) {
                let between = line.substring(lastIdx, tempMatch.index).trim();
                if (between !== "") {
                    onlyChords = false;
                    break;
                }
            }
            lastIdx = tempMatch.index + tempMatch[0].length;
        }
        if (lastIdx < line.length && line.substring(lastIdx).trim() !== "") {
            onlyChords = false;
        }
        chordRegex.lastIndex = 0;
        if (onlyChords) {
            let chords = [];
            while ((tempMatch = chordRegex.exec(line)) !== null) {
                let chord = tempMatch[1].trim();
                if (isChordLike(chord)) chords.push(chord);
            }
            if (chords.length) {
                resultHtml += `<div class="chord-only-row">${escapeHtml(chords.join(' · '))}</div>`;
            }
            continue;
        }
        let cleanLine = '';
        let chords = [];
        for (let i = 0; i < line.length; i++) {
            if (line[i] === '[') {
                let closeIdx = line.indexOf(']', i);
                if (closeIdx !== -1) {
                    let chordContent = line.substring(i + 1, closeIdx).trim();
                    if (isChordLike(chordContent)) {
                        chords.push({ chord: chordContent, position: cleanLine.length });
                        i = closeIdx;
                        continue;
                    } else {
                        cleanLine += '[' + chordContent + ']';
                        i = closeIdx;
                        continue;
                    }
                }
            }
            cleanLine += line[i];
        }
        if (chords.length === 0) {
            resultHtml += `<div class="song-line"><div class="lyric-row">${escapeHtml(cleanLine)}</div></div>`;
            continue;
        }
        chords.sort((a, b) => a.position - b.position);
        let currentPos = 0;
        let chordLineParts = [];
        for (let i = 0; i < chords.length; i++) {
            let chord = chords[i];
            while (currentPos < chord.position) {
                chordLineParts.push(' ');
                currentPos++;
            }
            for (let j = 0; j < chord.chord.length; j++) {
                chordLineParts.push(chord.chord[j]);
                currentPos++;
            }
            if (i < chords.length - 1) {
                chordLineParts.push(' ');
                currentPos++;
            }
        }
        while (currentPos < cleanLine.length) {
            chordLineParts.push(' ');
            currentPos++;
        }
        let chordLine = chordLineParts.join('').trimEnd();
        resultHtml += `<div class="song-line">`;
        if (chordLine.trim()) {
            resultHtml += `<div class="chord-row">${escapeHtml(chordLine)}</div>`;
        }
        resultHtml += `<div class="lyric-row">${escapeHtml(cleanLine)}</div>`;
        resultHtml += `</div>`;
    }
    return resultHtml;
}

function escapeHtml(str) { 
    return str.replace(/[&<>]/g, m => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;' }[m])); 
}

function transposeChordInString(text, semitones) {
    if (semitones === 0) return text;
    return text.replace(/\[([^\]]+)\]/g, (match, content) => {
        if (isChordLike(content)) {
            return `[${transposeChord(content, semitones)}]`;
        }
        return match;
    });
}

function isValidUrl(str) {
    if (!str) return false;
    str = str.trim();
    try {
        const url = new URL(str);
        return url.protocol === 'http:' || url.protocol === 'https:';
    } catch {
        return false;
    }
}

async function loadSongsFromCSV(forceRefresh = false) {
    try {
        let url = 'songs/songs.csv';
        if (forceRefresh) url += '?t=' + Date.now();
        const response = await fetch(url, { cache: 'no-store', headers: { 'Cache-Control': 'no-cache' } });
        if (!response.ok) throw new Error('CSV не найден');
        const csvText = await response.text();
        const songs = parseCSV(csvText);
        songs.sort((a, b) => a.title.localeCompare(b.title, 'ru'));
        songsList = songs.map((song, idx) => ({ 
            id: `song_${idx}`, 
            title: song.title, 
            artist: song.artist, 
            fileName: song.fileName,
            originUrl: song.originUrl || null
        }));
        console.log('Загружены песни:', songsList.length);
        renderSongList();
        const lastSongId = localStorage.getItem(STORAGE_LAST_SONG);
        if (lastSongId && songsList.some(s => s.id === lastSongId)) {
            await loadSongById(lastSongId, true, forceRefresh);
        } else if (songsList.length > 0 && !currentSongId) {
            await loadSongById(songsList[0].id, true, forceRefresh);
        }
    } catch(e) {
        document.getElementById('songListContainer').innerHTML = `<div style="padding:20px;color:#e74c3c;">❌ Файл songs/songs.csv не найден</div>`;
        console.error('Ошибка загрузки CSV:', e);
    }
}

function parseCSV(csvText) {
    const lines = csvText.split(/\r?\n/);
    if (lines.length < 2) return [];
    const result = [];
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line === "") continue;
        let parts = [];
        let current = '';
        let inQuotes = false;
        for (let j = 0; j < line.length; j++) {
            const char = line[j];
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                parts.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        parts.push(current.trim());
        parts = parts.map(p => p.replace(/^["']|["']$/g, ''));
        if (parts.length >= 3) {
            let artist = parts[0] || '';
            let title = parts[1] || '';
            let fileName = parts[2] || '';
            let originUrl = null;
            if (parts.length >= 4) {
                let urlCandidate = parts.slice(3).join(',').trim();
                if (isValidUrl(urlCandidate)) {
                    originUrl = urlCandidate;
                }
            }
            if (title && fileName) {
                result.push({ title, artist, fileName, originUrl });
            }
        }
    }
    return result;
}

function loadSavedTransposes() {
    const saved = localStorage.getItem(STORAGE_TRANSPOSES);
    if (saved) { try { songTransposes = JSON.parse(saved); } catch(e) {} }
}

function saveCurrentTranspose() {
    if (currentSongId && transposeShift !== 0) {
        songTransposes[currentSongId] = transposeShift;
    } else if (currentSongId && transposeShift === 0) {
        delete songTransposes[currentSongId];
    }
    localStorage.setItem(STORAGE_TRANSPOSES, JSON.stringify(songTransposes));
    updateTransposeBadge();
}

function saveLastSong(songId) { if (songId) localStorage.setItem(STORAGE_LAST_SONG, songId); }

function updateTransposeBadge() {
    document.querySelectorAll('.song-item').forEach(item => {
        const songId = item.dataset.id;
        const shift = songTransposes[songId];
        const existingBadge = item.querySelector('.transpose-badge');
        if (existingBadge) existingBadge.remove();
        if (shift && shift !== 0) {
            const badge = document.createElement('span');
            badge.className = 'transpose-badge';
            badge.textContent = shift > 0 ? `+${shift}` : `${shift}`;
            item.appendChild(badge);
        }
    });
}

function updateSongDisplay() {
    if (!currentSongId || !currentRawOriginal) {
        document.getElementById('songView').innerHTML = '<div class="no-song-msg">🎵 Выберите песню</div>';
        return;
    }
    let transposedRaw = transposeShift !== 0 ? transposeChordInString(currentRawOriginal, transposeShift) : currentRawOriginal;
    const song = songsList.find(s => s.id === currentSongId);
    if (!song) return;
    let titleHtml = `<div class="song-header">`;
    titleHtml += `<div class="song-title-wrapper">`;
    titleHtml += `<div class="song-title">`;
    if (song.originUrl) {
        titleHtml += `<a href="${escapeHtml(song.originUrl)}" target="_blank" rel="noopener noreferrer" title="Открыть оригинал на сайте">`;
        titleHtml += escapeHtml(song.title);
        titleHtml += ` <span class="link-icon">🔗</span>`;
        titleHtml += ` <span class="link-label">оригинал</span>`;
        titleHtml += `</a>`;
    } else {
        titleHtml += escapeHtml(song.title);
    }
    titleHtml += `</div>`;
    titleHtml += `</div>`;
    titleHtml += `<div class="song-artist">${escapeHtml(song.artist)}</div>`;
    titleHtml += `</div>`;
    document.getElementById('songView').innerHTML = titleHtml + formatSongWithChordsFixed(transposedRaw);
    document.getElementById('transposeAmount').innerText = transposeShift;
    const songView = document.querySelector('.song-view');
    if (songView) songView.scrollTop = 0;
}

async function loadSongById(id, saveToStorage = true, forceRefresh = false) {
    const song = songsList.find(s => s.id === id);
    if (!song) return;
    try {
        let url = `songs/${encodeURIComponent(song.fileName)}`;
        if (forceRefresh) url += '?t=' + Date.now();
        const response = await fetch(url, { cache: 'no-store', headers: { 'Cache-Control': 'no-cache' } });
        if (!response.ok) throw new Error('Файл не найден');
        currentRawOriginal = await response.text();
        currentSongId = id;
        currentOriginUrl = song.originUrl || null;
        transposeShift = songTransposes[id] || 0;
        updateSongDisplay();
        document.querySelectorAll('.song-item').forEach(el => { el.classList.toggle('active', el.dataset.id === id); });
        if (saveToStorage) saveLastSong(id);
        if (window.innerWidth <= 720) closeSidebar();
    } catch(e) {
        document.getElementById('songView').innerHTML = `<div class="error-msg">❌ Ошибка загрузки ${song.fileName}</div>`;
        console.error('Ошибка загрузки песни:', e);
    }
}

function changeTranspose(delta) {
    if (!currentSongId) return;
    let newShift = transposeShift + delta;
    if (newShift < -7) newShift = -7;
    if (newShift > 7) newShift = 7;
    transposeShift = newShift;
    updateSongDisplay();
    saveCurrentTranspose();
}

function resetTranspose() {
    if (!currentSongId) return;
    transposeShift = 0;
    updateSongDisplay();
    saveCurrentTranspose();
}

function renderSongList(filterText = "") {
    const container = document.getElementById('songListContainer');
    let filtered = filterText ? songsList.filter(s => s.title.toLowerCase().includes(filterText.toLowerCase()) || s.artist.toLowerCase().includes(filterText.toLowerCase())) : [...songsList];
    if (filtered.length === 0) {
        container.innerHTML = '<div style="padding:20px;text-align:center;color:#aaa;">🎵 Нет песен</div>';
        return;
    }
    container.innerHTML = "";
    filtered.forEach(song => {
        const div = document.createElement('div');
        div.className = 'song-item' + (currentSongId === song.id ? ' active' : '');
        div.dataset.id = song.id;
        div.innerHTML = `<div class="song-title-small">${escapeHtml(song.title)}</div><div class="song-artist-small">${escapeHtml(song.artist)}</div>`;
        div.addEventListener('click', () => loadSongById(song.id, true, true));
        container.appendChild(div);
    });
    updateTransposeBadge();
}

async function refreshSongsList() {
    const refreshBtn = document.getElementById('refreshCsvBtn');
    refreshBtn.innerHTML = '⏳';
    await loadSongsFromCSV(true);
    refreshBtn.innerHTML = '⟳';
}

function openSidebar() { document.getElementById('sidebar').classList.add('open'); document.getElementById('overlay').classList.add('active'); }
function closeSidebar() { document.getElementById('sidebar').classList.remove('open'); document.getElementById('overlay').classList.remove('active'); }
function openConverter() { window.open('converter.html', '_blank'); }

// ====== ИНИЦИАЛИЗАЦИЯ ======
document.addEventListener('DOMContentLoaded', () => {
    loadSavedTransposes();
    loadSongsFromCSV(false);
    document.getElementById('searchInput').addEventListener('input', (e) => renderSongList(e.target.value));
    document.getElementById('transposeUpBtn').addEventListener('click', () => changeTranspose(1));
    document.getElementById('transposeDownBtn').addEventListener('click', () => changeTranspose(-1));
    document.getElementById('resetTransposeBtn').addEventListener('click', resetTranspose);
    document.getElementById('menuToggleBtn').addEventListener('click', openSidebar);
    document.getElementById('overlay').addEventListener('click', closeSidebar);
    document.getElementById('converterIconBtn').addEventListener('click', openConverter);
    document.getElementById('refreshCsvBtn').addEventListener('click', refreshSongsList);
    window.addEventListener('resize', () => { if (window.innerWidth > 720) closeSidebar(); });
});