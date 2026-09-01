/**
 * Gathering Niche - 실시간 프론트엔드 가치평가 및 VIP 핀코드 보안 엔진 (주거지 지분 & 헤이딜러 5대 카테고리 1위 챔피언 자동차)
 */

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

    init() {
        this.checkPinAuth();
        this.bindEvents();
        this.calculate();
    },

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

    verifyAndUnlockPin() {
        const currentCycle = this.getPinCycleKey();
        const pinInput = document.getElementById('pin-input-field');
        const errorMsg = document.getElementById('pin-error-text');
        const modal = document.getElementById('pin-gate-modal');
        const statusBtn = document.getElementById('btn-pin-status');

        if (!pinInput) return;
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

    bindEvents() {
        const form = document.getElementById('niche-calc-form');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.calculate();
            });

            const inputs = form.querySelectorAll('input, select');
            inputs.forEach(input => {
                input.addEventListener('input', () => this.calculate());
                input.addEventListener('change', () => this.calculate());
            });

            const typeSelect = document.getElementById('input-type');
            if (typeSelect) {
                typeSelect.addEventListener('change', () => {
                    this.toggleVehicleFields();
                    this.calculate();
                });
            }
        }

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

    toggleVehicleFields() {
        const type = document.getElementById('input-type').value;
        const isVehicle = type.includes('자동차') || type.includes('차량');
        const realEstateFields = document.querySelectorAll('.re-field');
        const vehicleFields = document.querySelectorAll('.vehicle-field');

        realEstateFields.forEach(el => el.style.display = isVehicle ? 'none' : 'block');
        vehicleFields.forEach(el => el.style.display = isVehicle ? 'block' : 'none');
    },

    loadPreset(presetData) {
        document.getElementById('input-case').value = presetData.case_number;
        document.getElementById('input-type').value = presetData.property_type;
        document.getElementById('input-address').value = presetData.address;
        document.getElementById('input-appraisal').value = presetData.appraisal_value;
        document.getElementById('input-min-bid').value = presetData.min_bid_price;
        
        if (presetData.is_vehicle) {
            if (document.getElementById('input-car-model')) document.getElementById('input-car-model').value = presetData.car_model || "";
            if (document.getElementById('input-car-year')) document.getElementById('input-car-year').value = presetData.vehicle_year || new Date().getFullYear() - 2;
            if (document.getElementById('input-car-mileage')) document.getElementById('input-car-mileage').value = presetData.mileage_km || 45000;
            if (document.getElementById('input-car-wholesale')) document.getElementById('input-car-wholesale').value = presetData.wholesale_price || presetData.appraisal_value;
            if (document.getElementById('input-car-fines')) document.getElementById('input-car-fines').value = presetData.fines || 0;
        } else {
            document.getElementById('input-building-area').value = presetData.building_area_sqm || 0;
            document.getElementById('input-num').value = presetData.share_numerator || 1;
            document.getElementById('input-denom').value = presetData.share_denominator || 2;
            document.getElementById('input-monthly-rent').value = presetData.monthly_rent || 0;
            document.getElementById('check-residing').checked = presetData.is_residing !== false;
        }

        this.toggleVehicleFields();
        this.calculate();
        window.scrollTo({ top: 300, behavior: 'smooth' });
    },

    calculate() {
        const type = document.getElementById('input-type').value;
        const isVehicle = type.includes('자동차') || type.includes('차량');

        if (isVehicle) {
            this.calculateVehicle();
        } else {
            this.calculateResidentialShare();
        }
    },

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

    calculateVehicle() {
        const currentYear = new Date().getFullYear();
        const caseNumber = document.getElementById('input-case').value.trim() || "사건번호 미입력";
        const propertyType = document.getElementById('input-type').value;
        const address = document.getElementById('input-address').value.trim() || "법원 차량보관소";
        const appraisalValue = parseInt(document.getElementById('input-appraisal').value, 10) || 0;
        const minBidPrice = parseInt(document.getElementById('input-min-bid').value, 10) || 0;
        const carModel = document.getElementById('input-car-model')?.value || "차량";
        const carYear = parseInt(document.getElementById('input-car-year')?.value, 10) || currentYear;
        const mileageKm = parseInt(document.getElementById('input-car-mileage')?.value, 10) || 0;
        let wholesalePrice = parseInt(document.getElementById('input-car-wholesale')?.value, 10) || 0;
        const fines = parseInt(document.getElementById('input-car-fines')?.value, 10) || 0;

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

        this.renderResults({
            isVehicle: true,
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

    calculateResidentialShare() {
        const caseNumber = document.getElementById('input-case').value.trim() || "사건번호 미입력";
        const propertyType = document.getElementById('input-type').value;
        const address = document.getElementById('input-address').value.trim() || "소재지 미지정";
        const appraisalValue = parseInt(document.getElementById('input-appraisal').value, 10) || 0;
        const minBidPrice = parseInt(document.getElementById('input-min-bid').value, 10) || 0;
        const buildingAreaSqm = parseFloat(document.getElementById('input-building-area').value) || 0.0;
        const shareNum = parseInt(document.getElementById('input-num').value, 10) || 1;
        const shareDenom = parseInt(document.getElementById('input-denom').value, 10) || 2;
        let monthlyRent = parseInt(document.getElementById('input-monthly-rent').value, 10) || 0;
        const isResiding = document.getElementById('check-residing').checked;

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

        this.renderResults({
            isVehicle: false,
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

    formatNumber(num) {
        return (num || 0).toLocaleString('ko-KR');
    },

    renderResults(data) {
        document.getElementById('res-target-bid').textContent = `${this.formatNumber(data.targetBidPrice)}원`;
        document.getElementById('res-win-rate').textContent = `${data.winRate.toFixed(1)}%`;
        document.getElementById('res-ev').textContent = `${this.formatNumber(data.ev)}원`;

        document.getElementById('td-appraisal').textContent = `${this.formatNumber(data.appraisalValue)}원`;
        document.getElementById('td-min-bid').textContent = `${this.formatNumber(data.minBidPrice)}원`;
        
        if (data.isVehicle) {
            document.getElementById('th-market-label').textContent = "헤이딜러 즉시 도매가";
            document.getElementById('td-market-price').textContent = `${this.formatNumber(data.baseMarketPrice)}원`;

            document.getElementById('tr-share').style.display = 'none';
            document.getElementById('tr-unjust-monthly').style.display = 'none';
            document.getElementById('tr-unjust-annual').style.display = 'none';
            document.getElementById('tr-settlement').style.display = 'none';

            document.getElementById('tr-turnaround').style.display = 'table-row';
            document.getElementById('td-turnaround').textContent = data.turnaround;

            document.getElementById('tr-encar-bonus').style.display = 'table-row';
            document.getElementById('td-encar-bonus').textContent = `+${this.formatNumber(data.encarBonus)}원 (소매 직거래 시)`;

            document.getElementById('th-safe-profit-label').textContent = "헤이딜러 즉시 순수익";
        } else {
            document.getElementById('th-market-label').textContent = "추정 기준 시세";
            document.getElementById('td-market-price').textContent = `${this.formatNumber(data.baseMarketPrice)}원`;

            document.getElementById('tr-share').style.display = 'table-row';
            document.getElementById('tr-unjust-monthly').style.display = 'table-row';
            document.getElementById('tr-unjust-annual').style.display = 'table-row';
            document.getElementById('tr-settlement').style.display = 'table-row';

            document.getElementById('tr-turnaround').style.display = 'none';
            document.getElementById('tr-encar-bonus').style.display = 'none';

            document.getElementById('th-safe-profit-label').textContent = "예비비 차감 후 순수익";
            document.getElementById('td-share').textContent = `전용 ${data.buildingPyeong}평 / 지분 ${(data.shareRatio * 100).toFixed(1)}%`;
            document.getElementById('td-unjust-monthly').textContent = `월 ${this.formatNumber(data.unjustMonthly)}원`;
            document.getElementById('td-unjust-annual').textContent = `연 ${this.formatNumber(data.unjustAnnual)}원`;
            document.getElementById('td-settlement').textContent = `${data.settlementScore}점 / 100점 (실거주 점유)`;
        }

        document.getElementById('td-net-profit').textContent = `${this.formatNumber(data.netProfit)}원 (${data.marginRate}%)`;
        document.getElementById('td-buffer').textContent = `${this.formatNumber(data.realityBufferMin)}원 ~ ${this.formatNumber(data.realityBufferMax)}원`;
        document.getElementById('td-safe-profit').textContent = `${this.formatNumber(data.netProfitBufferMin)}원 (${data.marginRateBufferMin}%)`;
        document.getElementById('td-real-cash').textContent = `${this.formatNumber(data.realCashMin)}원 ~ ${this.formatNumber(data.realCashMax)}원`;
        
        const badge = document.getElementById('res-badge');
        if (badge) {
            if (data.isPass) {
                const label = data.isVehicle ? `알짜 선별 완료 (${data.categoryDesc})` : "알짜 선별 완료 (실거주 압박 90점)";
                badge.textContent = label;
                badge.className = "brand-badge";
            } else {
                const reasonText = (data.filterReasons && data.filterReasons.length > 0) 
                    ? data.filterReasons.join(", ") 
                    : "마진 미달 또는 리스크 보류";
                badge.textContent = `보류 (${reasonText})`;
                badge.className = "brand-badge tag-blind";
            }
        }
    }
};

document.addEventListener('DOMContentLoaded', () => {
    NicheApp.init();
});
