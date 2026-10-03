/**
 * Gathering Niche - 실시간 프론트엔드 가치평가 및 VIP 핀코드 보안 엔진 (주거지 지분 & 헤이딜러 5대 카테고리 1위 챔피언 자동차)
 */

/**
 * @typedef {{is_vehicle: boolean, is_empty?: boolean, slot_category?: string, case_number?: string, property_type?: string, address?: string, appraisal_value?: number, min_bid_price?: number, building_area_sqm?: number, share_numerator?: number, share_denominator?: number, monthly_rent?: number, is_residing?: boolean, car_model?: string, vehicle_year?: number, mileage_km?: number, wholesale_price?: number, fines?: number}} AssetPreset
 * @typedef {AssetPreset & {is_vehicle: false}} ResidentialPreset
 * @typedef {AssetPreset & {is_vehicle: true}} VehiclePreset
 * @typedef {'case' | 'type' | 'address' | 'appraisal' | 'min-bid' | 'building-area' | 'num' | 'denom' | 'monthly-rent' | 'residing' | 'car-model' | 'car-year' | 'car-mileage' | 'car-wholesale' | 'car-fines'} InputName
 * @typedef {'content' | 'empty' | 'badge' | 'target-bid' | 'win-rate' | 'ev' | 'appraisal' | 'min-bid' | 'market-price' | 'net-profit' | 'buffer' | 'safe-profit' | 'real-cash' | 'share' | 'unjust-monthly' | 'unjust-annual' | 'settlement' | 'turnaround' | 'encar-bonus'} ResultName
 * @typedef {{caseNumber: string, propertyType: string, address: string, targetBidPrice: number, winRate: number, ev: number, appraisalValue: number, minBidPrice: number, baseMarketPrice: number, netProfit: number, marginRate: number, realityBufferMin: number, realityBufferMax: number, netProfitBufferMin: number, netProfitBufferMax: number, realCashMin: number, realCashMax: number, marginRateBufferMin: number, isPass: boolean, filterReasons: string[]}} CommonResult
 * @typedef {CommonResult & {buildingPyeong: number, shareRatio: number, unjustMonthly: number, unjustAnnual: number, settlementScore: number, turnaround: string}} ResidentialResult
 * @typedef {CommonResult & {encarBonus: number, turnaround: string, categoryDesc: string}} VehicleResult
 */

/** @param {string} id @returns {HTMLFormElement} */
function assetForm(id) {
    const form = document.getElementById(id);
    if (!(form instanceof HTMLFormElement)) throw new Error(`입력창 계약 누락: ${id}`);
    return form;
}

/** @param {HTMLFormElement} form @param {InputName} name @returns {HTMLInputElement | HTMLSelectElement} */
function assetInput(form, name) {
    if (!(form instanceof HTMLFormElement) || !name) throw new TypeError('입력 필드 계약 오류');
    const field = form.elements.namedItem(name);
    if (!(field instanceof HTMLInputElement || field instanceof HTMLSelectElement)) {
        throw new Error(`입력 필드 계약 누락: ${form.id}/${name}`);
    }
    return field;
}

/** @param {string} id @returns {HTMLElement} */
function assetElement(id) {
    const element = document.getElementById(id);
    if (!(element instanceof HTMLElement)) throw new Error(`화면 계약 누락: ${id}`);
    return element;
}

/** @param {HTMLElement} root @param {ResultName} name @returns {HTMLElement} */
function resultElement(root, name) {
    if (!(root instanceof HTMLElement) || !name) throw new TypeError('결과 필드 계약 오류');
    const field = root.querySelector(`[data-result="${name}"]`);
    if (!(field instanceof HTMLElement)) throw new Error(`결과 필드 계약 누락: ${root.id}/${name}`);
    return field;
}

const NicheApp = {
    config: {
        SQM_TO_PYEONG: 3.305785,
        BID_RATIO_LOWER: 0.65,
        BID_RATIO_REC: 0.75,
        BID_RATIO_UPPER: 0.85,
        MAX_AGE_YEARS: 5,
        MAX_MILEAGE_KM: 70000,
        MIN_HEYDEALER_PROFIT: 2000000,
        STORAGE_KEY: 'gh_member_pin',
        CYCLE_KEY: 'gh_member_pin_cycle',
        CATEGORY_CHAMPIONS: [
            { name: "국산 준대형 세단 1위", model: "그랜저", keywords: ["그랜저", "GRANDEUR", "GN7", "IG"] },
            { name: "국산 패밀리 SUV 1위", model: "쏘렌토/싼타페", keywords: ["쏘렌토", "SORENTO", "MQ4", "싼타페", "SANTAFE"] },
            { name: "국산 패밀리 RV 1위", model: "카니발", keywords: ["카니발", "CARNIVAL", "KA4"] },
            { name: "수입 프리미엄 세단 1위", model: "벤츠 E-Class/5시리즈", keywords: ["ECLASS", "E클래스", "E300", "E250", "E220", "5시리즈", "520I", "530I"] },
            { name: "국산 프리미엄 럭셔리 1위", model: "제네시스 G80/GV80", keywords: ["G80", "GV80", "제네시스", "GENESIS", "RG3"] }
        ]
    },

    /** @param {Date} [d] @returns {string} */
    getPinCycleKey(d = new Date()) {
        const now = new Date(d);
        const day = now.getDay();
        const target = new Date(now);
        if (day === 2 || day === 3) {
            target.setDate(now.getDate() - (day - 2));
        } else if (day >= 4) {
            target.setDate(now.getDate() - (day - 4));
        } else {
            target.setDate(now.getDate() - (day + 3));
        }
        const year = target.getFullYear();
        const month = String(target.getMonth() + 1).padStart(2, '0');
        const dateStr = String(target.getDate()).padStart(2, '0');
        return `${year}-${month}-${dateStr}`;
    },

    /** @returns {void} */
    init() {
        this.checkPinAuth();
        this.bindEvents();
        this.loadActivePresets();
        this.calculateResidentialShare();
        this.calculateVehicle();
    },

    /** @returns {Promise<void>} */
    async loadActivePresets() {
        const container = document.getElementById('case-list-container');
        if (!container) return;
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 35000);
        try {
            const res = await fetch('data/active_presets.json?v=' + Date.now(), { cache: 'no-cache', signal: controller.signal });
            if (!res.ok) return;
            const data = await res.json();
            const presets = data.presets;
            if (!Array.isArray(presets) || presets.length === 0) return;

            let html = '';
            let currentCategory = '';

            presets.forEach((preset, index) => {
                if (typeof preset.is_vehicle !== 'boolean') throw new TypeError('사례의 자산 구분 계약이 없습니다.');
                const categoryType = preset.is_vehicle ? 'vehicle' : 'residential';
                
                // 5:5 카테고리 헤더 분기 (차량 5슬롯 / 주거지 5슬롯)
                if (categoryType !== currentCategory) {
                    currentCategory = categoryType;
                    const headerTitle = currentCategory === 'vehicle' 
                        ? '[헤이딜러 5대 카테고리 1위 챔피언 자동차 (5슬롯)]' 
                        : '[수도권 실거주 주거지 1/2 지분 (5슬롯)]';
                    const headerDesc = currentCategory === 'vehicle'
                        ? '5년·7만km 이내 / 헤이딜러 즉시 엑시트 순수익 200만 원 이상 검증 물건'
                        : '타 공유자 실거주 점유 / 부당이득반환 청구 압박 레버리지 검증 물건';
                    
                    const marginTop = index > 0 ? 'margin-top: 24px;' : '';
                    html += `
                    <div style="${marginTop} margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.1);">
                        <div style="font-size: 0.95rem; font-weight: 700; color: var(--primary); letter-spacing: -0.01em;">${headerTitle}</div>
                        <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 2px;">${headerDesc}</div>
                    </div>
                    `;
                }

                const isEmpty = !!preset.is_empty;
                const isVehicle = preset.is_vehicle;

                if (isEmpty) {
                    // 실매물 부재 시 가짜 데이터 주입 없이 공석 바닥 텍스트 슬롯 렌더링
                    html += `
                    <div class="case-item case-item-empty" style="cursor: default; opacity: 0.72; border: 1.5px dashed rgba(255, 255, 255, 0.18); background: rgba(255, 255, 255, 0.02); transition: all 0.2s ease;">
                        <div style="flex: 1;">
                            <div class="case-info-title" style="color: var(--text-muted);">
                                <span style="border: 1px solid rgba(255, 255, 255, 0.15); border-radius: 4px; padding: 2px 6px; font-size: 0.75rem; margin-right: 6px; font-weight: 600; color: var(--text-muted);">공석 슬롯</span>
                                <strong>${preset.placeholder_title || preset.title}</strong>
                            </div>
                            <div class="case-info-meta" style="color: rgba(255, 255, 255, 0.45); font-size: 0.82rem; margin-top: 4px; line-height: 1.4;">
                                ${preset.placeholder_desc || '이번 회차 필터 통과 실매물이 없습니다. (다음 회차 수집 대기)'}
                            </div>
                        </div>
                        <span class="case-tag tag-blind" style="opacity: 0.8; font-size: 0.75rem; align-self: center;">${preset.badge || '수집 대기'}</span>
                    </div>
                    `;
                } else {
                    // 필터를 통과한 실매물 정상 렌더링 (클릭 시 가치평가 파라미터 자동 로드)
                    const badgeClass = isVehicle ? 'tag-redev' : 'tag-share';
                    const safeJson = JSON.stringify(preset).replace(/"/g, '&quot;');
                    const presetCategory = isVehicle ? 'vehicle' : 'residential';
                    const loadMethod = isVehicle ? 'loadVehiclePreset' : 'loadResidentialPreset';
                    
                    let ddayStr = '';
                    if (preset.auction_date) {
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        const aDate = new Date(preset.auction_date);
                        aDate.setHours(0, 0, 0, 0);
                        const diffDays = Math.ceil((aDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
                        if (diffDays > 0) ddayStr = `<span style="font-size:0.78rem; color:#f59e0b; margin-left:0.4rem; font-weight:700;">(D-${diffDays})</span>`;
                        else if (diffDays === 0) ddayStr = `<span style="font-size:0.78rem; color:#ef4444; margin-left:0.4rem; font-weight:700;">(오늘 매각)</span>`;
                    }

                    html += `
                    <div class="case-item" data-preset-category="${presetCategory}" role="button" tabindex="0" aria-pressed="false" onclick="NicheApp.${loadMethod}(${safeJson}, this)" style="cursor:pointer; transition: all 0.2s ease;">
                        <div style="flex: 1;">
                            <div class="case-info-title">
                                <span style="color:var(--text-muted); font-size:0.85rem; font-weight:600;">[${preset.court_name || '법원'}]</span>
                                <span style="color:var(--primary); font-weight:700;">${preset.case_number}</span> 
                                ${preset.title || preset.car_model || preset.address}
                                ${ddayStr}
                            </div>
                            <div class="case-info-meta">${preset.meta || ''}</div>
                        </div>
                        <span class="case-tag ${badgeClass}" style="align-self: center;">${preset.badge || '검증 통과'}</span>
                    </div>
                    `;
                }
            });

            container.innerHTML = html;
            console.log('[NicheApp] 실데이터 저수지 10슬롯 프리셋 연동 완료 (총 ' + presets.length + '슬롯)');
        } catch (e) {
            console.warn('[NicheApp] active_presets.json 로드 건너뜀 (기본 프리셋 유지):', e);
        } finally {
            clearTimeout(timeout);
            controller.abort();
        }
    },

    /** @returns {Promise<void>} */
    async checkPinAuth() {
        const currentCycle = this.getPinCycleKey();
        let storedPin = null;
        let storedCycle = null;
        try {
            storedPin = localStorage.getItem(this.config.STORAGE_KEY) || sessionStorage.getItem(this.config.STORAGE_KEY);
            storedCycle = localStorage.getItem(this.config.CYCLE_KEY) || sessionStorage.getItem(this.config.CYCLE_KEY);
        } catch(e) {}

        const modal = document.getElementById('pin-gate-modal');
        const statusBtn = document.getElementById('btn-pin-status');

        const isValidSession = storedPin && storedPin.trim().length >= 4 && storedCycle === currentCycle;

        if (isValidSession) {
            document.body.classList.remove('pin-locked');
            if (modal) modal.classList.add('hidden');
            if (statusBtn) statusBtn.textContent = "VIP 인증됨";
        } else {
            try {
                localStorage.removeItem(this.config.STORAGE_KEY);
                localStorage.removeItem(this.config.CYCLE_KEY);
                sessionStorage.removeItem(this.config.STORAGE_KEY);
                sessionStorage.removeItem(this.config.CYCLE_KEY);
            } catch(e) {}

            document.body.classList.add('pin-locked');
            if (modal) modal.classList.remove('hidden');
            if (statusBtn) statusBtn.textContent = "VIP 잠금";
        }
    },

    /** @returns {void} */
    verifyAndUnlockPin() {
        const currentCycle = this.getPinCycleKey();
        const pinInput = document.getElementById('pin-input-field');
        const errorMsg = document.getElementById('pin-error-text');
        const modal = document.getElementById('pin-gate-modal');
        const statusBtn = document.getElementById('btn-pin-status');

        if (!(pinInput instanceof HTMLInputElement)) return;
        const enteredPin = pinInput.value.trim().toUpperCase().replace(/[\s\-_]/g, '');

        if (enteredPin.length < 4) {
            if (errorMsg) {
                errorMsg.textContent = "올바른 핀코드를 입력해 주십시오.";
                errorMsg.style.display = 'block';
            }
            return;
        }

        try {
            localStorage.setItem(this.config.STORAGE_KEY, enteredPin);
            localStorage.setItem(this.config.CYCLE_KEY, currentCycle);
            sessionStorage.setItem(this.config.STORAGE_KEY, enteredPin);
            sessionStorage.setItem(this.config.CYCLE_KEY, currentCycle);
        } catch(e) {}

        if (errorMsg) errorMsg.style.display = 'none';
        document.body.classList.remove('pin-locked');
        if (modal) modal.classList.add('hidden');
        if (statusBtn) statusBtn.textContent = "VIP 인증됨";
    },

    /** @returns {void} */
    bindEvents() {
        const residentialForm = assetForm('residential-form');
        const vehicleForm = assetForm('vehicle-form');
        residentialForm.addEventListener('submit', (event) => {
            event.preventDefault();
            this.calculateResidentialShare();
        });
        vehicleForm.addEventListener('submit', (event) => {
            event.preventDefault();
            this.calculateVehicle();
        });
        for (const eventName of ['input', 'change']) {
            residentialForm.addEventListener(eventName, () => this.calculateResidentialShare());
            vehicleForm.addEventListener(eventName, () => this.calculateVehicle());
        }
        const residentialTab = assetElement('residential-tab');
        const vehicleTab = assetElement('vehicle-tab');
        residentialTab.addEventListener('click', () => this.showResidential());
        vehicleTab.addEventListener('click', () => this.showVehicle());
        for (const tab of [residentialTab, vehicleTab]) {
            tab.addEventListener('keydown', (event) => {
                if (!(event instanceof KeyboardEvent)) return;
                if (event.key === 'Home') {
                    event.preventDefault();
                    this.showResidential();
                    residentialTab.focus();
                } else if (event.key === 'End') {
                    event.preventDefault();
                    this.showVehicle();
                    vehicleTab.focus();
                } else if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
                    event.preventDefault();
                    if (tab === residentialTab) {
                        this.showVehicle();
                        vehicleTab.focus();
                    } else {
                        this.showResidential();
                        residentialTab.focus();
                    }
                }
            });
        }
        const navToggle = assetElement('nav-toggle');
        const nav = assetElement('niche-nav');
        navToggle.addEventListener('click', () => {
            const open = nav.classList.toggle('is-open');
            navToggle.setAttribute('aria-expanded', String(open));
            navToggle.setAttribute('aria-label', open ? '메뉴 닫기' : '메뉴 열기');
        });
        nav.querySelectorAll('a').forEach((link) => {
            link.addEventListener('click', () => this.closeMenu());
        });
        nav.addEventListener('keydown', (event) => {
            if (event instanceof KeyboardEvent && event.key === 'Escape') {
                this.closeMenu();
                navToggle.focus();
            }
        });
        assetElement('case-list-container').addEventListener('keydown', (event) => {
            if (!(event instanceof KeyboardEvent) || !(event.target instanceof HTMLElement)) return;
            const card = event.target.closest('[data-preset-category][role="button"]');
            if (card instanceof HTMLElement && (event.key === 'Enter' || event.key === ' ')) {
                event.preventDefault();
                card.click();
            }
        });

        const pinForm = document.getElementById('pin-gate-form');
        if (pinForm) {
            pinForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.verifyAndUnlockPin();
            });
        }

        const statusBtn = document.getElementById('btn-pin-status');
        if (statusBtn) {
            statusBtn.addEventListener('click', () => {
                const modal = document.getElementById('pin-gate-modal');
                if (modal) modal.classList.remove('hidden');
            });
        }
    },

    /** @returns {void} */
    closeMenu() {
        assetElement('niche-nav').classList.remove('is-open');
        const toggle = assetElement('nav-toggle');
        toggle.setAttribute('aria-expanded', 'false');
        toggle.setAttribute('aria-label', '메뉴 열기');
    },

    /** @returns {void} */
    showResidential() {
        this.selectAssetPanel(assetElement('residential-tab'), assetElement('vehicle-tab'),
            assetElement('residential-panel'), assetElement('vehicle-panel'));
    },

    /** @returns {void} */
    showVehicle() {
        this.selectAssetPanel(assetElement('vehicle-tab'), assetElement('residential-tab'),
            assetElement('vehicle-panel'), assetElement('residential-panel'));
    },

    /** @param {HTMLElement} selectedTab @param {HTMLElement} otherTab @param {HTMLElement} selectedPanel @param {HTMLElement} otherPanel @returns {void} */
    selectAssetPanel(selectedTab, otherTab, selectedPanel, otherPanel) {
        if (![selectedTab, otherTab, selectedPanel, otherPanel].every((element) => element instanceof HTMLElement)) {
            throw new TypeError('자산 탭 계약 오류');
        }
        selectedTab.setAttribute('aria-selected', 'true');
        selectedTab.tabIndex = 0;
        otherTab.setAttribute('aria-selected', 'false');
        otherTab.tabIndex = -1;
        selectedPanel.hidden = false;
        otherPanel.hidden = true;
    },

    /** @param {HTMLFormElement} form @param {InputName} name @param {string | number | undefined} value @returns {void} */
    setPresetField(form, name, value) {
        const field = assetInput(form, name);
        const text = value == null ? '' : String(value);
        if (field instanceof HTMLSelectElement && text && !Array.from(field.options).some((option) => option.value === text)) {
            field.add(new Option(text, text));
        }
        field.value = text;
    },

    /** @param {'residential' | 'vehicle'} category @param {HTMLElement | undefined} card @returns {void} */
    selectPresetCard(category, card) {
        if (category !== 'residential' && category !== 'vehicle') throw new TypeError('사례 자산 계약 오류');
        if (card === undefined) return;
        if (!(card instanceof HTMLElement) || card.dataset.presetCategory !== category) {
            throw new TypeError('사례 선택 대상 계약 오류');
        }
        const container = assetElement('case-list-container');
        if (!container.contains(card)) throw new TypeError('사례 목록 밖의 선택 대상');
        container.querySelectorAll(`[data-preset-category="${category}"]`).forEach((item) => {
            item.setAttribute('aria-pressed', String(item === card));
        });
    },

    /** @param {ResidentialPreset} preset @param {HTMLElement} [card] @returns {void} */
    loadResidentialPreset(preset, card) {
        if (!preset || preset.is_vehicle !== false || preset.is_empty) throw new TypeError('부동산 사례 계약 오류');
        const form = assetForm('residential-form');
        /** @type {[InputName, string | number | undefined][]} */
        const fields = [
            ['case', preset.case_number], ['type', preset.property_type], ['address', preset.address],
            ['appraisal', preset.appraisal_value], ['min-bid', preset.min_bid_price],
            ['building-area', preset.building_area_sqm], ['num', preset.share_numerator],
            ['denom', preset.share_denominator], ['monthly-rent', preset.monthly_rent]
        ];
        for (const [name, value] of fields) {
            this.setPresetField(form, name, value);
        }
        const residing = assetInput(form, 'residing');
        if (!(residing instanceof HTMLInputElement)) throw new TypeError('거주 여부 필드 계약 오류');
        residing.checked = preset.is_residing !== false;
        this.selectPresetCard('residential', card);
        this.calculateResidentialShare();
        this.showResidential();
        assetElement('simulator').scrollIntoView({ behavior: 'smooth', block: 'start' });
    },

    /** @param {VehiclePreset} preset @param {HTMLElement} [card] @returns {void} */
    loadVehiclePreset(preset, card) {
        if (!preset || preset.is_vehicle !== true || preset.is_empty) throw new TypeError('자동차 사례 계약 오류');
        const form = assetForm('vehicle-form');
        /** @type {[InputName, string | number | undefined][]} */
        const fields = [
            ['case', preset.case_number], ['type', preset.property_type], ['address', preset.address],
            ['appraisal', preset.appraisal_value], ['min-bid', preset.min_bid_price],
            ['car-model', preset.car_model], ['car-year', preset.vehicle_year],
            ['car-mileage', preset.mileage_km], ['car-wholesale', preset.wholesale_price],
            ['car-fines', preset.fines]
        ];
        for (const [name, value] of fields) {
            this.setPresetField(form, name, value);
        }
        this.selectPresetCard('vehicle', card);
        this.calculateVehicle();
        this.showVehicle();
        assetElement('simulator').scrollIntoView({ behavior: 'smooth', block: 'start' });
    },

    /** @param {string} modelName @returns {{isMatch: boolean, desc: string}} */
    matchCategoryChampion(modelName) {
        if (!modelName) return { isMatch: false, desc: "차종 미입력" };
        const clean = modelName.toUpperCase().replace(/[^A-Z0-9가-힣]/g, '');
        for (const cat of this.config.CATEGORY_CHAMPIONS) {
            for (const kw of cat.keywords) {
                const cleanKw = kw.toUpperCase().replace(/[^A-Z0-9가-힣]/g, '');
                if (clean.includes(cleanKw) || cleanKw.includes(clean)) {
                    return { isMatch: true, desc: `${cat.name} (${cat.model})` };
                }
            }
        }
        return { isMatch: false, desc: "5대 카테고리 1위 미포함" };
    },

    /** @returns {void} */
    calculateVehicle() {
        const form = assetForm('vehicle-form');
        const root = assetElement('vehicle-results');
        if (!form.checkValidity()) { this.clearResults(root); return; }
        const currentYear = new Date().getFullYear();
        const caseNumber = assetInput(form, 'case').value.trim() || "사건번호 미입력";
        const propertyType = assetInput(form, 'type').value;
        const address = assetInput(form, 'address').value.trim() || "법원 차량보관소";
        const appraisalValue = parseInt(assetInput(form, 'appraisal').value, 10) || 0;
        const minBidPrice = parseInt(assetInput(form, 'min-bid').value, 10) || 0;
        const carModel = assetInput(form, 'car-model')?.value || "차량";
        const carYear = parseInt(assetInput(form, 'car-year')?.value, 10) || currentYear;
        const mileageKm = parseInt(assetInput(form, 'car-mileage')?.value, 10) || 0;
        let wholesalePrice = parseInt(assetInput(form, 'car-wholesale')?.value, 10) || 0;
        const fines = parseInt(assetInput(form, 'car-fines')?.value, 10) || 0;

        if (appraisalValue <= 0 || minBidPrice <= 0) return;

        if (wholesalePrice <= 0) {
            wholesalePrice = Math.round(appraisalValue * 0.85);
        }

        const vehicleAge = currentYear - carYear;
        const matchResult = this.matchCategoryChampion(carModel);
        const isAgeValid = vehicleAge <= this.config.MAX_AGE_YEARS;
        const isMileageValid = mileageKm <= this.config.MAX_MILEAGE_KM;

        const filterReasons = [];
        if (!matchResult.isMatch) filterReasons.push("5대 카테고리 1위 미포함");
        if (!isAgeValid) filterReasons.push(`연식 초과 (${vehicleAge}년 > ${this.config.MAX_AGE_YEARS}년)`);
        if (!isMileageValid) filterReasons.push(`주행거리 초과 (${mileageKm.toLocaleString()}km > 7만km)`);

        const targetBidPrice = Math.max(minBidPrice, Math.round(wholesalePrice * 0.75));

        const bidRatio = targetBidPrice / wholesalePrice;
        let winRate = 70.0;
        if (bidRatio <= 0.70) winRate = 42.0;
        else if (bidRatio <= 0.78) winRate = 70.0;
        else if (bidRatio <= 0.85) winRate = 88.0;
        else winRate = 96.0;

        const acqTax = Math.round(targetBidPrice * 0.07);
        const grossProfit = wholesalePrice - targetBidPrice;
        const netProfit = grossProfit - acqTax;

        const realityBufferMin = 1500000 + fines;
        const realityBufferMax = 3000000 + fines;

        const heydilerExitMin = netProfit - realityBufferMax;
        const heydilerExitMax = netProfit - realityBufferMin;

        if (heydilerExitMin < this.config.MIN_HEYDEALER_PROFIT) {
            filterReasons.push(`헤이딜러 마진 부족 (+${(heydilerExitMin / 10000).toFixed(0)}만 < 200만)`);
        }

        const isPass = filterReasons.length === 0;

        const encarBonus = Math.round(wholesalePrice * 0.08);

        const realCashMin = targetBidPrice + acqTax + realityBufferMin;
        const realCashMax = targetBidPrice + acqTax + realityBufferMax;

        const ev = Math.round(netProfit * (winRate / 100.0));
        const marginRate = Math.round((netProfit / targetBidPrice) * 1000) / 10;
        const marginRateBufferMin = Math.round((heydilerExitMin / targetBidPrice) * 1000) / 10;

        this.renderVehicleResults({
            caseNumber,
            propertyType: `${propertyType} (${carModel})`,
            address,
            appraisalValue,
            minBidPrice,
            baseMarketPrice: wholesalePrice,
            targetBidPrice,
            winRate,
            netProfit,
            marginRate,
            ev,
            realityBufferMin,
            realityBufferMax,
            netProfitBufferMin: heydilerExitMin,
            netProfitBufferMax: heydilerExitMax,
            realCashMin,
            realCashMax,
            marginRateBufferMin,
            encarBonus,
            turnaround: "3일 (헤이딜러 즉시 엑시트)",
            isPass,
            categoryDesc: matchResult.desc,
            filterReasons
        });
    },

    /** @returns {void} */
    calculateResidentialShare() {
        const form = assetForm('residential-form');
        const root = assetElement('residential-results');
        if (!form.checkValidity()) { this.clearResults(root); return; }
        const caseNumber = assetInput(form, 'case').value.trim() || "사건번호 미입력";
        const propertyType = assetInput(form, 'type').value;
        const address = assetInput(form, 'address').value.trim() || "소재지 미지정";
        const appraisalValue = parseInt(assetInput(form, 'appraisal').value, 10) || 0;
        const minBidPrice = parseInt(assetInput(form, 'min-bid').value, 10) || 0;
        const buildingAreaSqm = parseFloat(assetInput(form, 'building-area').value) || 0.0;
        const shareNum = parseInt(assetInput(form, 'num').value, 10) || 1;
        const shareDenom = parseInt(assetInput(form, 'denom').value, 10) || 2;
        let monthlyRent = parseInt(assetInput(form, 'monthly-rent').value, 10) || 0;
        const residing = assetInput(form, 'residing');
        if (!(residing instanceof HTMLInputElement)) throw new TypeError('거주 여부 필드 계약 오류');
        const isResiding = residing.checked;

        if (appraisalValue <= 0 || minBidPrice <= 0) return;

        const shareRatio = Math.min(Math.max(shareNum / shareDenom, 0.01), 1.0);
        const buildingPyeong = Math.round((buildingAreaSqm / this.config.SQM_TO_PYEONG) * 100) / 100;
        const baseMarketPrice = appraisalValue;

        const targetBidPrice = Math.max(minBidPrice, Math.round(baseMarketPrice * this.config.BID_RATIO_REC));

        if (monthlyRent <= 0) {
            monthlyRent = Math.round((appraisalValue * 0.05) / 12);
        }
        const unjustMonthly = Math.round(monthlyRent * shareRatio);
        const unjustAnnual = unjustMonthly * 12;

        const bidRatio = targetBidPrice / baseMarketPrice;
        let winRate = 72.0;
        if (bidRatio <= 0.65) winRate = 45.0;
        else if (bidRatio <= 0.75) winRate = 72.0;
        else if (bidRatio <= 0.85) winRate = 88.0;
        else winRate = 96.0;

        const grossProfit = baseMarketPrice - targetBidPrice;
        const acqCost = Math.round(targetBidPrice * 0.035);
        const netProfit = grossProfit - acqCost;
        const ev = Math.round(netProfit * (winRate / 100.0));
        const marginRate = Math.round((netProfit / targetBidPrice) * 1000) / 10;

        const realityBufferMin = 5000000;
        const realityBufferMax = 10000000;

        const netProfitBufferMax = netProfit - realityBufferMin;
        const netProfitBufferMin = netProfit - realityBufferMax;

        const realCashMin = targetBidPrice + acqCost + realityBufferMin;
        const realCashMax = targetBidPrice + acqCost + realityBufferMax;

        const marginRateBufferMin = Math.round((netProfitBufferMin / targetBidPrice) * 1000) / 10;

        this.renderResidentialResults({
            caseNumber,
            propertyType,
            address,
            appraisalValue,
            minBidPrice,
            buildingPyeong,
            shareRatio,
            baseMarketPrice,
            targetBidPrice,
            winRate,
            netProfit,
            marginRate,
            ev,
            realityBufferMin,
            realityBufferMax,
            netProfitBufferMin,
            netProfitBufferMax,
            realCashMin,
            realCashMax,
            marginRateBufferMin,
            unjustMonthly,
            unjustAnnual,
            settlementScore: isResiding ? 90 : 60,
            turnaround: "60일~90일 (합의/형식경매)",
            isPass: marginRateBufferMin >= 20.0,
            filterReasons: []
        });
    },

    /** @param {number} num @returns {string} */
    formatNumber(num) {
        return (num || 0).toLocaleString('ko-KR');
    },

    /** @param {HTMLElement} root @returns {void} */
    clearResults(root) {
        resultElement(root, 'content').hidden = true;
        resultElement(root, 'empty').hidden = false;
        resultElement(root, 'badge').textContent = '입력 대기';
    },

    /** @param {HTMLElement} root @param {CommonResult} data @param {string} passLabel @returns {void} */
    renderCommonResults(root, data, passLabel) {
        if (!data || !Number.isFinite(data.targetBidPrice) || !passLabel) throw new TypeError('계산 결과 계약 오류');
        resultElement(root, 'content').hidden = false;
        resultElement(root, 'empty').hidden = true;
        resultElement(root, 'target-bid').textContent = `${this.formatNumber(data.targetBidPrice)}원`;
        resultElement(root, 'win-rate').textContent = `${data.winRate.toFixed(1)}%`;
        resultElement(root, 'ev').textContent = `${this.formatNumber(data.ev)}원`;
        resultElement(root, 'appraisal').textContent = `${this.formatNumber(data.appraisalValue)}원`;
        resultElement(root, 'min-bid').textContent = `${this.formatNumber(data.minBidPrice)}원`;
        resultElement(root, 'market-price').textContent = `${this.formatNumber(data.baseMarketPrice)}원`;
        resultElement(root, 'net-profit').textContent = `${this.formatNumber(data.netProfit)}원 (${data.marginRate}%)`;
        resultElement(root, 'buffer').textContent = `${this.formatNumber(data.realityBufferMin)}원 ~ ${this.formatNumber(data.realityBufferMax)}원`;
        resultElement(root, 'safe-profit').textContent = `${this.formatNumber(data.netProfitBufferMin)}원 (${data.marginRateBufferMin}%)`;
        resultElement(root, 'real-cash').textContent = `${this.formatNumber(data.realCashMin)}원 ~ ${this.formatNumber(data.realCashMax)}원`;
        const badge = resultElement(root, 'badge');
        const reasons = data.filterReasons.length ? data.filterReasons.join(', ') : '마진 미달 또는 리스크 보류';
        badge.textContent = data.isPass ? passLabel : `보류 (${reasons})`;
        badge.className = data.isPass ? 'brand-badge' : 'brand-badge tag-blind';
    },

    /** @param {ResidentialResult} data @returns {void} */
    renderResidentialResults(data) {
        if (!data || !Number.isFinite(data.shareRatio)) throw new TypeError('부동산 결과 계약 오류');
        const root = assetElement('residential-results');
        this.renderCommonResults(root, data, '알짜 선별 완료 (실거주 압박 90점)');
        resultElement(root, 'share').textContent = `전용 ${data.buildingPyeong}평 / 지분 ${(data.shareRatio * 100).toFixed(1)}%`;
        resultElement(root, 'unjust-monthly').textContent = `월 ${this.formatNumber(data.unjustMonthly)}원`;
        resultElement(root, 'unjust-annual').textContent = `연 ${this.formatNumber(data.unjustAnnual)}원`;
        resultElement(root, 'settlement').textContent = `${data.settlementScore}점 / 100점 (실거주 점유)`;
    },

    /** @param {VehicleResult} data @returns {void} */
    renderVehicleResults(data) {
        if (!data || !Number.isFinite(data.encarBonus)) throw new TypeError('자동차 결과 계약 오류');
        const root = assetElement('vehicle-results');
        this.renderCommonResults(root, data, `알짜 선별 완료 (${data.categoryDesc})`);
        resultElement(root, 'turnaround').textContent = data.turnaround;
        resultElement(root, 'encar-bonus').textContent = `+${this.formatNumber(data.encarBonus)}원 (소매 직거래 시)`;
    }
};

document.addEventListener('DOMContentLoaded', () => {
    NicheApp.init();
});
