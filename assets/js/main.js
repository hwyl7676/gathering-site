// ===================================================================
// Site-wide JavaScript - Scroll animations, nav toggle, interactions
// ===================================================================

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

    // --- Animated counters ---
    const counters = document.querySelectorAll('[data-count]');
    const counterObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                animateCounter(entry.target);
                counterObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });

    counters.forEach(counter => counterObserver.observe(counter));

    function animateCounter(el) {
        const target = parseInt(el.dataset.count);
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

    // --- Smooth scroll for anchor links ---
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', (e) => {
            const href = anchor.getAttribute('href');
            if (href === '#') return;
            const target = document.querySelector(href);
            if (target) {
                e.preventDefault();
                const offset = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--nav-height')) || 72;
                const y = target.getBoundingClientRect().top + window.pageYOffset - offset;
                window.scrollTo({ top: y, behavior: 'smooth' });
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

    // --- Budget Filter Tabs Handler ---
    const budgetTabBtns = document.querySelectorAll('.budget-tab-btn');
    const filterableCards = document.querySelectorAll('[data-budget]');

    if (budgetTabBtns.length > 0) {
        budgetTabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                // Update active tab button
                budgetTabBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');

                const selectedBudget = btn.getAttribute('data-filter');

                // Filter cards with smooth animation
                filterableCards.forEach(card => {
                    const cardBudget = card.getAttribute('data-budget');
                    if (selectedBudget === 'all' || cardBudget === selectedBudget) {
                        card.style.display = 'block';
                        card.style.opacity = '0';
                        card.style.transform = 'translateY(10px)';
                        setTimeout(() => {
                            card.style.transition = 'all 0.3s ease';
                            card.style.opacity = '1';
                            card.style.transform = 'translateY(0)';
                        }, 50);
                    } else {
                        card.style.display = 'none';
                    }
                });
            });
        });
    }
});
