// ===================================================================
// Site-wide JavaScript - Scroll animations, nav toggle, interactions
// ===================================================================

/**
 * [불변 비즈니스 프론트엔드 계약 (Invariants Contract) - AI 임의 원복 절대 금지]
 * 1. Global Hard Lock PIN Gatekeeper: gh_member_pin 없이는 모든 화면 암전 및 블러 차단.
 * 2. FOMO 카운트다운 타이머 & 카카오톡 VIP 오픈채팅방 전환 유지.
 * 상세 내역은 프로젝트 루트의 DECISIONS.md를 준수할 것.
 */

document.addEventListener('DOMContentLoaded', () => {
    // --- Scroll-triggered animations ---
    const animatedElements = document.querySelectorAll('.animate-on-scroll');

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
                // Stagger animations for siblings
                const siblings = entry.target.parentElement.querySelectorAll('.animate-on-scroll');
                let delay = 0;
                siblings.forEach((sib, i) => {
                    if (sib === entry.target) delay = i * 80;
                });
                setTimeout(() => {
                    entry.target.classList.add('visible');
                }, delay);
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.1,
        rootMargin: '0px 0px -40px 0px'
    });

    animatedElements.forEach(el => observer.observe(el));

    // --- Mobile nav toggle ---
    const navToggle = document.querySelector('.nav-toggle');
    const navLinks = document.querySelector('.nav-links');

    if (navToggle && navLinks) {
        navToggle.addEventListener('click', () => {
            navLinks.classList.toggle('active');
            navToggle.classList.toggle('active');
        });

        // Close nav when clicking a link
        navLinks.querySelectorAll('a').forEach(link => {
            link.addEventListener('click', () => {
                navLinks.classList.remove('active');
                navToggle.classList.remove('active');
            });
        });
    }

    // --- Nav background on scroll ---
    const nav = document.querySelector('.nav');
    if (nav) {
        let lastScroll = 0;
        window.addEventListener('scroll', () => {
            const currentScroll = window.pageYOffset;
            if (currentScroll > 50) {
                nav.style.borderBottomColor = 'rgba(255, 255, 255, 0.08)';
                nav.style.background = 'rgba(7, 11, 20, 0.92)';
            } else {
                nav.style.borderBottomColor = 'rgba(255, 255, 255, 0.06)';
                nav.style.background = 'rgba(7, 11, 20, 0.8)';
            }
            lastScroll = currentScroll;
        }, { passive: true });
    }

    // --- Animated counters (통계 숫자 전용 한정) ---
    const counters = document.querySelectorAll('.stat-value[data-count], .summary-card-value[data-count], [data-counter]');
    const counterObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateCounter(entry.target);
                counterObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.2 });

    counters.forEach(counter => counterObserver.observe(counter));

    function animateCounter(el) {
        const target = parseInt(el.dataset.count);
        if (isNaN(target)) return;
        const suffix = el.dataset.suffix || '';
        const prefix = el.dataset.prefix || '';
        const duration = 1500;
        const start = performance.now();

        function update(now) {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            // Ease out expo
            const eased = 1 - Math.pow(1 - progress, 4);
            const current = Math.round(target * eased);
            el.textContent = prefix + current.toLocaleString() + suffix;
            if (progress < 1) requestAnimationFrame(update);
        }
        requestAnimationFrame(update);
    }

    // --- Mouse glow effect on cards ---
    document.querySelectorAll('.card').forEach(card => {
        card.addEventListener('mousemove', (e) => {
            const rect = card.getBoundingClientRect();
            const x = ((e.clientX - rect.left) / rect.width) * 100;
            const y = ((e.clientY - rect.top) / rect.height) * 100;
            card.style.setProperty('--mouse-x', x + '%');
            card.style.setProperty('--mouse-y', y + '%');
        });
    });

    // --- Precision Scroll & Highlight Engine for Anchor Targets ---
    function openPrunedAccordion() {
        const content = document.getElementById('pruned-accordion-content');
        const btn = document.getElementById('pruned-accordion-btn');
        if (content) {
            content.style.display = 'block';
            content.querySelectorAll('.detail-section').forEach(sec => sec.classList.add('visible'));
        }
        if (btn) {
            btn.classList.add('active');
            btn.innerHTML = '<span>AI 필터링 탈락 물건 접기 &uarr;</span>';
        }
    }

    window.togglePrunedSection = function() {
        const content = document.getElementById('pruned-accordion-content');
        const btn = document.getElementById('pruned-accordion-btn');
        if (!content) return;

        const isHidden = (content.style.display === 'none' || !content.style.display);
        if (isHidden) {
            openPrunedAccordion();
        } else {
            content.style.display = 'none';
            if (btn) {
                btn.classList.remove('active');
                const countMatch = btn.getAttribute('data-prune-count') || btn.getAttribute('data-count') || '2';
                btn.innerHTML = `<span>AI 필터링 탈락 물건 (${countMatch}건) 확인하기 (투자 주의 &darr;)</span>`;
            }
        }
    };

    function scrollToTargetElement(target, isSmooth = true) {
        if (!target) return;

        // 만약 타겟이 접혀있는 탈락 물건 아코디언 내부에 있다면 먼저 펼치기
        const accordionParent = target.closest('#pruned-accordion-content');
        if (accordionParent && accordionParent.style.display === 'none') {
            openPrunedAccordion();
        }

        target.classList.add('visible', 'highlighted-target');
        
        const navHeight = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-height')) || 72;
        const targetRect = target.getBoundingClientRect();
        const absoluteTop = window.pageYOffset + targetRect.top;
        const scrollToY = Math.max(0, absoluteTop - navHeight - 16);

        window.scrollTo({
            top: scrollToY,
            behavior: isSmooth ? 'smooth' : 'auto'
        });

        // 3초 후 하이라이트 클래스 정리 (재진입 시 다시 펄스 가능)
        setTimeout(() => {
            target.classList.remove('highlighted-target');
        }, 3200);
    }

    function findTargetByHash(hashStr) {
        if (!hashStr || hashStr === '#' || hashStr.length < 2) return null;
        
        // 1. 직접 ID 선택자 시도
        try {
            const direct = document.querySelector(hashStr);
            if (direct) return direct;
        } catch (e) {}

        const cleanKey = hashStr.replace(/^#/, '').trim();

        // 2. data-rank 매칭 (예: item-1, item-2)
        const rankEl = document.querySelector(`[data-rank="${cleanKey}"]`);
        if (rankEl) return rankEl;

        // 3. ID 부분 일치 탐색
        const partialIdEl = document.querySelector(`[id*="${cleanKey}"]`);
        if (partialIdEl) return partialIdEl;

        // 4. 사건번호 숫자만 추출하여 텍스트 매칭
        const digitsOnly = cleanKey.replace(/\D/g, '');
        if (digitsOnly.length >= 4) {
            const sections = document.querySelectorAll('.detail-section');
            for (const sec of sections) {
                if (sec.textContent.includes(digitsOnly)) {
                    return sec;
                }
            }
        }

        return null;
    }

    function handleHashNavigation(isSmooth = true) {
        const hash = window.location.hash;
        if (!hash) return;

        const targetEl = findTargetByHash(hash);
        if (targetEl) {
            scrollToTargetElement(targetEl, isSmooth);
        }
    }

    // 초기 로딩 시 렌더링 완료 타이밍을 고려한 다단계 정밀 스크롤
    if (window.location.hash) {
        // 1차 즉각 시도
        setTimeout(() => handleHashNavigation(false), 50);
        // 2차 웹폰트 및 DOM 레이아웃 안정화 후 부드러운 안착
        setTimeout(() => handleHashNavigation(true), 350);
    }

    window.addEventListener('load', () => {
        if (window.location.hash) {
            setTimeout(() => handleHashNavigation(true), 150);
        }
    });

    window.addEventListener('hashchange', () => {
        handleHashNavigation(true);
    });

    // --- Smooth scroll for anchor links ---
    document.querySelectorAll('a[href*="#"]').forEach(anchor => {
        anchor.addEventListener('click', (e) => {
            const href = anchor.getAttribute('href');
            if (!href || href === '#') return;

            const urlParts = href.split('#');
            const targetHash = '#' + urlParts[1];
            const isSamePage = !urlParts[0] || urlParts[0] === window.location.pathname || urlParts[0] === window.location.href.split('#')[0];

            if (isSamePage) {
                const target = findTargetByHash(targetHash);
                if (target) {
                    e.preventDefault();
                    history.pushState(null, null, targetHash);
                    scrollToTargetElement(target, true);
                }
            }
        });
    });

    // --- Track record 'Load More' toggle ---
    const loadMoreBtn = document.getElementById('load-more-track-btn');
    const hiddenTrackItems = document.getElementById('hidden-track-records');

    if (loadMoreBtn && hiddenTrackItems) {
        loadMoreBtn.addEventListener('click', () => {
            const isExpanded = hiddenTrackItems.classList.contains('active');
            if (isExpanded) {
                hiddenTrackItems.classList.remove('active');
                hiddenTrackItems.style.display = 'none';
                loadMoreBtn.innerHTML = '<span>지난 검증 내역 더보기 (2건 추가) &darr;</span>';
            } else {
                hiddenTrackItems.classList.add('active');
                hiddenTrackItems.style.display = 'block';
                hiddenTrackItems.querySelectorAll('.track-record-card').forEach(card => {
                    card.classList.add('visible');
                });
                loadMoreBtn.innerHTML = '<span>검증 내역 접기 &uarr;</span>';
            }
        });
    }

    // --- Track Status & Budget Compound Filter Handler ---
    const statusBtns = document.querySelectorAll('.track-status-btn');
    const budgetTabBtns = document.querySelectorAll('.budget-tab-btn');
    const filterableCards = document.querySelectorAll('.track-record-card[data-status]');

    let currentStatus = 'all';
    let currentBudget = 'all';

    function applyCompoundFilter() {
        let visibleCount = 0;
        filterableCards.forEach(card => {
            const cardStatus = card.getAttribute('data-status');
            const cardBudget = card.getAttribute('data-budget');

            const matchStatus = (currentStatus === 'all' || cardStatus === currentStatus);
            const matchBudget = (currentBudget === 'all' || cardBudget === currentBudget);

            if (matchStatus && matchBudget) {
                visibleCount++;
                card.style.display = 'block';
                card.style.opacity = '0';
                card.style.transform = 'translateY(10px)';
                setTimeout(() => {
                    card.style.transition = 'all 0.3s ease';
                    card.style.opacity = '1';
                    card.style.transform = 'translateY(0)';
                }, 30);
            } else {
                card.style.display = 'none';
            }
        });

        // 0건일 때 휑한 공백 방지용 안내 박스
        let emptyNotice = document.getElementById('track-record-empty-notice');
        if (visibleCount === 0) {
            if (!emptyNotice) {
                emptyNotice = document.createElement('div');
                emptyNotice.id = 'track-record-empty-notice';
                emptyNotice.className = 'track-record-empty-box animate-on-scroll';
                emptyNotice.style.cssText = 'text-align:center; padding:3rem 1.5rem; background:rgba(30,41,59,0.3); border:1px dashed rgba(255,255,255,0.15); border-radius:16px; margin:2rem 0; color:var(--text-secondary);';
                emptyNotice.innerHTML = '<div style="font-size:1.1rem; font-weight:600; color:var(--text-primary); margin-bottom:0.5rem;">해당 조건에 부합하는 매물이 없습니다.</div><div style="font-size:0.88rem;">다른 예산 탭을 선택하시거나 [전체 예산]으로 확인해 보세요.</div>';
                const container = document.querySelector('.budget-tabs-container');
                if (container && container.parentNode) {
                    container.parentNode.insertBefore(emptyNotice, container.nextSibling);
                }
            }
            emptyNotice.style.display = 'block';
        } else if (emptyNotice) {
            emptyNotice.style.display = 'none';
        }
    }

    if (statusBtns.length > 0) {
        statusBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                statusBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentStatus = btn.getAttribute('data-status-filter') || 'all';
                applyCompoundFilter();
            });
        });
    }

    if (budgetTabBtns.length > 0) {
        budgetTabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                budgetTabBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentBudget = btn.getAttribute('data-filter') || 'all';
                applyCompoundFilter();
            });
        });
    }

    // ===================================================================
    // Global Hard Lock PIN Gatekeeper (무조건 핀코드 인증 필수 & 당일 자정 만료)
    // ===================================================================
    const PIN_STORAGE_KEY = 'gh_member_pin';
    const PIN_DATE_KEY = 'gh_member_pin_date';

    function getTodayString() {
        const d = new Date();
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    function initGlobalPinGate() {
        const today = getTodayString();
        let storedPin = null;
        let storedDate = null;
        
        try {
            storedPin = localStorage.getItem(PIN_STORAGE_KEY) || sessionStorage.getItem(PIN_STORAGE_KEY);
            storedDate = localStorage.getItem(PIN_DATE_KEY) || sessionStorage.getItem(PIN_DATE_KEY);
        } catch(e) {}

        const modal = document.getElementById('global-pin-gate-modal');
        const pinInput = document.getElementById('global-pin-input-field');
        const pinForm = document.getElementById('global-pin-gate-form');
        const errorMsg = document.getElementById('global-pin-error-text');

        // 당일 자정 만료 검증: 오늘 날짜와 다르면 무조건 세션 파기
        const isValidSession = storedPin && storedPin.trim().length >= 4 && storedDate === today;

        if (isValidSession) {
            // 오늘 정상 인증된 세션: 화면 잠금 해제
            document.body.classList.remove('pin-locked');
            document.documentElement.classList.remove('pin-gate-locked');
            if (modal) modal.classList.add('hidden');
        } else {
            // 미인증 또는 만료 세션: 이전 스토리지 초기화 및 화면 완전 암전/블러 잠금
            try {
                localStorage.removeItem(PIN_STORAGE_KEY);
                localStorage.removeItem(PIN_DATE_KEY);
                sessionStorage.removeItem(PIN_STORAGE_KEY);
                sessionStorage.removeItem(PIN_DATE_KEY);
            } catch(e) {}

            document.body.classList.add('pin-locked');
            document.documentElement.classList.add('pin-gate-locked');
            if (modal) modal.classList.remove('hidden');
            if (pinInput) setTimeout(() => pinInput.focus(), 200);
        }

        if (pinForm) {
            pinForm.addEventListener('submit', (e) => {
                e.preventDefault();
                if (!pinInput) return;
                const entered = pinInput.value.trim().toUpperCase().replace(/[\s\-_]/g, '');

                if (entered.length < 4) {
                    if (errorMsg) {
                        errorMsg.textContent = "올바른 핀코드를 입력해 주십시오.";
                        errorMsg.style.display = 'block';
                    }
                    return;
                }

                // 당일 핀코드 인증 완료 및 오늘 날짜 스탬프 저장
                try {
                    localStorage.setItem(PIN_STORAGE_KEY, entered);
                    localStorage.setItem(PIN_DATE_KEY, today);
                    sessionStorage.setItem(PIN_STORAGE_KEY, entered);
                    sessionStorage.setItem(PIN_DATE_KEY, today);
                } catch(e) {}

                if (errorMsg) errorMsg.style.display = 'none';
                document.body.classList.remove('pin-locked');
                document.documentElement.classList.remove('pin-gate-locked');
                if (modal) modal.classList.add('hidden');

                if (window.showToast) {
                    window.showToast("VIP 핀코드 인증 완료. 환영합니다.");
                }
            });
        }
    }

    initGlobalPinGate();

    // --- Global VIP Member State Sync ---
    try {
        const vipPin = localStorage.getItem(PIN_STORAGE_KEY) || sessionStorage.getItem(PIN_STORAGE_KEY);
        if (vipPin) {
            localStorage.setItem(PIN_STORAGE_KEY, vipPin);
            sessionStorage.setItem(PIN_STORAGE_KEY, vipPin);

            const navLinks = document.querySelector('.nav-links');
            if (navLinks && !document.querySelector('.nav-vip-badge')) {
                const vipLi = document.createElement('li');
                const isSubdir = window.location.pathname.includes('/reports/') || window.location.pathname.includes('/members/');
                const membersUrl = isSubdir ? '../members/current.html' : 'members/current.html';
                
                vipLi.innerHTML = `<a href="${membersUrl}" class="nav-vip-badge">VIP 풀리포트 &rarr;</a>`;
                navLinks.insertBefore(vipLi, navLinks.firstChild);
            }
        }
    } catch (e) {
        // 스토리지 접근 불가 환경 방어
    }

    // --- FOMO Realtime Countdown Timer Engine ---
    function initCountdownTimer() {
        const timerEls = document.querySelectorAll('.countdown-timer-text');
        if (timerEls.length === 0) return;

        function updateTimer() {
            const now = new Date();
            // 오늘 자정(23:59:59)까지 남은 시간
            const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);
            let diffMs = endOfDay - now;
            if (diffMs <= 0) diffMs = 0;

            const hours = String(Math.floor(diffMs / (1000 * 60 * 60))).padStart(2, '0');
            const minutes = String(Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))).padStart(2, '0');
            const seconds = String(Math.floor((diffMs % (1000 * 60)) / 1000)).padStart(2, '0');

            timerEls.forEach(el => {
                el.textContent = `${hours}:${minutes}:${seconds}`;
            });
        }

        updateTimer();
        setInterval(updateTimer, 1000);
    }
    initCountdownTimer();
    setTimeout(initCountdownTimer, 300);

    // --- Toast Notification & One-Click Kakao Join ---
    let toastEl = document.getElementById('global-toast');
    if (!toastEl) {
        toastEl = document.createElement('div');
        toastEl.id = 'global-toast';
        toastEl.className = 'toast-notification';
        document.body.appendChild(toastEl);
    }

    window.showToast = function(msg) {
        if (!toastEl) return;
        toastEl.textContent = msg;
        toastEl.classList.add('show');
        setTimeout(() => {
            toastEl.classList.remove('show');
        }, 2800);
    };
});
