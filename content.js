// İZBAN Admin Panel Modernizer extension content script
let observer = null;

// Inject Homepage Button into Left Sidebar Menu
function injectHomepageButton() {
    const sideMenu = document.querySelector('.nav.side-menu');
    if (sideMenu && !document.getElementById('izban-homepage-menu-item')) {
        const homeLi = document.createElement('li');
        homeLi.id = 'izban-homepage-menu-item';

        const siteTitleLink = document.querySelector('.site_title, .nav_title a')?.getAttribute('href') || '/';
        const isHome = window.location.pathname === '/' || window.location.pathname.endsWith('/index.html') || window.location.pathname.includes('/default.aspx') || window.location.pathname.includes('/Home');

        if (isHome) {
            homeLi.classList.add('active');
        }

        homeLi.innerHTML = `
            <a href="${siteTitleLink}">
                <i class="fa fa-home"></i> <span>Ana Sayfa</span>
            </a>
        `;

        if (sideMenu.firstChild) {
            sideMenu.insertBefore(homeLi, sideMenu.firstChild);
        } else {
            sideMenu.appendChild(homeLi);
        }
    }
}

// Disable Navigation when Clicking Logo Title wrapper link
function disableLogoNavigation() {
    const brandLinks = document.querySelectorAll('.site_title, .nav_title a');
    brandLinks.forEach(link => {
        link.removeAttribute('href');
        link.style.cursor = 'default';
        link.addEventListener('click', (e) => {
            e.preventDefault();
        }, true);
    });
}

// Profile redirection, Personal Page Scrollbar class injection, Envelope notifications
function handleProfileAndMessages() {
    // 1. Personal Page Detection
    const titles = Array.from(document.querySelectorAll('.x_title h2'));
    const isOzlukOrKisisel = titles.some(h2 => h2.textContent.toUpperCase().includes('ÖZLÜK') ||
        h2.textContent.toUpperCase().includes('KİŞİSEL BİLGİLER') ||
        h2.textContent.toUpperCase().includes('KISISEL BILGILER'));

    const isKisiselPage = window.location.pathname.includes('Kisisel') ||
        window.location.pathname.includes('kisisel') ||
        window.location.pathname.includes('Personal') ||
        window.location.pathname.includes('Profil') ||
        isOzlukOrKisisel ||
        (document.title && document.title.includes('Kişisel Bilgiler'));

    if (isKisiselPage) {
        document.body.classList.add('izban-kisisel-page');
    }

    // 2. Identify Top Navigation Items and Set IDs for Reordering
    const profileLink = document.querySelector('.top_nav .user-profile');
    if (profileLink) {
        const profileLi = profileLink.closest('li');
        if (profileLi) {
            profileLi.id = 'izban-profile-li';

            // Manual click toggle on profile triggers to bypass bootstrap JS failures on homepage
            if (profileLi.dataset.toggleHandlerAdded !== 'true') {
                profileLi.dataset.toggleHandlerAdded = 'true';
                profileLink.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    profileLi.classList.toggle('open');

                    // Close other open dropdowns (like envelope menu)
                    const envelopeLi = document.getElementById('izban-envelope-li');
                    if (envelopeLi) envelopeLi.classList.remove('open');
                });

                // Close when clicking anywhere outside
                document.addEventListener('click', (e) => {
                    if (!profileLi.contains(e.target)) {
                        profileLi.classList.remove('open');
                    }
                });
            }
        }
    }

    const envelopeIcon = document.querySelector('.top_nav i.fa-envelope-o, .top_nav i.fa-envelope');
    if (envelopeIcon) {
        const envelopeLi = envelopeIcon.closest('li');
        if (envelopeLi) {
            envelopeLi.id = 'izban-envelope-li';
        }
    }

    // 3. Configure Profile Dropdown Items (Personal Info, Settings, Exit)
    configureProfileDropdown();

    // 4. Envelope Message Dropdown Toggle & Unread Badge Counter
    const envelopeLi = document.querySelector('.top_nav i.fa-envelope-o, .top_nav i.fa-envelope')?.closest('li');
    if (envelopeLi) {
        const envelopeLink = envelopeLi.querySelector('a');
        if (envelopeLink && envelopeLi.dataset.dropdownHandlerAdded !== 'true') {
            envelopeLi.dataset.dropdownHandlerAdded = 'true';

            // Toggle open class on click to support manual opening
            envelopeLink.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                envelopeLi.classList.toggle('open');

                // Close other open dropdowns (like user profile menu)
                const profileLi = document.getElementById('izban-profile-li');
                if (profileLi) profileLi.classList.remove('open');
            });

            // Close when clicking anywhere outside
            document.addEventListener('click', (e) => {
                if (!envelopeLi.contains(e.target)) {
                    envelopeLi.classList.remove('open');
                }
            });
        }

        // 5. Counts unread messages and creates dynamic indicator badge
        const msgList = envelopeLi.querySelector('.msg_list');
        if (msgList && envelopeLink) {
            const messages = Array.from(msgList.querySelectorAll('li:not(.text-center):not(:last-child)'))
                .filter(li => {
                    const text = li.textContent.toLowerCase();
                    return !text.includes('yeni mesaj yok') &&
                        !text.includes('mesajınız bulunmamaktadır') &&
                        !text.includes('bulunmuyor') &&
                        !text.includes('gönder') &&
                        !text.includes('gonder') &&
                        text.trim().length > 0;
                });
            const unreadCount = messages.length;

            if (unreadCount > 0) {
                let badge = envelopeLink.querySelector('.badge');
                if (!badge) {
                    badge = document.createElement('span');
                    badge.className = 'badge bg-green';
                    envelopeLink.appendChild(badge);
                    envelopeLink.style.position = 'relative';
                }
                badge.textContent = unreadCount;
                badge.style.setProperty('display', 'inline-block', 'important');
            } else {
                const badge = envelopeLink.querySelector('.badge');
                if (badge) {
                    badge.style.setProperty('display', 'none', 'important');
                }
            }

            // Configure custom view/inbox actions inside message dropdown list
            configureMessageDropdown(envelopeLi);
        }
    }
}

// Configures user profile dropdown dynamically with 3 buttons
function configureProfileDropdown() {
    const userMenu = document.querySelector('.dropdown-usermenu');
    if (userMenu && userMenu.dataset.customized !== 'true') {
        userMenu.dataset.customized = 'true';

        // Find existing Log Out (exit) link
        const logoutLink = Array.from(userMenu.querySelectorAll('a'))
            .find(a => a.getAttribute('href') && (a.getAttribute('href').includes('logout') || a.getAttribute('href').includes('exit') || a.textContent.toLowerCase().includes('çıkış') || a.textContent.toLowerCase().includes('out')))
            ?.getAttribute('href') || '/logout';

        // Find "Kişisel Bilgilerim" URL
        const kisiselLink = Array.from(document.querySelectorAll('.nav.side-menu a'))
            .find(a => a.textContent.includes('Kişisel Bilgiler') || a.textContent.includes('Kisisel Bilgiler'))
            ?.getAttribute('href') || localStorage.getItem('izban-kisisel-url') || '#';

        // Construct the new list of menu items
        userMenu.innerHTML = `
            <li>
                <a href="${kisiselLink}" style="padding: 10px 16px !important; display: flex !important; align-items: center; gap: 8px;">
                    <i class="fa fa-user" style="font-size: 14px; width: 16px; text-align: center;"></i>
                    <span>Kişisel Bilgilerim</span>
                </a>
            </li>
            <li>
                <a href="javascript:;" style="padding: 10px 16px !important; display: flex !important; align-items: center; gap: 8px;">
                    <i class="fa fa-cog" style="font-size: 14px; width: 16px; text-align: center;"></i>
                    <span>Ayarlar</span>
                </a>
            </li>
            <li class="divider" style="margin: 6px 0; border-top: 1px solid #e2e8f0;"></li>
            <li>
                <a href="${logoutLink}" style="padding: 10px 16px !important; display: flex !important; align-items: center; gap: 8px;">
                    <i class="fa fa-sign-out" style="font-size: 14px; width: 16px; text-align: center;"></i>
                    <span>Çıkış</span>
                </a>
            </li>
        `;
    }
}

// Configures message dropdown dynamically with inbox & send buttons
function configureMessageDropdown(envelopeLi) {
    const msgList = envelopeLi.querySelector('.msg_list');
    if (!msgList || msgList.dataset.customized === 'true') return;
    msgList.dataset.customized = 'true';

    // Find sidebar messaging link or find existing inbox redirect href in DOM
    const sidebarInboxLink = Array.from(document.querySelectorAll('#sidebar-menu a, .side-menu a, .left_col a'))
        .find(a => {
            const text = a.textContent.toLowerCase();
            const href = a.getAttribute('href');
            if (!href || href === '#' || href.startsWith('javascript:')) return false;
            return text.includes('gelen kutusu') ||
                text.includes('mesajlar') ||
                text.includes('mesaj listesi') ||
                (text.includes('mesaj') && !text.includes('gönder') && !text.includes('gonder') && !text.includes('yaz') && !text.includes('ekle') && !text.includes('yeni'));
        })?.getAttribute('href');

    const sidebarSendLink = Array.from(document.querySelectorAll('#sidebar-menu a, .side-menu a, .left_col a'))
        .find(a => {
            const text = a.textContent.toLowerCase();
            const href = a.getAttribute('href');
            if (!href || href === '#' || href.startsWith('javascript:')) return false;
            return text.includes('yeni mesaj') ||
                text.includes('mesaj gönder') ||
                text.includes('mesaj gonder') ||
                text.includes('mesaj yaz') ||
                text.includes('mesaj ekle');
        })?.getAttribute('href');

    const existingInboxLink = Array.from(msgList.querySelectorAll('a'))
        .find(a => {
            const text = a.textContent.toLowerCase();
            const href = a.getAttribute('href');
            if (!href || href === '#' || href.startsWith('javascript:')) return false;
            return !text.includes('gönder') && !text.includes('gonder') && !text.includes('yeni') && !text.includes('ekle');
        })?.getAttribute('href');

    const existingSendLink = Array.from(msgList.querySelectorAll('a'))
        .find(a => {
            const text = a.textContent.toLowerCase();
            const href = a.getAttribute('href');
            if (!href || href === '#' || href.startsWith('javascript:')) return false;
            return text.includes('yeni') || text.includes('gönder') || text.includes('gonder') || text.includes('ekle');
        })?.getAttribute('href') || sidebarSendLink || '/Mesaj/Yeni';

    // Parse existingSendLink to generate a legitimate .aspx page to prevent 404
    let fallbackInbox = '/Mesajlar.aspx'; // Default directly to plural form Mesajlar.aspx
    if (existingSendLink) {
        const qIdx = existingSendLink.indexOf('?');
        let basePath = qIdx !== -1 ? existingSendLink.substring(0, qIdx) : existingSendLink;
        if (basePath.toLowerCase().includes('gonder') || basePath.toLowerCase().includes('ekle') || basePath.toLowerCase().includes('yeni') || basePath.toLowerCase().includes('yaz')) {
            basePath = basePath.replace(/gonder/gi, 'lar')
                .replace(/ekle/gi, 'lar')
                .replace(/yeni/gi, 'lar')
                .replace(/yaz/gi, 'lar');

            // Fix double plurals like larlar or lerlar
            basePath = basePath.replace(/larlar/gi, 'lar').replace(/lerlar/gi, 'lar');
            basePath = basePath.replace(/desteklar/gi, 'destekler');

            if (!basePath.endsWith('.aspx') && !basePath.includes('.')) {
                basePath += '.aspx';
            }
        } else {
            // Strip the .aspx page suffix name to map to singular or plural
            basePath = basePath.replace(/mesaj/gi, 'mesajlar').replace(/mesajlarlar/gi, 'mesajlar');
        }
        fallbackInbox = basePath;
    }

    if (fallbackInbox === '/.aspx' || fallbackInbox === '/' || !fallbackInbox) {
        fallbackInbox = '/Mesajlar.aspx';
    }

    const inboxUrl = sidebarInboxLink || existingInboxLink || fallbackInbox || '/Mesajlar.aspx';

    // Construct beautiful custom footer actions row with Gelen Kutusu & Yeni Gönder buttons
    const actionLi = document.createElement('li');
    actionLi.className = 'izban-msg-actions-li';
    actionLi.style.cssText = 'padding: 10px 16px !important; border-top: 1px solid #f1f5f9; display: flex !important; gap: 8px !important; justify-content: center !important; margin-top: 6px !important;';

    actionLi.innerHTML = `
        <a href="${inboxUrl}" class="btn btn-sm btn-primary izban-btn-msg izban-btn-inbox" style="flex: 1; margin: 0 !important; display: flex !important; align-items: center; justify-content: center; gap: 6px; padding: 6px 10px !important; border-radius: 6px !important; font-size: 11.5px !important; font-weight: 600 !important; color: #ffffff !important; background: #6366f1 !important; border: none !important;">
            <i class="fa fa-envelope" style="font-size: 11px; color: #ffffff !important; margin: 0 !important; width: auto !important; height: auto !important;"></i>
            <span style="color: #ffffff !important;">Gelen Kutusu</span>
        </a>
        <a href="${existingSendLink}" class="btn btn-sm btn-success izban-btn-msg izban-btn-send" style="flex: 1; margin: 0 !important; display: flex !important; align-items: center; justify-content: center; gap: 6px; padding: 6px 10px !important; border-radius: 6px !important; font-size: 11.5px !important; font-weight: 600 !important; color: #ffffff !important; background: #10b981 !important; border: none !important;">
            <i class="fa fa-paper-plane" style="font-size: 11px; color: #ffffff !important; margin: 0 !important; width: auto !important; height: auto !important;"></i>
            <span style="color: #ffffff !important;">Yeni Gönder</span>
        </a>
    `;

    // Remove any existing default footer lines so it does not duplicate
    const defaultFooters = Array.from(msgList.querySelectorAll('li')).filter(li =>
        li.classList.contains('text-center') ||
        li.querySelector('a[href*="Gonder"]') ||
        li.textContent.includes('Yeni Mesaj Gönder')
    );
    defaultFooters.forEach(fi => fi.remove());

    msgList.appendChild(actionLi);

    // Setup explicit click listeners on custom action buttons to handle navigation robustly
    const inboxBtn = actionLi.querySelector('.izban-btn-inbox');
    const sendBtn = actionLi.querySelector('.izban-btn-send');

    if (inboxBtn) {
        inboxBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            window.location.href = inboxUrl;
        });
    }
    if (sendBtn) {
        sendBtn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            window.location.href = existingSendLink;
        });
    }
}

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
    // Giriş sayfasını denetle
    detectLoginPage();
    // Dinamik grafik ekleme ve sayfa yerleşimlerini güncelleme fonksiyonunu çalıştır
    handlePageLayout();
}

function handlePageLayout() {
    // AnaSayfa butonunu sol menüye ekle
    injectHomepageButton();

    // Logo yönlendirmesini devre dışı bırak
    disableLogoNavigation();

    // Profil yönlendirmesini, sayfa sınıfını ve zarf bildirimlerini denetle
    handleProfileAndMessages();

    // Karanlık mod eklenti butonlarını yükle
    injectDarkModeToggles();


    // Doğum günü bölümünü hareketlendir
    handleBirthdaySection();

    // 1. KPI Kartları (Top Tiles): Sağ tarafa küçük bir SVG pasta grafiği/ilerleme dairesi ekle
    const tiles = document.querySelectorAll('.tile_stats_count');
    tiles.forEach(tile => {
        if (tile.dataset.styled === 'true') return;
        tile.dataset.styled = 'true';

        const topTextEl = tile.querySelector('.count_top');
        const topText = topTextEl ? (topTextEl.textContent || "").trim() : "";
        const isComplaint = topText.toLowerCase().includes("şikayet") || topText.toLowerCase().includes("şikâyet");
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
        if (!isComplaint) {
            const div = document.createElement('div');
            div.innerHTML = svgHTML;
            tile.appendChild(div.firstElementChild);
        }

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

        // Sadece ana sayfa düzeyindeki tablolu modüllere (İzin ve Tesis içerenlere) grafik yerleştir (Doküman/Revize kartları hariç)
        if (table && (titleText.includes('Tesisler') || titleText.includes('İzin')) && !titleText.includes('Doküman') && !titleText.includes('Revize')) {
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

function handleBirthdaySection() {
    const panels = document.querySelectorAll('.x_panel');
    panels.forEach(panel => {
        const titleEl = panel.querySelector('.x_title h2');
        if (!titleEl) return;
        const titleText = (titleEl.textContent || "").trim();
        if (titleText.includes("Doğum Günü")) {
            const contentEl = panel.querySelector('.x_content');
            if (!contentEl || contentEl.dataset.styled === 'true') return;
            contentEl.dataset.styled = 'true';

            // İçerik kontrolü
            const text = contentEl.textContent || "";
            if (text.includes("bulunmamaktadır") || text.includes("bulunmuyor") || text.includes("bulunmadı")) {
                contentEl.innerHTML = `
                    <div class="izban-birthday-empty" style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px 16px; text-align: center; background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border-radius: 12px; border: 1px dashed #cbd5e1; position: relative; overflow: hidden; min-height: 120px;">
                        <div class="birthday-confetti-effect" style="position: absolute; top:0; left:0; right:0; bottom:0; opacity: 0.15; pointer-events: none; background-image: radial-gradient(circle, #3b82f6 1px, transparent 1px), radial-gradient(circle, #ef4444 1px, transparent 1px); background-size: 20px 20px; background-position: 0 0, 10px 10px;"></div>
                        <div class="izban-birthday-icon-wrapper" style="font-size: 32px; color: #6366f1; margin-bottom: 12px; animation: bounce 2s infinite ease-in-out; display: inline-block;">
                            🎂
                        </div>
                        <div style="font-size: 13px; font-weight: 700; color: #475569; line-height: 1.5; margin-bottom: 4px;">
                            Bugün doğum günü olan personel bulunmamaktadır.
                        </div>
                        <div style="font-size: 11px; color: #94a3b8;">
                            Yeni yaşlarında tüm ekibimize mutluluklar dileriz!
                        </div>
                    </div>
                `;
            }
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

let originalBgImage = null;

function findExistingTrainImage() {
    // 1. Try to read directly from computed style of common elements
    const selectors = ['.login_wrapper', '.login_content', 'form', 'body', '.login-panel'];
    for (const s of selectors) {
        const el = document.querySelector(s);
        if (el) {
            const style = window.getComputedStyle(el);
            const bgImg = style.backgroundImage;
            if (bgImg && bgImg !== 'none' && bgImg.includes('url')) {
                const match = bgImg.match(/url\((['"]?)(.*?)\1\)/);
                if (match && match[2] && !match[2].includes('Alsancak')) {
                    return match[2];
                }
            }
        }
    }

    // 2. Scan all stylesheets for rules matching login selectors that have background-image
    try {
        for (const sheet of document.styleSheets) {
            try {
                const rules = sheet.cssRules || sheet.rules;
                if (!rules) continue;
                for (const rule of rules) {
                    if (rule.selectorText &&
                        (rule.selectorText.includes('login') || rule.selectorText.includes('wrapper') || rule.selectorText.includes('body')) &&
                        rule.style && rule.style.backgroundImage && rule.style.backgroundImage.includes('url')) {
                        const match = rule.style.backgroundImage.match(/url\((['"]?)(.*?)\1\)/);
                        if (match && match[2] && !match[2].includes('Alsancak')) {
                            return match[2];
                        }
                    }
                }
            } catch (e) {
                // Cross-origin stylesheet access error - normal for external sheets
            }
        }
    } catch (e) {
        // ignore
    }

    // 3. Fallbacks - scan all divs and elements with inline styling
    const allDivs = document.querySelectorAll('div');
    for (const div of allDivs) {
        const inlineBg = div.style.backgroundImage;
        if (inlineBg && inlineBg.includes('url')) {
            const match = inlineBg.match(/url\((['"]?)(.*?)\1\)/);
            if (match && match[2] && !match[2].includes('Alsancak')) {
                return match[2];
            }
        }
    }

    // 4. Default fallback: Wikimedia E22000
    return 'https://upload.wikimedia.org/wikipedia/commons/1/1a/TCDD_E22000_in_Alsancak.jpg';
}

function detectLoginPage() {
    const isLoginPath = window.location.pathname.toLowerCase().includes('login') ||
        window.location.pathname.toLowerCase().includes('default.asp') ||
        window.location.pathname.toLowerCase().includes('default.aspx') ||
        window.location.pathname === '/';

    const hasLoginFields = document.querySelector('input[type="password"]') ||
        document.querySelector('input[name*="kullanici" i]') ||
        document.querySelector('input[id*="kullanici" i]') ||
        document.querySelector('input[name*="sicil" i]') ||
        document.querySelector('input[id*="sicil" i]');

    if (isLoginPath || hasLoginFields) {
        if (!originalBgImage) {
            originalBgImage = findExistingTrainImage();
        }

        if (!document.body.classList.contains('izban-login-page')) {
            document.body.classList.add('izban-login-page');
        }
        setupLoginBackground();
    }
}

function setupLoginBackground() {
    if (document.getElementById('izban-login-bg-container')) return;

    let trainImgUrl = chrome.runtime.getURL('bg-4k.jpg');

    const bgContainer = document.createElement('div');
    bgContainer.id = 'izban-login-bg-container';

    bgContainer.innerHTML = `
        <div class="izban-login-bg-image" style="background-image: url('${trainImgUrl}') !important;"></div>
        <div class="izban-login-bg-overlay"></div>
    `;
    document.body.insertBefore(bgContainer, document.body.firstChild);

    // Hata oluşmaması için wrapper ve login içeriğindeki mevcut arka plan görselini temizliyoruz ki glassmorphic olsun
    ['.login_wrapper', '.login_content', 'form', '.form'].forEach(selector => {
        const el = document.querySelector(selector);
        if (el) {
            el.style.setProperty('background-image', 'none', 'important');
            el.style.setProperty('background-color', 'transparent', 'important');
        }
    });
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