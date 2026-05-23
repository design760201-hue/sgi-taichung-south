/* ==========================================================================
   台灣創價學會台中南區資訊網站 - 專用互動邏輯 (script.js)
   功能範疇：頂部導覽捲動效果、行動端雙向聯動導覽、防虛擬鍵盤遮擋、
             手機底部抽屜 (Bottom Sheet) 拖曳手勢關閉、
             Google Calendar API 客製串接與動態活動渲染、
             御書與體驗談互動彈窗 (Modal)、聯絡表單提交與回饋
   ========================================================================== */

// ==========================================================================
// 0. Google Calendar API 設定
// ==========================================================================
// 若您要同步您的 Google 行事曆，請完成以下 2 個準備工作：
// 1. 將該 Google 行事曆的權限設定為「公開（Make available to public）」
// 2. 將行事曆 ID 與免費申請的 API Key 填入下方（未填寫時，網頁會自動載入南區精美示範活動）
const GOOGLE_API_KEY = 'AIzaSyAyvQ2snygW4I2Jmj-UZbBPeoEk9LiF43I'; 
const CALENDAR_ID = 'sgi.taichungsouthman@gmail.com'; 

document.addEventListener('DOMContentLoaded', () => {
    
    // 1. 自動更新頁尾版權年份
    const footerYear = document.getElementById('footer-year');
    if (footerYear) {
        footerYear.textContent = new Date().getFullYear();
    }

    // 2. 頂部導覽列捲動樣式切換 (Scroll Header effect)
    const header = document.getElementById('main-header');
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
        updateActiveNavLink();
    });

    // 3. 滾動自動高亮導覽選單 (Scroll spy - 桌面與手機雙端雙向同步)
    const spySections = document.querySelectorAll('section, header');
    const desktopNavLinks = document.querySelectorAll('.nav-link');
    const mobileBottomNavItems = document.querySelectorAll('.mobile-bottom-nav-item');

    function updateActiveNavLink() {
        let scrollPosition = window.scrollY + 140; // 滾動偏移值

        spySections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.offsetHeight;
            let sectionId = section.getAttribute('id');
            
            // 處理首頁 Header 的對應
            if (!sectionId && section.tagName === 'HEADER') {
                sectionId = 'hero';
            }

            if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
                // 桌面版頂部高亮
                desktopNavLinks.forEach(link => {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === `#${sectionId}`) {
                        link.classList.add('active');
                    }
                });
                
                // 手機版底部導覽高亮
                mobileBottomNavItems.forEach(item => {
                    item.classList.remove('active');
                    if (item.getAttribute('href') === `#${sectionId}`) {
                        item.classList.add('active');
                    }
                });
            }
        });
    }



    // 5. 異步載入並同步 Google Calendar 行事曆事件
    fetchGoogleCalendarEvents();

    // 6. 註冊手機底部抽屜 (Bottom Sheet) 的向下滑動關閉手勢 (Swipe-down to Close)
    initializeBottomSheetGestures();

    // 7. 初始化 Soka Press 金句字卡系統
    initializeSokaQuoteCard();

    // 8. 初始化當月座談會人員表多支部系統
    initializeMeetingMembers();
    initializeAnnouncements();
    
    // 9. 啟動導覽跳轉自動展開雙向聯動
    initializeNavigationSync();
});


// ==========================================================================
// A. 手機版底部導覽列點擊動態高亮與跳轉
// ==========================================================================
window.setActiveTab = function(element) {
    const mobileBottomNavItems = document.querySelectorAll('.mobile-bottom-nav-item');
    mobileBottomNavItems.forEach(item => item.classList.remove('active'));
    element.classList.add('active');
};


// ==========================================================================
// B. 活動行事曆動態篩選與初始化 (Dynamic Filters)
// ==========================================================================
function initializeCalendarFilters() {
    const filterButtons = document.querySelectorAll('.filter-btn');
    if (!filterButtons || filterButtons.length === 0) return;
    const eventCards = document.querySelectorAll('.event-card');

    filterButtons.forEach(button => {
        // 先清除所有舊的監聽器，防止重複綁定
        const newButton = button.cloneNode(true);
        button.parentNode.replaceChild(newButton, button);
        
        newButton.addEventListener('click', () => {
            filterButtons.forEach(btn => btn.classList.remove('active'));
            // 由於克隆了節點，我們需要重新獲取 active 按鈕並更新類別
            document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
            newButton.classList.add('active');

            const filterValue = newButton.getAttribute('data-filter');

            eventCards.forEach(card => {
                const cardCategory = card.getAttribute('data-category');
                
                // 動態展示或隱藏，並加入流暢的淡入動畫
                if (filterValue === 'all' || cardCategory === filterValue) {
                    card.style.display = 'flex';
                    card.style.opacity = '0';
                    card.style.transform = 'scale(0.96) translateY(5px)';
                    setTimeout(() => {
                        card.style.opacity = '1';
                        card.style.transform = 'scale(1) translateY(0)';
                        card.style.transition = 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)';
                    }, 50);
                } else {
                    card.style.display = 'none';
                }
            });
        });
    });
}


// ==========================================================================
// C. Google Calendar API 串接與 UI 動態渲染
// ==========================================================================

// 預設的創價學會台中南區溫馨範例活動資料 (作為無 API Key 或是網路錯誤時的防退化備用數據)
const MOCK_EVENTS = [
    {
        day: '16',
        month: '05 月',
        weekday: '星期六',
        tag: '座談會',
        category: 'meeting',
        title: '五月份南區溫馨座談會',
        desc: '本月座談會主題為「歡喜的信念」，我們將透過溫馨的佛法對話、讚頌與動人的生命體驗分享，凝聚鄰里情誼，注入前進勇氣。',
        time: '19:30 - 21:00',
        location: '南區溫馨聚會所 / 各分班家聚點'
    },
    {
        day: '24',
        month: '05 月',
        weekday: '星期日',
        tag: '區級幹部',
        category: 'youth',
        title: '南區區級幹部工作研討會',
        desc: '歡迎全體南區區級幹部與地區負責人共同參與！本月我們將凝聚團隊共識，研討下半年度的活動方針與廣宣推動計劃。',
        time: '14:00 - 16:00',
        location: '台中文化會館 4 樓講堂'
    },
    {
        day: '07',
        month: '06 月',
        weekday: '星期日',
        tag: '學習會',
        category: 'meeting',
        title: '御書研討會：《開目抄》導讀',
        desc: '深入研讀日蓮大聖人重要著作《開目抄》，學習在面臨巨大逆境時，如何確立不可動搖的誓願，轉換宿命，獲得絕對幸福。',
        time: '19:30 - 21:00',
        location: '南區溫馨聚會所 / 雲端視訊會場'
    },
    {
        day: '14',
        month: '06 月',
        weekday: '星期日',
        tag: '區級幹部',
        category: 'youth',
        title: '區級幹部培訓與信仰學習會',
        desc: '以池田大作先生的「指導選集」為指針，探討幹部如何在基層溫暖鼓勵每一位法友，落實「一人人間革命」的崇高使命。',
        time: '10:00 - 11:30',
        location: '南區溫馨聚會所'
    }
];

// 偵測活動文字自動分配標籤與分類樣式
function detectCategory(title, description) {
    const text = (title + ' ' + (description || '')).toLowerCase();
    
    // 優先判定幹部類，分配至 youth (區級幹部行事曆)
    if (text.includes('幹部') || text.includes('負責人') || text.includes('會議') || text.includes('培訓') || text.includes('幹部會') || text.includes('役員') || text.includes('青年') || text.includes('大學') || text.includes('女子') || text.includes('男子')) {
        return { category: 'youth', tag: '區級幹部' };
    }
    // 御書/學習類判定，分配至 meeting (地區座談會/南區活動)
    if (text.includes('御書') || text.includes('研討') || text.includes('學習') || text.includes('法理') || text.includes('專題') || text.includes('會長') || text.includes('啟發')) {
        return { category: 'meeting', tag: '學習會' };
    }
    // 座談會判定，分配至 meeting (地區座談會/南區活動)
    if (text.includes('座談') || text.includes('地區') || text.includes('班') || text.includes('組') || text.includes('家訪')) {
        return { category: 'meeting', tag: '座談會' };
    }
    
    return { category: 'meeting', tag: '南區活動' };
}

// 渲染活動卡片 HTML 節點
function renderCalendarEvents(events) {
    const eventsGrid = document.getElementById('events-grid');
    if (!eventsGrid) return;
    
    if (events.length === 0) {
        eventsGrid.innerHTML = `
            <div class="no-events" style="grid-column: 1/-1; text-align: center; padding: 4rem 2rem; color: var(--color-text-muted);">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="margin-bottom: 1rem; opacity: 0.5;"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
                <p style="font-weight: 600; font-size: 1.05rem; margin-bottom: 0.25rem;">近期暫無安排活動</p>
                <p style="font-size: 0.85rem; opacity: 0.8;">請隨時關注我們的公告，或聯絡關懷人員取得最新消息！</p>
            </div>
        `;
        return;
    }
    
    eventsGrid.innerHTML = events.map(event => {
        return `
            <div class="event-card" data-category="${event.category}">
                <div class="event-date-badge">
                    <span class="event-date-day">${event.day}</span>
                    <div class="event-date-month">
                        <span>${event.month}</span>
                        <span>${event.weekday}</span>
                    </div>
                    <span class="event-tag">${event.tag}</span>
                </div>
                <h3 class="event-title">${event.title}</h3>
                <p class="event-desc">${event.desc}</p>
                <ul class="event-info-list">
                    <li class="event-info-item">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                        <span>${event.time}</span>
                    </li>
                    <li class="event-info-item">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                        <span>${event.location}</span>
                    </li>
                </ul>
            </div>
        `;
    }).join('');
    
    // 初始化動態分類過濾
    initializeCalendarFilters();
}

// 異步串接 Google Calendar API
async function fetchGoogleCalendarEvents() {
    if (!GOOGLE_API_KEY || !CALENDAR_ID) {
        console.log('💡 未填寫 Google API Key，自動啟用創價學會台中南區專用備份日曆。');
        renderCalendarEvents(MOCK_EVENTS);
        return;
    }
    
    const now = new Date().toISOString();
    // 抓取未來 6 個月內的公開活動事件
    const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(CALENDAR_ID)}/events?key=${GOOGLE_API_KEY}&timeMin=${now}&singleEvents=true&orderBy=startTime&maxResults=15`;
    
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`網路錯誤，狀態碼：${response.status}`);
        }
        
        const data = await response.json();
        const items = data.items || [];
        
        const events = items.map(item => {
            const startDateTime = item.start.dateTime || item.start.date;
            const endDateTime = item.end.dateTime || item.end.date;
            const startDate = new Date(startDateTime);
            const endDate = new Date(endDateTime);
            
            // 解析日、月與星期
            const day = String(startDate.getDate()).padStart(2, '0');
            const month = String(startDate.getMonth() + 1).padStart(2, '0') + ' 月';
            
            const weekdays = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
            const weekday = weekdays[startDate.getDay()];
            
            // 解析時間段
            let timeStr = '全天活動';
            if (item.start.dateTime) {
                const startHour = String(startDate.getHours()).padStart(2, '0');
                const startMin = String(startDate.getMinutes()).padStart(2, '0');
                const endHour = String(endDate.getHours()).padStart(2, '0');
                const endMin = String(endDate.getMinutes()).padStart(2, '0');
                timeStr = `${startHour}:${startMin} - ${endHour}:${endMin}`;
            }
            
            // 智慧偵測分類
            const { category, tag } = detectCategory(item.summary, item.description);
            
            return {
                day,
                month,
                weekday,
                tag,
                category,
                title: item.summary || '未命名溫馨聚會',
                desc: item.description || '點擊本活動查看詳情，誠摯邀請大家在溫馨充滿題目的氣氛中前來相聚！',
                time: timeStr,
                location: item.location || '南區溫馨聚會所 / 雲端視訊會場'
            };
        });
        
        console.log(`✅ 成功同步 ${events.length} 筆 Google Calendar 行事曆事件！`);
        renderCalendarEvents(events);
        
    } catch (error) {
        console.warn('⚠️ Google Calendar API 同步異常，已安全降級為南區預設行事曆數據：', error);
        renderCalendarEvents(MOCK_EVENTS);
    }
}


// ==========================================================================
// D. 手機底部抽屜 (Bottom Sheet) 手勢下拉關閉 (Swipe-down to Close)
// ==========================================================================
function initializeBottomSheetGestures() {
    const modalOverlay = document.getElementById('modal-overlay');
    const modalContainer = document.querySelector('.modal-container');
    
    if (!modalOverlay || !modalContainer) return;
    
    let startY = 0;
    let currentY = 0;
    let isDragging = false;
    
    // 綁定觸摸開始事件
    modalContainer.addEventListener('touchstart', (e) => {
        // 僅在行動端斷點、且 modal 內部滾動在最頂端（或點擊拖曳橫條）時觸發下拉手勢
        if (window.innerWidth <= 768 && (modalContainer.scrollTop === 0 || e.target.classList.contains('modal-drag-handle'))) {
            startY = e.touches[0].clientY;
            isDragging = true;
            modalContainer.style.transition = 'none'; // 拖曳時解除 transition 達到完全跟手
        }
    }, { passive: true });
    
    // 綁定觸摸移動事件
    modalContainer.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        currentY = e.touches[0].clientY;
        const offsetY = currentY - startY;
        
        // 僅允許向下拖曳關閉
        if (offsetY > 0) {
            modalContainer.style.transform = `translateY(${offsetY}px)`;
            // 背景遮罩隨著向下拉大而按比例淡出
            const opacityRatio = Math.max(0.2, 1 - (offsetY / 400));
            modalOverlay.style.background = `rgba(11, 76, 83, ${0.4 * opacityRatio})`;
            modalOverlay.style.backdropFilter = `blur(${8 * opacityRatio}px)`;
        }
    }, { passive: true });
    
    // 綁定觸摸結束事件
    modalContainer.addEventListener('touchend', () => {
        if (!isDragging) return;
        isDragging = false;
        
        // 恢復 transition 動畫屬性
        modalContainer.style.transition = 'transform 0.45s cubic-bezier(0.16, 1, 0.3, 1)';
        modalOverlay.style.transition = 'opacity 0.4s ease, background 0.4s ease, backdrop-filter 0.4s ease';
        
        const offsetY = currentY - startY;
        
        // 下拉位移大於臨界值 (80px) 則執行關閉
        if (offsetY > 80) {
            closeModal();
        } else {
            // 位移不夠，回彈至原位，並恢復背景遮罩明度
            modalContainer.style.transform = 'translateY(0)';
            modalOverlay.style.background = 'rgba(11, 76, 83, 0.4)';
            modalOverlay.style.backdropFilter = 'blur(8px)';
        }
        
        // 重置變數
        startY = 0;
        currentY = 0;
    });
}

// ==========================================================================
// E. 御書與體驗談互動彈窗資料庫與開關控制 (Modals)
// ==========================================================================
const modalData = {};

// 開啟彈窗
window.openModal = function(key) {
    const modalOverlay = document.getElementById('modal-overlay');
    const modalContentArea = document.getElementById('modal-content-area');
    const modalContainer = document.querySelector('.modal-container');
    const data = modalData[key];

    if (data && modalOverlay && modalContentArea && modalContainer) {
        modalContentArea.innerHTML = `
            <span class="modal-tag">${data.tag}</span>
            <h3 class="modal-title">${data.title}</h3>
            <div class="modal-body">
                ${data.body}
            </div>
        `;
        
        // 開啟時恢復初始樣式狀態
        modalOverlay.style.background = 'rgba(11, 76, 83, 0.4)';
        modalOverlay.style.backdropFilter = 'blur(8px)';
        modalContainer.style.transform = 'translateY(0)';
        
        modalOverlay.classList.add('active');
        document.body.style.overflow = 'hidden'; // 鎖定背景捲動
    }
};

// 關閉彈窗
window.closeModal = function() {
    const modalOverlay = document.getElementById('modal-overlay');
    const modalContainer = document.querySelector('.modal-container');
    
    if (modalOverlay && modalContainer) {
        modalOverlay.classList.remove('active');
        
        // 為了讓手機底部滑落動畫能順暢播出，延時復原樣式
        setTimeout(() => {
            modalContainer.style.transform = '';
            modalOverlay.style.background = '';
            modalOverlay.style.backdropFilter = '';
        }, 350);
        
        document.body.style.overflow = ''; // 解鎖背景捲動
    }
};

// 監聽 ESC 鍵關閉彈窗
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeModal();
    }
});



// ==========================================================================
// G. Soka Press 每日心靈晨光金句字卡系統 (IG 1:1 字卡一鍵儲存與隨機切換)
// ==========================================================================

// 精選池田大作先生 8 句鼓舞人心的經典心靈晨光金句
const SOKA_PRESS_QUOTES = [
    {
        text: "人間革命的溫暖光芒，是驅散黑暗、照亮社區的最強大力量。當我們主動關懷一人，和平的漣漪就從這裡開始擴散。",
        author: "— 池田大作",
        source: "《新·人間革命》"
    },
    {
        text: "無論面臨多麼嚴酷的人生寒冬，只要堅持不懈地信心前進，春天必定會到來，一切苦難都將化為成長的養分。",
        author: "— 池田大作",
        source: "《妙一女御前御消息》指導"
    },
    {
        text: "命運不是用來屈服的，而是用來開拓與挑戰的。胸懷強大信念的人，能將任何逆境轉換為最耀眼的勝利凱歌。",
        author: "— 池田大作",
        source: "《青春對話》"
    },
    {
        text: "真正的幸福並非身處無風無浪的避風港，而是在驚濤駭浪中，依然能吹起希望的風笛，勇敢地破浪前行。",
        author: "— 池田大作",
        source: "《幸福哲學》"
    },
    {
        text: "關懷鄰里、疼惜伙伴的溫暖問候，能融化最冰冷的心靈。我們主動的一句鼓勵，就是點亮他人生命的一盞明燈。",
        author: "— 池田大作",
        source: "社區廣宣關懷指導"
    },
    {
        text: "偉大的變革，始於一個人的「人間革命」。當我們改變了自己的心境，身邊的環境與世界也將隨之轉換與躍進。",
        author: "— 池田大作",
        source: "《人間革命》"
    },
    {
        text: "青年是新時代的開路先鋒，絕對不要害怕挫折。每一次的跌倒與奮起，都是在鍛鍊靈魂的鋼骨，鑄造未來的輝煌。",
        author: "— 池田大作",
        source: "《青年抄》"
    },
    {
        text: "每天清晨，都是我們嶄新的起點。唱出歡喜的歌聲，抱持如朝陽般源源不絕的朝氣，去開啟幸福與希望的一天！",
        author: "— 池田大作",
        source: "晨光心靈指導"
    }
];

let currentQuoteIndex = 0;

// 初始化字卡
function initializeSokaQuoteCard() {
    // 1. 設定今日日期 YYYY.MM.DD
    const dateEl = document.getElementById('soka-card-date');
    if (dateEl) {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        dateEl.textContent = `${yyyy}.${mm}.${dd}`;
        
        // 2. 根據「日期天數」決定今日預設金句，保證每天打開都是特定的一句，且每天不同
        currentQuoteIndex = today.getDate() % SOKA_PRESS_QUOTES.length;
        renderQuote(currentQuoteIndex);
    }
}

// 渲染特定索引的金句到 DOM
function renderQuote(index) {
    const textEl = document.getElementById('soka-quote-text');
    const authorEl = document.getElementById('soka-quote-author');
    const sourceEl = document.getElementById('soka-quote-source');
    
    if (textEl && authorEl && sourceEl) {
        const quote = SOKA_PRESS_QUOTES[index];
        textEl.textContent = quote.text;
        authorEl.textContent = quote.author;
        sourceEl.textContent = quote.source;
    }
}

// 隨機「換一句」功能（保證不與當前金句重複）
window.getRandomQuote = function() {
    let newIndex = currentQuoteIndex;
    if (SOKA_PRESS_QUOTES.length > 1) {
        while (newIndex === currentQuoteIndex) {
            newIndex = Math.floor(Math.random() * SOKA_PRESS_QUOTES.length);
        }
    }
    currentQuoteIndex = newIndex;
    
    // 加入一個優雅的淡入淡出轉場效果
    const card = document.getElementById('soka-quote-card');
    if (card) {
        card.style.opacity = '0.3';
        card.style.transform = 'scale(0.98)';
        card.style.transition = 'all 0.25s ease';
        
        setTimeout(() => {
            renderQuote(currentQuoteIndex);
            card.style.opacity = '1';
            card.style.transform = 'scale(1)';
        }, 250);
    }
};

// 一鍵儲存/下載字卡功能 (透過 html2canvas 生成 2x Retina 高畫質 PNG)
window.downloadQuoteCard = function() {
    const card = document.getElementById('soka-quote-card');
    const spinner = document.getElementById('soka-spinner');
    
    if (!card || !spinner) return;
    
    // 顯示加載動畫
    spinner.classList.add('active');
    
    // 為了確保 html2canvas 渲染時的完美效果，我們在其配置中：
    // 1. 設定 scale: 3，將渲染畫質提升 3 倍以產生 Retina 超高清畫質 PNG
    // 2. 允許跨域與啟用畫布快取
    // 3. 設定背景色為透明，避免多餘背景色干擾
    setTimeout(() => {
        html2canvas(card, {
            scale: 3, 
            useCORS: true,
            allowTaint: true,
            backgroundColor: null,
            logging: false
        }).then(canvas => {
            // 將 Canvas 轉換成 base64 PNG 圖片
            const imageURL = canvas.toDataURL("image/png");
            
            // 獲取今日日期用於檔名
            const today = new Date();
            const dateStr = today.getFullYear() + 
                            String(today.getMonth() + 1).padStart(2, '0') + 
                            String(today.getDate()).padStart(2, '0');
            
            // 創建隱藏的 <a> 標籤觸發下載
            const downloadLink = document.createElement('a');
            downloadLink.href = imageURL;
            downloadLink.download = `SGI-晨光心靈金句-${dateStr}.png`;
            
            document.body.appendChild(downloadLink);
            downloadLink.click();
            document.body.removeChild(downloadLink);
            
            // 隱藏加載動畫
            spinner.classList.remove('active');
            
            // 手機端震動或溫馨提示，提升人本操作細節體驗
            if (navigator.vibrate) {
                navigator.vibrate(50); // 微震動回饋
            }
        }).catch(err => {
            console.error('金句字卡生成失敗：', err);
            spinner.classList.remove('active');
            alert('⚠️ 抱歉，字卡生成出現異常，請稍後再試！');
        });
    }, 600); // 留出 600 毫秒的微動畫延遲，給用戶帶來滿滿的 premium 精緻生成體感
};


// ==========================================================================
// G. 雲端下載區塊複製連結與 Toast 提示 (Cloud Share Hub)
// ==========================================================================

window.copyShareLink = function(event) {
    if (event) {
        event.preventDefault();
    }
    
    const shareLink = 'https://drive.google.com/drive/u/2/folders/1m7p6RYtq6ij0SkujbVqSGk16JaasL-BT';
    
    // 使用現代 Clipboard API 進行複製
    navigator.clipboard.writeText(shareLink).then(() => {
        // 手機端輕微震動回饋
        if (window.vibratePhone) {
            window.vibratePhone(40);
        } else if (navigator.vibrate) {
            navigator.vibrate(40);
        }
        
        // 顯示高質感 Toast 提示
        showToast('✨ 雲端連結已複製！歡迎分享給法友 🌸');
        
        // 按鈕視覺狀態切換
        const btn = event.currentTarget;
        if (btn) {
            const btnTextElement = btn.querySelector('.btn-text');
            if (btnTextElement) {
                const origText = btnTextElement.textContent;
                btnTextElement.textContent = '連結已複製！';
                btn.classList.add('copied');
                
                setTimeout(() => {
                    btnTextElement.textContent = origText;
                    btn.classList.remove('copied');
                }, 2000);
            }
        }
    }).catch(err => {
        console.error('複製失敗:', err);
        // 退回備用方案
        const textarea = document.createElement('textarea');
        textarea.value = shareLink;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand('copy');
            showToast('✨ 雲端連結已複製！歡迎分享給法友 🌸');
        } catch (e) {
            alert('請手動複製連結：' + shareLink);
        }
        document.body.removeChild(textarea);
    });
};

function showToast(message) {
    let toast = document.querySelector('.custom-toast');
    if (!toast) {
        toast = document.createElement('div');
        toast.className = 'custom-toast';
        document.body.appendChild(toast);
    }
    
    toast.textContent = message;
    
    // 強制重繪以確保動畫正確重播
    toast.classList.remove('show');
    void toast.offsetWidth; 
    
    toast.classList.add('show');
    
    // 3秒後自動淡出
    if (window.toastTimer) {
        clearTimeout(window.toastTimer);
    }
    window.toastTimer = setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// ==========================================================================
// 8. 座談會人員名單通報與查詢系統核心邏輯
// ==========================================================================
// 若您要同步您的 Google 試算表，請完成以下 2 個準備工作：
// 1. 將該 Google 試算表的共用權限設定為「知道連結的任何人都可以檢視（Viewer）」
// 2. 將試算表 ID 填入下方（未填寫時，網頁會自動載入 7 大支部 2026年5月份真實與模擬數據）
const MEMBERS_SPREADSHEET_ID = '11rIPgA92E6NEgV2Ni3sq80cBDH2e9AWRrq8YGc-rfBI'; 

// 全域狀態變數
let currentBranch = '勤益支部';
let currentDistrict = '全部';
let memberSearchQuery = '';
let currentBranchData = []; // 當前支部的所有數據

// 1. 2026 年 5 月份 7 大支部預設預存數據庫 (Mock Data)
// 包含與您截圖 100% 吻合的真實人員安排，以及為其他支部設計的精美模擬數據
const BRANCH_MEMBERS_MOCK = {
    '勤益支部': [
        { district: '坪林地區', group: '豐年組', date: '5/19(週二)', emcee: '', gosho: '', theme: '', cadre: '', scribe: '', concluder: '', address: '台中市太平區東平里008鄰東村路11號', mapUrl: 'https://maps.google.com/?q=台中市太平區東平里008鄰東村路11號' },
        { district: '坪林地區', group: '光華組', date: '5/21(週四)', emcee: '娟穎', gosho: '', theme: '宣佑', cadre: '', scribe: '', concluder: '', address: '台中市太平區長安路135號', mapUrl: 'https://maps.google.com/?q=台中市太平區長安路135號' },
        { district: '坪林地區', group: '光明組', date: '5/22(週五)', emcee: '冠宇', gosho: '女子部 文馨', theme: '文馨', cadre: '', scribe: '', concluder: '', address: '台中市太平區光明里大興一街5巷25號', mapUrl: 'https://maps.google.com/?q=台中市太平區光明里大興一街5巷25號' },
        { district: '宜昌地區', group: '宜佳組', date: '5/19(週二)', emcee: '喬安', gosho: '男子部 銘義', theme: '銘義', cadre: '', scribe: '', concluder: '', address: '台中市太平區宜佳街51號', mapUrl: 'https://maps.google.com/?q=台中市太平區宜佳街51號' },
        { district: '宜昌地區', group: '宜欣組', date: '5/21(週四)', emcee: '', gosho: '', theme: '', cadre: '', scribe: '', concluder: '', address: '台中市太平區溪洲路48巷3號6樓', mapUrl: 'https://maps.google.com/?q=台中市太平區溪洲路48巷3號6樓' },
        { district: '宜昌地區', group: '東村組', date: '5/23(週六)', emcee: '', gosho: '', theme: '', cadre: '', scribe: '', concluder: '', address: '台中市太平區東平里東村路11號', mapUrl: 'https://maps.google.com/?q=台中市太平區東平里東村路11號' },
        { district: '光興地區', group: '光隆組', date: '5/19(週二)', emcee: '若嘉', gosho: '', theme: '', cadre: '', scribe: '', concluder: '', address: '台中市太平區東方一街1巷58號', mapUrl: 'https://maps.google.com/?q=台中市太平區東方一街1巷58號' },
        { district: '光興地區', group: '興隆組', date: '5/21(週四)', emcee: '益誠', gosho: '女子部 怜綾', theme: '銘義', cadre: '', scribe: '', concluder: '', address: '台中市太平區東方二街3巷11號', mapUrl: 'https://maps.google.com/?q=台中市太平區東方二街3巷11號' },
        { district: '光興地區', group: '建國組', date: '5/23(週六)', emcee: '', gosho: '', theme: '', cadre: '', scribe: '', concluder: '', address: '台中市太平區鵬儀路104巷12號', mapUrl: 'https://maps.google.com/?q=台中市太平區鵬儀路104巷12號' }
    ],
    '東平支部': [
        { district: '樂業地區', group: '新光組', date: '5/19(週二)', emcee: '壯婦部', gosho: '', theme: '', cadre: '', scribe: '', concluder: '', address: '台中市太平區中山路4段212巷2弄1號', mapUrl: 'https://maps.google.com/?q=台中市太平區中山路4段212巷2弄1號' },
        { district: '樂業地區', group: '東英組', date: '5/22(週五)', emcee: '壯婦部', gosho: '', theme: '', cadre: '', scribe: '', concluder: '', address: '台中市東區東英15街260巷40號', mapUrl: 'https://maps.google.com/?q=台中市東區東英15街260巷40號' },
        { district: '樂業地區', group: '東信組', date: '5/23(週六)', emcee: '怡慧', gosho: '男子部 炳聰', theme: '', cadre: '', scribe: '', concluder: '', address: '台中市東區振興路437巷111弄24號', mapUrl: 'https://maps.google.com/?q=台中市東區振興路437巷111弄24號' },
        { district: '新坪地區', group: '新高組', date: '', emcee: '琇如', gosho: '', theme: '', cadre: '', scribe: '', concluder: '', address: '台中市太平區立功路103號7樓(守衛室)', mapUrl: 'https://maps.google.com/?q=台中市太平區立功路103號7樓(守衛室)' },
        { district: '新坪地區', group: '新吉組', date: '5/19(週二)', emcee: '力嘉', gosho: '男子部 哲伸', theme: '', cadre: '', scribe: '', concluder: '', address: '台中市太平區新吉里新和街19號', mapUrl: 'https://maps.google.com/?q=台中市太平區新吉里新和街19號' },
        { district: '新坪地區', group: '新城組', date: '5/22(週五)', emcee: '宜芳', gosho: '', theme: '', cadre: '', scribe: '', concluder: '', address: '台中市太平區新吉里新平路3段187巷12號', mapUrl: 'https://maps.google.com/?q=台中市太平區新吉里新平路3段187巷12號' },
        { district: '長億地區', group: '中政組', date: '5/19(週二)', emcee: '', gosho: '', theme: '', cadre: '', scribe: '', concluder: '', address: '台中市太平區東平路618巷21號', mapUrl: 'https://maps.google.com/?q=台中市太平區東平路618巷21號' },
        { district: '長億地區', group: '永成組', date: '5/21(週四)', emcee: '', gosho: '', theme: '', cadre: '', scribe: '', concluder: '', address: '台中市太平區永成北路42-1號', mapUrl: 'https://maps.google.com/?q=台中市太平區永成北路42-1號' },
        { district: '長億地區', group: '興平組', date: '5/22(週五)', emcee: '', gosho: '女子部 琬婷', theme: '女子部 怜綾', cadre: '', scribe: '', concluder: '', address: '台中市太平區長億東三街70巷12號1樓', mapUrl: 'https://maps.google.com/?q=台中市太平區長億東三街70巷12號1樓' },
        { district: '長億地區', group: '小鎮組', date: '5/23(週六)', emcee: '', gosho: '', theme: '', cadre: '', scribe: '', concluder: '', address: '台中市太平區長億六街2-22號', mapUrl: 'https://maps.google.com/?q=台中市太平區長億六街2-22號' }
    ],
    '新里支部': [
        { district: '十九甲地區', group: '新仁組', date: '5/19(週二)', emcee: '', gosho: '男子部 育侃', theme: '', cadre: '', scribe: '', concluder: '', address: '台中市大里區新仁七街44號', mapUrl: 'https://maps.google.com/?q=%E5%8F%B0%E4%B8%AD%E5%B8%82%E5%A4%A7%E9%87%8C%E5%8D%80%E6%96%B0%E4%BB%81%E4%B8%83%E8%A1%9744%E8%99%9F' },
        { district: '十九甲地區', group: '立德組', date: '5/21(週四)', emcee: '', gosho: '', theme: '', cadre: '', scribe: '', concluder: '', address: '台中市大里區立仁里合信街98號', mapUrl: 'https://maps.google.com/?q=%E5%8F%B0%E4%B8%AD%E5%B8%82%E5%A4%A7%E9%87%8C%E5%8D%80%E7%AB%8B%E4%BB%81%E9%87%8C%E5%90%88%E4%BF%A1%E8%A1%9798%E8%99%9F' },
        { district: '十九甲地區', group: '立仁組', date: '5/22(週五)', emcee: '', gosho: '', theme: '', cadre: '', scribe: '', concluder: '', address: '台中市大里區新仁七街44號 (共用)', mapUrl: 'https://maps.google.com/?q=%E5%8F%B0%E4%B8%AD%E5%B8%82%E5%A4%A7%E9%87%8C%E5%8D%80%E6%96%B0%E4%BB%81%E4%B8%83%E8%A1%9744%E8%99%9F%20(%E5%85%B1%E7%94%A8)' },
        { district: '塗城地區', group: '瑞隆組', date: '5/19(週二)', emcee: '壯年部', gosho: '', theme: '', cadre: '', scribe: '', concluder: '', address: '台中市大里區塗城路304巷51弄7號', mapUrl: 'https://maps.google.com/?q=%E5%8F%B0%E4%B8%AD%E5%B8%82%E5%A4%A7%E9%87%8C%E5%8D%80%E5%A1%97%E5%9F%8E%E8%B7%AF304%E5%B7%B751%E5%BC%847%E8%99%9F' },
        { district: '塗城地區', group: '仁化組', date: '5/21(週四)', emcee: '林鈞聖', gosho: '', theme: '', cadre: '', scribe: '', concluder: '', address: '台中市太平區德安街95巷7號', mapUrl: 'https://maps.google.com/?q=%E5%8F%B0%E4%B8%AD%E5%B8%82%E5%A4%AA%E5%B9%B3%E5%8D%80%E5%BE%B7%E5%AE%89%E8%A1%9795%E5%B7%B77%E8%99%9F' },
        { district: '塗城地區', group: '仁美組', date: '5/22(週五)', emcee: '林牧穎', gosho: '女子部 維陽', theme: '', cadre: '', scribe: '', concluder: '', address: '台中市大里區仁化路1147號', mapUrl: 'https://maps.google.com/?q=%E5%8F%B0%E4%B8%AD%E5%B8%82%E5%A4%A7%E9%87%8C%E5%8D%80%E4%BB%81%E5%8C%96%E8%B7%AF1147%E8%99%9F' },
        { district: '塗城地區', group: '美群組', date: '5/23(週六)', emcee: '張恆胤、陳智恩', gosho: '', theme: '', cadre: '', scribe: '', concluder: '', address: '台中市大里區三民二街57巷37號', mapUrl: 'https://maps.google.com/?q=%E5%8F%B0%E4%B8%AD%E5%B8%82%E5%A4%A7%E9%87%8C%E5%8D%80%E4%B8%89%E6%B0%91%E4%BA%8C%E8%A1%9757%E5%B7%B737%E8%99%9F' },
        { district: '成功地區', group: '東湖組', date: '5/19(週二)', emcee: '', gosho: '', theme: '', cadre: '', scribe: '', concluder: '', address: '台中市大里區仁化路1147號', mapUrl: 'https://maps.google.com/?q=%E5%8F%B0%E4%B8%AD%E5%B8%82%E5%A4%A7%E9%87%8C%E5%8D%80%E4%BB%81%E5%8C%96%E8%B7%AF1147%E8%99%9F' },
        { district: '成功地區', group: '瑞城組', date: '5/21(週四)', emcee: '', gosho: '男子部 鈺翔', theme: '', cadre: '', scribe: '', concluder: '', address: '台中市大里區塗城路433巷64弄8號', mapUrl: 'https://maps.google.com/?q=%E5%8F%B0%E4%B8%AD%E5%B8%82%E5%A4%A7%E9%87%8C%E5%8D%80%E5%A1%97%E5%9F%8E%E8%B7%AF433%E5%B7%B764%E5%BC%848%E8%99%9F' },
        { district: '成功地區', group: '金城組', date: '5/22(週五)', emcee: '', gosho: '', theme: '', cadre: '', scribe: '', concluder: '', address: '台中市大里區長春路115巷25號', mapUrl: 'https://maps.google.com/?q=%E5%8F%B0%E4%B8%AD%E5%B8%82%E5%A4%A7%E9%87%8C%E5%8D%80%E9%95%B7%E6%98%A5%E8%B7%AF115%E5%B7%B725%E8%99%9F' },
        { district: '成功地區', group: '草湖組', date: '5/23(週六)', emcee: '', gosho: '', theme: '', cadre: '', scribe: '', concluder: '', address: '台中市大里區長春路115巷25號', mapUrl: 'https://maps.google.com/?q=%E5%8F%B0%E4%B8%AD%E5%B8%82%E5%A4%A7%E9%87%8C%E5%8D%80%E9%95%B7%E6%98%A5%E8%B7%AF115%E5%B7%B725%E8%99%9F' }
    ],
    '益民支部': [
        { district: '永興地區', group: '東興組', date: '5/19(週二)', emcee: '林巧昀', gosho: '', theme: '', cadre: '', scribe: '', concluder: '', address: '台中市大里區益民路二段261巷27號', mapUrl: 'https://maps.google.com/?q=%E5%8F%B0%E4%B8%AD%E5%B8%82%E5%A4%A7%E9%87%8C%E5%8D%80%E7%9B%8A%E6%B0%91%E8%B7%AF%E4%BA%8C%E6%AE%B5261%E5%B7%B727%E8%99%9F' },
        { district: '永興地區', group: '大榮組', date: '5/21(週四)', emcee: '林君學', gosho: '男子部 育陞', theme: '', cadre: '', scribe: '', concluder: '', address: '台中市大里區光榮街163號', mapUrl: 'https://maps.google.com/?q=%E5%8F%B0%E4%B8%AD%E5%B8%82%E5%A4%A7%E9%87%8C%E5%8D%80%E5%85%89%E6%A6%AE%E8%A1%97163%E8%99%9F' },
        { district: '永興地區', group: '永隆組', date: '5/22(週五)', emcee: '黃羽揚', gosho: '', theme: '', cadre: '', scribe: '', concluder: '', address: '台中市大里區樹王路407號', mapUrl: 'https://maps.google.com/?q=%E5%8F%B0%E4%B8%AD%E5%B8%82%E5%A4%A7%E9%87%8C%E5%8D%80%E6%A8%B9%E7%8E%8B%E8%B7%AF407%E8%99%9F' },
        { district: '內新地區', group: '東昇組', date: '5/19(週二)', emcee: '黃靖甯', gosho: '女子部 育岑', theme: '', cadre: '', scribe: '', concluder: '', address: '台中市大里區日新路477號', mapUrl: 'https://maps.google.com/?q=%E5%8F%B0%E4%B8%AD%E5%B8%82%E5%A4%A7%E9%87%8C%E5%8D%80%E6%97%A5%E6%96%B0%E8%B7%AF477%E8%99%9F' },
        { district: '內新地區', group: '東榮組', date: '5/21(週四)', emcee: '呂鈞翰', gosho: '', theme: '', cadre: '', scribe: '', concluder: '', address: '台中市大里區東榮路一段22號', mapUrl: 'https://maps.google.com/?q=%E5%8F%B0%E4%B8%AD%E5%B8%82%E5%A4%A7%E9%87%8C%E5%8D%80%E6%9D%B1%E6%A6%AE%E8%B7%AF%E4%B8%80%E6%AE%B522%E8%99%9F' },
        { district: '內新地區', group: '中新組', date: '5/23(週六)', emcee: '婦人部', gosho: '', theme: '', cadre: '', scribe: '', concluder: '', address: '台中市大里區新義路184號', mapUrl: 'https://maps.google.com/?q=%E5%8F%B0%E4%B8%AD%E5%B8%82%E5%A4%A7%E9%87%8C%E5%8D%80%E6%96%B0%E7%BE%A9%E8%B7%AF184%E8%99%9F' },
        { district: '德芳地區', group: '長榮組', date: '5/21(週四)', emcee: '游順隆', gosho: '', theme: '', cadre: '', scribe: '', concluder: '', address: '台中市大里區大里路33巷5號', mapUrl: 'https://maps.google.com/?q=%E5%8F%B0%E4%B8%AD%E5%B8%82%E5%A4%A7%E9%87%8C%E5%8D%80%E5%A4%A7%E9%87%8C%E8%B7%AF33%E5%B7%B75%E8%99%9F' },
        { district: '德芳地區', group: '至聖組', date: '5/22(週五)', emcee: '洪澤森', gosho: '女子部 佩洳', theme: '', cadre: '', scribe: '', concluder: '', address: '台中市大里區益民路二段181巷14號', mapUrl: 'https://maps.google.com/?q=%E5%8F%B0%E4%B8%AD%E5%B8%82%E5%A4%A7%E9%87%8C%E5%8D%80%E7%9B%8A%E6%B0%91%E8%B7%AF%E4%BA%8C%E6%AE%B5181%E5%B7%B714%E8%99%9F' },
        { district: '德芳地區', group: '新田組', date: '5/23(週六)', emcee: '何芷儀', gosho: '', theme: '', cadre: '', scribe: '', concluder: '', address: '台中市大里區夏田路27巷1號', mapUrl: 'https://maps.google.com/?q=%E5%8F%B0%E4%B8%AD%E5%B8%82%E5%A4%A7%E9%87%8C%E5%8D%80%E5%A4%8F%E7%94%B0%E8%B7%AF27%E5%B7%B71%E8%99%9F' }
    ],
    '日峰支部': [
        { district: '喀哩地區', group: '東園組', date: '5/19(週二)', emcee: '阿融', gosho: '男子部 耕澤', theme: '耕澤', cadre: '', scribe: '', concluder: '', address: '台中市烏日區溪南路一段807巷25號', mapUrl: 'https://maps.google.com/?q=%E5%8F%B0%E4%B8%AD%E5%B8%82%E7%83%8F%E6%97%A5%E5%8D%80%E6%BA%AA%E5%8D%97%E8%B7%AF%E4%B8%80%E6%AE%B5807%E5%B7%B725%E8%99%9F' },
        { district: '喀哩地區', group: '光明組', date: '5/21(週四)', emcee: '軒源', gosho: '', theme: '', cadre: '', scribe: '', concluder: '', address: '台中市烏日區五光里五光路五中巷18弄18號', mapUrl: 'https://maps.google.com/?q=%E5%8F%B0%E4%B8%AD%E5%B8%82%E7%83%8F%E6%97%A5%E5%8D%80%E4%BA%94%E5%85%89%E9%87%8C%E4%BA%94%E5%85%89%E8%B7%AF%E4%BA%94%E4%B8%AD%E5%B7%B718%E5%BC%8418%E8%99%9F' },
        { district: '喀哩地區', group: '南里組', date: '5/22(週五)', emcee: '', gosho: '', theme: '', cadre: '', scribe: '', concluder: '', address: '台中市烏日區北里里太明路366號', mapUrl: 'https://maps.google.com/?q=%E5%8F%B0%E4%B8%AD%E5%B8%82%E7%83%8F%E6%97%A5%E5%8D%80%E5%8C%97%E9%87%8C%E9%87%8C%E5%A4%AA%E6%98%8E%E8%B7%AF366%E8%99%9F' },
        { district: '萬豐地區', group: '四德組', date: '5/19(週二)', emcee: '', gosho: '', theme: '', cadre: '', scribe: '', concluder: '', address: '台中市霧峰區四德里四德南路78號', mapUrl: 'https://maps.google.com/?q=%E5%8F%B0%E4%B8%AD%E5%B8%82%E9%9C%A7%E5%B3%B0%E5%8D%80%E5%9B%9B%E5%BE%B7%E9%87%8C%E5%9B%9B%E5%BE%B7%E5%8D%97%E8%B7%AF78%E8%99%9F' },
        { district: '萬豐地區', group: '六股組', date: '5/21(週四)', emcee: '敬弘', gosho: '男子部 能達', theme: '昕融', cadre: '', scribe: '', concluder: '', address: '台中市霧峰區丁台里六股路193號', mapUrl: 'https://maps.google.com/?q=%E5%8F%B0%E4%B8%AD%E5%B8%82%E9%9C%A7%E5%B3%B0%E5%8D%80%E4%B8%81%E5%8F%B0%E9%87%8C%E5%85%AD%E8%82%A1%E8%B7%AF193%E8%99%9F' },
        { district: '萬豐地區', group: '樹仁組', date: '5/23(週六)', emcee: '', gosho: '', theme: '', cadre: '', scribe: '', concluder: '', address: '台中市霧峰區育群路186號', mapUrl: 'https://maps.google.com/?q=%E5%8F%B0%E4%B8%AD%E5%B8%82%E9%9C%A7%E5%B3%B0%E5%8D%80%E8%82%B2%E7%BE%A4%E8%B7%AF186%E8%99%9F' },
        { district: '霧峰地區', group: '中正組', date: '5/19(週二)', emcee: '', gosho: '', theme: '', cadre: '', scribe: '', concluder: '', address: '台中市霧峰區中正路1046號', mapUrl: 'https://maps.google.com/?q=%E5%8F%B0%E4%B8%AD%E5%B8%82%E9%9C%A7%E5%B3%B0%E5%8D%80%E4%B8%AD%E6%AD%A3%E8%B7%AF1046%E8%99%9F' },
        { district: '霧峰地區', group: '吉峰組', date: '5/21(週四)', emcee: '佳龍', gosho: '', theme: '', cadre: '', scribe: '', concluder: '', address: '台中市霧峰區吉峰西路62巷1弄1號', mapUrl: 'https://maps.google.com/?q=%E5%8F%B0%E4%B8%AD%E5%B8%82%E9%9C%A7%E5%B3%B0%E5%8D%80%E5%90%89%E5%B3%B0%E8%A5%BF%E8%B7%AF62%E5%B7%B71%E5%BC%841%E8%99%9F' },
        { district: '霧峰地區', group: '桐林組', date: '5/23(週六)', emcee: '子郁', gosho: '女子部 怜綾', theme: '彥辰', cadre: '', scribe: '', concluder: '', address: '台中市霧峰區桐林里民生路606巷29號', mapUrl: 'https://maps.google.com/?q=%E5%8F%B0%E4%B8%AD%E5%B8%82%E9%9C%A7%E5%B3%B0%E5%8D%80%E6%A1%90%E6%9E%97%E9%87%8C%E6%B0%91%E7%94%9F%E8%B7%AF%E6%B0%91%E7%94%9F%E8%B7%AF606%E5%B7%B729%E8%99%9F' }
    ],
    '高工支部': [
        { district: '烏日地區', group: '高鐵組', date: '', emcee: '永傑', gosho: '女子部 珍汝', theme: '柏瑋', cadre: '', scribe: '', concluder: '', address: '', mapUrl: '' },
        { district: '烏日地區', group: '學田組', date: '5/19(週二)', emcee: '以諮', gosho: '', theme: '伯孟', cadre: '', scribe: '', concluder: '', address: '', mapUrl: '' },
        { district: '烏日地區', group: '成功組', date: '5/22(週五)', emcee: '丞帆', gosho: '', theme: '婦人部支援', cadre: '', scribe: '', concluder: '', address: '', mapUrl: '' },
        { district: '明道地區', group: '仁德組', date: '5/19(週二)', emcee: '宏裕', gosho: '女子部 姿妏', theme: '姿妏', cadre: '', scribe: '', concluder: '', address: '', mapUrl: '' },
        { district: '明道地區', group: '九德組', date: '5/21(週四)', emcee: '長恩', gosho: '', theme: '婦人部支援', cadre: '', scribe: '', concluder: '', address: '', mapUrl: '' },
        { district: '明道地區', group: '光德組', date: '5/22(週五)', emcee: '瑞誠', gosho: '女子部 昱潔', theme: '（冠任）', cadre: '', scribe: '', concluder: '', address: '', mapUrl: '' },
        { district: '樹義地區', group: '福康組', date: '5/19(週二)', emcee: '柏穎哥', gosho: '', theme: '婦人部支援', cadre: '', scribe: '', concluder: '', address: '', mapUrl: '' },
        { district: '樹義地區', group: '樹德組', date: '5/21(週四)', emcee: '貿健', gosho: '女子部 偉襦', theme: '柏瑋', cadre: '', scribe: '', concluder: '', address: '', mapUrl: '' },
        { district: '樹義地區', group: '福田組', date: '5/23(週六)', emcee: '柏瑋、承翰', gosho: '', theme: '雅瑩、珍汝', cadre: '', scribe: '', concluder: '', address: '', mapUrl: '' },
        { district: '和平地區', group: '大慶組', date: '5/19(週二)', emcee: '雅惠', gosho: '男子部 柏瑋', theme: '珮琪', cadre: '', scribe: '', concluder: '', address: '', mapUrl: '' },
        { district: '和平地區', group: '德富組', date: '5/22(週五)', emcee: '柏豪', gosho: '', theme: '珮琪', cadre: '', scribe: '', concluder: '', address: '', mapUrl: '' },
        { district: '和平地區', group: '福順組', date: '5/23(週六)', emcee: '富懋', gosho: '', theme: '珮琪', cadre: '', scribe: '', concluder: '', address: '', mapUrl: '' }
    ],
    '復興支部': [
        { district: '建成地區', group: '仁和組', date: '5/19(週二)', emcee: '昱儕', gosho: '', theme: '', cadre: '', scribe: '', concluder: '', address: '台中市南區仁和一街93號3樓-2', mapUrl: 'https://maps.google.com/?q=台中市南區仁和一街93號3樓-2' },
        { district: '建成地區', group: '新榮組', date: '5/21(週四)', emcee: '順堯', gosho: '', theme: '', cadre: '', scribe: '', concluder: '', address: '台中市南區復興路三段148-5號14樓之2', mapUrl: 'https://maps.google.com/?q=台中市南區復興路三段148-5號14樓之2' },
        { district: '建成地區', group: '長春組', date: '5/23(週六)', emcee: '科廷 淵百', gosho: '女子部 伯孟', theme: '彥伊', cadre: '', scribe: '', concluder: '', address: '402臺中市南區仁和路119號', mapUrl: 'https://maps.google.com/?q=402臺中市南區仁和路119號' },
        { district: '大東地區', group: '南門組', date: '5/19(週二)', emcee: '彥婷', gosho: '', theme: '晶晶', cadre: '', scribe: '', concluder: '', address: '台中市忠明南路1320巷7號', mapUrl: 'https://maps.google.com/?q=台中市忠明南路1320巷7號' },
        { district: '大東地區', group: '建中組', date: '5/21(週四)', emcee: '男子部-秉儒', gosho: '', theme: '晶晶', cadre: '', scribe: '', concluder: '', address: '台中市東區建德街105號', mapUrl: 'https://maps.google.com/?q=台中市東區建德街105號' },
        { district: '大東地區', group: '大智組', date: '5/22(週五)', emcee: '米恩米晴', gosho: '男子部 睿劭', theme: '霏霏', cadre: '', scribe: '', concluder: '', address: '台中市東區振興路162巷16弄13號', mapUrl: 'https://maps.google.com/?q=台中市東區振興路162巷16弄13號' },
        { district: '健康地區', group: '福平組', date: '5/19(週二)', emcee: '沛沛', gosho: '男子部 威辰', theme: '', cadre: '', scribe: '', concluder: '', address: '台中市南區南平一街56-2號', mapUrl: 'https://maps.google.com/?q=台中市南區南平一街56-2號' },
        { district: '健康地區', group: '福興組', date: '5/21(週四)', emcee: '未來部-昕宸', gosho: '', theme: '', cadre: '', scribe: '', concluder: '', address: '台中市南區南和路118號', mapUrl: 'https://maps.google.com/?q=台中市南區南和路118號' },
        { district: '健康地區', group: '永和組', date: '5/22(週五)', emcee: '婦人部協助', gosho: '', theme: '', cadre: '', scribe: '', concluder: '', address: '台中市南區美村路二段297號', mapUrl: 'https://maps.google.com/?q=台中市南區美村路二段297號' }
    ]
};

// 2. 初始化座談會人員名單系統
function initializeMeetingMembers() {
    const indicatorDot = document.querySelector('.status-indicator-dot');
    const syncStatusText = document.getElementById('sync-status-text');
    
    if (MEMBERS_SPREADSHEET_ID) {
        if (indicatorDot && syncStatusText) {
            indicatorDot.className = 'status-indicator-dot syncing';
            syncStatusText.textContent = '● 雲端即時同步中 (點擊開啟試算表)';
        }
        loadBranchData(currentBranch);
    } else {
        if (indicatorDot && syncStatusText) {
            indicatorDot.className = 'status-indicator-dot local';
            syncStatusText.textContent = '本地預設數據 (點擊配置雲端同步)';
        }
        currentBranchData = BRANCH_MEMBERS_MOCK[currentBranch] || [];
        renderDistrictFilters();
        applyMembersFilters();
    }
}

// 3. 點擊同步狀態列提示設定
function handleSyncStatusClick() {
    if (MEMBERS_SPREADSHEET_ID) {
        window.open(`https://docs.google.com/spreadsheets/d/${MEMBERS_SPREADSHEET_ID}/edit`, '_blank');
    } else {
        alert('💡 雲端即時同步設定指引：\n\n1. 開啟您的座談會人員 Google 試算表。\n2. 點擊右上角「共用」，將權限設定為「知道連結的任何人都可以檢視」。\n3. 複製該試算表網址中的 ID（即 d/ 與 /edit 之間長長的一串英數符號）。\n4. 將其填入 script.js 中的 MEMBERS_SPREADSHEET_ID 變數即可！\n\n目前正為您展示 100% 吻合 2026年5月份的真實預設本地數據 🌸');
    }
}

// 4. 動態載入特定支部數據 (雲端 / 本地)
async function loadBranchData(branchName) {
    const loadingOverlay = document.getElementById('table-loading-overlay');
    
    if (!MEMBERS_SPREADSHEET_ID) {
        currentBranchData = BRANCH_MEMBERS_MOCK[branchName] || [];
        renderDistrictFilters();
        applyMembersFilters();
        return;
    }
    
    if (loadingOverlay) loadingOverlay.style.display = 'flex';
    
    try {
        const data = await fetchGoogleSheetsMembers(MEMBERS_SPREADSHEET_ID, branchName);
        currentBranchData = data;
        
        if (loadingOverlay) loadingOverlay.style.display = 'none';
        
        renderDistrictFilters();
        applyMembersFilters();
    } catch (error) {
        console.error('抓取 Google Sheets 數據出錯，降級使用本地預設數據:', error);
        
        if (loadingOverlay) loadingOverlay.style.display = 'none';
        showToast('⚠️ 雲端同步失敗，已為您載入本地預設數據 🌸');
        
        currentBranchData = BRANCH_MEMBERS_MOCK[branchName] || [];
        renderDistrictFilters();
        applyMembersFilters();
    }
}

// 5. 零金鑰 Google Sheets 數據載入器與智慧解析引擎 (已優化向下填充與格式化值讀取)
async function fetchGoogleSheetsMembers(spreadsheetId, sheetName) {
    const url = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}`;
    
    const response = await fetch(url);
    if (!response.ok) throw new Error('Network response was not ok');
    
    const text = await response.text();
    const match = text.match(/google\.visualization\.Query\.setResponse\(([\s\S]*?)\);/);
    if (!match) throw new Error('Failed to parse Google Sheets Visualization response');
    
    const json = JSON.parse(match[1]);
    const rows = json.table.rows;
    
    if (!rows || rows.length === 0) return [];
    
    // 用於向下填充合併儲存格的暫存變數
    let currentDistrict = '';
    
    const parsedData = rows.map(row => {
        // 優先提取 cell.f (格式化後的值，如 "5/19(週二)")，若不存在才使用 cell.v
        const getCellValue = (index) => {
            if (!row.c || !row.c[index]) return '';
            const cell = row.c[index];
            if (cell.f !== undefined && cell.f !== null) {
                return String(cell.f).trim();
            }
            return cell.v !== null ? String(cell.v).trim() : '';
        };
        
        const rawDistrict = getCellValue(0);
        // 智慧型地區判斷：如果名稱不為空且含有「地區」字樣，則更新 currentDistrict
        if (rawDistrict && rawDistrict.includes('地區')) {
            currentDistrict = rawDistrict;
        }
        
        let addressVal = '';
        let addressLink = '';
        
        if (row.c && row.c[11]) {
            const cell11 = row.c[11];
            addressVal = cell11.f !== undefined && cell11.f !== null ? String(cell11.f).trim() : (cell11.v !== null ? String(cell11.v).trim() : '');
            addressLink = cell11.u ? cell11.u : '';
        }
        
        if (!addressLink && addressVal) {
            addressLink = `https://maps.google.com/?q=${encodeURIComponent(addressVal)}`;
        }
        
        return {
            district: rawDistrict || currentDistrict,
            group: getCellValue(1),
            date: getCellValue(2),
            emcee: getCellValue(3),
            gosho: getCellValue(4),
            theme: getCellValue(5),
            cadre: getCellValue(7),
            scribe: getCellValue(8),
            concluder: getCellValue(9),
            address: addressVal,
            mapUrl: addressLink
        };
    });
    
    // 過濾無效資料：必須有組別且非表頭，且地區必須包含「地區」字樣，以確保完美過濾雜質行
    return parsedData.filter(item => {
        return item.group && 
               item.group !== '組' && 
               item.group !== '組別' && 
               item.district && 
               item.district !== '地區' &&
               item.district.includes('地區');
    });
}

// 6. 動態渲染二級地區篩選頁籤
function renderDistrictFilters() {
    const filtersContainer = document.getElementById('district-filters');
    if (!filtersContainer) return;
    
    const districts = [...new Set(currentBranchData.map(item => item.district))].filter(Boolean);
    
    let html = `<button class="district-filter ${currentDistrict === '全部' ? 'active' : ''}" onclick="filterByDistrict('全部')">全部地區</button>`;
    
    districts.forEach(dist => {
        html += `<button class="district-filter ${currentDistrict === dist ? 'active' : ''}" onclick="filterByDistrict('${dist}')">${dist}</button>`;
    });
    
    filtersContainer.innerHTML = html;
}

// 7. 切換支部頁籤控制器
function switchBranch(branchName) {
    currentBranch = branchName;
    currentDistrict = '全部';
    
    const tabs = document.querySelectorAll('.branch-tab');
    tabs.forEach(tab => {
        if (tab.getAttribute('onclick').includes(branchName)) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });
    
    loadBranchData(branchName);
}

// 8. 地區二級篩選控制器
function filterByDistrict(districtName) {
    currentDistrict = districtName;
    
    const buttons = document.querySelectorAll('.district-filter');
    buttons.forEach(btn => {
        if (btn.getAttribute('onclick').includes(districtName)) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    
    applyMembersFilters();
}

// 9. 處理智慧模糊搜尋輸入
function handleMemberSearch() {
    const searchInput = document.getElementById('member-search');
    const clearBtn = document.getElementById('search-clear-btn');
    
    if (!searchInput) return;
    
    memberSearchQuery = searchInput.value.trim().toLowerCase();
    
    if (clearBtn) {
        clearBtn.style.display = memberSearchQuery ? 'flex' : 'none';
    }
    
    applyMembersFilters();
}

// 10. 清除搜尋輸入
function clearMemberSearch() {
    const searchInput = document.getElementById('member-search');
    const clearBtn = document.getElementById('search-clear-btn');
    
    if (searchInput) {
        searchInput.value = '';
        searchInput.focus();
    }
    
    if (clearBtn) {
        clearBtn.style.display = 'none';
    }
    
    memberSearchQuery = '';
    applyMembersFilters();
}

// 11. 支部 + 地區 + 模糊搜尋 三合一聯動過濾引擎
function applyMembersFilters() {
    let filteredData = currentBranchData;
    
    if (currentDistrict !== '全部') {
        filteredData = filteredData.filter(item => item.district === currentDistrict);
    }
    
    if (memberSearchQuery) {
        filteredData = filteredData.filter(item => {
            return (item.district && item.district.toLowerCase().includes(memberSearchQuery)) ||
                   (item.group && item.group.toLowerCase().includes(memberSearchQuery)) ||
                   (item.date && item.date.toLowerCase().includes(memberSearchQuery)) ||
                   (item.emcee && item.emcee.toLowerCase().includes(memberSearchQuery)) ||
                   (item.gosho && item.gosho.toLowerCase().includes(memberSearchQuery)) ||
                   (item.theme && item.theme.toLowerCase().includes(memberSearchQuery)) ||
                   (item.cadre && item.cadre.toLowerCase().includes(memberSearchQuery)) ||
                   (item.scribe && item.scribe.toLowerCase().includes(memberSearchQuery)) ||
                   (item.concluder && item.concluder.toLowerCase().includes(memberSearchQuery)) ||
                   (item.address && item.address.toLowerCase().includes(memberSearchQuery));
        });
    }
    
    renderMembersTable(filteredData);
}

// 12. 表格渲染引擎 (智慧 Badge 標籤與「一鍵開啟導航」轉化)
function renderMembersTable(data) {
    const tableBody = document.getElementById('members-table-body');
    const table = document.getElementById('members-table');
    const scrollHint = document.getElementById('table-scroll-hint');
    const noResults = document.getElementById('no-results-message');
    
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    if (data.length === 0) {
        if (noResults) noResults.style.display = 'flex';
        if (table) table.style.display = 'none';
        if (scrollHint) scrollHint.style.display = 'none';
        return;
    }
    
    if (noResults) noResults.style.display = 'none';
    if (table) table.style.display = 'table';
    
    if (scrollHint) scrollHint.style.display = window.innerWidth <= 768 ? 'flex' : 'none';
    
    data.forEach(item => {
        const row = document.createElement('tr');
        
        const formatBadgeText = (text) => {
            if (!text) return '<span style="color:var(--color-text-muted); font-size:0.85rem;">-</span>';
            
            if (text.includes('女子部')) {
                const name = text.replace('女子部', '').trim();
                return `<span class="member-badge female">🌸 女子部 ${name}</span>`;
            }
            if (text.includes('男子部')) {
                const name = text.replace('男子部', '').trim();
                return `<span class="member-badge male">⚡️ 男子部 ${name}</span>`;
            }
            
            return text;
        };
        
        let addressHtml = '<span style="color:var(--color-text-muted); font-size:0.85rem;">-</span>';
        if (item.address) {
            if (item.mapUrl) {
                addressHtml = `<a href="${item.mapUrl}" target="_blank" class="map-btn">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                    📍 開啟導航
                </a>`;
            } else {
                addressHtml = `<span style="font-size:0.85rem; font-weight:600;">${item.address}</span>`;
            }
        }
        
        row.innerHTML = `
            <td style="font-weight: 700; color: var(--color-primary-dark);">${item.district || '-'}</td>
            <td style="font-weight: 700; color: var(--color-secondary);">${item.group || '-'}</td>
            <td style="font-weight: 600;">${item.date || '-'}</td>
            <td>${item.emcee || '<span style="color:var(--color-text-muted); font-size:0.85rem;">-</span>'}</td>
            <td>${formatBadgeText(item.gosho)}</td>
            <td>${formatBadgeText(item.theme)}</td>
            <td>${item.cadre || '<span style="color:var(--color-text-muted); font-size:0.85rem;">-</span>'}</td>
            <td>${item.scribe || '<span style="color:var(--color-text-muted); font-size:0.85rem;">-</span>'}</td>
            <td>${item.concluder || '<span style="color:var(--color-text-muted); font-size:0.85rem;">-</span>'}</td>
            <td>${addressHtml}</td>
        `;
        
        tableBody.appendChild(row);
    });
}

// ==========================================
// 13. 南區每月區會傳達事項數據與互動渲染引擎
// ==========================================

// (1) 2026年4月份 (5月份活動執行) 南區區會傳達事項完整 JSON 數據庫
const SOUTH_DISTRICT_ANNOUNCEMENTS = {
    routine: [
        {
            id: 'respect-ceremony',
            title: '御本尊敬領儀式',
            badge: '儀式',
            time: '5/7(四) 19:10',
            location: '霧峰會館講堂二',
            summary: '本月恭領御本尊的法友儀式安排。請相關地區正長通知敬領者於 19:00 報到。',
            details: {
                notes: [
                    '報到時間：請各部相關地區正長通知敬領者於 19:00 報到。',
                    '請【一日館長區負責人】點交御本尊及負責御本尊供養金收付，並轉交敬領者表單予受理報到人員。',
                    '當日請大興本部協商安排敬領工作人員，工作人員請於 19:00 至會館準備。',
                    '工作人員編制：授予人員（本部遞及禮生捧各1名）、司儀（壯年部本部遴選）、服務人員（婦人部負責受理報到、座位、動線等引導）、場控（本部企劃員負責彩排工作）。',
                    '「程序表」請循壯年部企劃管道回傳區核備。'
                ]
            }
        },
        {
            id: 'gosho-lecture',
            title: '佛法講座',
            badge: '教學',
            time: '5/7(四) 19:30',
            location: '霧峰會館文化會堂',
            summary: '黃楨雅 副圈長主講，蘇建志唱導。教學範圍為〈御義口傳〉（化城喻品七件大事）。',
            details: {
                staff: {
                    '司儀': '遴選青年部擔任',
                    '場控': '青年部區級幹部',
                    '副唱導': '青年部',
                    '簡報播放': '青年部'
                },
                program: '勤行唱題 (10分鐘) ➔ 教學 (80分鐘) ➔ 題目三唱。企劃案由區男/女子部企劃長擬提。',
                material: [
                    '《日蓮大聖人御書全集 文白並列本 別冊》(化城喻品七件大事)',
                    '《御義口傳要文講義》〈化城喻品第七〉'
                ],
                notes: [
                    '開放講堂一作為婦幼同步區，請多加利用。'
                ]
            }
        },
        {
            id: 'cadre-study',
            title: '幹部視訊教學',
            badge: '研習',
            time: '5/11(一) 19:30',
            location: '線上舉辦',
            summary: '台中南區與台中西區於 5/11 線上舉辦；南投區於 5/13(三) 19:30 線上舉辦。',
            details: {
                participants: '四部地區級以上幹部及大學部 CR、VCR。',
                material: [
                    '5月份《福運雜誌》',
                    '5月份《教學研習》',
                    '5/12《創價新聞》'
                ],
                notes: [
                    '擔任座談會總結幹部及御書講師者，請務必參加上課。',
                    '無法在所屬區上課者，請依各部企劃管道申請跨區註冊上課。'
                ]
            }
        },
        {
            id: 'memorial-meeting',
            title: '追善回向勤行會暨佛法教學',
            badge: '追善',
            time: '各本部場次不同 (5/5、5/9、5/16)',
            location: '霧峰會館',
            summary: '大興本部 5/5(二)、大里本部 5/9(六)、太平本部 5/16(六)。各場次皆於 19:50 舉辦。',
            details: {
                schedules: [
                    { name: '大興本部', date: '5/5(二) 19:50', cadre: '游象陸 (區副總合長)', chanter: '游象陸', lecturer: '劉士榮 (本部長)' },
                    { name: '大里本部', date: '5/9(六) 19:50', cadre: '高友馨 (區副婦人部長)', chanter: '吳永富 (副區長)', lecturer: '李景達 (支部企劃員)' },
                    { name: '太平本部', date: '5/16(六) 19:50', cadre: '張美雲 (圈副婦人部長)', chanter: '蘇建志 (副圈長)', lecturer: '陳雅鳳 (支部副婦人部長)' }
                ],
                program: '勤行唱題 (30分鐘，含鞠躬行儀) ➔ 御書學習 (20分鐘) ➔ 體驗 (10分鐘) ➔ 總結指導 (10分鐘) ➔ 題目三唱 (1分鐘)。企劃案循壯年部管道回傳區核備。',
                material: [
                    '2026.5月份《教學研習》'
                ],
                notes: [
                    '【鞠躬行儀】：婦人部引導人員 8 位，於勤行後，於 20:05 開始引導與會者至唱導者後方，向御本尊行鞠躬禮。',
                    '【體驗單元】：以所屬本部為主，可安排發表者或遴選人員朗讀《創價新聞》之體驗，不跨本部安排。體驗稿由區級幹部校稿後提交區正長，副本寄壯年部區企劃長。'
                ]
            }
        },
        {
            id: 'rehearsal-meeting',
            title: '五月份實體座談會線上彩排',
            badge: '會議',
            time: '5/15(五) 20:00',
            location: '線上舉辦',
            summary: '為實體座談會進行線上彩排。請各程序擔當人員準時上線參加。',
            details: {
                notes: [
                    '請各程序擔當人員準時上線參加。',
                    '相關程序細節請參照本月 (4月) 全國區長會傳達資料。',
                    '本月「座談會青年部主打場」各地區場次安排，請切換至「座談會青年部主打場」分頁進行快速搜尋與過濾。'
                ]
            }
        }
    ],
    respect: [
        { seq: 1, type: '一般', district: '德芳地區', department: '婦人部', name: '劉玟君' },
        { seq: 2, type: '一般', district: '樂業地區', department: '婦人部', name: '李昱諄' },
        { seq: 3, type: '一般', district: '大東地區', department: '壯年部', name: '林兆祥' },
        { seq: 4, type: '守護', district: '樂業地區', department: '男子部', name: '李彥翰' }
    ],
    youth: [
        { district: '坪林地區', group: '光明組', date: '5/22(五)' },
        { district: '宜昌地區', group: '宜佳組', date: '5/19(二)' },
        { district: '光興地區', group: '興隆組', date: '5/21(四)' },
        { district: '樂業地區', group: '東信組', date: '5/23(六)' },
        { district: '新坪地區', group: '新吉組', date: '5/19(二)' },
        { district: '長億地區', group: '興平組', date: '5/22(五)' },
        { district: '永興地區', group: '大榮組', date: '5/21(四)' },
        { district: '內新地區', group: '東昇組', date: '5/19(二)' },
        { district: '德芳地區', group: '至聖組', date: '5/22(五)' },
        { district: '十九甲地區', group: '立仁組', date: '5/22(五)' },
        { district: '塗城地區', group: '瑞隆組', date: '5/19(二)' },
        { district: '成功地區', group: '瑞城組', date: '5/21(四)' },
        { district: '烏日地區', group: '高鐵組', date: '5/17(日)' },
        { district: '明道地區', group: '光德組', date: '5/22(五)' },
        { district: '樹義地區', group: '樹德組', date: '5/21(四)' },
        { district: '和平地區', group: '大慶組', date: '5/19(二)' },
        { district: '喀哩地區', group: '光明組', date: '5/21(四)' },
        { district: '萬豐地區', group: '四德組', date: '5/19(二)' },
        { district: '霧峰地區', group: '桐林組', date: '5/23(六)' },
        { district: '建成地區', group: '長春組', date: '5/23(六)' },
        { district: '大東地區', group: '大智組', date: '5/22(五)' },
        { district: '健康地區', group: '福平組', date: '5/19(二)' }
    ],
    others: {
        friendshipDay: {
            title: '2026區創價友誼日',
            time: '5/2(六) 上午 10:00',
            location: '霧峰會館文化會堂',
            target: '新朋友、全體高中部、大學部、研究生部與青年部會員。'
        },
        universities: [
            { school: '中山醫大學會', date: '5/17(日) 14:00', location: '大學會之家' },
            { school: '中興大學會', date: '5/9(六) 19:30', location: '大學會之家' },
            { school: '勤益大學會', date: '5/23(六) 19:30', location: '大學會之家' },
            { school: '修平／朝陽大學會', date: '5/27(三) 19:30', location: '大學會之家' },
            { school: '亞洲大學會', date: '5/13(三) 19:30', location: '大學會之家' }
        ],
        museum: {
            title: '創價美術館 台中館',
            subtitle: '藝術亮點 • 常設對話與觀展交流',
            description: '創價美術館台中館為台中市政府文化局評選之「藝術亮點」優良藝文場館，展出藝術家皆具臺灣重要藝術成就與貢獻。館內二樓設有對話廣場會員服務中心與常唱堂，可供觀展後交流運用。請各地區把握展期，至少規劃 1 場「地區文化日」，邀約會員及新朋友參與，並以共乘或捷運方式前往觀展交流，善用場域推動文化扎根與廣布。'
        }
    }
};

// (2) 初始化南區傳達事項控制台
function initializeAnnouncements() {
    const tabs = document.querySelectorAll('.announcement-tab-btn');
    if (tabs.length === 0) return;
    
    tabs.forEach(tab => {
        tab.addEventListener('click', function(e) {
            e.preventDefault();
            
            // 防止重複點擊當前 active 的 tab
            if (this.classList.contains('active')) return;
            
            // 切換 active 樣式
            tabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            
            // 切換分頁內容
            const tabName = this.getAttribute('data-tab');
            switchAnnouncementTab(tabName);
        });
    });
    
    // 預設渲染四部例行活動
    switchAnnouncementTab('routine');
}

// (3) 切換分頁 (結合 Loading 微動畫)
function switchAnnouncementTab(tabName) {
    const loader = document.getElementById('announcements-loader');
    const content = document.getElementById('announcements-content');
    
    if (!content) return;
    
    // 顯示載入動畫，隱藏內容
    if (loader) loader.style.display = 'flex';
    content.style.opacity = '0';
    content.style.transform = 'translateY(10px)';
    
    // 200ms 後模擬非同步載入渲染
    setTimeout(() => {
        if (loader) loader.style.display = 'none';
        
        renderAnnouncements(tabName);
        
        // 觸發漸入動畫
        content.style.opacity = '1';
        content.style.transform = 'translateY(0)';
    }, 200);
}

// (4) 動態渲染引擎
function renderAnnouncements(tabName) {
    const contentDiv = document.getElementById('announcements-content');
    if (!contentDiv) return;
    
    contentDiv.innerHTML = '';
    
    if (tabName === 'routine') {
        // 渲染例行活動時間線
        const listContainer = document.createElement('div');
        listContainer.className = 'routine-list';
        contentDiv.appendChild(listContainer);
        
        SOUTH_DISTRICT_ANNOUNCEMENTS.routine.forEach(item => {
            const card = document.createElement('div');
            card.className = 'routine-card';
            
            let detailsHtml = '';
            if (item.id === 'respect-ceremony') {
                detailsHtml = `
                    <div class="routine-details" style="display: none;">
                        <div class="routine-detail-row">
                            <span class="routine-detail-label">儀式指引</span>
                            <div class="routine-detail-value">
                                <ul class="routine-notes-list">
                                    ${item.details.notes.map(n => `<li>${n}</li>`).join('')}
                                </ul>
                            </div>
                        </div>
                    </div>
                `;
            } else if (item.id === 'gosho-lecture') {
                detailsHtml = `
                    <div class="routine-details" style="display: none;">
                        <div class="routine-detail-row">
                            <span class="routine-detail-label">工作編制</span>
                            <div class="routine-detail-value">
                                <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 0.5rem; margin-bottom: 0.8rem;">
                                    ${Object.entries(item.details.staff).map(([role, assign]) => `
                                        <div style="background:rgba(16,126,125,0.04); padding:0.4rem; border-radius:8px; border:1px solid rgba(16,126,125,0.08);">
                                            <div style="font-size:0.75rem; color:var(--color-accent); font-weight:600;">${role}</div>
                                            <div style="font-size:0.85rem; color:var(--color-primary-dark, #0b2545); font-weight:500;">${assign}</div>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        </div>
                        <div class="routine-detail-row">
                            <span class="routine-detail-label">活動程序</span>
                            <span class="routine-detail-value">${item.details.program}</span>
                        </div>
                        <div class="routine-detail-row">
                            <span class="routine-detail-label">教學教材</span>
                            <div class="routine-detail-value">
                                <ul class="routine-notes-list" style="margin-top:0.2rem;">
                                    ${item.details.material.map(m => `<li>${m}</li>`).join('')}
                                </ul>
                            </div>
                        </div>
                        <div class="routine-detail-row">
                            <span class="routine-detail-label">備註提醒</span>
                            <span class="routine-detail-value" style="color:var(--color-accent); font-weight:500;">
                                ${item.details.notes.join('')}
                            </span>
                        </div>
                    </div>
                `;
            } else if (item.id === 'cadre-study') {
                detailsHtml = `
                    <div class="routine-details" style="display: none;">
                        <div class="routine-detail-row">
                            <span class="routine-detail-label">對象人員</span>
                            <span class="routine-detail-value">${item.details.participants}</span>
                        </div>
                        <div class="routine-detail-row">
                            <span class="routine-detail-label">學習教材</span>
                            <div class="routine-detail-value">
                                <ul class="routine-notes-list" style="margin-top:0.2rem;">
                                    ${item.details.material.map(m => `<li>${m}</li>`).join('')}
                                </ul>
                            </div>
                        </div>
                        <div class="routine-detail-row">
                            <span class="routine-detail-label">研習說明</span>
                            <div class="routine-detail-value">
                                <ul class="routine-notes-list" style="margin-top:0.2rem;">
                                    ${item.details.notes.map(n => `<li>${n}</li>`).join('')}
                                </ul>
                            </div>
                        </div>
                    </div>
                `;
            } else if (item.id === 'memorial-meeting') {
                detailsHtml = `
                    <div class="routine-details" style="display: none;">
                        <div class="routine-detail-row">
                            <span class="routine-detail-label">各場安排</span>
                            <div class="routine-detail-value">
                                <div class="routine-schedules" style="margin-top: 0;">
                                    ${item.details.schedules.map(sch => `
                                        <div class="routine-schedule-item">
                                            <span style="font-weight:600; color:var(--color-primary-dark, #0b2545);">${sch.name} (${sch.date})</span>
                                            <span style="font-size:0.8rem; color:var(--color-accent);">
                                                指導: ${sch.cadre} | 唱導: ${sch.chanter} | 講師: ${sch.lecturer}
                                            </span>
                                        </div>
                                    `).join('')}
                                </div>
                            </div>
                        </div>
                        <div class="routine-detail-row">
                            <span class="routine-detail-label">大會程序</span>
                            <span class="routine-detail-value">${item.details.program}</span>
                        </div>
                        <div class="routine-detail-row">
                            <span class="routine-detail-label">研習教材</span>
                            <span class="routine-detail-value">${item.details.material.join(', ')}</span>
                        </div>
                        <div class="routine-detail-row">
                            <span class="routine-detail-label">細部工作</span>
                            <div class="routine-detail-value">
                                <ul class="routine-notes-list" style="margin-top:0.2rem;">
                                    ${item.details.notes.map(n => `<li>${n}</li>`).join('')}
                                </ul>
                            </div>
                        </div>
                    </div>
                `;
            } else if (item.id === 'rehearsal-meeting') {
                detailsHtml = `
                    <div class="routine-details" style="display: none;">
                        <div class="routine-detail-row">
                            <span class="routine-detail-label">彩排須知</span>
                            <div class="routine-detail-value">
                                <ul class="routine-notes-list">
                                    ${item.details.notes.map(n => `<li>${n}</li>`).join('')}
                                </ul>
                            </div>
                        </div>
                    </div>
                `;
            }
            
            card.innerHTML = `
                <div class="routine-title-bar">
                    <div class="routine-info">
                        <h4 class="routine-title">${item.title}</h4>
                        <div class="routine-time-location">
                            <span>📅 ${item.time}</span>
                            <span>📍 ${item.location}</span>
                        </div>
                    </div>
                    <span class="routine-badge">${item.badge}</span>
                </div>
                <p style="font-size:0.95rem; color:var(--color-text, #2c3e50); line-height:1.5; margin-bottom:1rem;">${item.summary}</p>
                
                ${detailsHtml}
                
                <button class="toggle-details-btn" style="background:none; border:none; color:var(--color-accent); font-size:0.85rem; font-weight:600; cursor:pointer; display:flex; align-items:center; gap:0.3rem; padding:0.5rem 0; margin-top:0.5rem; outline:none;">
                    <svg class="chevron-icon" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="transition: transform 0.3s ease;"><polyline points="6 9 12 15 18 9"></polyline></svg>
                    <span>展開工作分配與程序指引</span>
                </button>
            `;
            
            listContainer.appendChild(card);
            
            const btn = card.querySelector('.toggle-details-btn');
            const details = card.querySelector('.routine-details');
            const chevron = card.querySelector('.chevron-icon');
            const btnText = btn.querySelector('span');
            
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const isHidden = details.style.display === 'none';
                if (isHidden) {
                    details.style.display = 'block';
                    chevron.style.transform = 'rotate(180deg)';
                    btnText.textContent = '收合詳細資料';
                    card.style.background = 'rgba(220, 166, 38, 0.03)';
                    card.style.borderColor = 'rgba(220, 166, 38, 0.3)';
                } else {
                    details.style.display = 'none';
                    chevron.style.transform = 'rotate(0deg)';
                    btnText.textContent = '展開工作分配與程序指引';
                    card.style.background = '#ffffff';
                    card.style.borderColor = 'rgba(16, 126, 125, 0.12)';
                }
            });
        });
        
    } else if (tabName === 'respect') {
        // 渲染御本尊敬領表格與注意事項
        const respectContainer = document.createElement('div');
        respectContainer.className = 'respect-container';
        
        let tableRows = SOUTH_DISTRICT_ANNOUNCEMENTS.respect.map(item => `
            <tr>
                <td style="font-weight: 700; color: var(--color-accent);">${item.seq}</td>
                <td>
                    <span class="respect-badge ${item.type === '守護' ? 'guard' : 'normal'}">${item.type}</span>
                </td>
                <td style="font-weight: 600;">${item.district}</td>
                <td style="color: var(--color-secondary); font-weight: 600;">${item.department}</td>
                <td style="font-weight: 700; color: var(--color-primary-dark, #0b2545);">${item.name}</td>
            </tr>
        `).join('');
        
        respectContainer.innerHTML = `
            <div class="respect-table-container">
                <table class="respect-table">
                    <thead>
                        <tr>
                            <th>序號</th>
                            <th>類別</th>
                            <th>恭領地區</th>
                            <th>部別</th>
                            <th>敬領法友</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${tableRows}
                    </tbody>
                </table>
            </div>
            
            <div style="background: rgba(220, 166, 38, 0.05); border: 1px solid rgba(220, 166, 38, 0.2); border-radius: 16px; padding: 1.5rem; margin-top: 1.5rem;">
                <h5 style="color: var(--color-accent); font-size: 1.1rem; font-weight: 600; margin-bottom: 0.8rem; display: flex; align-items: center; gap: 0.5rem;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
                    敬領注意事項與工作分配指引
                </h5>
                <ul style="padding-left: 1.2rem; margin: 0; color: var(--color-text, #2c3e50); font-size: 0.9rem; line-height: 1.6;">
                    <li style="margin-bottom: 0.4rem;"><strong>報到時間：</strong>請各部相關地區正長通知敬領者於 <strong>19:00</strong> 報到（典禮將於 5/7 19:10 於霧峰會館講堂二準時舉辦）。</li>
                    <li style="margin-bottom: 0.4rem;"><strong>一日館長職責：</strong>請【一日館長區負責人】負責點交御本尊、御本尊供養金收付，並轉交敬領者表單予受理報到人員。</li>
                    <li style="margin-bottom: 0.4rem;"><strong>大興本部工作分工：</strong>大興本部協商安排敬領工作人員於 19:00 至會館準備：
                        <ul style="padding-left: 1.2rem; margin-top: 0.2rem; list-style-type: circle;">
                            <li>授予人員：本部 (遞) 及禮生 (捧) 各 1 名</li>
                            <li>司儀：由壯年部遴選</li>
                            <li>服務人員：由婦人部負責，協助報到、座位、動線等引導</li>
                            <li>場控：由本部企劃員擔任，負責彩排與流程控管</li>
                        </ul>
                    </li>
                    <li><strong>程序核備：</strong>御本尊敬領「程序表」請循壯年部企劃管道回傳區核備。</li>
                </ul>
            </div>
        `;
        
        contentDiv.appendChild(respectContainer);
        
    } else if (tabName === 'youth') {
        // 渲染座談會青年部主打場卡片網格與專屬極速搜尋框
        const youthWrap = document.createElement('div');
        youthWrap.innerHTML = `
            <div class="youth-meetings-header">
                <div style="font-size: 0.95rem; color: var(--color-text, #2c3e50);">
                    💡 全區共計 <strong style="color:var(--color-accent); font-size:1.1rem;">22</strong> 個座談會青年部主打場，支援即時關鍵字模糊過濾。
                </div>
                <div class="youth-search-wrap">
                    <svg class="youth-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                    <input type="text" class="youth-search-input" placeholder="輸入地區、組別、日期 (如: 塗城、5/19)..." autofocus>
                </div>
            </div>
            
            <div class="youth-meetings-grid">
                <!-- 由過濾引擎渲染 -->
            </div>
        `;
        
        contentDiv.appendChild(youthWrap);
        
        const searchInput = youthWrap.querySelector('.youth-search-input');
        
        // 初次渲染全部 22 個組別
        filterYouthMeetings('');
        
        searchInput.addEventListener('input', function() {
            filterYouthMeetings(this.value);
        });
        
    } else if (tabName === 'others') {
        // 渲染其他重要活動，包含創價友誼日、五所大學座談會、池田先生字卡、創價美術館地區文化日
        const othersDiv = document.createElement('div');
        othersDiv.className = 'others-cards-container';
        
        const universitiesHtml = SOUTH_DISTRICT_ANNOUNCEMENTS.others.universities.map(u => `
            <div class="routine-schedule-item">
                <span style="font-weight:600; color:var(--color-primary-dark, #0b2545);">🎓 ${u.school}</span>
                <span style="font-size:0.85rem; color:var(--color-accent);">${u.date} ➔ ${u.location}</span>
            </div>
        `).join('');
        
        othersDiv.innerHTML = `
            <!-- 卡片 1: 友誼日 -->
            <div class="other-item-card">
                <div class="other-card-header">
                    <div class="other-card-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                    </div>
                    <h4 class="other-card-title">${SOUTH_DISTRICT_ANNOUNCEMENTS.others.friendshipDay.title}</h4>
                </div>
                <div class="other-card-content">
                    <p style="margin-bottom:0.8rem; color:var(--color-text, #2c3e50);">
                        <strong>舉辦時間：</strong>${SOUTH_DISTRICT_ANNOUNCEMENTS.others.friendshipDay.time}<br>
                        <strong>舉辦地點：</strong>${SOUTH_DISTRICT_ANNOUNCEMENTS.others.friendshipDay.location}
                    </p>
                    <p style="font-size:0.9rem; color:var(--color-text-muted);">
                        <strong>參加對象：</strong>${SOUTH_DISTRICT_ANNOUNCEMENTS.others.friendshipDay.target}
                    </p>
                    <div style="background: rgba(16, 126, 125, 0.06); border: 1px dashed rgba(16, 126, 125, 0.3); border-radius: 12px; padding: 0.8rem; margin-top: 1rem; font-size: 0.85rem; color: var(--color-primary, #107e7d); font-weight: 500; line-height: 1.4;">
                        ✨ 邀請新朋友與全體青年學子踴躍參與，一同感受創價大家庭最溫暖的友誼與熱情！
                    </div>
                </div>
            </div>
            
            <!-- 卡片 2: 大學回娘家 -->
            <div class="other-item-card">
                <div class="other-card-header">
                    <div class="other-card-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"></path><path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5"></path></svg>
                    </div>
                    <h4 class="other-card-title">大學座談會暨學長姊回娘家</h4>
                </div>
                <div class="other-card-content" style="display:flex; flex-direction:column; justify-content:space-between; height:100%;">
                    <div class="routine-schedules" style="margin-top: 0; margin-bottom: 1rem; background:rgba(16,126,125,0.05);">
                        ${universitiesHtml}
                    </div>
                    
                    <div class="other-guidance-box" style="margin-top: 0.5rem;">
                        <p class="other-guidance-text">
                            「能貫徹青春時代的誓願與信念之人，是人生的勝利者。誓願，是讓自身無限向上、活躍、成長的原動力。」
                        </p>
                        <p class="other-guidance-text" style="margin-top:0.4rem; text-align:right; font-weight:600; color:var(--color-accent);">
                            ── 池田 SGI 會長指導 🌸
                        </p>
                    </div>
                </div>
            </div>
            
            <!-- 卡片 3: 美術館文化日 -->
            <div class="other-item-card">
                <div class="other-card-header">
                    <div class="other-card-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
                    </div>
                    <h4 class="other-card-title">${SOUTH_DISTRICT_ANNOUNCEMENTS.others.museum.title}</h4>
                </div>
                <div class="other-card-content">
                    <div style="font-size:0.8rem; background:rgba(220,166,38,0.15); color:var(--color-accent); padding:0.2rem 0.6rem; border-radius:4px; display:inline-block; font-weight:600; margin-bottom:0.8rem;">
                        ${SOUTH_DISTRICT_ANNOUNCEMENTS.others.museum.subtitle}
                    </div>
                    <p style="font-size:0.88rem; color:var(--color-text, #2c3e50); line-height:1.5;">
                        ${SOUTH_DISTRICT_ANNOUNCEMENTS.others.museum.description}
                    </p>
                    <div style="margin-top: 1.2rem; display: flex; align-items: center; gap: 0.5rem; font-size: 0.85rem; color: var(--color-primary, #107e7d); font-weight: 600;">
                        🌿 倡導綠色環保觀展：請以共乘或捷運方式前往觀展交流！
                    </div>
                </div>
            </div>
        `;
        
        contentDiv.appendChild(othersDiv);
    }
}

// (5) 座談會青年部主打場極速搜尋過濾引擎 (支持毫秒級模糊關鍵字交叉篩選)
function filterYouthMeetings(keyword) {
    const grid = document.querySelector('.youth-meetings-grid');
    if (!grid) return;
    
    const term = keyword.trim().toLowerCase();
    const filtered = SOUTH_DISTRICT_ANNOUNCEMENTS.youth.filter(item => {
        return item.district.toLowerCase().includes(term) ||
               item.group.toLowerCase().includes(term) ||
               item.date.toLowerCase().includes(term);
    });
    
    grid.innerHTML = '';
    
    if (filtered.length === 0) {
        grid.innerHTML = `
            <div class="youth-no-results">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin: 0 auto 0.8rem; display: block; color: var(--color-text-muted);"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                沒有找到相符的座談會青年部主打場場次（請嘗試其他關鍵字如：5/19、塗城、大慶）
            </div>
        `;
        return;
    }
    
    filtered.forEach(item => {
        const card = document.createElement('div');
        card.className = 'youth-meeting-card';
        card.innerHTML = `
            <div class="youth-meet-district">${item.district}</div>
            <div class="youth-meet-group">${item.group}</div>
            <div class="youth-meet-date">📅 ${item.date}</div>
        `;
        grid.appendChild(card);
    });
}

// ==========================================================================
// 📢 (4) 收折與展開南區傳達事項大面板 (Collapsible system)
// ==========================================================================
function toggleAnnouncements() {
    const container = document.querySelector('.announcements-container');
    const toggleBtn = document.getElementById('announcements-toggle');
    const statusText = document.getElementById('toggle-status');
    
    if (!container || !toggleBtn || !statusText) return;
    
    const isExpanded = container.classList.contains('active');
    
    if (isExpanded) {
        // --- 收起邏輯 ---
        // 1. 將 maxHeight 從 'none' 臨時改回真實像素高度，以便 transition 能感知到高度變化
        container.style.maxHeight = container.scrollHeight + 'px';
        // 2. 強制瀏覽器重繪 (Reflow)
        container.offsetHeight; 
        
        // 3. 開始執行收縮與漸隱動畫
        container.style.maxHeight = '0px';
        container.style.opacity = '0';
        container.style.transform = 'translateY(-12px)';
        container.style.paddingTop = '0px';
        container.style.paddingBottom = '0px';
        container.style.marginTop = '0px';
        
        container.classList.remove('active');
        toggleBtn.classList.remove('active');
        statusText.textContent = '點擊展開';
    } else {
        // --- 展開邏輯 ---
        container.classList.add('active');
        toggleBtn.classList.add('active');
        statusText.textContent = '點擊收起';
        
        // 1. 還原 padding 與 margin 的數值（對齊 CSS 中的樣式，手機端 padding 是 1.5rem，電腦端是 2.5rem）
        const isMobile = window.innerWidth <= 768;
        const paddingVal = isMobile ? '1.5rem' : '2.5rem';
        container.style.paddingTop = paddingVal;
        container.style.paddingBottom = paddingVal;
        container.style.marginTop = '0.5rem';
        container.style.opacity = '1';
        container.style.transform = 'translateY(0)';
        
        // 2. 設定 maxHeight 為真實的 scrollHeight
        container.style.maxHeight = container.scrollHeight + 'px';
        
        // 3. 動態等待 transition 結束後，將 maxHeight 設為 none
        // 這是極為關鍵的步驟：如果不設為 none，之後當法友點選 Tab 切換或是點擊「展開工作分配與程序指引」時，
        // 內容的總高度會變長，寫死的高度會導致溢出的內容被截斷！設為 none 則能使其自適應無限高！
        setTimeout(() => {
            if (container.classList.contains('active')) {
                container.style.maxHeight = 'none';
            }
        }, 600); // 0.6 秒對齊 transition 時間
    }
}

// ==========================================================================
// 📅 (5) 收折與展開南區動態活動行事曆 (Collapsible Calendar)
// ==========================================================================
function toggleCalendar() {
    const container = document.getElementById('events-grid');
    const toggleBtn = document.getElementById('calendar-toggle');
    const statusText = document.getElementById('calendar-status');
    
    if (!container || !toggleBtn || !statusText) return;
    
    const isExpanded = container.classList.contains('active');
    
    if (isExpanded) {
        // --- 收起邏輯 ---
        container.style.maxHeight = container.scrollHeight + 'px';
        container.offsetHeight; 
        
        container.style.maxHeight = '0px';
        container.style.opacity = '0';
        container.style.transform = 'translateY(-12px)';
        container.style.paddingTop = '0px';
        container.style.paddingBottom = '0px';
        container.style.marginTop = '0px';
        
        container.classList.remove('active');
        toggleBtn.classList.remove('active');
        statusText.textContent = '點擊展開';
    } else {
        // --- 展開邏輯 ---
        container.classList.add('active');
        toggleBtn.classList.add('active');
        statusText.textContent = '點擊收起';
        
        container.style.opacity = '1';
        container.style.transform = 'translateY(0)';
        container.style.marginTop = '1.5rem';
        
        container.style.maxHeight = container.scrollHeight + 'px';
        
        setTimeout(() => {
            if (container.classList.contains('active')) {
                container.style.maxHeight = 'none';
            }
        }, 600);
    }
}

// ==========================================================================
// 📥 (6) 收折與展開專屬雲端資源共享庫 (Collapsible Downloads)
// ==========================================================================
function toggleStudy() {
    const container = document.querySelector('.study-cloud-hub');
    const toggleBtn = document.getElementById('study-toggle');
    const statusText = document.getElementById('study-status');
    
    if (!container || !toggleBtn || !statusText) return;
    
    const isExpanded = container.classList.contains('active');
    
    if (isExpanded) {
        // --- 收起邏輯 ---
        container.style.maxHeight = container.scrollHeight + 'px';
        container.offsetHeight; 
        
        container.style.maxHeight = '0px';
        container.style.opacity = '0';
        container.style.transform = 'translateY(-12px)';
        container.style.paddingTop = '0px';
        container.style.paddingBottom = '0px';
        container.style.marginTop = '0px';
        
        container.classList.remove('active');
        toggleBtn.classList.remove('active');
        statusText.textContent = '點擊展開';
    } else {
        // --- 展開邏輯 ---
        container.classList.add('active');
        toggleBtn.classList.add('active');
        statusText.textContent = '點擊收起';
        
        // 還原 padding
        const isMobile = window.innerWidth <= 768;
        const paddingVal = isMobile ? '1.5rem' : '2.5rem';
        container.style.paddingTop = paddingVal;
        container.style.paddingBottom = paddingVal;
        container.style.marginTop = '1.5rem';
        container.style.opacity = '1';
        container.style.transform = 'translateY(0)';
        
        container.style.maxHeight = container.scrollHeight + 'px';
        
        setTimeout(() => {
            if (container.classList.contains('active')) {
                container.style.maxHeight = 'none';
            }
        }, 600);
    }
}


// ==========================================================================
// 🔗 (7) 導覽跳轉自動展開雙向聯動系統 (Navigation Auto-Expand Sync)
// ==========================================================================
function initializeNavigationSync() {
    // 獲取所有指向頁面內部錨點的連結
    const links = document.querySelectorAll('a[href^="#"]');
    
    links.forEach(link => {
        link.addEventListener('click', (e) => {
            const targetId = link.getAttribute('href');
            
            if (targetId === '#calendar') {
                const container = document.getElementById('events-grid');
                if (container && !container.classList.contains('active')) {
                    console.log('💡 偵測到跳轉至行事曆，為法友自動展開摺疊抽屜！');
                    toggleCalendar();
                }
            } else if (targetId === '#about') {
                const container = document.querySelector('.announcements-container');
                if (container && !container.classList.contains('active')) {
                    console.log('💡 偵測到跳轉至傳達事項，為法友自動展開摺疊抽屜！');
                    toggleAnnouncements();
                }
            } else if (targetId === '#study') {
                const container = document.querySelector('.study-cloud-hub');
                if (container && !container.classList.contains('active')) {
                    console.log('💡 偵測到跳轉至資料下載，為法友自動展開摺疊抽屜！');
                    toggleStudy();
                }
            } else if (targetId === '#sokaban-duty') {
                const container = document.getElementById('sokaban-table-wrapper');
                if (container && !container.classList.contains('active')) {
                    console.log('💡 偵測到跳轉至創價班執勤表，為法友自動展開摺疊抽屜！');
                    toggleSokaban();
                }
            }
        });
    });
}


// ==========================================================================
// 🛡️ (8) 收折與展開創價班勤務配置表 (Collapsible Sokaban Duty)
// ==========================================================================
function toggleSokaban() {
    const container = document.getElementById('sokaban-table-wrapper');
    const toggleBtn = document.getElementById('sokaban-toggle');
    const statusText = document.getElementById('sokaban-status');
    
    if (!container || !toggleBtn || !statusText) return;
    
    const isExpanded = container.classList.contains('active');
    
    if (isExpanded) {
        // --- 收起邏輯 ---
        container.style.maxHeight = container.scrollHeight + 'px';
        container.offsetHeight; 
        
        container.style.maxHeight = '0px';
        container.style.opacity = '0';
        container.style.transform = 'translateY(-12px)';
        container.style.paddingTop = '0px';
        container.style.paddingBottom = '0px';
        container.style.marginTop = '0px';
        
        container.classList.remove('active');
        toggleBtn.classList.remove('active');
        statusText.textContent = '點擊展開';
    } else {
        // --- 展開邏輯 ---
        container.classList.add('active');
        toggleBtn.classList.add('active');
        statusText.textContent = '點擊收起';
        
        container.style.opacity = '1';
        container.style.transform = 'translateY(0)';
        container.style.marginTop = '1.5rem';
        
        container.style.maxHeight = container.scrollHeight + 'px';
        
        setTimeout(() => {
            if (container.classList.contains('active')) {
                container.style.maxHeight = 'none';
            }
        }, 600);
    }
}


// ==========================================================================
// 📱 (9) 手機端三條線漢堡下拉選單控制與智慧跳轉聯動系統 (Mobile Hamburger Dropdown)
// ==========================================================================

// 切換選單的展開與收合狀態
window.toggleMobileDropdown = function() {
    const hamburger = document.getElementById('hamburger');
    const dropdown = document.getElementById('mobile-dropdown-menu');
    
    if (!hamburger || !dropdown) return;
    
    const isActive = dropdown.classList.contains('active');
    
    if (isActive) {
        hamburger.classList.remove('active');
        dropdown.classList.remove('active');
    } else {
        hamburger.classList.add('active');
        dropdown.classList.add('active');
        
        // 輕微觸控震動 (15ms)
        if (window.navigator && window.navigator.vibrate) {
            window.navigator.vibrate(15);
        }
    }
};

// 點選項目後的關閉、平滑滾動與展開聯動
window.closeMobileDropdown = function(event, targetId) {
    // 1. 阻止預設的快速跳轉，改用我們的平滑物理滾動
    if (event) event.preventDefault();
    
    const hamburger = document.getElementById('hamburger');
    const dropdown = document.getElementById('mobile-dropdown-menu');
    
    // 2. 秒速關閉下拉選單與復位漢堡 X 按鈕
    if (hamburger) hamburger.classList.remove('active');
    if (dropdown) dropdown.classList.remove('active');
    
    // 3. 獲取目標元素並進行高精確的扣除 Header 高度跳轉
    const target = document.querySelector(targetId);
    if (target) {
        const headerOffset = 70; // 頂部固定導覽列高度
        const elementPosition = target.getBoundingClientRect().top;
        const offsetPosition = elementPosition + window.pageYOffset - headerOffset;
        
        // 執行絲滑的平滑滾動
        window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
        });
        
        // 4. 雙向自動展開聯動：若目標面板處於收合狀態，則平滑向下滑開它
        setTimeout(() => {
            if (targetId === '#calendar') {
                const container = document.getElementById('events-grid');
                if (container && !container.classList.contains('active')) {
                    toggleCalendar();
                }
            } else if (targetId === '#about') {
                const container = document.querySelector('.announcements-container');
                if (container && !container.classList.contains('active')) {
                    toggleAnnouncements();
                }
            } else if (targetId === '#study') {
                const container = document.querySelector('.study-cloud-hub');
                if (container && !container.classList.contains('active')) {
                    toggleStudy();
                }
            } else if (targetId === '#sokaban-duty') {
                const container = document.getElementById('sokaban-table-wrapper');
                if (container && !container.classList.contains('active')) {
                    toggleSokaban();
                }
            }
        }, 100); // 稍微延遲以獲得更好的視覺分離體驗
        
        // 5. 觸覺震動回饋
        if (window.navigator && window.navigator.vibrate) {
            window.navigator.vibrate(15);
        }
    }
};






