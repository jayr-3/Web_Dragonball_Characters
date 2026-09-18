const characterGrid = document.getElementById('characterGrid');
const statusMessage = document.getElementById('statusMessage');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const filterTabs = document.getElementById('filterTabs');
const sortKiSelect = document.getElementById('sortKiSelect');

// Modal Elements
const modal = document.getElementById('characterModal');
const closeModal = document.querySelector('.close-modal');
const modalImg = document.getElementById('modalImg');
const modalName = document.getElementById('modalName');
const modalSubtitle = document.getElementById('modalSubtitle');
const modalKi = document.getElementById('modalKi');
const modalDesc = document.getElementById('modalDesc');

let allCharacters = [];
let currentFilteredList = [];
const charCache = new Map();
const activeAnimFrames = new Map();

let currentRaceFilter = 'all';
let currentSortMode = 'default';

document.addEventListener('DOMContentLoaded', fetchBaseCharacters);

async function fetchBaseCharacters() {
    try {
        statusMessage.style.display = 'block';
        statusMessage.innerText = 'SCANNING DRAGON BALL DATABASE...';
        
        const response = await fetch('/api/characters?limit=100');
        const data = await response.json();

        allCharacters = data.items || data;
        currentFilteredList = [...allCharacters];
        
        statusMessage.style.display = 'none';
        applyFiltersAndSort();

        prefetchTransformations(allCharacters);

    } catch (error) {
        statusMessage.innerText = 'ERROR: UNABLE TO CONNECT TO SCOUTER SATELLITE';
    }
}

function parseKiToNumber(kiStr) {
    if (!kiStr || kiStr === 'Unknown' || kiStr === 'null') return 0;
    let str = kiStr.toString().trim().toLowerCase();
    
    const multipliers = {
        'thousand': 1e3, 'million': 1e6, 'billion': 1e9,
        'trillion': 1e12, 'quadrillion': 1e15, 'quintillion': 1e18,
        'sextillion': 1e21, 'septillion': 1e24, 'googol': 1e100
    };

    for (const [unit, mult] of Object.entries(multipliers)) {
        if (str.includes(unit)) {
            let num = parseFloat(str.replace(unit, '').trim().replace(/,/g, ''));
            return isNaN(num) ? 0 : num * mult;
        }
    }
    let cleaned = str.replace(/\./g, '').replace(/,/g, '');
    let parsed = parseFloat(cleaned);
    return isNaN(parsed) ? 0 : parsed;
}

function applyFiltersAndSort() {
    let result = [...allCharacters];
    const query = searchInput.value.trim().toLowerCase();
    if (query) {
        result = result.filter(char => char.name.toLowerCase().includes(query));
    }
    if (currentRaceFilter !== 'all') {
        result = result.filter(char => 
            (char.race && char.race.toLowerCase().includes(currentRaceFilter.toLowerCase())) || 
            (char.affiliation && char.affiliation.toLowerCase().includes(currentRaceFilter.toLowerCase()))
        );
    }
    if (currentSortMode === 'desc') result.sort((a, b) => parseKiToNumber(b.ki) - parseKiToNumber(a.ki));
    else if (currentSortMode === 'asc') result.sort((a, b) => parseKiToNumber(a.ki) - parseKiToNumber(b.ki));

    currentFilteredList = result;
    renderCharacters(currentFilteredList);
}

filterTabs.addEventListener('click', (e) => {
    if (!e.target.classList.contains('tab-btn')) return;
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    e.target.classList.add('active');
    currentRaceFilter = e.target.getAttribute('data-filter');
    applyFiltersAndSort();
});

sortKiSelect.addEventListener('change', (e) => { currentSortMode = e.target.value; applyFiltersAndSort(); });
searchBtn.addEventListener('click', applyFiltersAndSort);
searchInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') applyFiltersAndSort(); });

async function prefetchTransformations(characters) {
    for (const char of characters) if (!charCache.has(char.id)) await loadTransformations(char.id);
}

async function loadTransformations(charId) {
    if (charCache.has(charId)) { attachTransformationsToCard(charId, charCache.get(charId)); return; }
    try {
        const response = await fetch(`/api/characters/${charId}`);
        const detail = await response.json();
        charCache.set(charId, detail);
        attachTransformationsToCard(charId, detail);
    } catch (e) {}
}

function attachTransformationsToCard(charId, detail) {
    if (!detail.transformations || detail.transformations.length === 0) return;
    const formsContainer = document.getElementById(`forms-container-${charId}`);
    const formsBox = document.getElementById(`forms-${charId}`);
    if (!formsContainer || !formsBox || formsBox.children.length > 1) return;

    formsContainer.style.display = 'block';
    detail.transformations.forEach(form => {
        const thumb = document.createElement('img');
        thumb.src = form.image;
        thumb.className = 'form-thumb';
        thumb.title = form.name;
        thumb.dataset.img = form.image; thumb.dataset.name = form.name; thumb.dataset.ki = form.ki;
        thumb.onclick = function(e) { e.stopPropagation(); switchForm(this, charId); }; // กันคลิกแล้ว Modal เด้ง
        formsBox.appendChild(thumb);
    });
}

// อัปเดตเพิ่ม onclick='openModal()' ไปที่ตัวการ์ด
function renderCharacters(characters) {
    characterGrid.innerHTML = '';
    if (characters.length === 0) {
        statusMessage.style.display = 'block';
        statusMessage.innerText = 'NO TARGET MATCHED IN SCOUTER';
        return;
    }
    statusMessage.style.display = 'none';

    characters.forEach((char) => {
        const card = document.createElement('div');
        card.className = 'card';
        card.id = `card-${char.id}`;
        card.setAttribute('onclick', `openModal(${char.id})`); // เปิด Modal เมื่อคลิกการ์ด

        card.innerHTML = `
            <div class="card-top">
                <div class="aura-bg"></div>
                <img src="${char.image}" alt="${char.name}" class="card-img" id="img-${char.id}">
            </div>
            
            <div class="form-selector-container" id="forms-container-${char.id}" onclick="event.stopPropagation()">
                <div class="form-selector" id="forms-${char.id}">
                    <img src="${char.image}" class="form-thumb active" 
                         onclick="switchForm(this, ${char.id})" 
                         data-img="${char.image}" data-name="${char.name}" data-ki="${char.ki}" title="Base Form">
                </div>
            </div>

            <div class="card-bottom">
                <div class="char-name" id="name-${char.id}">${char.name}</div>
                <div class="char-subtitle">${char.race || 'Unknown'} | ${char.affiliation || 'Freelancer'}</div>
                
                <div class="stat-group">
                    <span class="stat-label">POWER LEVEL (KI)</span>
                    <span class="stat-value scouter-number ki-value" id="ki-${char.id}" data-value="${char.ki}">${char.ki}</span>
                </div>
            </div>
        `;
        characterGrid.appendChild(card);
        if (charCache.has(char.id)) attachTransformationsToCard(char.id, charCache.get(char.id));
    });

    document.querySelectorAll('.ki-value').forEach(el => triggerScouterEffect(el));
}

function triggerScouterEffect(el) {
    const finalVal = el.getAttribute('data-value') || '0';
    const chars = '0123456789';
    const duration = 600;
    const startTime = performance.now();

    if (activeAnimFrames.has(el)) cancelAnimationFrame(activeAnimFrames.get(el));

    function animate(now) {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        if (progress < 1) {
            let scrambled = '';
            for (let i = 0; i < finalVal.length; i++) {
                const c = finalVal[i];
                if (c === '.' || c === ',' || c === ' ' || isNaN(c)) scrambled += c;
                else scrambled += (i / finalVal.length < progress) ? c : chars[Math.floor(Math.random() * chars.length)];
            }
            el.innerText = scrambled;
            activeAnimFrames.set(el, requestAnimationFrame(animate));
        } else {
            el.innerText = finalVal;
            activeAnimFrames.delete(el);
        }
    }
    activeAnimFrames.set(el, requestAnimationFrame(animate));
}

window.switchForm = function(el, charId) {
    const selector = document.getElementById(`forms-${charId}`);
    if (!selector) return;
    selector.querySelectorAll('.form-thumb').forEach(btn => btn.classList.remove('active'));
    el.classList.add('active');

    const imgEl = document.getElementById(`img-${charId}`);
    const nameEl = document.getElementById(`name-${charId}`);
    const kiEl = document.getElementById(`ki-${charId}`);

    if (imgEl && el.dataset.img) imgEl.src = el.dataset.img;
    if (nameEl && el.dataset.name) nameEl.innerText = el.dataset.name;
    if (kiEl && el.dataset.ki) {
        kiEl.setAttribute('data-value', el.dataset.ki);
        triggerScouterEffect(kiEl);
    }
};

// ระบบ Modal แสดงประวัติ
window.openModal = async function(charId) {
    // ดึงข้อมูลรูป/ชื่อ ปัจจุบันที่โชว์อยู่บนการ์ด (เผื่อว่ากดสลับร่างอยู่)
    const currentImg = document.getElementById(`img-${charId}`).src;
    const currentName = document.getElementById(`name-${charId}`).innerText;
    const currentKi = document.getElementById(`ki-${charId}`).getAttribute('data-value');
    
    // ดึงข้อมูลประวัติจาก Cache ที่โหลดไว้
    let detail = charCache.get(charId);
    
    modalImg.src = currentImg;
    modalName.innerText = currentName;
    modalSubtitle.innerText = detail ? `${detail.race || 'Unknown'} | ${detail.affiliation || 'Freelancer'}` : 'Unknown';
    
    // เซ็ตเอฟเฟกต์ตัวเลข Scouter ภายในหน้าต่าง
    modalKi.setAttribute('data-value', currentKi);
    triggerScouterEffect(modalKi);

    modalDesc.innerText = (detail && detail.description) ? detail.description : 'NO HISTORY RECORD FOUND IN SCOUTER DATABASE.';
    
    modal.classList.add('show');
};

// ปิด Modal
closeModal.onclick = () => modal.classList.remove('show');
window.onclick = (e) => { if (e.target == modal) modal.classList.remove('show'); }