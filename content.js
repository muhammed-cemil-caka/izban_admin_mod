// İZBAN Admin Panel Modernizer extension content script
let observer = null;

// Dark Mode Initialization & Storage
function initializeDarkMode() {
    const isDark = localStorage.getItem('izban-dark-mode') === 'true';
    if (isDark) {
        document.body.classList.add('dark-theme');
    }
}

function injectDarkModeToggles() {
    // Proaktif olarak tekrar eklenmesini önle
    if (document.getElementById('izban-dark-toggle-top')) return;

    // A. Navbar Right (Profil menüsünün yanına güneş/ay butonu)
    const navbarRight = document.querySelector('.navbar-right') || document.querySelector('.top_nav ul');
    if (navbarRight) {
        const toggleLi = document.createElement('li');
        toggleLi.id = 'izban-dark-toggle-top-li';
        toggleLi.style.cssText = 'display: flex; align-items: center; justify-content: center; padding: 0 12px;';

        const isDark = document.body.classList.contains('dark-theme');
        toggleLi.innerHTML = `
            <a id="izban-dark-toggle-top" href="javascript:;" style="padding: 8px !important; display: flex; align-items: center; border-radius: 50%; width: 32px; height: 32px; justify-content: center; transition: all 0.2s;" title="Karanlık Mod Arayüzü">
                <i class="fa ${isDark ? 'fa-sun-o' : 'fa-moon-o'}" style="font-size: 16px !important; color: ${isDark ? '#eab308' : '#475569'} !important; margin: 0 !important; width: auto !important; height: auto !important;"></i>
            </a>
        `;

        if (navbarRight.firstChild) {
            navbarRight.insertBefore(toggleLi, navbarRight.firstChild);
        } else {
            navbarRight.appendChild(toggleLi);
        }

        const button = toggleLi.querySelector('#izban-dark-toggle-top');
        button.addEventListener('click', toggleDarkMode);
    }

    // B. Kullanıcı Ayarlar Menüsü (Dropdown) İçine Ekle
    const userMenu = document.querySelector('.dropdown-usermenu');
    if (userMenu && !document.getElementById('izban-dark-toggle-dropdown-li')) {
        const dropdownLi = document.createElement('li');
        dropdownLi.id = 'izban-dark-toggle-dropdown-li';

        const isDark = document.body.classList.contains('dark-theme');
        dropdownLi.innerHTML = `
            <a href="javascript:;" id="izban-dark-toggle-dropdown" style="display: flex; align-items: center; justify-content: space-between;">
                <span>Karanlık Mod</span>
                <i class="fa ${isDark ? 'fa-toggle-on' : 'fa-toggle-off'}" style="font-size: 16px !important; color: ${isDark ? '#10b981' : '#cbd5e1'} !important;"></i>
            </a>
        `;
        userMenu.appendChild(dropdownLi);

        const dropdownButton = dropdownLi.querySelector('#izban-dark-toggle-dropdown');
        dropdownButton.addEventListener('click', toggleDarkMode);
    }
}

function toggleDarkMode() {
    const isDark = document.body.classList.toggle('dark-theme');
    localStorage.setItem('izban-dark-mode', isDark ? 'true' : 'false');

    // Tüm buton ikonlarını güncelle
    const topIcon = document.querySelector('#izban-dark-toggle-top i');
    if (topIcon) {
        topIcon.className = `fa ${isDark ? 'fa-sun-o' : 'fa-moon-o'}`;
        topIcon.style.setProperty('color', isDark ? '#eab308' : '#475569', 'important');
    }

    const dropdownIcon = document.querySelector('#izban-dark-toggle-dropdown i');
    if (dropdownIcon) {
        dropdownIcon.className = `fa ${isDark ? 'fa-toggle-on' : 'fa-toggle-off'}`;
        dropdownIcon.style.setProperty('color', isDark ? '#10b981' : '#cbd5e1', 'important');
    }
}

function handleNavigation() {
    // Dinamik grafik ekleme ve sayfa yerleşimlerini güncelleme fonksiyonunu çalıştır
    handlePageLayout();
}

function handlePageLayout() {
    // Karanlık mod eklenti butonlarını yükle
    injectDarkModeToggles();

    // 1. KPI Kartları (Top Tiles): Sağ tarafa küçük bir SVG pasta grafiği/ilerleme dairesi ekle
    const tiles = document.querySelectorAll('.tile_stats_count');
    tiles.forEach(tile => {
        if (tile.dataset.styled === 'true') return;
        tile.dataset.styled = 'true';

        const topTextEl = tile.querySelector('.count_top');
        const topText = topTextEl ? (topTextEl.textContent || "").trim() : "";
        if (topText.includes("Profil") || tile.querySelector('select')) {
            tile.style.setProperty('flex-direction', 'column', 'important');
            tile.style.setProperty('align-items', 'stretch', 'important');
            return;
        }

        const bottomTextEl = tile.querySelector('.count_bottom');
        if (!bottomTextEl) return;

        const textContent = bottomTextEl.textContent || "";
        // 63.01% veya 63% gibi değerleri regex ile yakalayalım
        const match = textContent.match(/(\d+(?:\.\d+)?)\s*%/);
        let percent = 50; // varsayılan
        let percentText = "50%";
        if (match && match[1]) {
            percent = parseFloat(match[1]);
            percentText = match[1] + "%";
        } else {
            // Yüzde yoksa değer içindeki en büyük sayıyı çekelim (limit 100)
            const numMatch = textContent.match(/(\d+)/);
            if (numMatch && numMatch[1]) {
                const val = parseInt(numMatch[1]);
                percent = val > 100 ? (val % 100) : val;
            }
            percentText = percent + "%";
        }

        // Duruma göre renk seçimi
        let strokeColor = '#10b981'; // başarılı (yeşil)
        if (bottomTextEl.querySelector('.red')) {
            strokeColor = '#ef4444'; // tehlikeli (kırmızı)
        } else if (bottomTextEl.querySelector('.orange') || bottomTextEl.querySelector('.yellow')) {
            strokeColor = '#f59e0b'; // uyarı (turuncu)
        }

        // Metin uzunluğuna göre font boyutu belirleme
        const fontSize = percentText.length > 5 ? '5.5' : (percentText.length > 3 ? '6.5' : '8.5');

        const svgHTML = `
            <div class="izban-tile-pie-container" style="display: flex; align-items: center; justify-content: center; margin-left: 12px; flex-shrink: 0;">
                <svg width="42" height="42" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="16" fill="none" stroke="#f1f5f9" stroke-width="4"></circle>
                    <circle cx="18" cy="18" r="16" fill="none" stroke="${strokeColor}" stroke-width="4" 
                            stroke-dasharray="${percent} 100" stroke-linecap="round" 
                            transform="rotate(-90 18 18)" style="transition: stroke-dasharray 0.5s ease;"></circle>
                    <text x="18" y="18" dominant-baseline="central" text-anchor="middle" font-size="${fontSize}" font-weight="800" fill="#334155">${percentText}</text>
                </svg>
            </div>
        `;

        // Mevcut içeriği sola yaslamak için kılıf oluşturalım
        const wrapper = document.createElement('div');
        wrapper.className = 'izban-tile-content-left';
        wrapper.style.flex = '1';
        wrapper.style.minWidth = '0';

        while (tile.firstChild) {
            wrapper.appendChild(tile.firstChild);
        }

        tile.appendChild(wrapper);

        // Pasta grafiğini ekleyelim
        const div = document.createElement('div');
        div.innerHTML = svgHTML;
        tile.appendChild(div.firstElementChild);

        tile.style.display = 'flex';
        tile.style.flexDirection = 'row';
        tile.style.alignItems = 'center';
        tile.style.justifyContent = 'space-between';
    });

    // 2. Tablo içeren Alt Paneller (Sabit Tesisler, İzinler vb.) Yanına Orta Ölçekli Pasta/Halke Grafiği ekle
    const panels = document.querySelectorAll('.x_panel');
    panels.forEach((panel, idx) => {
        if (panel.dataset.styled === 'true') return;

        const table = panel.querySelector('.table');
        const titleText = panel.querySelector('.x_title h2')?.textContent || '';

        // Sadece ana sayfa düzeyindeki tablolu modüllere (İzin, Tesis veya Doküman içerenlere) grafik yerleştir
        if (table && (titleText.includes('Tesisler') || titleText.includes('İzin') || titleText.includes('Doküman'))) {
            panel.dataset.styled = 'true';

            // Yan yana hizalamak için flex kutusu kuralım
            const flexWrapper = document.createElement('div');
            flexWrapper.className = 'izban-panel-flex-wrapper';
            flexWrapper.style.display = 'flex';
            flexWrapper.style.gap = '24px';
            flexWrapper.style.alignItems = 'center';
            flexWrapper.style.marginTop = '12px';

            const tableContainer = document.createElement('div');
            tableContainer.className = 'izban-table-container';
            tableContainer.style.flex = '3';
            tableContainer.style.overflowX = 'auto';

            table.replaceWith(tableContainer);
            tableContainer.appendChild(table);

            // Sağ tarafa eklenecek pasta grafik alanı
            const chartContainer = document.createElement('div');
            chartContainer.className = 'izban-panel-chart-container';
            chartContainer.style.flex = '2';
            chartContainer.style.minWidth = '200px';
            chartContainer.style.maxWidth = '240px';
            chartContainer.style.display = 'flex';
            chartContainer.style.flexDirection = 'column';
            chartContainer.style.alignItems = 'center';
            chartContainer.style.background = '#f8fafc';
            chartContainer.style.borderRadius = '12px';
            chartContainer.style.padding = '16px';
            chartContainer.style.border = '1px solid #e2e8f0';

            const canvasId = `izbanPanelChart_${idx}`;
            chartContainer.innerHTML = `
                <div style="width: 100%; height: 140px; position: relative;">
                    <canvas id="${canvasId}"></canvas>
                </div>
                <div style="font-size: 11px; font-weight: 700; color: #64748b; margin-top: 8px; text-align: center;">
                    Bileşen Dağılım Grafiği
                </div>
            `;

            const contentContainer = panel.querySelector('.x_content') || panel;
            contentContainer.appendChild(flexWrapper);
            flexWrapper.appendChild(tableContainer);
            flexWrapper.appendChild(chartContainer);

            // Grafik renderlama
            setTimeout(() => {
                const ctx = document.getElementById(canvasId);
                if (ctx && typeof Chart !== 'undefined') {
                    new Chart(ctx, {
                        type: 'doughnut',
                        data: {
                            labels: ['Aktif / Tamamlandı', 'Arızalı / Beklemede', 'İşlemde'],
                            datasets: [{
                                data: [70, 20, 10],
                                backgroundColor: ['#10b981', '#ef4444', '#f59e0b'],
                                borderWidth: 1
                            }]
                        },
                        options: {
                            responsive: true,
                            maintainAspectRatio: false,
                            plugins: {
                                legend: { display: false }
                            },
                            cutout: '70%'
                        }
                    });
                }
            }, 200);
        }
    });
}

// MutationObserver - Sayfa dinamik yenilendiğinde (AJAX geçişleri) yerleşimleri koru
function startObserver() {
    if (observer) return;
    observer = new MutationObserver(() => {
        stopObserver();
        handleNavigation();
        startObserver();
    });
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}

function stopObserver() {
    if (observer) {
        observer.disconnect();
        observer = null;
    }
}

// Sayfa yüklendiğinde başlat
initializeDarkMode();
if (document.readyState === 'complete' || document.readyState === 'interactive') {
    handleNavigation();
    startObserver();
} else {
    document.addEventListener('DOMContentLoaded', () => {
        handleNavigation();
        startObserver();
    });
}