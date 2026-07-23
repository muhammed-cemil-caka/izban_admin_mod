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

// Dynamically finds the settings/password change page from the sidebar menu
function getSettingsUrl() {
    let url = localStorage.getItem('izban-settings-url');
    if (url && url !== '#' && !url.startsWith('javascript:')) return url;

    // First priority: Check the sidebar footer settings cog button (glyphicon-cog, fa-cog, title="Settings", etc.)
    const footerLink = document.querySelector('.sidebar-footer a[title*="Settings" i], .sidebar-footer a[title*="Ayar" i], .sidebar-footer a[title*="ayar" i], .sidebar-footer a[href*="ayar" i], .sidebar-footer a[href*="setting" i]')
        || Array.from(document.querySelectorAll('.sidebar-footer a')).find(a => {
            const html = a.innerHTML.toLowerCase();
            const title = (a.getAttribute('title') || '').toLowerCase();
            const href = (a.getAttribute('href') || '').toLowerCase();
            return html.includes('cog') || html.includes('gear') || title.includes('ayar') || title.includes('setting') || href.includes('ayar') || href.includes('setting');
        });

    if (footerLink) {
        const href = footerLink.getAttribute('href');
        if (href && href !== '#' && !href.startsWith('javascript:')) {
            localStorage.setItem('izban-settings-url', href);
            return href;
        }
    }

    const links = Array.from(document.querySelectorAll('.left_col a, #sidebar-menu a, .nav.side-menu a'));

    // First priority: Exact match or clear settings/password change page
    const settingsLink = links.find(a => {
        const text = a.textContent.toLowerCase();
        const href = a.getAttribute('href') || '';
        if (href === '#' || href.startsWith('javascript:')) return false;
        return (text.includes('şifre değiştir') || text.includes('sifre degistir') || text.includes('şifre işlemleri') || (text.includes('ayar') && !text.includes('kpi')));
    });
    if (settingsLink) {
        const href = settingsLink.getAttribute('href');
        localStorage.setItem('izban-settings-url', href);
        return href;
    }

    // Second priority: Any page with "ayar"
    const anyAyarLink = links.find(a => {
        const text = a.textContent.toLowerCase();
        const href = a.getAttribute('href') || '';
        if (href === '#' || href.startsWith('javascript:')) return false;
        return text.includes('ayar');
    });
    if (anyAyarLink) {
        const href = anyAyarLink.getAttribute('href');
        localStorage.setItem('izban-settings-url', href);
        return href;
    }

    // Fallback if none found - use Kişisel Bilgilerim page to prevent 404
    const kisiselLink = Array.from(document.querySelectorAll('.nav.side-menu a'))
        .find(a => a.textContent.includes('Kişisel Bilgiler') || a.textContent.includes('Kisisel Bilgiler'))
        ?.getAttribute('href') || localStorage.getItem('izban-kisisel-url') || '#';

    return kisiselLink && kisiselLink !== '#' ? kisiselLink : '#';
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

        // Dynamic Settings URL
        const ayarlarLink = getSettingsUrl();

        // Construct the new list of menu items
        userMenu.innerHTML = `
            <li>
                <a href="${kisiselLink}" style="padding: 10px 16px !important; display: flex !important; align-items: center; gap: 8px;">
                    <i class="fa fa-user" style="font-size: 14px; width: 16px; text-align: center;"></i>
                    <span>Kişisel Bilgilerim</span>
                </a>
            </li>
            <li>
                <a href="${ayarlarLink}" style="padding: 10px 16px !important; display: flex !important; align-items: center; gap: 8px;">
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
    try {
        // Giriş sayfasını denetle
        detectLoginPage();
        // Dinamik grafik ekleme ve sayfa yerleşimlerini güncelleme fonksiyonunu çalıştır
        handlePageLayout();
        // Şikayet sayfası görsel iyileştirmelerini başlat
        initializeSikayetlerPage();
    } catch (e) {
        console.warn('Error in handleNavigation:', e);
    }
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

    // Arama barlarını yükle
    initializeSidebarSearch();
    initializeContactsSearch();
    initializeSelectMultipleSearch();

    // Doğum günü bölümünü hareketlendir
    handleBirthdaySection();

    // Helper for generating dynamic KPI details breakdown
    function getKpiDetails(title, value) {
        const lowerTitle = title.toLowerCase();
        let valNum = parseInt(value.replace(/[^0-9]/g, '')) || 0;

        if (lowerTitle.includes("set") || lowerTitle.includes("sefer")) {
            const active = Math.round(valNum * 0.6) || 44;
            const maintenance = Math.round(valNum * 0.3) || 29;
            const standby = valNum - active - maintenance || 5;
            return [
                { label: "Hat Üzerinde", value: active, color: "#10b981" },
                { label: "Depoda Bakımda", value: maintenance, color: "#ef4444" },
                { label: "Yedek Üniteler", value: standby, color: "#f59e0b" }
            ];
        } else if (lowerTitle.includes("asansör") || lowerTitle.includes("lift")) {
            const active = Math.round(valNum * 0.98) || 132;
            const maintenance = valNum - active || 2;
            return [
                { label: "Faal Üniteler", value: active, color: "#10b981" },
                { label: "Arızalı / Bakımda", value: maintenance, color: "#ef4444" }
            ];
        } else if (lowerTitle.includes("merdiven") || lowerTitle.includes("yürüyen")) {
            const active = Math.round(valNum * 0.96) || 84;
            const maintenance = valNum - active || 3;
            return [
                { label: "Faal Üniteler", value: active, color: "#10b981" },
                { label: "Arızalı / Bakımda", value: maintenance, color: "#ef4444" }
            ];
        } else if (lowerTitle.includes("personel") || lowerTitle.includes("kullanıcı") || lowerTitle.includes("üye")) {
            const active = Math.round(valNum * 0.8) || 120;
            const offline = valNum - active || 30;
            return [
                { label: "Aktif Çalışan", value: active, color: "#10b981" },
                { label: "İzinli / Raporlu", value: offline, color: "#f59e0b" }
            ];
        } else if (lowerTitle.includes("yolcu") || lowerTitle.includes("biniş")) {
            const regular = Math.round(valNum * 0.7) || 7500;
            const discount = valNum - regular || 2500;
            return [
                { label: "Tam Bilet", value: regular, color: "#6366f1" },
                { label: "İndirimli / Öğrenci", value: discount, color: "#f59e0b" }
            ];
        } else {
            const part1 = Math.round(valNum * 0.75);
            const part2 = valNum - part1;
            return [
                { label: "Aktif / Planlanan", value: part1, color: "#10b981" },
                { label: "Pasif / Beklemede", value: part2, color: "#f59e0b" }
            ];
        }
    }

    // 1. KPI Kartları (Top Tiles): Sağ tarafa küçük bir SVG pasta grafiği/ilerleme dairesi ekle
    const tiles = document.querySelectorAll('.tile_stats_count');
    tiles.forEach(tile => {
        if (tile.dataset.styled === 'true') return;
        tile.dataset.styled = 'true';

        const topTextEl = tile.querySelector('.count_top');
        const topText = topTextEl ? (topTextEl.textContent || "").trim() : "";
        const countEl = tile.querySelector('.count');
        const countText = countEl ? (countEl.textContent || "").trim() : "0";
        const isComplaint = topText.toLowerCase().includes("şikayet") || topText.toLowerCase().includes("şikâyet");
        if (topText.includes("Profil") || tile.querySelector('select')) {
            tile.style.setProperty('flex-direction', 'column', 'important');
            tile.style.setProperty('align-items', 'stretch', 'important');
            return;
        }

        const bottomTextEl = tile.querySelector('.count_bottom');
        if (!bottomTextEl) return;

        const textContent = bottomTextEl.textContent || "";
        const match = textContent.match(/(\d+(?:\.\d+)?)\s*%/);
        let percent = 50;
        let percentText = "50%";
        if (match && match[1]) {
            percent = parseFloat(match[1]);
            percentText = match[1] + "%";
        } else {
            const numMatch = textContent.match(/(\d+)/);
            if (numMatch && numMatch[1]) {
                const val = parseInt(numMatch[1]);
                percent = val > 100 ? (val % 100) : val;
            }
            percentText = percent + "%";
        }

        let strokeColor = '#10b981';
        if (bottomTextEl.querySelector('.red')) {
            strokeColor = '#ef4444';
        } else if (bottomTextEl.querySelector('.orange') || bottomTextEl.querySelector('.yellow')) {
            strokeColor = '#f59e0b';
        }

        const fontSize = percentText.length > 5 ? '5.5' : (percentText.length > 3 ? '6.5' : '8.5');

        const svgHTML = `
            <div class="izban-tile-pie-container">
                <svg width="42" height="42" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="16" fill="none" stroke="#f1f5f9" stroke-width="4"></circle>
                    <circle cx="18" cy="18" r="16" fill="none" stroke="${strokeColor}" stroke-width="4" 
                            stroke-dasharray="${percent} 100" stroke-linecap="round" 
                            transform="rotate(-90 18 18)" style="transition: stroke-dasharray 0.5s ease;"></circle>
                    <text x="18" y="18" dominant-baseline="central" text-anchor="middle" font-size="${fontSize}" font-weight="800" fill="#334155">${percentText}</text>
                </svg>
            </div>
        `;

        // Create main row wrapper to contain content-left and pie container
        const mainRow = document.createElement('div');
        mainRow.className = 'izban-tile-main-row';

        // Mevcut içeriği sola yaslamak için kılıf oluşturalım
        const leftWrapper = document.createElement('div');
        leftWrapper.className = 'izban-tile-content-left';
        leftWrapper.style.flex = '1';
        leftWrapper.style.minWidth = '0';

        while (tile.firstChild) {
            leftWrapper.appendChild(tile.firstChild);
        }

        mainRow.appendChild(leftWrapper);

        // Pasta grafiğini ekleyelim
        if (!isComplaint) {
            const div = document.createElement('div');
            div.innerHTML = svgHTML;
            mainRow.appendChild(div.firstElementChild);
        } else {
            tile.classList.add('izban-complaint-tile');
            const arrowDiv = document.createElement('div');
            arrowDiv.className = 'izban-complaint-arrow';
            arrowDiv.innerHTML = '&#8599;'; // North East Arrow ↗
            mainRow.appendChild(arrowDiv);

            // Store parsed total complaints
            window.izbanTotalComplaintsCount = parseInt(countText.replace(/[^0-9]/g, '')) || 5988;

            // Coordinate green badge on the card
            if (bottomTextEl) {
                const badgeCount = PENDING_COMPLAINTS_DATA.length;
                bottomTextEl.innerHTML = `<i class="green"><i class="fa fa-clock-o"></i> ${badgeCount} Cevap Bekliyor</i>`;
            }
        }

        tile.appendChild(mainRow);

        if (!isComplaint) {
            // Generate and append details panel below the main row
            const detailsPanel = document.createElement('div');
            detailsPanel.className = 'izban-tile-details';

            const detailsData = getKpiDetails(topText, countText);
            let detailsRowsHtml = '';
            detailsData.forEach(item => {
                detailsRowsHtml += `
                    <div class="izban-detail-row">
                        <span>${item.label}</span>
                        <span style="color: ${item.color}; font-weight: 800;">${item.value}</span>
                    </div>
                `;
            });

            detailsPanel.innerHTML = `
                <button type="button" class="izban-tile-details-close">&times;</button>
                <div class="izban-tile-details-inner">
                    ${detailsRowsHtml}
                </div>
            `;
            tile.appendChild(detailsPanel);
        }

        // Adjust layouts
        tile.style.display = 'flex';
        tile.style.flexDirection = 'column';
        tile.style.alignItems = 'stretch';
    });

    // Global Delegated click listeners once for expandable KPI cards
    if (!window.izbanKpiClickDelegated) {
        window.izbanKpiClickDelegated = true;

        // Find default or custom complaint URL
        const findComplaintUrl = () => {
            const links = Array.from(document.querySelectorAll('.nav.side-menu a, .child_menu a'));
            const found = links.find(a => {
                const text = a.textContent.toLowerCase();
                const href = (a.getAttribute('href') || '').toLowerCase();
                return text.includes('şikayet') || text.includes('şikâyet') || href.includes('sikayet') || href.includes('complaint');
            });
            return found ? found.getAttribute('href') : null;
        };
        const complaintUrl = findComplaintUrl();

        document.addEventListener('click', (e) => {
            // Complaint tile click redirect
            const complaintTile = e.target.closest('.izban-complaint-tile');
            if (complaintTile) {
                // If clicked an actual internal link/active button, let it handle naturally, else redirect:
                if (e.target.closest('a') && e.target.closest('a').getAttribute('href') !== '#') {
                    return;
                }
                if (complaintUrl) {
                    window.location.href = complaintUrl;
                } else {
                    showModernComplaintsModal();
                }
                return;
            }

            // Close button click
            const closeBtn = e.target.closest('.izban-tile-details-close');
            if (closeBtn) {
                e.stopPropagation();
                const panel = closeBtn.closest('.izban-tile-details');
                if (panel) {
                    panel.classList.remove('open');
                }
                const tile = closeBtn.closest('.tile_stats_count');
                if (tile) {
                    tile.classList.remove('is-expanded');
                }
                return;
            }

            // Pie container click or main row click
            const mainRow = e.target.closest('.izban-tile-main-row');

            if (mainRow) {
                if (e.target.closest('a') || e.target.closest('button') || e.target.closest('select')) {
                    return;
                }
                const tile = mainRow.closest('.tile_stats_count');
                if (tile) {
                    const detailsPanel = tile.querySelector('.izban-tile-details');
                    if (detailsPanel) {
                        const isOpen = detailsPanel.classList.contains('open');

                        // Close any other open panels to show only one floating overlay at a time
                        document.querySelectorAll('.izban-tile-details.open').forEach(p => {
                            if (p !== detailsPanel) p.classList.remove('open');
                        });

                        // Clear is-expanded on other cards
                        document.querySelectorAll('.tile_stats_count.is-expanded').forEach(t => {
                            if (t !== tile) t.classList.remove('is-expanded');
                        });

                        if (isOpen) {
                            detailsPanel.classList.remove('open');
                            tile.classList.remove('is-expanded');
                        } else {
                            detailsPanel.classList.add('open');
                            tile.classList.add('is-expanded');
                        }
                    }
                }
                return;
            }

            // Clicked outside KPI cards - close all open panels and cards
            if (!e.target.closest('.tile_stats_count')) {
                document.querySelectorAll('.izban-tile-details.open').forEach(p => {
                    p.classList.remove('open');
                });
                document.querySelectorAll('.tile_stats_count.is-expanded').forEach(t => {
                    t.classList.remove('is-expanded');
                });
            }
        });
    }

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
    // If URL contains page= query or similar application page indicators, we are logged in - do not treat as login page
    const urlLower = window.location.href.toLowerCase();
    const queryParams = new URLSearchParams(window.location.search);
    if (queryParams.has('page') || urlLower.includes('page=') || urlLower.includes('sikayet') || urlLower.includes('complaint')) {
        return;
    }

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

function turkishToLower(str) {
    if (!str) return '';
    return str.toString()
        .replace(/İ/g, 'i')
        .replace(/I/g, 'ı')
        .toLowerCase();
}

function initializeContactsSearch() {
    if (document.getElementById('izban-contacts-search-wrapper')) return;

    // Detect if we are on a contacts page
    const cards = document.querySelectorAll('.profile_details');

    // Check page title / URL for table-based contact list
    const titleText = (document.title || "").toLowerCase();
    const headers = Array.from(document.querySelectorAll('.x_title h2, .page-title h3')).map(h => h.textContent.toLowerCase());
    const isContactsPage = cards.length > 0 ||
        window.location.pathname.toLowerCase().includes('rehber') ||
        window.location.pathname.toLowerCase().includes('personel') ||
        titleText.includes('rehber') ||
        titleText.includes('personel') ||
        titleText.includes('kişi') ||
        headers.some(h => h.includes('rehber') || h.includes('personel') || h.includes('kişi'));

    if (!isContactsPage) return;

    // Determine injection point
    let injectBeforeElement = null;
    let searchType = ''; // 'cards' or 'table'

    if (cards.length > 0) {
        searchType = 'cards';
        // Go up to the closest row or parent container to inject search bar cleanly before it
        const firstCard = cards[0];
        injectBeforeElement = firstCard.closest('.row') || firstCard.parentElement;
    } else {
        const tables = document.querySelectorAll('.right_col table');
        if (tables.length > 0) {
            searchType = 'table';
            // Inject before the container panel or table
            const table = tables[0];
            injectBeforeElement = table.closest('.x_panel') || table;
        }
    }

    if (!injectBeforeElement) return;

    // Create search bar element
    const searchWrapper = document.createElement('div');
    searchWrapper.id = 'izban-contacts-search-wrapper';
    searchWrapper.className = 'izban-search-wrapper';
    searchWrapper.innerHTML = `
        <input type="text" id="izban-contacts-search" class="izban-search-input" placeholder="Kişi ara... (İsim, unvan, tel vb.)" autocomplete="off" />
        <i class="fa fa-search izban-search-icon"></i>
        <button type="button" id="izban-contacts-search-clear" class="izban-search-clear">
            <i class="fa fa-times-circle"></i>
        </button>
    `;

    injectBeforeElement.parentNode.insertBefore(searchWrapper, injectBeforeElement);

    const searchInput = document.getElementById('izban-contacts-search');
    const clearBtn = document.getElementById('izban-contacts-search-clear');

    searchInput.addEventListener('input', (e) => {
        const query = turkishToLower(e.target.value.trim());

        if (query) {
            clearBtn.style.display = 'block';
        } else {
            clearBtn.style.display = 'none';
        }

        if (searchType === 'cards') {
            const contactCards = document.querySelectorAll('.profile_details');
            contactCards.forEach(card => {
                const nameEl = card.querySelector('.left h2, h2:not(.brief), h2');
                const nameText = nameEl ? nameEl.textContent.trim() : card.textContent.trim();
                const match = !query || turkishToLower(nameText).startsWith(query);
                if (match) {
                    card.style.setProperty('display', '', 'important');
                } else {
                    card.style.setProperty('display', 'none', 'important');
                }
            });
        } else if (searchType === 'table') {
            const rows = document.querySelectorAll('.right_col table tbody tr');
            rows.forEach(row => {
                // Skip header rows by checking if they contain th
                if (row.querySelector('th')) return;
                const cells = Array.from(row.querySelectorAll('td'));
                const nameCell = cells.find(td => {
                    const val = td.textContent.trim();
                    return val && /[a-zA-ZçğıöşüÇĞİÖŞÜ]/.test(val) && !val.includes(':');
                });
                const match = !query || (nameCell && turkishToLower(nameCell.textContent.trim()).startsWith(query));
                if (match) {
                    row.style.setProperty('display', '', 'important');
                } else {
                    row.style.setProperty('display', 'none', 'important');
                }
            });
        }
    });

    clearBtn.addEventListener('click', () => {
        searchInput.value = '';
        clearBtn.style.display = 'none';
        searchInput.focus();

        // Trigger input event to reset view
        searchInput.dispatchEvent(new Event('input'));
    });
}

function initializeSidebarSearch() {
    if (document.getElementById('izban-sidebar-search-container')) return;

    const sidebarMenu = document.getElementById('sidebar-menu') || document.querySelector('.main_menu_side');
    if (!sidebarMenu) return;

    // Create search bar element
    const searchContainer = document.createElement('div');
    searchContainer.id = 'izban-sidebar-search-container';
    searchContainer.className = 'izban-sidebar-search-container';
    searchContainer.innerHTML = `
        <div class="search-box-wrapper">
            <input type="text" id="izban-sidebar-search" placeholder="Menüde ara..." autocomplete="off" />
            <i class="fa fa-search search-icon"></i>
            <button type="button" id="izban-sidebar-clear">
                <i class="fa fa-times-circle"></i>
            </button>
        </div>
    `;

    // Inject at the top of the sidebar menu
    if (sidebarMenu.firstChild) {
        sidebarMenu.insertBefore(searchContainer, sidebarMenu.firstChild);
    } else {
        sidebarMenu.appendChild(searchContainer);
    }

    const searchInput = document.getElementById('izban-sidebar-search');
    const clearBtn = document.getElementById('izban-sidebar-clear');

    // Keep track of original menu states before search typing starts
    let originalStates = [];

    function saveMenuStates() {
        originalStates = [];
        const topLevels = document.querySelectorAll('.nav.side-menu > li');
        topLevels.forEach((li, index) => {
            const childMenu = li.querySelector('.child_menu');
            originalStates.push({
                index: index,
                isActive: li.classList.contains('active'),
                childDisplay: childMenu ? childMenu.style.display : ''
            });
        });
    }

    function restoreMenuStates() {
        const topLevels = document.querySelectorAll('.nav.side-menu > li');
        topLevels.forEach((li, index) => {
            const state = originalStates.find(s => s.index === index);
            if (!state) return;

            // Restore active class
            if (state.isActive) {
                li.classList.add('active');
            } else {
                li.classList.remove('active');
            }

            // Restore child menu display style
            const childMenu = li.querySelector('.child_menu');
            if (childMenu) {
                childMenu.style.display = state.childDisplay;
            }

            // Clean up any inline overrides we did during filter
            li.style.display = '';
            const childLis = li.querySelectorAll('.child_menu li');
            childLis.forEach(childLi => childLi.style.display = '');
        });
    }

    // Initialize original states
    saveMenuStates();

    searchInput.addEventListener('input', (e) => {
        const query = turkishToLower(e.target.value.trim());

        if (query) {
            clearBtn.style.display = 'block';
        } else {
            clearBtn.style.display = 'none';
            restoreMenuStates();
            return;
        }

        const topLevels = document.querySelectorAll('.nav.side-menu > li');

        topLevels.forEach(li => {
            const topLinkText = turkishToLower(li.querySelector('a')?.textContent || '');
            const childMenu = li.querySelector('.child_menu');
            const childLis = childMenu ? li.querySelectorAll('.child_menu li') : [];

            let topMatch = !query || topLinkText.startsWith(query);
            let childMatchCount = 0;

            childLis.forEach(childLi => {
                const childText = turkishToLower(childLi.textContent.trim());
                const childMatch = !query || childText.startsWith(query);
                if (childMatch) {
                    childLi.style.setProperty('display', '', 'important');
                    childMatchCount++;
                } else {
                    childLi.style.setProperty('display', 'none', 'important');
                }
            });

            if (topMatch || childMatchCount > 0) {
                li.style.setProperty('display', '', 'important');

                // If sub-items match, expand the menu to make them visible
                if (childMatchCount > 0 && childMenu) {
                    childMenu.style.setProperty('display', 'block', 'important');
                    li.classList.add('active');
                } else if (childMenu && !topMatch) {
                    childMenu.style.setProperty('display', 'none', 'important');
                    li.classList.remove('active');
                }
            } else {
                li.style.setProperty('display', 'none', 'important');
                if (childMenu) {
                    childMenu.style.setProperty('display', 'none', 'important');
                }
            }
        });
    });

    clearBtn.addEventListener('click', () => {
        searchInput.value = '';
        clearBtn.style.display = 'none';
        restoreMenuStates();
        searchInput.focus();
    });

    // Re-save states when menu items are clicked directly (to capture user updates while not searching)
    const topMenuLinks = document.querySelectorAll('.nav.side-menu > li > a');
    topMenuLinks.forEach(link => {
        link.addEventListener('click', () => {
            if (!searchInput.value.trim()) {
                // Wait for the native toggle to play out
                setTimeout(saveMenuStates, 300);
            }
        });
    });
}

function initializeSelectMultipleSearch() {
    const selects = document.querySelectorAll('select[multiple]');
    selects.forEach((select, idx) => {
        if (select.dataset.searchInjected === 'true') return;
        select.dataset.searchInjected = 'true';

        // Force exactly 5 options height natively
        select.setAttribute('size', '5');

        const selectId = select.id || `izban-select-multiple-${idx}`;
        select.id = selectId;

        const wrapper = document.createElement('div');
        wrapper.className = 'izban-select-search-wrapper';
        wrapper.innerHTML = `
            <input type="text" class="izban-select-search-input" placeholder="Alıcı ara..." autocomplete="off" data-target="${selectId}" />
            <i class="fa fa-search search-icon"></i>
            <button type="button" class="izban-select-clear">
                <i class="fa fa-times-circle"></i>
            </button>
        `;

        select.parentNode.insertBefore(wrapper, select);

        const searchInput = wrapper.querySelector('.izban-select-search-input');
        const clearBtn = wrapper.querySelector('.izban-select-clear');

        searchInput.addEventListener('input', (e) => {
            const query = turkishToLower(e.target.value.trim());
            if (query) {
                clearBtn.style.display = 'block';
            } else {
                clearBtn.style.display = 'none';
            }

            const options = select.querySelectorAll('option');
            options.forEach(opt => {
                const text = turkishToLower(opt.textContent.trim());
                const match = !query || text.startsWith(query);
                if (match) {
                    opt.style.display = '';
                } else {
                    opt.style.display = 'none';
                }
            });
        });

        clearBtn.addEventListener('click', () => {
            searchInput.value = '';
            clearBtn.style.display = 'none';
            searchInput.focus();
            searchInput.dispatchEvent(new Event('input'));
        });
    });
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

const PENDING_COMPLAINTS_DATA = [
    { passenger: "Ahmet Yılmaz", station: "Alsancak Metro", date: "Bugün, 08:30", body: "Klima arızası ve vagon sıcaklığı nedeniyle yolculuk konseptimiz olumsuz etkilendi." },
    { passenger: "Mehmet Kaya", station: "Menemen İstasyonu", date: "Dün, 19:40", body: "Asansör düğmelerinin kırık olması hareket kabiliyetini engelliyor." },
    { passenger: "Can Yıldız", station: "Şirinyer Turnikeler", date: "Dün, 14:10", body: "Güvenlik personelinin ilgisizliği ve geçiş turnikelerindeki yoğunluk yönetilemiyor." },
    { passenger: "Selin Aksoy", station: "Karşıyaka Gar", date: "22.07.2026, 18:25", body: "Sefer iptali anonsunun gecikmesi nedeniyle aktarma trenini kaçırdık." }
];

function showModernComplaintsModal() {
    if (document.getElementById('izban-complaints-modal')) return;

    const totalCount = window.izbanTotalComplaintsCount || 5988;
    const pendingCount = PENDING_COMPLAINTS_DATA.length;
    const answeredCount = totalCount - pendingCount;

    const formatNumber = (num) => num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");

    let listHtml = '';
    PENDING_COMPLAINTS_DATA.forEach(item => {
        listHtml += `
            <div class="izban-modal-list-item">
                <div class="item-header">
                    <strong>${item.passenger}</strong> - ${item.station}
                    <span class="item-date">${item.date}</span>
                </div>
                <div class="item-body">${item.body}</div>
            </div>
        `;
    });

    const modal = document.createElement('div');
    modal.id = 'izban-complaints-modal';
    modal.className = 'izban-modal-overlay';
    modal.innerHTML = `
        <div class="izban-modal-content">
            <div class="izban-modal-header">
                <h3><i class="fa fa-comments-o"></i> Şikayet Detay Paneli</h3>
                <button type="button" class="izban-modal-close-btn">&times;</button>
            </div>
            <div class="izban-modal-body">
                <div class="izban-modal-stats">
                    <div class="izban-modal-stat-card answered">
                        <div class="stat-num">${formatNumber(answeredCount)}</div>
                        <div class="stat-label">Cevaplanan Şikayet</div>
                    </div>
                    <div class="izban-modal-stat-card pending">
                        <div class="stat-num">${formatNumber(pendingCount)}</div>
                        <div class="stat-label">Bekleyen Şikayet</div>
                    </div>
                </div>
                
                <h4 style="margin-top: 16px; font-weight: 700; font-size: 13px; margin-bottom: 8px;">Cevap Bekleyen Şikayetler (${pendingCount})</h4>
                <div class="sikayet-list-container">
                    ${listHtml}
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(modal);

    modal.querySelector('.izban-modal-close-btn').addEventListener('click', () => {
        modal.remove();
    });
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });
}

function initializeSikayetlerPage() {
    const urlLower = window.location.href.toLowerCase();
    let queryParams;
    try {
        queryParams = new URLSearchParams(window.location.search);
    } catch (e) {
        console.warn('URL Parse Error Ignored:', e);
        queryParams = new URLSearchParams();
    }
    const isSikayetPage = urlLower.includes('sikayet') || urlLower.includes('complaint') || queryParams.get('page') === 'sikayetler';

    if (!isSikayetPage) return;

    // We are on the complaints page! Let's modernize it.
    const rightCol = document.querySelector('.right_col');
    if (!rightCol) return;

    // Check if we already injected our modern panel
    if (document.getElementById('izban-modern-complaints-container')) return;

    // Core mock database
    const defaultComplaints = [
        { id: "SK-9821B", date: "23.07.2026 08:30", passenger: "Ahmet Yılmaz", subject: "Klima arızası ve vagon sıcaklığı", station: "Alsancak Metro", status: "Cevap Bekliyor" },
        { id: "SK-9820B", date: "23.07.2026 07:15", passenger: "Elif Demir", subject: "Valiz geçiş turnikesi çalışmaması", station: "Halkapınar Aktarma", status: "Cevaplandı", reply: "Turnike arızası teknik ekibimize bildirilmiş olup, saat 09:12 itibariyle giderilmiştir." },
        { id: "SK-9819B", date: "22.07.2026 19:40", passenger: "Mehmet Kaya", subject: "Asansör düğmelerinin kırık olması", station: "Menemen İstasyonu", status: "Cevap Bekliyor" },
        { id: "SK-9818B", date: "22.07.2026 18:25", passenger: "Selin Aksoy", subject: "Sefer iptali anonsunun gecikmesi", station: "Karşıyaka Gar", status: "Cevaplandı", reply: "Gecikme anons sistemi kontrol edilmiştir. Geri bildiriminiz için teşekkür ederiz." },
        { id: "SK-9817B", date: "22.07.2026 14:10", passenger: "Can Yıldız", subject: "Güvenlik personelinin ilgisizliği", station: "Şirinyer Turnikeler", status: "Cevap Bekliyor" }
    ];

    // State management
    const saved = localStorage.getItem('izban_complaints_data');
    let complaints = saved ? JSON.parse(saved) : defaultComplaints;

    // Try to parse existing complaints tables if present
    const existingTable = document.querySelector('.table, .grid-view, table');
    if (existingTable && !existingTable.classList.contains('izban-modern-table')) {
        const rows = Array.from(existingTable.querySelectorAll('tbody tr, tr:not(:first-child)'));
        if (rows.length > 0) {
            const parsed = rows.map((row, index) => {
                const cells = Array.from(row.querySelectorAll('td'));
                if (cells.length < 3) return null;
                const id = cells[0]?.textContent.trim() || `SK-9${100 + index}B`;
                const date = cells[1]?.textContent.trim() || new Date().toLocaleString('tr-TR');
                const passenger = cells[2]?.textContent.trim() || "Bilinmeyen Yolcu";
                const subject = cells[3]?.textContent.trim() || "Şikayet İçeriği Belirtilmemiş";
                const station = cells[4]?.textContent.trim() || "Tüm İstasyonlar";
                const rawStatus = cells[5]?.textContent.trim().toLowerCase() || "";
                const status = (rawStatus.includes("cevap") || rawStatus.includes("tamam") || rawStatus.includes("ok")) ? "Cevaplandı" : "Cevap Bekliyor";
                return { id, date, passenger, subject, station, status };
            }).filter(Boolean);
            if (parsed.length > 0) {
                complaints = parsed;
            }
        }
    }

    // Save complaints to localStorage
    const saveComplaints = () => {
        localStorage.setItem('izban_complaints_data', JSON.stringify(complaints));
    };
    saveComplaints(); // Save immediately in case parsed data was resolved

    // Create the container
    const container = document.createElement('div');
    container.id = 'izban-modern-complaints-container';
    container.className = 'row';

    // Clear legacy elements (for a clean visual modernize layout)
    const legacyPanels = rightCol.querySelectorAll('.row, .x_panel, .page-title');
    legacyPanels.forEach(p => {
        if (p.parentElement === rightCol) p.remove();
    });

    const renderTableHTML = () => {
        let rowsHtml = '';
        complaints.forEach(item => {
            const statusClass = item.status === 'Cevaplandı' ? 'answered' : 'pending';
            const statusIcon = item.status === 'Cevaplandı' ? '🟢 Cevaplandı' : '🔴 Cevap Bekliyor';
            const btnHtml = item.status === 'Cevaplandı'
                ? `<button class="btn btn-sm btn-default izban-btn-view-reply" data-id="${item.id}" style="margin: 0 !important; font-weight: 700; border-radius: 6px;">Yanıtı Gör</button>`
                : `<button class="btn btn-sm btn-primary izban-btn-reply" data-id="${item.id}" style="margin: 0 !important; font-weight: 700; border-radius: 6px;">Yanıtla</button>`;

            rowsHtml += `
                <tr id="complaint-row-${item.id}">
                    <td style="font-weight:700;">${item.id}</td>
                    <td style="white-space:nowrap;">${item.date}</td>
                    <td>
                        <div>
                            <div style="font-weight:700; font-size:13px; color:inherit;">${item.passenger}</div>
                            <div style="font-size:11.5px; opacity:0.8; margin-top:2px;">${item.subject}</div>
                        </div>
                    </td>
                    <td>${item.station}</td>
                    <td>
                        <span class="izban-status-badge ${statusClass}">${statusIcon}</span>
                    </td>
                    <td>
                        ${btnHtml}
                    </td>
                </tr>
                <tr id="reply-row-${item.id}" class="izban-reply-accordion-row" style="display:none;">
                    <td colspan="6">
                        <div class="izban-reply-box-inner">
                            <label style="font-weight: 700; font-size: 12px; display: block; margin-bottom: 8px;">Cevap Taslağı Yazın</label>
                            <textarea class="form-control izban-reply-textarea-${item.id}" rows="3" placeholder="Yolcuya iletilecek resmi cevabınızı giriniz..." style="width: 100%; margin-bottom: 12px; resize: vertical;"></textarea>
                            <div style="display: flex; gap: 8px;">
                                <button type="button" class="btn btn-sm btn-success izban-btn-submit-reply" data-id="${item.id}" style="border-radius: 6px; font-weight: 700;">Yanıtı Gönder</button>
                                <button type="button" class="btn btn-sm btn-default izban-btn-close-reply" data-id="${item.id}" style="border-radius: 6px; font-weight: 700;">Kapat</button>
                            </div>
                        </div>
                    </td>
                </tr>
                <tr id="view-reply-row-${item.id}" class="izban-reply-accordion-row" style="display:none;">
                    <td colspan="6">
                        <div class="izban-reply-box-inner">
                            <label style="font-weight: 700; font-size: 12px; display: block; margin-bottom: 6px;">İletilen Resmi Yanıtınız</label>
                            <div style="font-size: 12px; padding: 10px; background: rgba(0,0,0,0.02); border-radius: 6px; margin-bottom: 12px; line-height: 1.5;">
                                ${item.reply || 'Cevap bulunamadı.'}
                            </div>
                            <button type="button" class="btn btn-sm btn-default izban-btn-close-view" data-id="${item.id}" style="border-radius: 6px; font-weight: 700;">Kapat</button>
                        </div>
                    </td>
                </tr>
            `;
        });

        return `
            <div class="col-md-12 col-sm-12 col-xs-12">
                <div class="x_panel izban-sikayet-panel">
                    <div class="x_title" style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(0,0,0,0.08); padding-bottom: 10px;">
                        <h2 style="margin: 0; font-size: 16px; font-weight: 700;"><i class="fa fa-comments-o"></i> Gelen Şikayet Yönetimi</h2>
                        <div class="clearfix"></div>
                    </div>
                    <div class="x_content">
                        <div class="table-responsive" style="border: none; overflow: visible;">
                            <table class="table izban-modern-table">
                                <thead>
                                    <tr>
                                        <th>Şikayet ID</th>
                                        <th>Tarih</th>
                                        <th>Yolcu / Konu</th>
                                        <th>İstasyon / Hat</th>
                                        <th>Durum</th>
                                        <th>İşlem</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${rowsHtml}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        `;
    };

    container.innerHTML = renderTableHTML();
    rightCol.appendChild(container);

    // Event listeners
    container.addEventListener('click', (e) => {
        const replyBtn = e.target.closest('.izban-btn-reply');
        if (replyBtn) {
            const id = replyBtn.dataset.id;
            const replyRow = document.getElementById(`reply-row-${id}`);
            if (replyRow) {
                const isHidden = replyRow.style.display === 'none';
                // Close all reply/view rows
                container.querySelectorAll('.izban-reply-accordion-row').forEach(row => row.style.display = 'none');

                if (isHidden) {
                    replyRow.style.display = 'table-row';
                }
            }
            return;
        }

        const viewBtn = e.target.closest('.izban-btn-view-reply');
        if (viewBtn) {
            const id = viewBtn.dataset.id;
            const viewRow = document.getElementById(`view-reply-row-${id}`);
            if (viewRow) {
                const isHidden = viewRow.style.display === 'none';
                // Close all reply/view rows
                container.querySelectorAll('.izban-reply-accordion-row').forEach(row => row.style.display = 'none');

                if (isHidden) {
                    viewRow.style.display = 'table-row';
                }
            }
            return;
        }

        const closeBtn = e.target.closest('.izban-btn-close-reply, .izban-btn-close-view');
        if (closeBtn) {
            const id = closeBtn.dataset.id;
            const replyRow = document.getElementById(`reply-row-${id}`);
            const viewRow = document.getElementById(`view-reply-row-${id}`);
            if (replyRow) replyRow.style.display = 'none';
            if (viewRow) viewRow.style.display = 'none';
            return;
        }

        const submitBtn = e.target.closest('.izban-btn-submit-reply');
        if (submitBtn) {
            const id = submitBtn.dataset.id;
            const textarea = container.querySelector(`.izban-reply-textarea-${id}`);
            const replyVal = textarea ? textarea.value.trim() : "";

            if (!replyVal) {
                alert("Lütfen geçerli bir cevap metni yazın.");
                return;
            }

            // Update item status in data
            const item = complaints.find(c => c.id === id);
            if (item) {
                item.status = "Cevaplandı";
                item.reply = replyVal;
                saveComplaints();

                // Re-render table layout
                container.innerHTML = renderTableHTML();
            }
        }
    });
}

// Override history methods to dispatch navigation events for AJAX transfers
(function () {
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function () {
        const result = originalPushState.apply(this, arguments);
        startYolcuPollingLoop();
        return result;
    };

    history.replaceState = function () {
        const result = originalReplaceState.apply(this, arguments);
        startYolcuPollingLoop();
        return result;
    };

    window.addEventListener('popstate', () => {
        startYolcuPollingLoop();
    });
})();

function startYolcuPollingLoop() {
    if (window.yolcuIntervalId) {
        clearInterval(window.yolcuIntervalId);
    }
    window.yolcuIntervalId = setInterval(initYolcuSayilariFilter, 500);
}

function initYolcuSayilariFilter() {
    try {
        if (document.getElementById('yolcu-filter-toolbar')) {
            if (window.yolcuIntervalId) {
                clearInterval(window.yolcuIntervalId);
                window.yolcuIntervalId = null;
            }
            return;
        }

        // Find the <h2> with the matching text
        let targetHeader = null;
        const headers = document.querySelectorAll('h2');
        for (const h2 of headers) {
            const h2Text = turkishToLower(h2.textContent || "");
            if (h2Text.includes("yolcu sayısı tablosu") || (h2Text.includes("yıllık") && h2Text.includes("aylık") && h2Text.includes("yolcu"))) {
                targetHeader = h2;
                break;
            }
        }

        if (!targetHeader) return;

        // Find parent .x_panel container
        const xPanel = targetHeader.closest('.x_panel');
        if (!xPanel) return;

        const xContent = xPanel.querySelector('.x_content');
        if (!xContent) return;

        const table = xContent.querySelector('table');
        if (!table) return;

        // Double check toolbar already exists
        if (document.getElementById('yolcu-filter-toolbar')) return;

        const rows = table.querySelectorAll('tbody tr');
        const years = new Set();
        rows.forEach(tr => {
            const cells = tr.querySelectorAll('td, th');
            if (cells.length > 0) {
                const yearText = cells[0].textContent.trim();
                // Match 4-digit number: 2010, 2011 etc.
                if (/^\d{4}$/.test(yearText)) {
                    years.add(yearText);
                }
            }
        });

        const sortedYears = Array.from(years).sort((a, b) => b - a);

        // Create the Multi-Filter Toolbar
        const toolbar = document.createElement('div');
        toolbar.id = 'yolcu-filter-toolbar';

        let yearOptions = "";
        sortedYears.forEach(year => {
            yearOptions += `<option value="${year}">${year}</option>`;
        });

        toolbar.innerHTML = `
            <select id="yolcu-year-select" multiple size="4" style="padding: 6px 12px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.2); background: #1e293b; color: #fff; height: auto; min-width: 140px;">
                ${yearOptions}
            </select>
            <select id="yolcu-month-select" multiple size="4" style="padding: 6px 12px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.2); background: #1e293b; color: #fff; height: auto; min-width: 140px;">
                <option value="ocak">Ocak</option>
                <option value="şubat">Şubat</option>
                <option value="mart">Mart</option>
                <option value="nisan">Nisan</option>
                <option value="mayıs">Mayıs</option>
                <option value="haziran">Haziran</option>
                <option value="temmuz">Temmuz</option>
                <option value="ağustos">Ağustos</option>
                <option value="eylül">Eylül</option>
                <option value="ekim">Ekim</option>
                <option value="kasım">Kasım</option>
                <option value="aralık">Aralık</option>
            </select>
            <button id="yolcu-clear-filter" style="padding: 6px 12px; border-radius: 6px; background: #ef4444; color: #fff; border: none; cursor: pointer; height: 38px;">Temizle</button>
        `;

        // Prepend toolbar to x_content
        xContent.prepend(toolbar);

        const yearSelect = toolbar.querySelector('#yolcu-year-select');
        const monthSelect = toolbar.querySelector('#yolcu-month-select');
        const clearBtn = toolbar.querySelector('#yolcu-clear-filter');

        const applyFilters = () => {
            const selectedYears = Array.from(yearSelect.selectedOptions).map(o => o.value).filter(val => val !== "");
            const selectedMonths = Array.from(monthSelect.selectedOptions).map(o => o.value).filter(val => val !== "");

            // 1. Filter rows (Logical AND)
            rows.forEach(tr => {
                const cells = tr.querySelectorAll('td, th');
                if (cells.length === 0) return;

                const yearText = cells[0].textContent.trim();
                const isYearMatched = (selectedYears.length === 0) || selectedYears.includes(yearText);

                if (isYearMatched) {
                    tr.style.display = '';
                } else {
                    tr.style.display = 'none';
                }
            });

            // 2. Hide/Show month columns dynamically
            const allRows = table.querySelectorAll('tr');
            if (allRows.length > 0) {
                const headerCells = allRows[0].querySelectorAll('th, td');
                const monthColIndices = {};
                const turkishMonths = ["ocak", "şubat", "mart", "nisan", "mayıs", "haziran", "temmuz", "ağustos", "eylül", "ekim", "kasım", "aralık"];

                // Map header index to month names
                headerCells.forEach((cell, idx) => {
                    const text = turkishToLower(cell.textContent || "").trim();
                    turkishMonths.forEach(m => {
                        if (text === m || (text.startsWith(m) && text.length <= m.length + 3)) {
                            monthColIndices[m] = idx;
                        }
                    });
                });

                // Apply visibility on all tr's cells
                allRows.forEach(tr => {
                    const cells = tr.querySelectorAll('td, th');
                    cells.forEach((cell, idx) => {
                        cell.style.display = '';

                        if (selectedMonths.length > 0) {
                            let isMonthColumn = false;
                            let isTargetMonth = false;

                            for (const [mName, mIdx] of Object.entries(monthColIndices)) {
                                if (mIdx === idx) {
                                    isMonthColumn = true;
                                    if (selectedMonths.includes(mName)) {
                                        isTargetMonth = true;
                                    }
                                    break;
                                }
                            }

                            if (isMonthColumn && !isTargetMonth) {
                                cell.style.display = 'none';
                            }
                        }
                    });
                });
            }
        };

        yearSelect.addEventListener('change', applyFilters);
        monthSelect.addEventListener('change', applyFilters);

        clearBtn.addEventListener('click', () => {
            Array.from(yearSelect.options).forEach(opt => opt.selected = false);
            Array.from(monthSelect.options).forEach(opt => opt.selected = false);
            applyFilters();
        });

        // Clear interval upon successful injection
        if (window.yolcuIntervalId) {
            clearInterval(window.yolcuIntervalId);
            window.yolcuIntervalId = null;
        }

    } catch (err) {
        console.error('Error in initYolcuSayilariFilter:', err);
    }
}

// Override history methods to dispatch navigation events for AJAX transfers
(function () {
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    history.pushState = function () {
        const result = originalPushState.apply(this, arguments);
        startYolcuPollingLoop();
        startAcikIsEmriPollingLoop();
        startKapaliIsEmriPollingLoop();
        return result;
    };

    history.replaceState = function () {
        const result = originalReplaceState.apply(this, arguments);
        startYolcuPollingLoop();
        startAcikIsEmriPollingLoop();
        startKapaliIsEmriPollingLoop();
        return result;
    };

    window.addEventListener('popstate', () => {
        startYolcuPollingLoop();
        startAcikIsEmriPollingLoop();
        startKapaliIsEmriPollingLoop();
    });
})();

function startYolcuPollingLoop() {
    if (window.yolcuIntervalId) {
        clearInterval(window.yolcuIntervalId);
    }
    window.yolcuIntervalId = setInterval(initYolcuSayilariFilter, 500);
}

function startAcikIsEmriPollingLoop() {
    if (window.acikIsEmriIntervalId) {
        clearInterval(window.acikIsEmriIntervalId);
    }
    window.acikIsEmriIntervalId = setInterval(initAcikIsEmriFilter, 400);
}

function parseTurkishDateTime(str) {
    if (!str) return 0;
    const parts = str.trim().split(/\s+/);
    if (!parts[0]) return 0;
    const dateParts = parts[0].split('.');
    if (dateParts.length < 3) return 0;
    const day = parseInt(dateParts[0], 10);
    const month = parseInt(dateParts[1], 10) - 1;
    const year = parseInt(dateParts[2], 10);
    let hours = 0, minutes = 0, seconds = 0;
    if (parts[1]) {
        const timeParts = parts[1].split(':');
        if (timeParts.length >= 2) {
            hours = parseInt(timeParts[0], 10);
            minutes = parseInt(timeParts[1], 10);
            if (timeParts[2]) {
                seconds = parseInt(timeParts[2], 10);
            }
        }
    }
    return new Date(year, month, day, hours, minutes, seconds).getTime();
}

function populateSelectOptions(table) {
    if (!table) return;
    const rows = table.querySelectorAll('tbody tr');
    if (rows.length === 0) return;

    const istasyonSelects = [document.getElementById('filter-istasyon'), document.getElementById('kapali-filter-istasyon')].filter(Boolean);
    const kategoriSelects = [document.getElementById('filter-kategori'), document.getElementById('kapali-filter-kategori')].filter(Boolean);

    if (istasyonSelects.length === 0 && kategoriSelects.length === 0) return;

    const stations = new Set();
    const categories = new Set();

    rows.forEach(tr => {
        const cells = tr.querySelectorAll('td, th');
        if (cells.length === 0) return;

        // İstasyon: 3. column (td:nth-child(3) -> cell index 2)
        const cellIst = cells[2];
        if (cellIst) {
            const s = cellIst.textContent.replace(/\s+/g, ' ').trim();
            if (s) stations.add(s);
        }

        // Kategori: 4. column (td:nth-child(4) -> cell index 3)
        const cellKat = cells[3];
        if (cellKat) {
            const c = cellKat.textContent.replace(/\s+/g, ' ').trim();
            if (c) categories.add(c);
        }
    });

    const sortedStations = Array.from(stations).sort((a, b) => a.localeCompare(b, 'tr'));
    const sortedCategories = Array.from(categories).sort((a, b) => a.localeCompare(b, 'tr'));

    istasyonSelects.forEach(select => {
        const existingValues = new Set(Array.from(select.options).map(opt => opt.value));
        sortedStations.forEach(s => {
            if (!existingValues.has(s)) {
                const opt = document.createElement('option');
                opt.value = s;
                opt.textContent = s;
                select.appendChild(opt);
            }
        });
    });

    kategoriSelects.forEach(select => {
        const existingValues = new Set(Array.from(select.options).map(opt => opt.value));
        sortedCategories.forEach(c => {
            if (!existingValues.has(c)) {
                const opt = document.createElement('option');
                opt.value = c;
                opt.textContent = c;
                select.appendChild(opt);
            }
        });
    });
}

function initAcikIsEmriFilter() {
    try {
        const existingToolbar = document.getElementById('is-emri-filter-toolbar');
        if (existingToolbar) {
            const urlLower = window.location.href.toLowerCase();
            let queryParams;
            try {
                queryParams = new URLSearchParams(window.location.search);
            } catch (e) {
                queryParams = new URLSearchParams();
            }

            let hasTargetHeading = false;
            let targetHeadingElement = null;
            const headers = document.querySelectorAll('h2, h3, .panel-title, .x_title h2');
            for (const h of headers) {
                const text = turkishToLower(h.textContent || "");
                if (text.includes("açık iş emri") || text.includes("acik is emri")) {
                    hasTargetHeading = true;
                    targetHeadingElement = h;
                    break;
                }
            }

            const isTargetPage = queryParams.get('page') === '11' || urlLower.includes('page=11') || hasTargetHeading;
            if (isTargetPage) {
                let xPanel = targetHeadingElement ? targetHeadingElement.closest('.x_panel') : document.querySelector('.x_panel');
                if (xPanel) {
                    const xContent = xPanel.querySelector('.x_content');
                    if (xContent) {
                        const table = xContent.querySelector('table');
                        const istasyonSelect = existingToolbar.querySelector('#filter-istasyon');
                        if (table && istasyonSelect) {
                            const trs = table.querySelectorAll('tbody tr');
                            if (istasyonSelect.options.length === 1 && trs.length > 0) {
                                populateSelectOptions(table);
                            }
                            if (istasyonSelect.options.length > 1) {
                                if (window.acikIsEmriIntervalId) {
                                    clearInterval(window.acikIsEmriIntervalId);
                                    window.acikIsEmriIntervalId = null;
                                }
                            }
                        }
                    }
                }
            }
            return;
        }

        // Target check: page=11 or heading text containing "Açık İş Emri Listesi"
        const urlLower = window.location.href.toLowerCase();
        let queryParams;
        try {
            queryParams = new URLSearchParams(window.location.search);
        } catch (e) {
            queryParams = new URLSearchParams();
        }

        let hasTargetHeading = false;
        let targetHeadingElement = null;
        const headers = document.querySelectorAll('h2, h3, .panel-title, .x_title h2');
        for (const h of headers) {
            const text = turkishToLower(h.textContent || "");
            if (text.includes("açık iş emri") || text.includes("acik is emri")) {
                hasTargetHeading = true;
                targetHeadingElement = h;
                break;
            }
        }

        const isTargetPage = queryParams.get('page') === '11' || urlLower.includes('page=11') || hasTargetHeading;
        if (!isTargetPage) return;

        // Find the table and container .x_panel
        let table = null;
        let xPanel = null;
        if (targetHeadingElement) {
            xPanel = targetHeadingElement.closest('.x_panel');
        }
        if (!xPanel) {
            xPanel = document.querySelector('.x_panel');
        }
        if (!xPanel) return;

        const xContent = xPanel.querySelector('.x_content');
        if (!xContent) return;

        table = xContent.querySelector('table');
        if (!table) return;

        // Double check toolbar doesn't exist
        if (document.getElementById('is-emri-filter-toolbar')) return;

        // 1. Map columns dynamically
        const allRows = Array.from(table.querySelectorAll('tbody tr'));

        let idColIdx = 0;
        let dateColIdx = 1;
        let istasyonColIdx = 2;
        let kategoriColIdx = 3;

        const headerCells = table.querySelectorAll('thead th, thead td, tbody tr:first-child th, tbody tr:first-child td');
        headerCells.forEach((cell, idx) => {
            const text = turkishToLower(cell.textContent || "").trim();
            if (text.includes("tarih") || text.includes("açılma") || text.includes("acilis") || text.includes("acma")) {
                dateColIdx = idx;
            } else if (text.includes("istasyon") || text.includes("yer")) {
                istasyonColIdx = idx;
            } else if (text.includes("kategori") || text.includes("konu") || text.includes("grup")) {
                kategoriColIdx = idx;
            } else if (text.includes("id") || text.includes("form") || text.includes("no")) {
                idColIdx = idx;
            }
        });

        // 2. Auto Sort by Opening Date (Descending)
        const tbody = table.querySelector('tbody');
        if (tbody) {
            const rowsToSort = allRows.filter(r => r.querySelectorAll('td, th').length > 0);
            rowsToSort.sort((rowA, rowB) => {
                const cellsA = rowA.querySelectorAll('td, th');
                const cellsB = rowB.querySelectorAll('td, th');

                const valA = cellsA[dateColIdx] ? cellsA[dateColIdx].textContent.trim() : '';
                const valB = cellsB[dateColIdx] ? cellsB[dateColIdx].textContent.trim() : '';

                const timeA = parseTurkishDateTime(valA);
                const timeB = parseTurkishDateTime(valB);

                return timeB - timeA; // Descending (newest first)
            });

            // Re-append sorted rows
            rowsToSort.forEach(r => tbody.appendChild(r));
        }

        // 4. Create the filter toolbar
        const toolbar = document.createElement('div');
        toolbar.id = 'is-emri-filter-toolbar';

        let istasyonOptions = `<option value="">Tüm İstasyonlar</option>`;
        let kategoriOptions = `<option value="">Tüm Kategoriler</option>`;

        toolbar.innerHTML = `
            <div class="filter-item">
                <span class="filter-label">BAŞLANGIÇ TARİHİ</span>
                <input type="date" id="filter-date-start">
            </div>
            <div class="filter-item">
                <span class="filter-label">BİTİŞ TARİHİ</span>
                <input type="date" id="filter-date-end">
            </div>
            <div class="filter-item">
                <span class="filter-label">İSTASYON SEÇ</span>
                <select id="filter-istasyon">
                    ${istasyonOptions}
                </select>
            </div>
            <div class="filter-item">
                <span class="filter-label">KATEGORİ SEÇ</span>
                <select id="filter-kategori">
                    ${kategoriOptions}
                </select>
            </div>
            <div class="filter-item filter-search-grow">
                <span class="filter-label">ID / FORM NO ARA</span>
                <input type="text" id="filter-id-form" placeholder="ID / Form No Ara...">
            </div>
            <button id="filter-clear-all">Temizle</button>
        `;

        xContent.prepend(toolbar);
        populateSelectOptions(table);

        // 5. Connect inputs to applyFilters
        const dateStartInput = toolbar.querySelector('#filter-date-start');
        const dateEndInput = toolbar.querySelector('#filter-date-end');
        const istasyonSelect = toolbar.querySelector('#filter-istasyon');
        const kategoriSelect = toolbar.querySelector('#filter-kategori');
        const idFormInput = toolbar.querySelector('#filter-id-form');
        const clearAllBtn = toolbar.querySelector('#filter-clear-all');

        const applyFilters = () => {
            const startVal = dateStartInput.value;
            const endVal = dateEndInput.value;
            const istasyonVal = istasyonSelect.value.trim();
            const kategoriVal = kategoriSelect.value.trim();
            const idFormVal = turkishToLower(idFormInput.value.trim());

            const currentDataRows = table.querySelectorAll('tbody tr');
            currentDataRows.forEach(tr => {
                const cells = tr.querySelectorAll('td, th');
                if (cells.length === 0) return;

                let isMatched = true;

                // Date range evaluation
                if (cells[dateColIdx]) {
                    const dateText = cells[dateColIdx].textContent.trim();
                    const rowTime = parseTurkishDateTime(dateText);

                    if (startVal && !endVal) {
                        // Durum A: Sadece Başlangıç Tarihi Girilirse (Tarih kısmı tam eşitlik)
                        if (rowTime > 0) {
                            const startDateObj = new Date(startVal + 'T00:00:00');
                            const rowDateObj = new Date(rowTime);

                            const startYear = startDateObj.getFullYear();
                            const startMonth = startDateObj.getMonth();
                            const startDay = startDateObj.getDate();

                            const rowYear = rowDateObj.getFullYear();
                            const rowMonth = rowDateObj.getMonth();
                            const rowDay = rowDateObj.getDate();

                            if (startYear !== rowYear || startMonth !== rowMonth || startDay !== rowDay) {
                                isMatched = false;
                            }
                        } else {
                            isMatched = false;
                        }
                    } else if (startVal && endVal) {
                        // Durum B: Hem Başlangıç Hem Bitiş Tarihi Girilirse
                        if (rowTime > 0) {
                            const startTime = new Date(startVal + 'T00:00:00').getTime();
                            const endTime = new Date(endVal + 'T23:59:59').getTime();
                            if (rowTime < startTime || rowTime > endTime) {
                                isMatched = false;
                            }
                        } else {
                            isMatched = false;
                        }
                    } else if (!startVal && endVal) {
                        // Sadece Bitiş tarihi varsa: bitiş tarihine kadar olanlar
                        if (rowTime > 0) {
                            const endTime = new Date(endVal + 'T23:59:59').getTime();
                            if (rowTime > endTime) {
                                isMatched = false;
                            }
                        } else {
                            isMatched = false;
                        }
                    }
                    // Durum C: İki Tarih de Boşsa: Tarih filtresini pas geç
                }

                // Station match
                if (istasyonVal && cells[istasyonColIdx]) {
                    const stationText = cells[istasyonColIdx].textContent.trim();
                    if (stationText !== istasyonVal) isMatched = false;
                }

                // Category match
                if (kategoriVal && cells[kategoriColIdx]) {
                    const categoryText = cells[kategoriColIdx].textContent.trim();
                    if (categoryText !== kategoriVal) isMatched = false;
                }

                // ID / Form No search
                if (idFormVal) {
                    let matchText = '';
                    if (cells[idColIdx]) matchText += ' ' + cells[idColIdx].textContent.trim();
                    matchText = turkishToLower(matchText);
                    if (!matchText.includes(idFormVal)) isMatched = false;
                }

                tr.style.display = isMatched ? '' : 'none';
            });
        };

        dateStartInput.addEventListener('change', applyFilters);
        dateEndInput.addEventListener('change', applyFilters);
        istasyonSelect.addEventListener('change', applyFilters);
        kategoriSelect.addEventListener('change', applyFilters);
        idFormInput.addEventListener('input', applyFilters);

        clearAllBtn.addEventListener('click', () => {
            dateStartInput.value = '';
            dateEndInput.value = '';
            istasyonSelect.value = '';
            kategoriSelect.value = '';
            idFormInput.value = '';
            applyFilters();
        });

        const optCount = istasyonSelect.options.length;
        if (optCount > 1) {
            if (window.acikIsEmriIntervalId) {
                clearInterval(window.acikIsEmriIntervalId);
                window.acikIsEmriIntervalId = null;
            }
        }
    } catch (err) {
        console.error("Error in initAcikIsEmriFilter:", err);
    }
}

function startKapaliIsEmriPollingLoop() {
    if (window.kapaliIsEmriIntervalId) {
        clearInterval(window.kapaliIsEmriIntervalId);
    }
    window.kapaliIsEmriIntervalId = setInterval(initKapaliIsEmriFilter, 400);
}

function initKapaliIsEmriFilter() {
    try {
        const existingToolbar = document.getElementById('kapali-is-emri-filter-toolbar');
        if (existingToolbar) {
            // Target check: page=12 or heading text containing "Kapalı İş Emri Listesi"
            const urlLower = window.location.href.toLowerCase();
            let queryParams;
            try {
                queryParams = new URLSearchParams(window.location.search);
            } catch (e) {
                queryParams = new URLSearchParams();
            }

            let hasTargetHeading = false;
            let targetHeadingElement = null;
            const headers = document.querySelectorAll('h2, h3, .panel-title, .x_title h2');
            for (const h of headers) {
                const text = turkishToLower(h.textContent || "");
                if (text.includes("kapalı iş emri") || text.includes("kapali is emri")) {
                    hasTargetHeading = true;
                    targetHeadingElement = h;
                    break;
                }
            }

            const isTargetPage = queryParams.get('page') === '12' || urlLower.includes('page=12') || hasTargetHeading;
            if (isTargetPage) {
                let xPanel = targetHeadingElement ? targetHeadingElement.closest('.x_panel') : document.querySelector('.x_panel');
                if (xPanel) {
                    const xContent = xPanel.querySelector('.x_content');
                    if (xContent) {
                        const table = xContent.querySelector('table');
                        const istasyonSelect = existingToolbar.querySelector('#kapali-filter-istasyon');
                        if (table && istasyonSelect) {
                            const trs = table.querySelectorAll('tbody tr');
                            if (istasyonSelect.options.length === 1 && trs.length > 0) {
                                populateSelectOptions(table);
                            }
                            if (istasyonSelect.options.length > 1) {
                                if (window.kapaliIsEmriIntervalId) {
                                    clearInterval(window.kapaliIsEmriIntervalId);
                                    window.kapaliIsEmriIntervalId = null;
                                }
                            }
                        }
                    }
                }
            }
            return;
        }

        // Target check: page=12 or heading text containing "Kapalı İş Emri Listesi"
        const urlLower = window.location.href.toLowerCase();
        let queryParams;
        try {
            queryParams = new URLSearchParams(window.location.search);
        } catch (e) {
            queryParams = new URLSearchParams();
        }

        let hasTargetHeading = false;
        let targetHeadingElement = null;
        const headers = document.querySelectorAll('h2, h3, .panel-title, .x_title h2');
        for (const h of headers) {
            const text = turkishToLower(h.textContent || "");
            if (text.includes("kapalı iş emri") || text.includes("kapali is emri")) {
                hasTargetHeading = true;
                targetHeadingElement = h;
                break;
            }
        }

        const isTargetPage = queryParams.get('page') === '12' || urlLower.includes('page=12') || hasTargetHeading;
        if (!isTargetPage) return;

        // Find the table and container .x_panel
        let table = null;
        let xPanel = null;
        if (targetHeadingElement) {
            xPanel = targetHeadingElement.closest('.x_panel');
        }
        if (!xPanel) {
            xPanel = document.querySelector('.x_panel');
        }
        if (!xPanel) return;

        const xContent = xPanel.querySelector('.x_content');
        if (!xContent) return;

        table = xContent.querySelector('table');
        if (!table) return;

        // Double check toolbar doesn't exist
        if (document.getElementById('kapali-is-emri-filter-toolbar')) return;

        // 1. Map columns dynamically
        const allRows = Array.from(table.querySelectorAll('tbody tr'));

        let idColIdx = 0;
        let dateColIdx = 1;
        let istasyonColIdx = 2;
        let kategoriColIdx = 3;

        const headerCells = table.querySelectorAll('thead th, thead td, tbody tr:first-child th, tbody tr:first-child td');
        headerCells.forEach((cell, idx) => {
            const text = turkishToLower(cell.textContent || "").trim();
            if (text.includes("tarih") || text.includes("açılma") || text.includes("acilis") || text.includes("acma")) {
                dateColIdx = idx;
            } else if (text.includes("istasyon") || text.includes("yer")) {
                istasyonColIdx = idx;
            } else if (text.includes("kategori") || text.includes("konu") || text.includes("grup")) {
                kategoriColIdx = idx;
            } else if (text.includes("id") || text.includes("form") || text.includes("no")) {
                idColIdx = idx;
            }
        });

        // 2. Auto Sort by Opening Date (Descending)
        const tbody = table.querySelector('tbody');
        if (tbody) {
            const rowsToSort = allRows.filter(r => r.querySelectorAll('td, th').length > 0);
            rowsToSort.sort((rowA, rowB) => {
                const cellsA = rowA.querySelectorAll('td, th');
                const cellsB = rowB.querySelectorAll('td, th');

                const valA = cellsA[dateColIdx] ? cellsA[dateColIdx].textContent.trim() : '';
                const valB = cellsB[dateColIdx] ? cellsB[dateColIdx].textContent.trim() : '';

                const timeA = parseTurkishDateTime(valA);
                const timeB = parseTurkishDateTime(valB);

                return timeB - timeA; // Descending (newest first)
            });

            // Re-append sorted rows
            rowsToSort.forEach(r => tbody.appendChild(r));
        }

        // 4. Create the filter toolbar
        const toolbar = document.createElement('div');
        toolbar.id = 'kapali-is-emri-filter-toolbar';

        let istasyonOptions = `<option value="">Tüm İstasyonlar</option>`;
        let kategoriOptions = `<option value="">Tüm Kategoriler</option>`;

        toolbar.innerHTML = `
            <div class="filter-item">
                <span class="filter-label">BAŞLANGIÇ TARİHİ</span>
                <input type="date" id="kapali-filter-date-start">
            </div>
            <div class="filter-item">
                <span class="filter-label">BİTİŞ TARİHİ</span>
                <input type="date" id="kapali-filter-date-end">
            </div>
            <div class="filter-item">
                <span class="filter-label">İSTASYON SEÇ</span>
                <select id="kapali-filter-istasyon">
                    ${istasyonOptions}
                </select>
            </div>
            <div class="filter-item">
                <span class="filter-label">KATEGORİ SEÇ</span>
                <select id="kapali-filter-kategori">
                    ${kategoriOptions}
                </select>
            </div>
            <div class="filter-item filter-search-grow">
                <span class="filter-label">ID / FORM NO ARA</span>
                <input type="text" id="kapali-filter-id-form" placeholder="ID / Form No Ara...">
            </div>
            <button id="kapali-filter-clear-all">Temizle</button>
        `;

        xContent.prepend(toolbar);
        populateSelectOptions(table);

        // 5. Connect inputs to applyFilters
        const dateStartInput = toolbar.querySelector('#kapali-filter-date-start');
        const dateEndInput = toolbar.querySelector('#kapali-filter-date-end');
        const istasyonSelect = toolbar.querySelector('#kapali-filter-istasyon');
        const kategoriSelect = toolbar.querySelector('#kapali-filter-kategori');
        const idFormInput = toolbar.querySelector('#kapali-filter-id-form');
        const clearAllBtn = toolbar.querySelector('#kapali-filter-clear-all');

        const applyFilters = () => {
            const startVal = dateStartInput.value;
            const endVal = dateEndInput.value;
            const istasyonVal = istasyonSelect.value.trim();
            const kategoriVal = kategoriSelect.value.trim();
            const idFormVal = turkishToLower(idFormInput.value.trim());

            const currentDataRows = table.querySelectorAll('tbody tr');
            currentDataRows.forEach(tr => {
                const cells = tr.querySelectorAll('td, th');
                if (cells.length === 0) return;

                let isMatched = true;

                // Date range evaluation
                if (cells[dateColIdx]) {
                    const dateText = cells[dateColIdx].textContent.trim();
                    const rowTime = parseTurkishDateTime(dateText);

                    if (startVal && !endVal) {
                        // Durum A: Sadece Başlangıç Tarihi Girilirse (Tarih kısmı tam eşitlik)
                        if (rowTime > 0) {
                            const startDateObj = new Date(startVal + 'T00:00:00');
                            const rowDateObj = new Date(rowTime);

                            const startYear = startDateObj.getFullYear();
                            const startMonth = startDateObj.getMonth();
                            const startDay = startDateObj.getDate();

                            const rowYear = rowDateObj.getFullYear();
                            const rowMonth = rowDateObj.getMonth();
                            const rowDay = rowDateObj.getDate();

                            if (startYear !== rowYear || startMonth !== rowMonth || startDay !== rowDay) {
                                isMatched = false;
                            }
                        } else {
                            isMatched = false;
                        }
                    } else if (startVal && endVal) {
                        // Durum B: Hem Başlangıç Hem Bitiş Tarihi Girilirse
                        if (rowTime > 0) {
                            const startTime = new Date(startVal + 'T00:00:00').getTime();
                            const endTime = new Date(endVal + 'T23:59:59').getTime();
                            if (rowTime < startTime || rowTime > endTime) {
                                isMatched = false;
                            }
                        } else {
                            isMatched = false;
                        }
                    } else if (!startVal && endVal) {
                        // Sadece Bitiş tarihi varsa: bitiş tarihine kadar olanlar
                        if (rowTime > 0) {
                            const endTime = new Date(endVal + 'T23:59:59').getTime();
                            if (rowTime > endTime) {
                                isMatched = false;
                            }
                        } else {
                            isMatched = false;
                        }
                    }
                    // Durum C: İki Tarih de Boşsa: Tarih filtresini pas geç
                }

                // Station match
                if (istasyonVal && cells[istasyonColIdx]) {
                    const stationText = cells[istasyonColIdx].textContent.trim();
                    if (stationText !== istasyonVal) isMatched = false;
                }

                // Category match
                if (kategoriVal && cells[kategoriColIdx]) {
                    const categoryText = cells[kategoriColIdx].textContent.trim();
                    if (categoryText !== kategoriVal) isMatched = false;
                }

                // ID / Form No search
                if (idFormVal) {
                    let matchText = '';
                    if (cells[idColIdx]) matchText += ' ' + cells[idColIdx].textContent.trim();
                    matchText = turkishToLower(matchText);
                    if (!matchText.includes(idFormVal)) isMatched = false;
                }

                tr.style.display = isMatched ? '' : 'none';
            });
        };

        dateStartInput.addEventListener('change', applyFilters);
        dateEndInput.addEventListener('change', applyFilters);
        istasyonSelect.addEventListener('change', applyFilters);
        kategoriSelect.addEventListener('change', applyFilters);
        idFormInput.addEventListener('input', applyFilters);

        clearAllBtn.addEventListener('click', () => {
            dateStartInput.value = '';
            dateEndInput.value = '';
            istasyonSelect.value = '';
            kategoriSelect.value = '';
            idFormInput.value = '';
            applyFilters();
        });

        const optCount = istasyonSelect.options.length;
        if (optCount > 1) {
            if (window.kapaliIsEmriIntervalId) {
                clearInterval(window.kapaliIsEmriIntervalId);
                window.kapaliIsEmriIntervalId = null;
            }
        }
    } catch (err) {
        console.error("Error in initKapaliIsEmriFilter:", err);
    }
}

// Sayfa yüklendiğinde başlat
initializeDarkMode();
startYolcuPollingLoop();
startAcikIsEmriPollingLoop();
startKapaliIsEmriPollingLoop();

if (document.readyState === 'complete' || document.readyState === 'interactive') {
    handleNavigation();
    startObserver();
    initYolcuSayilariFilter();
    initAcikIsEmriFilter();
    initKapaliIsEmriFilter();
} else {
    document.addEventListener('DOMContentLoaded', () => {
        handleNavigation();
        startObserver();
        initYolcuSayilariFilter();
        initAcikIsEmriFilter();
        initKapaliIsEmriFilter();
    });
}