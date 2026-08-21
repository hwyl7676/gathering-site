// ===================================================================
// Private 경매 구독 - Client Analytics & Conversion Funnel Logger
// ===================================================================

(function() {
    'use strict';

    const STORAGE_EVENTS_KEY = 'gh_analytics_events';
    const STORAGE_SUMMARY_KEY = 'gh_analytics_summary';

    function getStorage(key, defaultVal) {
        try {
            const raw = localStorage.getItem(key);
            return raw ? JSON.parse(raw) : defaultVal;
        } catch (e) {
            return defaultVal;
        }
    }

    function setStorage(key, val) {
        try {
            localStorage.setItem(key, JSON.stringify(val));
        } catch (e) {}
    }

    // 익명 세션 ID 생성
    let sessionId = sessionStorage.getItem('gh_session_id');
    if (!sessionId) {
        sessionId = 'sess_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
        sessionStorage.setItem('gh_session_id', sessionId);
    }

    // 당일 날짜 키 (YYYY-MM-DD)
    function getTodayKey() {
        const d = new Date();
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    }

    // 이벤트 로깅 코어 함수
    window.trackEvent = function(eventType, extraData = {}) {
        try {
            const now = new Date();
            const todayKey = getTodayKey();
            const pagePath = window.location.pathname || '/';
            const pageTitle = document.title || '';

            const eventObj = {
                id: 'evt_' + Math.random().toString(36).substring(2, 8),
                type: eventType, // page_view, scroll_read, kakao_click, code_copy
                path: pagePath,
                title: pageTitle,
                session: sessionId,
                timestamp: now.toISOString(),
                timeStr: now.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
                data: extraData
            };

            // 1. 상세 이벤트 로그 (최근 200건 유지)
            const events = getStorage(STORAGE_EVENTS_KEY, []);
            events.unshift(eventObj);
            if (events.length > 200) events.pop();
            setStorage(STORAGE_EVENTS_KEY, events);

            // 2. 집계 통계 업데이트
            const summary = getStorage(STORAGE_SUMMARY_KEY, {
                total_pageviews: 0,
                total_kakao_clicks: 0,
                total_code_copies: 0,
                total_reads: 0,
                daily: {},
                item_clicks: {}
            });

            // 전체 카운터
            if (eventType === 'page_view') summary.total_pageviews = (summary.total_pageviews || 0) + 1;
            if (eventType === 'kakao_click') summary.total_kakao_clicks = (summary.total_kakao_clicks || 0) + 1;
            if (eventType === 'code_copy') summary.total_code_copies = (summary.total_code_copies || 0) + 1;
            if (eventType === 'scroll_read') summary.total_reads = (summary.total_reads || 0) + 1;

            // 일자별 카운터
            if (!summary.daily[todayKey]) {
                summary.daily[todayKey] = { pv: 0, kakao: 0, copy: 0, reads: 0 };
            }
            if (eventType === 'page_view') summary.daily[todayKey].pv += 1;
            if (eventType === 'kakao_click') summary.daily[todayKey].kakao += 1;
            if (eventType === 'code_copy') summary.daily[todayKey].copy += 1;
            if (eventType === 'scroll_read') summary.daily[todayKey].reads += 1;

            // 물건별 카톡 클릭 집계
            if (eventType === 'kakao_click' && extraData && extraData.itemName) {
                const itemKey = extraData.itemName;
                summary.item_clicks[itemKey] = (summary.item_clicks[itemKey] || 0) + 1;
            }

            setStorage(STORAGE_SUMMARY_KEY, summary);
        } catch (e) {
            console.error('[Analytics Error]', e);
        }
    };

    // 1. 페이지 뷰 자동 로깅
    document.addEventListener('DOMContentLoaded', () => {
        // 관리자 페이지 자체는 트래킹 제외
        if (window.location.pathname.includes('admin-stats.html')) return;

        window.trackEvent('page_view', {
            referrer: document.referrer || '직접 접속',
            screenWidth: window.innerWidth
        });

        // 2. 75% 이상 스크롤 완독(read_complete) 1회 로깅
        let hasLoggedRead = false;
        window.addEventListener('scroll', () => {
            if (hasLoggedRead) return;
            const scrollTotal = document.documentElement.scrollHeight - window.innerHeight;
            if (scrollTotal <= 0) return;
            const scrollPercent = (window.pageYOffset / scrollTotal) * 100;
            if (scrollPercent >= 75) {
                hasLoggedRead = true;
                window.trackEvent('scroll_read', { scrollPercent: Math.round(scrollPercent) });
            }
        }, { passive: true });

        // 3. 카카오톡 클릭 요소 자동 감지
        document.querySelectorAll('a[href*="open.kakao.com"], .btn-kakao, .teaser-masked').forEach(el => {
            el.addEventListener('click', (e) => {
                // 클릭된 위치/물건 정보 파악
                const card = el.closest('.detail-section') || el.closest('.track-record-card');
                let itemName = '일반 네비/배너 버튼';
                if (card) {
                    const titleEl = card.querySelector('.detail-section-title span, .track-record-title span:first-child');
                    if (titleEl) {
                        itemName = titleEl.textContent.trim();
                    }
                } else if (el.classList.contains('nav-cta')) {
                    itemName = '상단 네비게이션 무료입장';
                } else if (el.closest('.hero')) {
                    itemName = '메인 히어로 알림방 입장';
                } else if (el.closest('.cta-section')) {
                    itemName = '하단 메인 CTA 오픈채팅';
                }

                window.trackEvent('kakao_click', {
                    itemName: itemName,
                    buttonText: el.textContent.trim()
                });
            });
        });
    });
})();
