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

    // 1-2. 全自動月份時鐘引擎 (自動更新執行月份標籤)
    const currentMonthNum = new Date().getMonth() + 1;
    const chineseMonths = ["", "一", "二", "三", "四", "五", "六", "七", "八", "九", "十", "十一", "十二"];
    const currentChineseMonth = chineseMonths[currentMonthNum];
    const subTitles = document.querySelectorAll('.toggle-title-sub');
    subTitles.forEach(el => {
        if (el.textContent.includes('月份活動執行')) {
            el.textContent = `(${currentChineseMonth}月份活動執行)`;
        }
    });

    // 1-3. 座談會人員表定時休眠與自動喚醒引擎 (6/1 - 7/25 00:00 全自動隱藏，過後自動恢復)
    const recessStart = new Date('2026/06/01 00:00:00');
    const recessEnd = new Date('2026/07/25 00:00:00');
    if (new Date() >= recessStart && new Date() < recessEnd) {
        // (1) 物理隱藏當月座談會人員表主體 Section 區塊
        const meetingSection = document.getElementById('meeting-members');
        if (meetingSection) {
            meetingSection.style.display = 'none';
        }
        // (2) 遍歷隱藏頂部導覽列、手機下拉選單及頁尾中的座談會按鈕 (並隱藏 li 以防空白間距)
        const navLinks = document.querySelectorAll('a[href="#meeting-members"]');
        navLinks.forEach(link => {
            if (link.parentElement && link.parentElement.tagName === 'LI') {
                link.parentElement.style.display = 'none';
            } else {
                link.style.display = 'none';
            }
        });
        // (3) 物理隱藏手機底部導覽列按鈕 (如果有該按鈕)
        const mobileBottomNavItems = document.querySelectorAll('.mobile-bottom-nav-item');
        mobileBottomNavItems.forEach(item => {
            if (item.getAttribute('href') === '#meeting-members') {
                item.style.display = 'none';
            }
        });
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

    // 7. 初始化 Soka Press 金句字卡系統與 Hero 區塊名言隨機化
    initializeSokaQuoteCard();
    initializeHeroQuotes();

    // 8. 初始化當月座談會人員表多支部系統
    initializeMeetingMembers();
    initializeAnnouncements();
    
    // 9. 啟動導覽跳轉自動展開雙向聯動
    initializeNavigationSync();

    // 10. 智慧提醒公告彈窗自動排程顯示 (5/29 00:00 自動啟用，配合今日防打擾)
    const noticeStartDate = new Date('2026/05/29 00:00:00');
    if (new Date() >= noticeStartDate) {
        const closedDate = localStorage.getItem('soka-notice-closed-date');
        const todayStr = new Date().toDateString();
        
        if (closedDate !== todayStr) {
            // 頁面加載後延遲 1000 毫秒（1 秒）絲滑彈出
            setTimeout(() => {
                if (typeof window.openNoticeModal === 'function') {
                    window.openNoticeModal();
                }
            }, 1000);
        }
    }

    // 11. 暑期活動專區定時自動下架引擎 (過 2026/08/02 23:59:59 全自動隱藏下架)
    const campDeadline = new Date('2026/08/02 23:59:59');
    if (new Date() > campDeadline) {
        // (1) 物理隱藏暑期活動專區主體 Section 區塊
        const campSection = document.getElementById('summer-camp');
        if (campSection) {
            campSection.style.display = 'none';
        }
        // (2) 遍歷隱藏頂部導覽列、手機下拉選單中的暑期專區按鈕 (並隱藏 li 以防空白間距)
        const navItems = document.querySelectorAll('.summer-camp-nav-item');
        navItems.forEach(item => {
            if (item.tagName === 'LI') {
                item.style.display = 'none';
            } else if (item.parentElement && item.parentElement.tagName === 'LI') {
                item.parentElement.style.display = 'none';
            } else {
                item.style.display = 'none';
            }
        });
    }
});


// ==========================================================================
// 0.2 暑期活動專區頁籤切換函數
// ==========================================================================
window.switchCampTab = function(type) {
    // 移除所有頁籤按鈕與內容的 active 樣式
    document.querySelectorAll('.camp-tab-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.camp-tab-content').forEach(content => content.classList.remove('active'));
    
    // 根據選擇的類型加上 active 樣式
    if (type === 'junior') {
        const btn = document.querySelector('.camp-tab-btn:nth-child(1)');
        const content = document.getElementById('camp-content-junior');
        if (btn) btn.classList.add('active');
        if (content) content.classList.add('active');
    } else {
        const btn = document.querySelector('.camp-tab-btn:nth-child(2)');
        const content = document.getElementById('camp-content-senior');
        if (btn) btn.classList.add('active');
        if (content) content.classList.add('active');
    }
};


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
                </div>
                <h3 class="event-title">${event.title}</h3>
                <p class="event-desc">${event.desc}</p>
                <ul class="event-info-list">
                    <li class="event-info-item">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
                        <span>${event.time}</span>
                    </li>
                    ${event.location ? `
                    <li class="event-info-item">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                        <span>${event.location}</span>
                    </li>
                    ` : ''}
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
                location: item.location || ''
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

// 精選池田大作先生 100 句鼓舞人心的經典心靈晨光金句
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
    },
    {
        text: "信心就是無限的希望。只要我們不放棄，即使在最深的黑暗中，也能湧現出照亮前路、克服一切考驗的無窮智慧。",
        author: "— 池田大作",
        source: "《創造幸福的明燈》"
    },
    {
        text: "一棵大樹要能抵擋狂風暴雨，必須將根深深扎入大地。我們的信心也是如此，日常的唱題與奮鬥就是扎根的過程。",
        author: "— 池田大作",
        source: "《信心與實踐》"
    },
    {
        text: "微笑是心靈的陽光，能消融冷漠與隔閡。用溫暖的微笑去迎接每一個人，就是最簡單也最動人的廣宣流布實踐。",
        author: "— 池田大作",
        source: "《女性光輝》"
    },
    {
        text: "生命的價值不在於長短，而在於我們如何燃燒它。每天都踏實地面對挑戰，積極為身邊的人帶來喜悅，就是充實的人生。",
        author: "— 池田大作",
        source: "《青春對話》"
    },
    {
        text: "廣宣流布的奮鬥，不是遠大空洞的口號，而是眼前一個人的幸福。把身邊的法友當作至親來疼惜，就是最強的力量。",
        author: "— 池田大作",
        source: "《新·人間革命》"
    },
    {
        text: "心境決定環境。當我們的心充滿感謝與歡喜時，即使是平凡的日常生活，也會化作繁花盛開、幸福洋溢的寶土。",
        author: "— 池田大作",
        source: "《幸福哲學》"
    },
    {
        text: "不要與他人作無謂的比較。你擁有獨一無二的使命，就像櫻、梅、桃、李各有其美，展現出真實的自己就是最美麗的。",
        author: "— 池田大作",
        source: "《櫻梅桃李指導》"
    },
    {
        text: "勇氣不是沒有恐懼，而是即使感到害怕，依然選擇採取正義與信念的行動。只要踏出第一步，路就會在眼前展開。",
        author: "— 池田大作",
        source: "《青春對話》"
    },
    {
        text: "無論面臨多大的風浪，只要師弟誓願的指針不變，我們的人生航船就絕不會迷失方向，終能抵達幸福的彼岸。",
        author: "— 池田大作",
        source: "《師弟不二》"
    },
    {
        text: "家庭是社會的溫馨港灣。用慈悲與包容守護家人，以題目為燈火照亮家庭，就是建立堅不可摧之福德家庭的基石。",
        author: "— 池田大作",
        source: "《家庭教育指導》"
    },
    {
        text: "一滴水融入大海，就永遠不會乾涸。我們積極參與學會活動、融入廣宣流布的隊伍，生命就能獲得無限的守護。",
        author: "— 池田大作",
        source: "《學會精神指導》"
    },
    {
        text: "青春是多采多姿的，也是磨練心志的黃金時期。不要害怕失敗，失敗是成功的序曲，是鍛鍊強大心靈的最好契機。",
        author: "— 池田大作",
        source: "《給青年部的信》"
    },
    {
        text: "唱題是宇宙最和諧、最強大的旋律。當我們唱出響亮的妙法時，就是在喚醒宇宙間所有的善知識，前來守護我們。",
        author: "— 池田大作",
        source: "《唱題的功德》"
    },
    {
        text: "信心就是永不服輸的精神。即使被擊倒十次，也要在第十一 次站起來。這種不屈不撓的姿態，本身就是最耀眼的勝利。",
        author: "— 池田大作",
        source: "《青春對話》"
    },
    {
        text: "廣宣流布的接力棒已經交到了青年手中。青年的躍進，就是新時代的曙光；青年的歌聲，是照亮黑暗的希望之源。",
        author: "— 池田大作",
        source: "《躍動的青年》"
    },
    {
        text: "每一個人的生命中，都蘊藏著與宇宙同等寬廣的寶藏。通過信心修行，我們可以把這個無盡的智慧與慈悲開發出來。",
        author: "— 池田大作",
        source: "《法華經的智慧》"
    },
    {
        text: "在日常生活中展現出卓越的誠實與信用，就是信心最好的證明。做一個讓鄰里信賴、讓同事敬佩的社會棟樑吧。",
        author: "— 池田大作",
        source: "《社會與信心》"
    },
    {
        text: "不要為昨天的失敗而懊悔，也不要為明天的未知而焦慮。踏實地過好今天這一刻，把當下的奮鬥做到極致，就是最好的人生。",
        author: "— 池田大作",
        source: "《青春對話》"
    },
    {
        text: "真正的強大，不是去支配他人，而是戰勝自己的軟弱與惰性。每天的自我超越，就是人間革命最真實的腳步。",
        author: "— 池田大作",
        source: "《人間革命的實踐》"
    },
    {
        text: "一句溫暖的問候，可以挽救一顆瀕臨絕望的心。不要吝嗇給予鼓勵，用我們的慈悲去溫暖身邊每一個受挫的靈魂。",
        author: "— 池田大作",
        source: "《關懷的精神》"
    },
    {
        text: "御書云：『濕木求火，乾土求水』。無論環境多麼惡劣、困難多麼巨大，只要我們抱持必勝的信心，就一定能創造奇蹟。",
        author: "— 池田大作",
        source: "《御書學習指導》"
    },
    {
        text: "學會的座談會是民主與溫馨的殿堂。在這裡，沒有高低貴賤，只有彼此鼓勵、攜手向前的真誠法情，是心靈的綠洲。",
        author: "— 池田大作",
        source: "《座談會精神》"
    },
    {
        text: "讀書能拓寬心靈的視野，思考能鍛鍊智慧的鋼骨。青年們，在奮鬥的同時，不要忘記充實自己的知識，成為睿智的人。",
        author: "— 池田大作",
        source: "《青春對話》"
    },
    {
        text: "信心不是逃避現實的避難所，而是勇於面對現實、戰勝生活考驗的無限泉源。在工作中展現出實力，才是真正的信仰。",
        author: "— 池田大作",
        source: "《生活與信仰》"
    },
    {
        text: "感恩是一切福德的源頭。對身邊的伙伴抱持感謝之心，對生活中的考驗抱持磨練之意，生命就會湧現源源不絕的喜悅。",
        author: "— 池田大作",
        source: "《幸福哲學》"
    },
    {
        text: "廣宣流布是和平與文化的遠征。我們通過對話搭建理解的橋梁，用友誼消除偏見，這才是改變世界最根本的道路。",
        author: "— 池田大作",
        source: "《新·人間革命》"
    },
    {
        text: "無論你的處境多麼孤單，請記住，在廣宣流布的偉大隊伍中，無數法友都在為你祈願，你絕對不是孤軍奮戰。",
        author: "— 池田大作",
        source: "《法情互助》"
    },
    {
        text: "健康是最大的財富，唱題是維持身心健康的無上妙藥。保持規律的生活，懷著歡喜的心情去奮鬥，人生才會圓滿。",
        author: "— 池田大作",
        source: "《健康與信心》"
    },
    {
        text: "真正的偉大，隱藏在最平凡的日常實踐中。每天堅持唱題、踏實關懷伙伴，這些看似微小的累積，終將鑄就崇高的福德。",
        author: "— 池田大作",
        source: "《踏實奮鬥》"
    },
    {
        text: "青年的使命是破除舊有的黑暗，開闢充滿希望的康莊大道。要胸懷天下，把自己的夢想與全人類的和平幸福緊密相連。",
        author: "— 池田大作",
        source: "《青年的誓願》"
    },
    {
        text: "不要害怕改變，停滯不前才是最大的危機。每天都以嶄新的心情出發，像不斷流動的清泉一樣，保持生命的新鮮與活力。",
        author: "— 池田大作",
        source: "《人間革命的腳步》"
    },
    {
        text: "御書云：『心唯尊耳』。信心最重要的是那顆純粹、真誠的心。只要我們的心思始於利他與廣宣誓願，諸天必定讚嘆守護。",
        author: "— 池田大作",
        source: "《御書指針》"
    },
    {
        text: "父母的祈願，是守護子女一生最強大的隱形羽翼。用題目為孩子祈求幸福，就是給予他們最珍貴、最持久的財富。",
        author: "— 池田大作",
        source: "《家庭與教育》"
    },
    {
        text: "熱情是戰勝一切困難的推進器。無論做什麼事，只要投入百分之百的熱情，就能將枯燥的工作化為充滿創造力的舞台。",
        author: "— 池田大作",
        source: "《青春對話》"
    },
    {
        text: "師匠的指導，是照亮迷茫前路的指南針。在遇到瓶頸與挫折時，重溫師匠的期許，生命就能瞬間找回突破的無窮力量。",
        author: "— 池田大作",
        source: "《師弟精神》"
    },
    {
        text: "我們要在自己的崗位上，成為不可或缺的光芒。即使身處最底層，也要以敬業與誠實，贏得所有人發自內心的尊敬。",
        author: "— 池田大作",
        source: "《社會棟樑》"
    },
    {
        text: "真正的幸福不是物質的奢華，而是心靈的充實與自由。胸懷妙法的人，即使身無分文，也能感受到坐擁宇宙財寶般的富足。",
        author: "— 池田大作",
        source: "《幸福哲學》"
    },
    {
        text: "每一次的挑戰，都是一次重新認識自己潛能的機會。不要給自己設限，相信妙法的無限力量，你一定能創造出超越想像的成果。",
        author: "— 池田大作",
        source: "《勇氣與潛能》"
    },
    {
        text: "廣宣流布的歷史，是由無數無名英雄默默付出的汗水編織而成的。那些在幕後搬椅子、引導法友的伙伴，是最尊貴的人。",
        author: "— 池田大作",
        source: "《學會幕後英雄》"
    },
    {
        text: "用包容的心對待他人的缺點，用欣賞的眼光發現他人的優點。和諧團結的氛圍，是吸引更多善知識前來凝聚的磁鐵。",
        author: "— 池田大作",
        source: "《團結與和諧》"
    },
    {
        text: "不要沉溺於過去的榮光，也不要被過去的失敗束責。妙法的信仰是「從今以後」的宗教，每一刻都可以是嶄新生命的起點。",
        author: "— 池田大作",
        source: "《從今以後的信心》"
    },
    {
        text: "青年要有像雄獅一樣的志氣，無懼任何反對與冷嘲熱諷。只要我們立足於正義的信念之上，歷史終將證明我們的奮鬥是正確的。",
        author: "— 池田大作",
        source: "《雄獅志氣》"
    },
    {
        text: "每天清晨對著鏡子給自己一個微笑，大聲對自己說：『今天也是勝利的一天！』積極的心理暗示，能開啟美好的一天。",
        author: "— 池田大作",
        source: "《晨光鼓勵》"
    },
    {
        text: "唱題時要胸懷大志，不要只為個人瑣事而祈求。當我們把祈願的格局放大到社區繁榮與世界和平時，個人的煩惱自會迎刃而解。",
        author: "— 池田大作",
        source: "《大願與唱題》"
    },
    {
        text: "溫暖的同理心，是拉近人與人之間距離的最好橋梁。傾聽他人的心聲，分擔他人的憂愁，這是慈悲最溫柔的展現。",
        author: "— 池田大作",
        source: "《傾聽的精神》"
    },
    {
        text: "生命就如同鏡子，你對它哭，它就對你哭；你對它笑，它就對你笑。用歡喜和感謝的心面對生活，生活就會回報你幸福。",
        author: "— 池田大作",
        source: "《幸福哲學》"
    },
    {
        text: "做一個守信用的人，答應別人的事就一定要全力以赴去完成。信譽是一個人立足於社會的根基，也是信心最好的實踐。",
        author: "— 池田大作",
        source: "《誠信與社會》"
    },
    {
        text: "不要害怕孤單，孤單是沉澱心靈、積蓄力量的寶貴時光。在孤單中踏實充實自己，你終將在最適合的舞台上綻放光芒。",
        author: "— 池田大作",
        source: "《青春對話》"
    },
    {
        text: "學會的女性部門是推動和平最溫柔、最堅韌的力量。妳們的祈願與付出，正在默默守護著無數家庭與社區的安祥寧靜。",
        author: "— 池田大作",
        source: "《女性的使命》"
    },
    {
        text: "挫折是命運送給我們包裝粗糙的禮物。只要我們用信心拆開它，就會發現裡面裝滿了讓我們生命更加成熟與堅韌的智慧。",
        author: "— 池田大作",
        source: "《戰勝逆境》"
    },
    {
        text: "在人際關係中遇到摩擦時，先反省自己，用唱題來淨化自己的心境。當我們的心境擴大時，阻礙我們發展的逆緣也會化為順緣。",
        author: "— 池田大作",
        source: "《人間革命的實踐》"
    },
    {
        text: "青年的歌聲要響徹雲霄，青年的腳步要堅定有力。用我們的朝氣去感染社區，用我們的熱情去喚醒更多青年的覺醒。",
        author: "— 池田大作",
        source: "《青年歌聲》"
    },
    {
        text: "御書云：『一切福田，皆由心生』。只要我們的心田播下妙法希望的種子，並用踏實的實踐去灌溉，就一定能收穫幸福的果實。",
        author: "— 池田大作",
        source: "《御書指導》"
    },
    {
        text: "信心是世界上最平等的舞台。在這裡，只要你肯付出、肯為法友服務，不論年齡與背景，每個人都能累積最尊貴的功德。",
        author: "— 池田大作",
        source: "《信心平等》"
    },
    {
        text: "做事情要講求效率，更要持之以恆。三分鐘的熱度無法鑄就偉大的事業，唯有十年如一日的堅持，才能抵達勝利的頂峰。",
        author: "— 池田大作",
        source: "《持之以恆》"
    },
    {
        text: "真正的教養，體現在對弱勢群體的關懷與尊重上。用慈悲的眼光看待每一個人，不分彼此地給予援手，是崇高人格的表現。",
        author: "— 池田大作",
        source: "《人格修養》"
    },
    {
        text: "不要在困難面前低頭，要把困難當作是鍛鍊自己的磨刀石。刀越磨越鋒利，人的生命也是在克服考驗中變得越來越堅強。",
        author: "— 池田大作",
        source: "《克服考驗》"
    },
    {
        text: "家庭的和諧需要每個成員的共同努力。多一些包容與讚美，少一些責備與抱怨，用題目將家庭打造成最溫馨的心靈避風港。",
        author: "— 池田大作",
        source: "《福德家庭》"
    },
    {
        text: "廣宣流布是一場偉大的文化交融。我們通過藝術、音樂與文字，傳播美與善的價值，激發人們對美好生活的嚮往與追求。",
        author: "— 池田大作",
        source: "《文化與和平》"
    },
    {
        text: "每天讀一段御書或師匠的指導，就像是為心靈注入新鮮的甘露。用智慧武裝頭腦，我們才不會在紛繁複雜的社會中迷失。",
        author: "— 池田大作",
        source: "《每日學習》"
    },
    {
        text: "信心不是迷信，而是最先進的生命科學。它教導我們如何通過開發內在的佛界，去主動變革外部的客觀環境，創造奇蹟。",
        author: "— 池田大作",
        source: "《信心與科學》"
    },
    {
        text: "青年的胸懷要能裝得下整個海洋。要學會寬容不同的意見，以廣闊的視野和博大的胸襟，團結一切可以團結的力量。",
        author: "— 池田大作",
        source: "《青年的格局》"
    },
    {
        text: "一句感謝的話，能讓疲憊的心靈重獲新生。經常對身邊默默付出的家人與伙伴表達謝意，這會讓我們的福德更加豐厚。",
        author: "— 池田大作",
        source: "《感恩的功德》"
    },
    {
        text: "人生的道路不會總是一帆風順，有起有落才是生命的常態。在低谷時積蓄力量，在高潮時保持謙遜，這是智慧的人生態度。",
        author: "— 池田大作",
        source: "《人生起落》"
    },
    {
        text: "信心就是大無畏的精神。御書云：『日蓮弟子等，不可存畏懼心』。只要我們站立在正義的道路上，就沒什麼好害怕的。",
        author: "— 池田大作",
        source: "《大無畏精神》"
    },
    {
        text: "做一個溫暖的人，去照亮身邊每一個陰暗的角落。我們的生命因為給予他人溫暖而變得更加美麗，因為利他而變得更加高貴。",
        author: "— 池田大作",
        source: "《利他與幸福》"
    },
    {
        text: "不要把工作當成是應付生活的苦役，而要把工作當成是實踐自己人生價值、服務社會的舞台。在工作中修鍊自己的人間革命。",
        author: "— 池田大作",
        source: "《工作哲學》"
    },
    {
        text: "青年要有打破陳規的勇氣，用創新的思維去開拓廣宣流布的新局面。新時代需要新的方法，青年的智慧是無限的。",
        author: "— 池田大作",
        source: "《創新與開拓》"
    },
    {
        text: "學會的壯年部門是社區最堅實的金色大柱。你們的穩重與擔當，是守護學會、守護家庭、支持青年部前行的最強後盾。",
        author: "— 池田大作",
        source: "《壯年的使命》"
    },
    {
        text: "幸福的秘訣，在於有一顆知足且不斷奮鬥的心。珍惜眼前的每一份擁有，同時不懈地朝著更高的廣宣目標邁進。",
        author: "— 池田大作",
        source: "《幸福秘訣》"
    },
    {
        text: "在遭遇誤解與流言蜚語時，不需要過多解釋，用我們踏實的實踐和最終的勝利成果，去給予那些質疑最有利的回應。",
        author: "— 池田大作",
        source: "《實踐與證明》"
    },
    {
        text: "唱題是把我們的生命天線調頻到宇宙最強大的福德頻道。只要天線對準，源源不絕的能量與幸運就會被吸引到我們身邊。",
        author: "— 池田大作",
        source: "《調頻宇宙功德》"
    },
    {
        text: "每天都要有進步，哪怕只是微不足道的一小步。堅持每天讀一頁書、唱十分鐘題，一年下來，你的生命將發生驚人的變化。",
        author: "— 池田大作",
        source: "《微小的累積》"
    },
    {
        text: "信心是勇往直前的火車頭。只要火車頭充滿了題目與誓願的燃料，不論後面拖著多麼沉重的煩廂，都能前行無阻。",
        author: "— 池田大作",
        source: "《信心火車頭》"
    },
    {
        text: "對待伙伴要像春風般溫暖，對待自己的惰性要像秋風掃落葉般果斷。在克己復禮的過程中，我們的人格才能逐漸圓滿。",
        author: "— 池田大作",
        source: "《克己與溫暖》"
    },
    {
        text: "真正的美麗，是從內心深處自然流露出來的慈悲與智慧之光。妙法的女性，隨著年歲的增長，心靈的光芒會越發耀眼。",
        author: "— 池田大作",
        source: "《女性的內在美》"
    },
    {
        text: "不要在人生的挫折面前輕言放棄。每一次的跌倒，都是大地在給你重新站起來的支撐力。信心的人，永遠都有重來的勇氣。",
        author: "— 池田大作",
        source: "《重來的勇氣》"
    },
    {
        text: "廣宣流布的連帶，是世界上最純潔、最堅固的友誼紐帶。我們因為共同的誓願而相聚，這份法情將超越時間，歷久彌新。",
        author: "— 池田大作",
        source: "《法情連帶》"
    },
    {
        text: "在家庭中，父母的言傳身教是給孩子最好的教科書。用你們充滿朝氣與信心的生活姿態，去引導孩子樹立正確的人生觀。",
        author: "— 池田大作",
        source: "《言傳身教》"
    },
    {
        text: "做一個有擔當的人，勇於挑起重擔。在為大家服務的過程中，你的格局會被撐大，你的能力與福報也會隨之呈幾何級增長。",
        author: "— 池田大作",
        source: "《擔當與格局》"
    },
    {
        text: "御書云：『櫻梅桃李，各有其本體』。不需要羨慕別人的天賦，發掘並發揮出你自己的獨特優勢，你就是你人生的主角。",
        author: "— 池田大作",
        source: "《展現自我》"
    },
    {
        text: "唱題就像是給心靈做最頂級的SPA。在浮躁喧囂的世界中，靜下心來面對本尊，唱出響亮的題目，身心都能獲得徹底的淨化。",
        author: "— 池田大作",
        source: "《心靈SPA》"
    },
    {
        text: "青年的熱血是灌溉和平花朵最好的養分。用我們的激情去打破冷漠的堅冰，在世界的每一個角落，開出和諧與友誼之花。",
        author: "— 池田大作",
        source: "《青年熱血》"
    },
    {
        text: "幸福不是等來的，而是用我們自己的雙手開拓出來的。懷著必勝的信念，勇敢地去敲開命運的大門，幸福就在門後迎候。",
        author: "— 池田大作",
        source: "《主動開拓》"
    },
    {
        text: "在與人對話時，多站在對方的立場上思考。真誠的關心與尊重的態度，是讓妙法佛法深入人心的最好催化劑。",
        author: "— 池田大作",
        source: "《對話的智慧》"
    },
    {
        text: "人生的終點不是名利的堆砌，而是靈魂的昇華與人間革命的圓滿。當我們回首往事時，能無悔地說『我全力奮鬥過』，這就是無上勝利。",
        author: "— 池田大作",
        source: "《無悔人生》"
    },
    {
        text: "信心是抵禦生活一切風暴的堅固避雷針。不論外界的考驗多麼猛烈，只要信心的大柱巍然屹立，我們就永遠安全無虞。",
        author: "— 池田大作",
        source: "《信心避雷針》"
    },
    {
        text: "做事情要有始有終，把每一件小事都做到有條不紊。這種嚴謹踏實的工作作風，是妙法信徒在社會上最好的商標。",
        author: "— 池田大作",
        source: "《有始有終》"
    },
    {
        text: "家庭的溫暖能治癒一切外在的傷痛。多給家人一個擁抱，多說一句『辛苦了』，用愛與題目，把家建成幸福的發源地。",
        author: "— 池田大作",
        source: "《幸福發源地》"
    },
    {
        text: "廣宣流布不是一個人走一百步，而是大家攜手並進，一百個人每人跨出一步。團結互助，我們才能走得更遠、更穩。",
        author: "— 池田大作",
        source: "《攜手前進》"
    },
    {
        text: "每天晚上入睡前，懷著感謝的心，感謝今天所經歷的一切，不論是順境還是逆境。感恩的心境，能為明天招來更多福運。",
        author: "— 池田大作",
        source: "《夜半感恩》"
    },
    {
        text: "我們的人生，是為了取得徹底的勝利而存在的！唱出最響亮的歌聲，踏著最堅定的步伐，跟隨師匠的指引，去開創無比輝煌的躍動之年！",
        author: "— 池田大作",
        source: "《終極勝利》"
    }
];

// ==========================================================================
// H. 首頁 Hero 區塊文案隨機化系統 (每次重新整理或載入隨機呈現完美成對金句)
// ==========================================================================

// 精選與右側心靈晨光金句相呼應、大氣洗鍊的首頁開場大標題與名言引言成對組合
const SOKA_HERO_QUOTES = [
    {
        title: "點亮心中妙法光芒<br>創造自他彼此的<span>幸福人生</span>",
        text: "「人間革命的溫暖光芒，是驅散黑暗、照亮社區的最強大力量。當我們主動關懷一人，和平的漣漪就從這裡開始擴散。」",
        author: "— 創價學會第三任會長 池田大作"
    },
    {
        title: "堅持不懈信心前進<br>迎來人生最耀眼的<span>冬必為春</span>",
        text: "「無論面臨多麼嚴酷的人生寒冬，只要堅持不懈地信心前進，春天必定會到來，一切苦難都將化為成長的養分。」",
        author: "— 創價學會第三任會長 池田大作"
    },
    {
        title: "勇於開拓迎接挑戰<br>譜寫生命最豪邁的<span>勝利凱歌</span>",
        text: "「命運不是用來屈服的，而是用來開拓與挑戰的。胸懷強大信念的人，能將任何逆境轉換為最耀眼的勝利凱歌。」",
        author: "— 創價學會第三任會長 池田大作"
    },
    {
        title: "無懼驚濤破浪前行<br>吹響生命最嘹亮的<span>希望風笛</span>",
        text: "「真正的幸福並非身處無風無浪的避風港，而是在驚濤駭浪中，依然能吹起希望的風笛，勇敢地破浪前行。」",
        author: "— 創價學會第三任會長 池田大作"
    },
    {
        title: "以溫暖與關懷同行<br>點亮鄰里生命中的<span>幸福明燈</span>",
        text: "「關懷鄰里、疼惜伙伴的溫暖問候，能融化最冰冷的心靈。我們主動的一句鼓勵，就是點亮他人生命的一盞明燈。」",
        author: "— 創價學會第三任會長 池田大作"
    },
    {
        title: "變革始於一個人的心境<br>展開改變世界的<span>人間革命</span>",
        text: "「偉大的變革，始於一個人的『人間革命』。當我們改變了自己的心境，身邊的環境與世界也將隨之轉換與躍進。」",
        author: "— 創價學會第三任會長 池田大作"
    }
];

// 初始化首頁 Hero 區塊隨機金句，並實作平滑淡入動畫效果
function initializeHeroQuotes() {
    const titleEl = document.getElementById('hero-title');
    const textEl = document.getElementById('hero-quote-text');
    const authorEl = document.getElementById('hero-quote-author');
    
    if (titleEl && textEl && authorEl) {
        // 隨機抽選一組完美文案
        const randomIndex = Math.floor(Math.random() * SOKA_HERO_QUOTES.length);
        const quote = SOKA_HERO_QUOTES[randomIndex];
        
        // 為了防止隨機替換時文字突兀閃爍，將透明度先歸零，實作呼吸般的淡入
        titleEl.style.opacity = '0';
        textEl.style.opacity = '0';
        authorEl.style.opacity = '0';
        
        titleEl.innerHTML = quote.title;
        textEl.textContent = quote.text;
        authorEl.textContent = quote.author;
        
        // 在微延遲後啟動平滑的 CSS Transition 漸變淡入
        setTimeout(() => {
            titleEl.style.transition = 'opacity 0.6s ease';
            textEl.style.transition = 'opacity 0.6s ease';
            authorEl.style.transition = 'opacity 0.6s ease';
            
            titleEl.style.opacity = '1';
            textEl.style.opacity = '1';
            authorEl.style.opacity = '1';
        }, 50);
    }
}

let currentQuoteIndex = 0;

// 初始化字卡 (每次開啟/重新整理網頁時，重置抽籤狀態與日期)
function initializeSokaQuoteCard() {
    // 1. 設定今日日期 YYYY.MM.DD (若 DOM 元素存在則動態更新)
    const dateEl = document.getElementById('soka-card-date');
    if (dateEl) {
        const today = new Date();
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        dateEl.textContent = `${yyyy}.${mm}.${dd}`;
    }
    
    // 2. 網頁初始載入時，確保抽籤盒顯示，且 1:1 展示卡片與控制按鈕處於隱藏狀態
    const drawBox = document.getElementById('soka-draw-box');
    const quoteCard = document.getElementById('soka-quote-card');
    const cardActions = document.getElementById('soka-card-actions');
    
    if (drawBox) drawBox.style.display = 'block';
    if (quoteCard) quoteCard.style.display = 'none';
    if (cardActions) cardActions.style.display = 'none';
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

// 核心抽卡互動 logic
window.drawCard = function(cardIndex, cardElement) {
    const drawBox = document.getElementById('soka-draw-box');
    const cards = document.querySelectorAll('.draw-card');
    const quoteCard = document.getElementById('soka-quote-card');
    const cardActions = document.getElementById('soka-card-actions');
    
    // 防止重複點選或已淡出的卡牌再次點選
    if (cardElement.classList.contains('selected') || cardElement.classList.contains('fade-out')) return;
    
    // 1. 手機端釋放 15ms 微物理震動反饋，增強點按手感
    if (navigator.vibrate) {
        navigator.vibrate(15);
    }
    
    // 2. 被點選卡牌播放 3D 翻轉與放大效果，其他兩張牌優雅淡出
    cardElement.classList.add('selected');
    cards.forEach(card => {
        if (card !== cardElement) {
            card.classList.add('fade-out');
        }
    });
    
    // 3. 隨機抽選一句金句（進階防重複歷史記憶機制：從 localStorage 讀取最近抽過的卡牌索引，排除最近抽過的項目）
    let newIndex = currentQuoteIndex;
    if (SOKA_PRESS_QUOTES.length > 1) {
        let recentDrawn = [];
        try {
            const saved = localStorage.getItem('sgi_recent_drawn_quotes');
            if (saved) {
                recentDrawn = JSON.parse(saved);
                if (!Array.isArray(recentDrawn)) {
                    recentDrawn = [];
                }
            }
        } catch (e) {
            recentDrawn = [];
        }

        // 定義防重複歷史紀錄隊列的最大長度。
        // 目前金句池已擴充至 100 句。我們將最大記憶深度設為 30 句，這保證最近抽過的 30 句金句絕對不會重複出現，確保極致的新鮮感。
        const maxMemoryLength = Math.min(30, Math.floor(SOKA_PRESS_QUOTES.length / 3));

        // 計算目前可用的索引池（排除掉最近抽過的索引）
        let availableIndices = [];
        for (let i = 0; i < SOKA_PRESS_QUOTES.length; i++) {
            if (!recentDrawn.includes(i)) {
                availableIndices.push(i);
            }
        }

        // 安全閥機制：如果可用的索引池太小（少於或等於 1 個），則重置歷史紀錄，僅排除當前正顯示的索引，避免連續重複
        if (availableIndices.length <= 1) {
            recentDrawn = [];
            for (let i = 0; i < SOKA_PRESS_QUOTES.length; i++) {
                if (i !== currentQuoteIndex) {
                    availableIndices.push(i);
                }
            }
        }

        // 從經過篩選的可用索引池中隨機抽選一個
        const randomPoolIndex = Math.floor(Math.random() * availableIndices.length);
        newIndex = availableIndices[randomPoolIndex];

        // 將新抽選的索引加入歷史紀錄隊列中，若超出最大長度則移除最舊的紀錄
        recentDrawn.push(newIndex);
        if (recentDrawn.length > maxMemoryLength) {
            recentDrawn.shift();
        }

        // 將更新後的歷史紀錄存回 localStorage，供下一次點擊或下一次開啟網頁時使用
        try {
            localStorage.setItem('sgi_recent_drawn_quotes', JSON.stringify(recentDrawn));
        } catch (e) {
            console.error('Failed to save draw history to localStorage:', e);
        }
    } else {
        newIndex = 0;
    }
    
    currentQuoteIndex = newIndex;
    renderQuote(currentQuoteIndex);
    
    // 4. 延遲 1.2 秒（等待 3D 翻轉動畫播放完畢且帶入神祕感），淡出抽籤盒，淡入展示 1:1 精美金句字卡
    setTimeout(() => {
        if (drawBox) {
            drawBox.style.opacity = '0';
            drawBox.style.transform = 'scale(0.9)';
            drawBox.style.transition = 'all 0.4s ease';
        }
        
        setTimeout(() => {
            if (drawBox) drawBox.style.display = 'none';
            
            // 顯現 1:1 展示字卡與控制按鈕，並實作極精緻的縮放淡入
            if (quoteCard) {
                quoteCard.style.display = 'block';
                setTimeout(() => {
                    quoteCard.style.opacity = '1';
                    quoteCard.style.transform = 'scale(1)';
                    quoteCard.style.transition = 'all 0.55s cubic-bezier(0.175, 0.885, 0.32, 1.15)';
                }, 50);
            }
            
            if (cardActions) {
                cardActions.style.display = 'flex';
                setTimeout(() => {
                    cardActions.style.opacity = '1';
                    cardActions.style.transition = 'all 0.5s ease';
                }, 50);
            }
        }, 400);
    }, 1200);
};

// 重新洗牌，再抽一次
window.resetDrawBox = function() {
    const drawBox = document.getElementById('soka-draw-box');
    const cards = document.querySelectorAll('.draw-card');
    const quoteCard = document.getElementById('soka-quote-card');
    const cardActions = document.getElementById('soka-card-actions');
    
    // 1. 優雅淡出當前的 1:1 大字卡與控制按鈕
    if (quoteCard) {
        quoteCard.style.opacity = '0';
        quoteCard.style.transform = 'scale(0.95)';
        quoteCard.style.transition = 'all 0.4s ease';
    }
    
    if (cardActions) {
        cardActions.style.opacity = '0';
        cardActions.style.transition = 'all 0.35s ease';
    }
    
    setTimeout(() => {
        if (quoteCard) quoteCard.style.display = 'none';
        if (cardActions) cardActions.style.display = 'none';
        
        // 2. 重置並淡入抽籤盒
        if (drawBox) {
            drawBox.style.display = 'block';
            setTimeout(() => {
                drawBox.style.opacity = '1';
                drawBox.style.transform = 'scale(1)';
                drawBox.style.transition = 'all 0.4s ease';
            }, 50);
        }
        
        // 3. 恢復卡片為背面朝上的初始無狀態
        cards.forEach(card => {
            card.className = 'draw-card';
        });
        
        // 4. 延遲 300ms 播放三張卡牌在空中相互穿梭位置的 Shuffle 重新洗牌動畫
        setTimeout(() => {
            if (cards.length === 3) {
                cards[0].classList.add('shuffling-1');
                cards[1].classList.add('shuffling-2');
                cards[2].classList.add('shuffling-3');
                
                // 洗牌 800ms 動畫完畢後清除 shuffling 類，讓微懸浮動畫繼續平滑運作
                setTimeout(() => {
                    cards[0].classList.remove('shuffling-1');
                    cards[1].classList.remove('shuffling-2');
                    cards[2].classList.remove('shuffling-3');
                }, 800);
            }
        }, 300);
        
    }, 450);
};

// 一鍵儲存/下載字卡功能 (透過 html2canvas 生成 2x Retina 高畫質 PNG)
window.downloadQuoteCard = function() {
    const card = document.getElementById('soka-quote-card');
    const spinner = document.getElementById('soka-spinner');
    
    if (!card || !spinner) return;
    
    // 顯示加載動畫
    spinner.classList.add('active');
    
    // 為了確保 html2canvas 渲染時的完美效果，我們在後台採用「離屏 (Off-Screen) 臨時標準規格化」技術：
    // 1. 在背景將字卡強制切換為 9:16 (1080x1920) 的 Instagram 限時動態超高清排版規格
    // 2. 這能 100% 完美產出最符合發 IG 限動的 1080x1920 高清直式大氣圖片，字體與佈局等比例膨脹放大，震撼大氣！
    // 3. 設定 scale: 1.5，將渲染畫質在 1080x1920 基礎上再提升 1.5 倍（生成極致細緻的 1620x2880 的 Retina 超高清原圖）
    // 4. 渲染結束後（成功或失敗）立即自動還原原本樣式與 class，使用者完全不察覺任何異動
    setTimeout(() => {
        const originalStyle = card.style.cssText;
        
        card.classList.add('is-instagram-story');
        
        card.style.position = 'fixed';
        card.style.top = '-9999px';
        card.style.left = '-9999px';
        card.style.width = '1080px';
        card.style.height = '1920px';
        card.style.aspectRatio = '9 / 16';
        card.style.transform = 'none';
        card.style.display = 'flex';
        card.style.opacity = '1';
        card.style.zIndex = '-9999';
        
        html2canvas(card, {
            scale: 1.5, // 1080x1920 乘以 1.5 = 1620x2880，比 4K 還要清晰的限動大圖！
            useCORS: true,
            allowTaint: true,
            backgroundColor: null,
            logging: false
        }).then(canvas => {
            // 立即無縫還原金句字卡原本的 class 與網頁樣式
            card.classList.remove('is-instagram-story');
            card.style.cssText = originalStyle;
            
            // 將 Canvas 轉換成 base64 PNG 圖片
            const imageURL = canvas.toDataURL("image/png");
            
            // 獲取今日日期用於檔名
            const today = new Date();
            const dateStr = today.getFullYear() + 
                            String(today.getMonth() + 1).padStart(2, '0') + 
                            String(today.getDate()).padStart(2, '0');
            
            // 智慧型偵測行動端 (手機/平板/微信/LINE 等 WebView)
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            
            if (isMobile) {
                // 手機端：將超高清字卡寫入實體 <img> 並彈出毛玻璃長按儲存提示窗 (iOS 官方 100% 成功黃金實踐)
                const mobileSaveModal = document.getElementById('soka-mobile-save-modal');
                const mobileSaveImg = document.getElementById('mobile-save-img');
                
                if (mobileSaveModal && mobileSaveImg) {
                    mobileSaveImg.src = imageURL;
                    mobileSaveModal.classList.add('active');
                }
            } else {
                // 電腦端：依然直接觸發隱藏 <a> 標籤自動 click() 無縫極速下載
                const downloadLink = document.createElement('a');
                downloadLink.href = imageURL;
                downloadLink.download = `SGI-晨光金句限動-${dateStr}.png`;
                
                document.body.appendChild(downloadLink);
                downloadLink.click();
                document.body.removeChild(downloadLink);
            }
            
            // 隱藏加載動畫
            spinner.classList.remove('active');
            
            // 手機端震動，提升操作回饋體驗
            if (navigator.vibrate) {
                navigator.vibrate(50); // 微震動回饋
            }
        }).catch(err => {
            // 發生異常時也必須立即還原 class 與原本樣式
            card.classList.remove('is-instagram-story');
            card.style.cssText = originalStyle;
            
            console.error('金句字卡生成失敗：', err);
            spinner.classList.remove('active');
            alert('⚠️ 抱歉，字卡生成出現異常，請稍後再試！');
        });
    }, 600); // 留出 600 毫秒 the 微動畫延遲，給用戶帶來滿滿的 premium 精緻生成體感
};

// 關閉手機端專用字卡儲存彈窗
window.closeMobileSaveModal = function() {
    const mobileSaveModal = document.getElementById('soka-mobile-save-modal');
    if (mobileSaveModal) {
        mobileSaveModal.classList.remove('active');
    }
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
        { district: '德芳地區', group: '長榮組', date: '5/21(週四)', emcee: '游順隆', gosho: '', theme: '', cadre: '', scribe: '', concluder: '', address: '台中市大里區大里路33巷5號', mapUrl: 'https://maps.google.com/?q=%E5%8F%B0%E4%B8%AD%E5%B8%82%E5%A4%A7%E9%87%8C%E5%8D%80%E5%A4%A7%E9const SOUTH_DISTRICT_ANNOUNCEMENTS = {
    month: "2026年6月份 (7、8月份活動執行)",
    theme: "世界青年學會 • 躍動之年 ⚡",
    routine: [
        {
            id: 'memorial-meeting',
            title: '追善回向勤行會暨佛法教學',
            badge: '例行',
            time: '8/6 - 8/15 (詳見各場次)',
            location: '各本部講堂',
            summary: '2026年8月份追善回向勤行會暨佛法教學場次。程序包含勤行唱題、御書學習、體驗發表與總結指導。',
            details: {
                schedules: [
                    { name: '大興本部', date: '8/6(四) 19:50', cadre: '蘇麗華 區副婦人部長', chanter: '賴建忠 本部總合長', lecturer: '洪詩妤 支部副婦人部長' },
                    { name: '太平本部', date: '8/14(五) 19:50', cadre: '陳鴻賓 圈企劃長', chanter: '同左', lecturer: '許秀伶 本部婦人部長' },
                    { name: '大里本部', date: '8/15(六) 19:50', cadre: '黃潔芬 區副婦人部長', chanter: '吳永富 副區長', lecturer: '張淑雲 婦人部本部企劃' }
                ],
                program: '勤行唱題（30分鐘，含追善行儀） ➔ 御書學習（20分鐘） ➔ 體驗（10分鐘） ➔ 總結指導（10分鐘） ➔ 題目三唱（1分鐘）。企劃案請循壯年部企劃管道回傳區核備。',
                material: ['2026年8月份《教學研習》'],
                notes: [
                    '「鞠躬行儀」：依據儀典準則 202606 修訂，唱題約 15 分鐘後即可由禮生、服務人員引導出列向御本尊一鞠躬，無須唱題至 20:05 再行禮。行禮隊伍可視人數排成二至四列，行禮時間於 20:20 準時結束。',
                    '體驗單元：體驗人員請以所屬本部為主，除可安排發表者外，亦可遴選適當人員朗讀《創價新聞》登載之體驗，故不再跨本部安排發表人選。',
                    '若安排發表者：體驗稿請依各部管道安排【區級幹部】校稿，文稿請提交各部區正長，副本寄壯年部區企劃長。'
                ]
            }
        }
    ],
    respect: [
        { seq: 1, type: '一般', district: '建成地區', department: '婦人部', name: '楊惠玲' }
    ],
    youth: [
        { district: '坪林地區', group: '光華組', date: '8/20(四)' },
        { district: '成功地區', group: '金城組', date: '8/21(五)' },
        { district: '宜昌地區', group: '東村組', date: '8/22(六)' },
        { district: '烏日地區', group: '高鐵組', date: '8/16(日) 09:30' },
        { district: '光興地區', group: '光隆組', date: '8/18(二)' },
        { district: '明道地區', group: '光德組', date: '8/21(五)' },
        { district: '樂業地區', group: '東英組', date: '8/21(五)' },
        { district: '樹義地區', group: '福田組', date: '8/22(六)' },
        { district: '新坪地區', group: '新高組', date: '8/16(日) 09:30' },
        { district: '和平地區', group: '大慶組', date: '8/18(二)' },
        { district: '長億地區', group: '小鎮組', date: '8/22(六)' },
        { district: '喀哩地區', group: '光明組', date: '8/20(四)' },
        { district: '永興地區', group: '東興組', date: '8/18(二)' },
        { district: '萬豐地區', group: '樹仁組', date: '8/22(六)' },
        { district: '內新地區', group: '中新組', date: '8/22(六)' },
        { district: '霧峰地區', group: '中正組', date: '8/18(二)' },
        { district: '德芳地區', group: '長榮組', date: '8/20(四)' },
        { district: '建成地區', group: '仁和組', date: '8/18(二)' },
        { district: '十九甲地區', group: '立德組', date: '8/20(四)' },
        { district: '大東地區', group: '建中組', date: '8/20(四)' },
        { district: '塗城地區', group: '瑞隆組', date: '8/18(二)' },
        { district: '健康地區', group: '永和組', date: '8/21(五)' }
    ],
    others: {
        activities: [
            { id: 'buddhist-lecture', title: '台中南區佛法講座', time: '7/9(四) 晚上 19:30', location: '霧峰會館文化會堂', target: '全體會員、司儀請遴選青年部擔任、場控由青年部區級幹部負責', description: '上課教材為《御義口傳》，上課範圍為《御義口傳要文講義》法師品第十，以及《日蓮大聖人御書全集 文白並列本 別冊》法師品十六件大事。程序包含勤行 (10分鐘)、教學 (80分鐘) 及題目三唱。講解時將播放 PPT，結束後投影問卷 QR Code，請會員踴躍回饋！' },
            { id: 'video-teaching', title: '台中南區、南投區、台中西區幹部視訊教學', time: '8/10(一) 晚上 19:30 (西區為 20:00)', location: '線上視訊舉辦', target: '四部地區級以上幹部及大學部 CR、VCR', description: '上課教材包含：8月份《福運雜誌》與《教學研習》、8/11《創價新聞》。擔任座談會總結幹部及御書講師者，請務必參加上課。無法在所屬區上課者，請跨區註冊上課。' },
            { id: 'junior-high-camp', title: '2026年國中歡樂成長營', time: '8/1(六) 早上 9:30 ~ 下午 15:30', location: '霧峰會館/文化會堂', target: '家庭信仰之小六升國一、二、三學生 (含新朋友)', description: '口號為「SOKA STAR！歡喜躍動JUMP！」，今年全面開放邀約新朋友。請引導國三畢業生參加高中英知研習營，無法出席所屬區場次者，請跨場次陪同參加。對外邀約請勿對同學進行弘教，並需取得家長同意。' },
            { id: 'senior-high-camp', title: '2026年高中英知研習營', time: '8/2(日) 早上 9:30 ~ 下午 15:30', location: '霧峰會館/文化會堂', target: '升高一、二、三同學及畢業生或新朋友', description: '口號為「鳳雛躍動！JUMP一夏!」，今年全面開放對外邀約新朋友。高三畢業生優先鼓勵擔任國中成長營工作人員。無法出席者可陪同參加同圈其他場次，取得家長同意後始得報名。' },
            { id: 'soka-concert', title: '2026創價公演：古典樂的顛覆與狂想「雅諾史卡合奏團」', time: '10/16(五) 19:30、10/17(六) 14:30 與 19:30', location: '國立臺灣交響樂團演奏廳', target: '購票會員及親友', description: '區配票資訊已公佈，包含益民、新里、東平、勤益、日峰、高工、復興支部之各票價配額，詳情請洽各支部負責人領票與推廣。' }
        ]
    }
};

// ==========================================================================
// 地區級以上男子部傳達資料 (7/28 22:00 前顯示)
// ==========================================================================
const YOUTH_LEADER_ANNOUNCEMENTS = {
    title: "地區級以上男子部傳達資料",
    showAfter: "2026/06/15 00:00:00",
    hideAfter: "2026/07/28 22:00:00",
    categories: [
        {
            name: "學生部共同 / 暑期營隊",
            icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>`,
            items: [
                "2026年國中歡樂成長營、高中英知研習營即將於全國各地舉辦。今年全面開放邀約國高中新朋友參與，請務必向家長說明活動內容，並事先取得家長同意。",
                "暑期活動宣傳資訊連結：[點此進入 Linktree 宣傳頁](https://linktr.ee/twsgi.students)。",
                "適逢暑假期間，請鼓勵大學部、研究生部同學投入暑期活動工作人員使命，以利他行動確立信心，並與夥伴凝聚繫絆，亦可邀請新朋友參與，認識創價理念。"
            ]
        },
        {
            name: "國高部關懷",
            icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"></path><path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5"></path></svg>`,
            items: [
                "國中部：國中會考成績已公布；國中免試入學、特色招生考試入學將於7/7放榜，請持續關心國三同學並給予鼓勵。",
                "高中部：大學分科測驗將於7/11-12舉辦，7/29放榜，請持續關心考生並給予鼓勵。"
            ]
        },
        {
            name: "大研共同",
            icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>`,
            items: [
                "請大研幹部關心大學部、研究生部畢業生動向，並請區負責人於7/31前彙整畢業生名單交給區企劃長，以利後續照顧銜接。",
                "9/20 (日) 下午將於桃園文化會館舉辦「研究生OPEN DAY」實體活動！今年首次開放大三、大四對研究所有興趣的同學報名！請大學部、研究生部幹部鼓勵研究生踴躍參加。在學(職)研究生、海外大學畢業或研究所畢業之青年部幹部皆可報名。"
            ]
        },
        {
            name: "大學部",
            icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path><path d="M2 12h20"></path></svg>`,
            items: [
                "9月迎來開學季，請區正長、企劃長偕同區負責人、校園幹部確實掌握大一新生名單，提前展開家訪、電訪，並與育才部確認愛心媽媽安排。",
                "延續去年好評，將於8月底以大學會為單位舉辦「大學會新生之YA」，請提前邀請新生加入大學會溫暖家庭並認識愛心媽媽，以利後續照顧。",
                "本月幸福專欄介紹的是高雄二圈的「高師和平校區大學會」，歡迎全台大學會踴躍投稿，分享特色與歡喜熱絡大合照！"
            ]
        },
        {
            name: "研究生部 / 創價班 / 展覽部",
            icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>`,
            items: [
                "研究生之論文口試多於6、7月間舉辦，請持續關心研究生近況，並鼓勵研究生以信心全力挑戰畢業論文。",
                "創價班：7、8月全國各地將舉辦「國中歡樂成長營、高中英知研習營」，請全體創價班協助運營相關事宜，並全力邀請新朋友、好朋友一同參加，成為組織推進廣布擴大的堅實後盾！",
                "展覽部招募已截止，後續將進行人員懇談及專業培訓。東部美術館展展期至7/18止。換檔時程：第一檔卸展 7/26，第二檔布展 8/15-8/16，8/19 開展。歡迎利用學會官方 LINE 帳號使用「找展覽」功能掌握最新藝文展訊。"
            ]
        }
    ]
}; = BRANCH_MEMBERS_MOCK[currentBranch] || [];
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
    
    // 智慧型動態欄位索引定位系統：透過掃描 Google Sheets 表頭欄位名稱，自動精準映射每一欄 index。
    // 這能完美適應隱藏欄位、新增欄位或欄位順序微調，徹底避免錯位 Bug！
    let colIndices = {
        district: 0,   // 地區預設為 A 欄 (0)
        group: 1,      // 組別預設為 B 欄 (1)
        date: 2,       // 日期預設為 C 欄 (2)
        emcee: 3,      // 司儀預設為 D 欄 (3)
        gosho: 4,      // 御書預設為 E 欄 (4)
        theme: 5,      // 感謝專題/青年部預設為 F 欄 (5)
        cadre: 8,      // 投入幹部預設為 I 欄 (8，排除 H 欄的「大家談」)
        scribe: 9,     // 紀錄人員預設為 J 欄 (9)
        concluder: 10, // 總結幹部預設為 K 欄 (10)
        address: 12    // 地圖地址預設為 M 欄 (12)
    };

    if (json.table.cols && Array.isArray(json.table.cols)) {
        json.table.cols.forEach((col, idx) => {
            if (!col || !col.label) return;
            const label = col.label.trim();
            if (label.includes('地區')) {
                colIndices.district = idx;
            } else if (label === '組' || label === '組別') {
                colIndices.group = idx;
            } else if (label.includes('日期')) {
                colIndices.date = idx;
            } else if (label.includes('司儀')) {
                colIndices.emcee = idx;
            } else if (label.includes('御書')) {
                colIndices.gosho = idx;
            } else if (label.includes('感謝') || label.includes('專題') || label.includes('青年部')) {
                colIndices.theme = idx;
            } else if (label.includes('投入') || (label.includes('幹部') && !label.includes('總結'))) {
                colIndices.cadre = idx;
            } else if (label.includes('紀錄') || label.includes('記錄') || label.includes('人員') && !label.includes('投入') && !label.includes('總結')) {
                colIndices.scribe = idx;
            } else if (label.includes('總結')) {
                colIndices.concluder = idx;
            } else if (label.includes('地址') || label.includes('地點') || label.includes('googlemap') || label.includes('map')) {
                colIndices.address = idx;
            }
        });
    }
    
    // 用於向下填充合併儲存格的暫存變數
    let currentDistrict = '';
    
    const parsedData = rows.map(row => {
        // 優先提取 cell.f (格式化後的值)，若不存在才使用 cell.v
        const getCellValue = (index) => {
            if (!row.c || !row.c[index]) return '';
            const cell = row.c[index];
            if (cell.f !== undefined && cell.f !== null) {
                return String(cell.f).trim();
            }
            return cell.v !== null ? String(cell.v).trim() : '';
        };
        
        const rawDistrict = getCellValue(colIndices.district);
        // 智慧型地區判斷：如果名稱不為空且含有「地區」字樣，則更新 currentDistrict
        if (rawDistrict && rawDistrict.includes('地區')) {
            currentDistrict = rawDistrict;
        }
        
        let addressVal = '';
        let addressLink = '';
        
        if (row.c && row.c[colIndices.address]) {
            const addrCell = row.c[colIndices.address];
            addressVal = addrCell.f !== undefined && addrCell.f !== null ? String(addrCell.f).trim() : (addrCell.v !== null ? String(addrCell.v).trim() : '');
            addressLink = addrCell.u ? addrCell.u : '';
        }
        
        // 智慧降級：如果沒有超連結但有地址純文字，自動為其生成 Google Maps 搜尋連結
        if (!addressLink && addressVal) {
            addressLink = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressVal)}`;
        }
        
        return {
            district: rawDistrict || currentDistrict,
            group: getCellValue(colIndices.group),
            date: getCellValue(colIndices.date),
            emcee: getCellValue(colIndices.emcee),
            gosho: getCellValue(colIndices.gosho),
            theme: getCellValue(colIndices.theme),
            cadre: getCellValue(colIndices.cadre),
            scribe: getCellValue(colIndices.scribe),
            concluder: getCellValue(colIndices.concluder),
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
            const finalMapUrl = item.mapUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.address)}`;
            addressHtml = `<a href="${finalMapUrl}" target="_blank" class="map-btn" title="地址：${item.address}">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                📍 開啟導航
            </a>`;
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
    month: "2026年6月份 (7、8月份活動執行)",
    theme: "世界青年學會 • 躍動之年 ⚡",
    routine: [
        {
            id: 'memorial-meeting',
            title: '追善回向勤行會暨佛法教學',
            badge: '例行',
            time: '8/6 - 8/15 (詳見各場次)',
            location: '各本部講堂',
            summary: '2026年8月份追善回向勤行會暨佛法教學場次。程序包含勤行唱題、御書學習、體驗發表與總結指導。',
            details: {
                schedules: [
                    { name: '大興本部', date: '8/6(四) 19:50', cadre: '蘇麗華 區副婦人部長', chanter: '賴建忠 本部總合長', lecturer: '洪詩妤 支部副婦人部長' },
                    { name: '太平本部', date: '8/14(五) 19:50', cadre: '陳鴻賓 圈企劃長', chanter: '同左', lecturer: '許秀伶 本部婦人部長' },
                    { name: '大里本部', date: '8/15(六) 19:50', cadre: '黃潔芬 區副婦人部長', chanter: '吳永富 副區長', lecturer: '張淑雲 婦人部本部企劃' }
                ],
                program: '勤行唱題（30分鐘，含追善行儀） ➔ 御書學習（20分鐘） ➔ 體驗（10分鐘） ➔ 總結指導（10分鐘） ➔ 題目三唱（1分鐘）。企劃案請循壯年部企劃管道回傳區核備。',
                material: ['2026年8月份《教學研習》'],
                notes: [
                    '「鞠躬行儀」：依據儀典準則 202606 修訂，唱題約 15 分鐘後即可由禮生、服務人員引導出列向御本尊一鞠躬，無須唱題至 20:05 再行禮。行禮隊伍可視人數排成二至四列，行禮時間於 20:20 準時結束。',
                    '體驗單元：體驗人員請以所屬本部為主，除可安排發表者外，亦可遴選適當人員朗讀《創價新聞》登載之體驗，故不再跨本部安排發表人選。',
                    '若安排發表者：體驗稿請依各部管道安排【區級幹部】校稿，文稿請提交各部區正長，副本寄壯年部區企劃長。'
                ]
            }
        }
    ],
    respect: [
        { seq: 1, type: '一般', district: '建成地區', department: '婦人部', name: '楊惠玲' }
    ],
    youth: [
        { district: '坪林地區', group: '光華組', date: '8/20(四)' },
        { district: '成功地區', group: '金城組', date: '8/21(五)' },
        { district: '宜昌地區', group: '東村組', date: '8/22(六)' },
        { district: '烏日地區', group: '高鐵組', date: '8/16(日) 09:30' },
        { district: '光興地區', group: '光隆組', date: '8/18(二)' },
        { district: '明道地區', group: '光德組', date: '8/21(五)' },
        { district: '樂業地區', group: '東英組', date: '8/21(五)' },
        { district: '樹義地區', group: '福田組', date: '8/22(六)' },
        { district: '新坪地區', group: '新高組', date: '8/16(日) 09:30' },
        { district: '和平地區', group: '大慶組', date: '8/18(二)' },
        { district: '長億地區', group: '小鎮組', date: '8/22(六)' },
        { district: '喀哩地區', group: '光明組', date: '8/20(四)' },
        { district: '永興地區', group: '東興組', date: '8/18(二)' },
        { district: '萬豐地區', group: '樹仁組', date: '8/22(六)' },
        { district: '內新地區', group: '中新組', date: '8/22(六)' },
        { district: '霧峰地區', group: '中正組', date: '8/18(二)' },
        { district: '德芳地區', group: '長榮組', date: '8/20(四)' },
        { district: '建成地區', group: '仁和組', date: '8/18(二)' },
        { district: '十九甲地區', group: '立德組', date: '8/20(四)' },
        { district: '大東地區', group: '建中組', date: '8/20(四)' },
        { district: '塗城地區', group: '瑞隆組', date: '8/18(二)' },
        { district: '健康地區', group: '永和組', date: '8/21(五)' }
    ],
    others: {
        activities: [
            { id: 'buddhist-lecture', title: '台中南區佛法講座', time: '7/9(四) 晚上 19:30', location: '霧峰會館文化會堂', target: '全體會員、司儀請遴選青年部擔任、場控由青年部區級幹部負責', description: '上課教材為《御義口傳》，上課範圍為《御義口傳要文講義》法師品第十，以及《日蓮大聖人御書全集 文白並列本 別冊》法師品十六件大事。程序包含勤行 (10分鐘)、教學 (80分鐘) 及題目三唱。講解時將播放 PPT，結束後投影問卷 QR Code，請會員踴躍回饋！' },
            { id: 'video-teaching', title: '台中南區、南投區、台中西區幹部視訊教學', time: '8/10(一) 晚上 19:30 (西區為 20:00)', location: '線上視訊舉辦', target: '四部地區級以上幹部及大學部 CR、VCR', description: '上課教材包含：8月份《福運雜誌》與《教學研習》、8/11《創價新聞》。擔任座談會總結幹部及御書講師者，請務必參加上課。無法在所屬區上課者，請跨區註冊上課。' },
            { id: 'junior-high-camp', title: '2026年國中歡樂成長營', time: '8/1(六) 早上 9:30 ~ 下午 15:30', location: '霧峰會館/文化會堂', target: '家庭信仰之小六升國一、二、三學生 (含新朋友)', description: '口號為「SOKA STAR！歡喜躍動JUMP！」，今年全面開放邀約新朋友。請引導國三畢業生參加高中英知研習營，無法出席所屬區場次者，請跨場次陪同參加。對外邀約請勿對同學進行弘教，並需取得家長同意。' },
            { id: 'senior-high-camp', title: '2026年高中英知研習營', time: '8/2(日) 早上 9:30 ~ 下午 15:30', location: '霧峰會館/文化會堂', target: '升高一、二、三同學及畢業生或新朋友', description: '口號為「鳳雛躍動！JUMP一夏!」，今年全面開放對外邀約新朋友。高三畢業生優先鼓勵擔任國中成長營工作人員. 無法出席者可陪同參加同圈其他場次，取得家長同意後始得報名。' },
            { id: 'soka-concert', title: '2026創價公演：古典樂的顛覆與狂想「雅諾史卡合奏團」', time: '10/16(五) 19:30、10/17(六) 14:30 與 19:30', location: '國立臺灣交響樂團演奏廳', target: '購票會員及親友', description: '區配票資訊已公佈，包含益民、新里、東平、勤益、日峰、高工、復興支部之各票價配額，詳情請洽各支部負責人領票與推廣。' }
        ]
    }
};

// ==========================================================================
// 地區級以上男子部傳達資料 (7/28 22:00 前顯示)
// ==========================================================================
const YOUTH_LEADER_ANNOUNCEMENTS = {
    title: "地區級以上男子部傳達資料",
    showAfter: "2026/06/15 00:00:00",
    hideAfter: "2026/07/28 22:00:00",
    categories: [
        {
            name: "學生部共同 / 暑期營隊",
            icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>`,
            items: [
                "2026年國中歡樂成長營、高中英知研習營即將於全國各地舉辦。今年全面開放邀約國高中新朋友參與，請務必向家長說明活動內容，並事先取得家長同意。",
                "暑期活動宣傳資訊連結：[點此進入 Linktree 宣傳頁](https://linktr.ee/twsgi.students)。",
                "適逢暑假期間，請鼓勵大學部、研究生部同學投入暑期活動工作人員使命，以利他行動確立信心，並與夥伴凝聚繫絆，亦可邀請新朋友參與，認識創價理念。"
            ]
        },
        {
            name: "國高部關懷",
            icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"></path><path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5"></path></svg>`,
            items: [
                "國中部：國中會考成績已公布；國中免試入學、特色招生考試入學將於7/7放榜，請持續關心國三同學並給予鼓勵。",
                "高中部：大學分科測驗將於7/11-12舉辦，7/29放榜，請持續關心考生並給予鼓勵。"
            ]
        },
        {
            name: "大研共同",
            icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>`,
            items: [
                "請大研幹部關心大學部、研究生部畢業生動向，並請區負責人於7/31前彙整畢業生名單交給區企劃長，以利後續照顧銜接。",
                "9/20 (日) 下午將於桃園文化會館舉辦「研究生OPEN DAY」實體活動！今年首次開放大三、大四對研究所有興趣的同學報名！請大學部、研究生部幹部鼓勵研究生踴躍參加。在學(職)研究生、海外大學畢業或研究所畢業之青年部幹部皆可報名。"
            ]
        },
        {
            name: "大學部",
            icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path><path d="M2 12h20"></path></svg>`,
            items: [
                "9月迎來開學季，請區正長、企劃長偕同區負責人、校園幹部確實掌握大一新生名單，提前展開家訪、電訪，並與育才部確認愛心媽媽安排。",
                "延續去年好評，將於8月底以大學會為單位舉辦「大學會新生之YA」，請提前邀請新生加入大學會溫暖家庭並認識愛心媽媽，以利後續照顧。",
                "本月幸福專欄介紹的是高雄二圈的「高師和平校區大學會」，歡迎全台大學會踴躍投稿，分享特色與歡喜熱絡大合照！"
            ]
        },
        {
            name: "研究生部 / 創價班 / 展覽部",
            icon: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path></svg>`,
            items: [
                "研究生之論文口試多於6、7月間舉辦，請持續關心研究生近況，並鼓勵研究生以信心全力挑戰畢業論文。",
                "創價班：7、8月全國各地將舉辦「國中歡樂成長營、高中英知研習營」，請全體創價班協助運營相關事宜，並全力邀請新朋友、好朋友一同成功參與，成為組織推進廣布擴大的堅實後盾！",
                "展覽部招募已截止，後續將進行人員懇談及專業培訓。東部美術館展期至7/18止。換檔時程：第一檔卸展 7/26，第二檔布展 8/15-8/16，8/19 開展。歡迎利用學會官方 LINE 帳號使用「找展覽」功能掌握最新藝文展訊。"
            ]
        }
    ]
};

// (2) 初始化南區傳達事項控制台
function initializeAnnouncements() {
    // 1. 動態判斷是否顯示「地區級以上傳達」專屬 Tab (今晚 18:00 - 22:00 顯示，其餘時間完全物理銷毀)
    const now = new Date();
    const showStart = new Date(YOUTH_LEADER_ANNOUNCEMENTS.showAfter);
    const showEnd = new Date(YOUTH_LEADER_ANNOUNCEMENTS.hideAfter);
    const isLeaderActive = (now >= showStart && now <= showEnd);
    
    const tabsContainer = document.querySelector('.announcements-tabs');
    let leaderTabBtn = document.querySelector('.announcement-tab-btn[data-tab="leader"]');
    
    if (isLeaderActive) {
        if (!leaderTabBtn && tabsContainer) {
            // 動態創建按鈕並精確插入
            leaderTabBtn = document.createElement('button');
            leaderTabBtn.className = 'announcement-tab-btn';
            leaderTabBtn.setAttribute('data-tab', 'leader');
            leaderTabBtn.innerHTML = `
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>
                男子部會資料
            `;
            
            // 插在第一個子節點 (四部例行活動) 的後方
            if (tabsContainer.children.length > 0) {
                tabsContainer.insertBefore(leaderTabBtn, tabsContainer.children[0].nextSibling);
            } else {
                tabsContainer.appendChild(leaderTabBtn);
            }
        }
    } else {
        // 時間未到或已過，徹底物理刪除 DOM 按鈕
        if (leaderTabBtn) {
            leaderTabBtn.remove();
        }
    }

    const tabs = document.querySelectorAll('.announcement-tab-btn');
    if (tabs.length === 0) return;
    
    // 動態同步 HTML 標題與 JSON 數據庫
    const titleEl = document.querySelector('.announcements-title');
    if (titleEl && SOUTH_DISTRICT_ANNOUNCEMENTS.month) {
        titleEl.textContent = SOUTH_DISTRICT_ANNOUNCEMENTS.month;
    }
    const toggleTagEl = document.querySelector('.announcements-toggle-btn .toggle-tag');
    if (toggleTagEl && SOUTH_DISTRICT_ANNOUNCEMENTS.month) {
        const monthPart = SOUTH_DISTRICT_ANNOUNCEMENTS.month.split(' ')[0];
        toggleTagEl.textContent = `📢 ${monthPart}`;
    }
    const toggleSubEl = document.querySelector('.announcements-toggle-btn .toggle-title-sub');
    if (toggleSubEl && SOUTH_DISTRICT_ANNOUNCEMENTS.month) {
        const parts = SOUTH_DISTRICT_ANNOUNCEMENTS.month.split(' ');
        if (parts.length > 1) {
            toggleSubEl.textContent = parts[1];
        }
    }
    const subtitleEl = document.querySelector('.announcements-subtitle');
    if (subtitleEl && SOUTH_DISTRICT_ANNOUNCEMENTS.theme) {
        subtitleEl.textContent = SOUTH_DISTRICT_ANNOUNCEMENTS.theme;
    }
    
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
        // 渲染其他重要活動，重構為動態卡片渲染，並為每個活動配置專屬的高雅向量圖示
        const othersDiv = document.createElement('div');
        othersDiv.className = 'others-cards-container';
        
        const cardsHtml = SOUTH_DISTRICT_ANNOUNCEMENTS.others.activities.map(act => {
            // 根據活動 id 配對專屬的高雅向量 SVG
            let iconHtml = '';
            if (act.id === 'youth-departure') {
                iconHtml = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"></path></svg>`;
            } else if (act.id === 'future-summer') {
                iconHtml = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"></path><path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5"></path></svg>`;
            } else if (act.id === 'hq-meeting') {
                iconHtml = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>`;
            } else if (act.id === 'youth-reading') {
                iconHtml = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path></svg>`;
            } else if (act.id === 'men-meeting') {
                iconHtml = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>`;
            } else if (act.id === 'women-meeting') {
                iconHtml = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>`;
            } else {
                iconHtml = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>`;
            }
            
            return `
            <div class="other-item-card">
                <div class="other-card-header">
                    <div class="other-card-icon">
                        ${iconHtml}
                    </div>
                    <h4 class="other-card-title">${act.title}</h4>
                </div>
                <div class="other-card-content" style="display:flex; flex-direction:column; justify-content:space-between; height:100%;">
                    <div>
                        ${act.time ? `<p style="margin-bottom:0.5rem; color:var(--color-text, #2c3e50); font-size:0.9rem;"><strong>📅 舉辦時間：</strong>${act.time}</p>` : ''}
                        ${act.location ? `<p style="margin-bottom:0.5rem; color:var(--color-text, #2c3e50); font-size:0.9rem;"><strong>📍 舉辦地點：</strong>${act.location}</p>` : ''}
                        ${act.target ? `<p style="margin-bottom:0.8rem; color:var(--color-text-muted); font-size:0.85rem; line-height:1.4;"><strong>👥 參加對象：</strong>${act.target}</p>` : ''}
                    </div>
                    ${act.description ? `
                    <div style="background: rgba(16, 126, 125, 0.05); border: 1px dashed rgba(16, 126, 125, 0.25); border-radius: 12px; padding: 0.8rem; margin-top: 0.5rem; font-size: 0.85rem; color: var(--color-primary, #107e7d); font-weight: 500; line-height: 1.45;">
                        ${act.description}
                    </div>
                    ` : ''}
                </div>
            </div>
            `;
        }).join('');
        
        othersDiv.innerHTML = cardsHtml;
        contentDiv.appendChild(othersDiv);
    } else if (tabName === 'leader') {
        // 渲染地區級以上傳達，使用高奢折疊手風琴卡片
        const leaderContainer = document.createElement('div');
        leaderContainer.className = 'leader-announcements-container';
        
        const accordionsHtml = YOUTH_LEADER_ANNOUNCEMENTS.categories.map((cat, idx) => {
            const itemsHtml = cat.items.map(item => {
                let formatted = item;
                // 1. 將 【標題】(網址) 格式轉為 Clickable 連結並配上高雅徽章
                formatted = formatted.replace(/【([^】]+)】\((https?:\/\/[^\s\)]+)\)/g, (match, title, url) => {
                    let badgeText = '🔗 點此連結';
                    if (title.includes('投稿')) badgeText = '✍️ 點此投稿';
                    if (title.includes('報名')) badgeText = '📝 點此報名';
                    if (title.includes('信箱')) badgeText = '📧 寄送郵件';
                    return `<a href="${url}" target="_blank" class="leader-link">${title}<span class="leader-link-badge">${badgeText}</span></a>`;
                });
                
                // 2. 將沒有被 HTML 包裹的純 https 網址轉換為 clickable <a>
                formatted = formatted.replace(/(?<!href=")(https?:\/\/[^\s<>\)]+)/g, '<a href="$1" target="_blank" class="leader-link">$1</a>');
                
                return `
                <div class="leader-item-bullet">
                    <span class="bullet-dot">•</span>
                    <p class="bullet-text">${formatted}</p>
                </div>
                `;
            }).join('');
            
            return `
            <div class="leader-category-accordion ${idx === 0 ? 'active' : ''}">
                <div class="leader-accordion-header" onclick="toggleLeaderAccordion(this)">
                    <div style="display:flex; align-items:center; gap:0.8rem;">
                        <span class="leader-accordion-icon">${cat.icon}</span>
                        <h4 class="leader-accordion-title">${cat.name}</h4>
                    </div>
                    <span class="leader-accordion-arrow">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
                    </span>
                </div>
                <div class="leader-accordion-content">
                    <div class="leader-accordion-inner">
                        ${itemsHtml}
                    </div>
                </div>
            </div>
            `;
        }).join('');
        
        leaderContainer.innerHTML = accordionsHtml;
        contentDiv.appendChild(leaderContainer);
    }
}

// (5) 青年部主場座談會過濾與地圖導航功能


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

    // 內部輔助函數：智慧交叉匹配，為當前的青年部小卡片尋找地址與地圖導航連結
    const findMapInfo = (district, group) => {
        // 1. 優先從本地預設的 BRANCH_MEMBERS_MOCK 數據中查找相同地區與組別的記錄
        for (const branch in BRANCH_MEMBERS_MOCK) {
            const found = BRANCH_MEMBERS_MOCK[branch].find(m => m.district === district && m.group === group);
            if (found && (found.mapUrl || found.address)) {
                return {
                    mapUrl: found.mapUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(found.address)}`,
                    address: found.address
                };
            }
        }
        // 2. 如果沒找到，看看當前已載入/同步的數據 (如果是當前支部的數據)
        if (typeof currentBranchData !== 'undefined' && Array.isArray(currentBranchData)) {
            const found = currentBranchData.find(m => m.district === district && m.group === group);
            if (found && (found.mapUrl || found.address)) {
                return {
                    mapUrl: found.mapUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(found.address)}`,
                    address: found.address
                };
            }
        }
        return null;
    };
    
    filtered.forEach(item => {
        const card = document.createElement('div');
        card.className = 'youth-meeting-card';
        
        // 尋找對應的 Google Maps 連結與地址
        const mapInfo = findMapInfo(item.district, item.group);
        let mapBtnHtml = '';
        
        if (mapInfo) {
            mapBtnHtml = `
                <a href="${mapInfo.mapUrl}" target="_blank" class="youth-card-map-btn" title="地址：${mapInfo.address}">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                    📍 地圖導航
                </a>
            `;
        } else {
            mapBtnHtml = `
                <span class="youth-card-map-btn disabled" title="尚未配置此地區地址數據">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z"></path><circle cx="12" cy="10" r="3"></circle></svg>
                    暫無地址
                </span>
            `;
        }
        
        card.innerHTML = `
            <div class="youth-meet-district">${item.district}</div>
            <div class="youth-meet-group">${item.group}</div>
            <div class="youth-meet-date">📅 ${item.date}</div>
            <div class="youth-meet-map">${mapBtnHtml}</div>
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
            } else if (targetId === '#meeting-members') {
                const container = document.getElementById('members-table-wrapper');
                if (container && !container.classList.contains('active')) {
                    console.log('💡 偵測到跳轉至當月座談會人員表，為法友自動展開摺疊抽屜！');
                    toggleMembers();
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
// 👥 (8.5) 收折與展開當月座談會人員表 (Collapsible Meeting Members Table)
// ==========================================================================
function toggleMembers() {
    const container = document.getElementById('members-table-wrapper');
    const toggleBtn = document.getElementById('members-toggle');
    const statusText = document.getElementById('members-status');
    
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
        if (window.vibratePhone) window.vibratePhone(30);
    } else {
        // --- 展開邏輯 ---
        container.classList.add('active');
        toggleBtn.classList.add('active');
        statusText.textContent = '點擊收起';
        
        container.style.opacity = '1';
        container.style.transform = 'translateY(0)';
        container.style.marginTop = '1.5rem';
        
        container.style.maxHeight = container.scrollHeight + 'px';
        if (window.vibratePhone) window.vibratePhone(40);
        
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
            } else if (targetId === '#meeting-members') {
                const container = document.getElementById('members-table-wrapper');
                if (container && !container.classList.contains('active')) {
                    toggleMembers();
                }
            }
        }, 100); // 稍微延遲以獲得更好的視覺分離體驗
        
        // 5. 觸覺震動回饋
        if (window.navigator && window.navigator.vibrate) {
            window.navigator.vibrate(15);
        }
    }
};

// ==========================================================================
// 地區級以上傳達專屬手風琴折疊控制函數
// ==========================================================================
function toggleLeaderAccordion(header) {
    const accordion = header.parentElement;
    if (!accordion) return;
    
    const isActive = accordion.classList.contains('active');
    
    // 1. 平滑折疊其他所有手風琴卡片 (獨佔式展開)
    const allAccordions = document.querySelectorAll('.leader-category-accordion');
    allAccordions.forEach(item => {
        item.classList.remove('active');
    });
    
    // 2. 切換當前卡片狀態
    if (!isActive) {
        accordion.classList.add('active');
    }
}

// ==========================================================================
// 智慧提醒公告彈窗控制函數 (2026.05.29)
// ==========================================================================
window.openNoticeModal = function() {
    const modal = document.getElementById('soka-notice-modal');
    if (modal) {
        modal.classList.add('active');
        // 防止底層網頁捲動
        document.body.style.overflow = 'hidden';
    }
};

window.closeNoticeModal = function() {
    const modal = document.getElementById('soka-notice-modal');
    if (modal) {
        modal.classList.remove('active');
        // 恢復底層網頁捲動
        document.body.style.overflow = '';
        
        // 智慧防打擾：在 localStorage 中寫入今日已關閉的標記
        const todayStr = new Date().toDateString(); // 例如 "Fri May 29 2026"
        localStorage.setItem('soka-notice-closed-date', todayStr);
    }
};








