/**
 * knob.js - Infinite Knob Widget (Pure Canvas)
 * 
 * Widget knob berbasis Canvas murni (tanpa library eksternal).
 * Meniru tampilan dan perilaku jqxKnob Infinite Knob.
 * 
 * Cara penggunaan:
 *   const knob = new KnobInfinite('container-id', {
 *       value: 60,
 *       min: 0,
 *       max: 100
 *   });
 *   knob.setValue(75);
 *   knob.getValue();
 *   knob.on('change', (data) => { ... });
 *   knob.destroy();
 */

class KnobInfinite {
    /**
     * @param {string|HTMLElement} container - ID element atau element DOM container
     * @param {Object} options - Konfigurasi knob
     * @param {number} [options.value=0] - Nilai awal
     * @param {number} [options.min=0] - Nilai minimum
     * @param {number} [options.max=100] - Nilai maksimum
     * @param {number} [options.step=1] - Step perubahan nilai
     * @param {number} [options.startAngle=150] - Sudut mulai (derajat, 0=atas, searah jarum jam)
     * @param {number} [options.endAngle=510] - Sudut akhir (derajat, 0=atas, searah jarum jam)
     * @param {string} [options.rotation='clockwise'] - Arah rotasi
     * @param {boolean} [options.snapToStep=true] - Snap ke step
     * @param {boolean} [options.infinite=true] - Mode infinite scroll
     * @param {number} [options.infiniteStep=100] - Step infinity
     * @param {string} [options.units=''] - Satuan nilai
     * @param {number} [options.animationDuration=300] - Durasi animasi (ms)
     * @param {Function} [options.onChange] - Callback saat nilai berubah
     */
    constructor(container, options = {}) {
        this._container = (typeof container === 'string')
            ? document.getElementById(container)
            : container;

        if (!this._container) {
            throw new Error(`KnobInfinite: Container tidak ditemukan: ${container}`);
        }

        // Opsi default - berdasarkan konfigurasi jqxKnob infinite knob
        this._options = {
            value: 60,
            min: 0,
            max: 100,
            step: 1,
            startAngle: 150,
            endAngle: 510,
            rotation: 'clockwise',
            snapToStep: true,
            infinite: true,
            infiniteStep: 100,
            units: '',
            animationDuration: 300,
            onChange: null,
            ...options
        };

        // State
        this._currentValue = this._options.value;
        this._animValue = this._options.value;
        this._animId = null;
        this._isDragging = false;
        this._callbacks = {};
        this._resizeObserver = null;

        // Infinite state
        this._infMin = this._options.min;
        this._infMax = this._options.max;
        this._lastValue = this._options.value;

        // Warna dari jqxKnob infinite knob
        this._colors = {
            progressBar: '#00a644',
            progressBg: '#ff8b1e',
            spinner: '#00a4e1',
            spinnerStroke: '#00a4e1',
            markMajor: '#333333',
            markMinor: '#333333',
            spinnerMark: '#ffffff',
            labelColor: '#333333',
            pointer: '#ef6100',
            pointerStroke: '#ef6100',
            dialStroke: '#dfe3e9',
        };

        // Bangun DOM
        this._buildDOM();

        // Inisialisasi ukuran
        this._updateSize();

        // Gambar pertama
        this._draw();

        // Setup interaksi
        this._setupInteraction();

        // Setup resize observer
        this._setupResize();
    }

    // ========================
    //   PRIVATE METHODS
    // ========================

    _buildDOM() {
        this._container.classList.add('knob-infinite-wrapper');
        this._canvas = document.createElement('canvas');
        this._canvas.className = 'knob-canvas';
        this._container.appendChild(this._canvas);
        this._ctx = this._canvas.getContext('2d');

        // Value display di tengah
        this._valueDisplay = document.createElement('div');
        this._valueDisplay.className = 'knob-value-display';
        this._valueDisplay.innerHTML = `
            <span class="knob-value-text">${Math.round(this._options.value)}</span>
            ${this._options.units ? `<span class="knob-value-unit">${this._options.units}</span>` : ''}
        `;
        this._container.appendChild(this._valueDisplay);
        this._valueTextEl = this._valueDisplay.querySelector('.knob-value-text');
    }

    _updateSize() {
        const rect = this._container.getBoundingClientRect();
        const size = Math.min(rect.width, rect.height);
        const dpr = window.devicePixelRatio || 1;
        const displaySize = Math.max(size, 160);

        this._canvas.width = displaySize * dpr;
        this._canvas.height = displaySize * dpr;
        this._canvas.style.width = displaySize + 'px';
        this._canvas.style.height = displaySize + 'px';

        this._size = displaySize;
        this._dpr = dpr;
        this._cx = this._canvas.width / 2;
        this._cy = this._canvas.height / 2;
        this._radius = this._canvas.width / 2;
    }

    _setupResize() {
        if (window.ResizeObserver) {
            this._resizeObserver = new ResizeObserver(() => {
                this._updateSize();
                this._draw();
            });
            this._resizeObserver.observe(this._container);
        }
        // Juga handle resize window
        window.addEventListener('resize', () => {
            this._updateSize();
            this._draw();
        });
    }

    _setupInteraction() {
        // Mouse
        this._canvas.addEventListener('mousedown', this._onPointerDown.bind(this));
        window.addEventListener('mousemove', this._onPointerMove.bind(this));
        window.addEventListener('mouseup', this._onPointerUp.bind(this));

        // Touch
        this._canvas.addEventListener('touchstart', this._onTouchStart.bind(this), { passive: false });
        window.addEventListener('touchmove', this._onTouchMove.bind(this), { passive: false });
        window.addEventListener('touchend', this._onTouchEnd.bind(this));

        this._canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    }

    /**
     * Konversi sudut dari konvensi jqxKnob (0=atas, searah jarum jam)
     * ke canvas radians (0=kanan, searah jarum jam)
     */
    _knobDegToCanvasRad(deg) {
        return (deg - 90) * Math.PI / 180;
    }

    /**
     * Dapatkan nilai dari posisi pointer (mouse/touch)
     */
    _valueFromAngle(clientX, clientY) {
        const rect = this._canvas.getBoundingClientRect();
        const dx = clientX - rect.left - rect.width / 2;
        const dy = clientY - rect.top - rect.height / 2;

        // Jarak dari center
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 5) return this._currentValue; // terlalu dekat ke center, abaikan

        // Canvas angle (0=right, clockwise positive)
        let canvasAngle = Math.atan2(dy, dx);
        if (canvasAngle < 0) canvasAngle += 2 * Math.PI;

        // Konversi ke knob degrees (0=top, clockwise)
        let knobDeg = canvasAngle * 180 / Math.PI + 90;
        knobDeg = ((knobDeg % 360) + 360) % 360;

        const startAngle = this._options.startAngle; // 150
        const endAngle = this._options.endAngle; // 510

        // Map ke range [startAngle, endAngle]
        let effectiveDeg = knobDeg;
        if (effectiveDeg < startAngle) {
            effectiveDeg += 360;
        }

        let fraction = (effectiveDeg - startAngle) / (endAngle - startAngle);
        fraction = Math.max(0, Math.min(1, fraction));

        if (this._options.rotation !== 'clockwise') {
            fraction = 1 - fraction;
        }

        const range = this._infMax - this._infMin;
        let value = this._infMin + fraction * range;

        if (this._options.snapToStep) {
            value = Math.round(value / this._options.step) * this._options.step;
        }

        return Math.max(this._infMin, Math.min(this._infMax, value));
    }

    /**
     * Gambar semua komponen knob
     */
    _draw() {
        const ctx = this._ctx;
        const cx = this._cx;
        const cy = this._cy;
        const dpr = this._dpr;

        // Hapus canvas
        ctx.clearRect(0, 0, this._canvas.width, this._canvas.height);

        // Radius kerja (persentase dari radius canvas)
        const R = this._radius;
        const ro = R * 0.95; // outer bounds

        // Hitung sudut canvas untuk start, end, dan current value
        const startAngleRad = this._knobDegToCanvasRad(this._options.startAngle);  // PI/3 ≈ 1.047 (5 o'clock)
        const endAngleRad = this._knobDegToCanvasRad(this._options.endAngle);      // PI/3 + 2*PI ≈ 7.33

        const fraction = (this._animValue - this._infMin) / Math.max(1, this._infMax - this._infMin);
        const currentKnobDeg = this._options.startAngle + fraction * (this._options.endAngle - this._options.startAngle);
        const currentAngleRad = this._knobDegToCanvasRad(currentKnobDeg);

        // =============================================
        // 1. DIAL OUTER - Lingkaran dengan gradient
        // =============================================
        const dialR = ro * 0.93;

        const grad = ctx.createLinearGradient(cx - dialR, cy - dialR, cx + dialR, cy + dialR);
        grad.addColorStop(0, '#fefefe');
        grad.addColorStop(0.5, '#ececec');
        grad.addColorStop(1, '#fefefe');

        ctx.beginPath();
        ctx.arc(cx, cy, dialR, 0, 2 * Math.PI);
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.strokeStyle = '#dfe3e9';
        ctx.lineWidth = 2 * dpr;
        ctx.stroke();

        // =============================================
        // 2. PROGRESS BAR - Busur hijau/oranye
        // =============================================
        const progressRadius = ro * 0.60;
        const progressWidth = ro * 0.09;

        // Background (oranye)
        ctx.beginPath();
        ctx.arc(cx, cy, progressRadius, startAngleRad, endAngleRad);
        ctx.strokeStyle = this._colors.progressBg;
        ctx.lineWidth = progressWidth * 2;
        ctx.lineCap = 'butt';
        ctx.stroke();

        // Foreground (hijau) - dari start ke current
        ctx.beginPath();
        ctx.arc(cx, cy, progressRadius, startAngleRad, Math.min(currentAngleRad, endAngleRad));
        ctx.strokeStyle = this._colors.progressBar;
        ctx.lineWidth = progressWidth * 2;
        ctx.stroke();

        // =============================================
        // 3. SPINNER RING - Lingkaran biru dalam
        // =============================================
        const spinnerOuterR = ro * 0.60;
        const spinnerInnerR = ro * 0.45;
        const spinnerMidR = (spinnerOuterR + spinnerInnerR) / 2;

        // Gradient spinner
        const spinnerGrad = ctx.createLinearGradient(cx - spinnerMidR, cy, cx + spinnerMidR, cy);
        spinnerGrad.addColorStop(0, '#00a4e1');
        spinnerGrad.addColorStop(0.5, '#33c4f0');
        spinnerGrad.addColorStop(1, '#00a4e1');

        ctx.beginPath();
        ctx.arc(cx, cy, spinnerMidR, 0, 2 * Math.PI);
        ctx.strokeStyle = spinnerGrad;
        ctx.lineWidth = (spinnerOuterR - spinnerInnerR);
        ctx.stroke();

        // Spinner marks (garis putih)
        const spinnerMarkCount = 10;
        const spinnerMarkLength = ro * 0.14;
        const spinnerMarkOffset = ro * 0.46;

        for (let i = 0; i < spinnerMarkCount; i++) {
            const frac = i / spinnerMarkCount;
            const angle = startAngleRad + frac * (endAngleRad - startAngleRad);

            const x1 = cx + spinnerMarkOffset * Math.cos(angle);
            const y1 = cy + spinnerMarkOffset * Math.sin(angle);
            const x2 = cx + (spinnerMarkOffset + spinnerMarkLength) * Math.cos(angle);
            const y2 = cy + (spinnerMarkOffset + spinnerMarkLength) * Math.sin(angle);

            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 2 * dpr;
            ctx.stroke();
        }

        // =============================================
        // 4. CENTER CIRCLE - Lingkaran dalam
        // =============================================
        const centerR = spinnerInnerR;
        const centerGrad = ctx.createLinearGradient(cx - centerR, cy - centerR, cx + centerR, cy + centerR);
        centerGrad.addColorStop(0, '#fefefe');
        centerGrad.addColorStop(0.5, '#ececec');
        centerGrad.addColorStop(1, '#fefefe');

        ctx.beginPath();
        ctx.arc(cx, cy, centerR, 0, 2 * Math.PI);
        ctx.fillStyle = centerGrad;
        ctx.fill();
        ctx.strokeStyle = '#dfe3e9';
        ctx.lineWidth = 2 * dpr;
        ctx.stroke();

        // =============================================
        // 5. OUTER MARKS - Major & minor ticks
        // =============================================
        const markOffset = ro * 0.71;
        const majorMarkSize = ro * 0.09;
        const minorMarkSize = ro * 0.06;
        const majorInterval = 10;
        const minorInterval = 2;

        // Batasi jumlah marks untuk performa
        const maxMarks = 200;
        const totalMarks = Math.ceil((this._infMax - this._infMin) / minorInterval);
        const markStep = totalMarks > maxMarks ? Math.ceil(totalMarks / maxMarks) * minorInterval : minorInterval;

        for (let v = this._infMin; v <= this._infMax; v += markStep) {
            const frac = (v - this._infMin) / Math.max(1, this._infMax - this._infMin);
            const angle = startAngleRad + frac * (endAngleRad - startAngleRad);
            const isMajor = (v % majorInterval === 0);
            const size = isMajor ? majorMarkSize : minorMarkSize;

            const x1 = cx + markOffset * Math.cos(angle);
            const y1 = cy + markOffset * Math.sin(angle);
            const x2 = cx + (markOffset + size) * Math.cos(angle);
            const y2 = cy + (markOffset + size) * Math.sin(angle);

            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.strokeStyle = this._colors.markMajor;
            ctx.lineWidth = 1 * dpr;
            ctx.stroke();
        }

        // =============================================
        // 6. LABELS - Angka di sekeliling
        // =============================================
        const labelOffset = ro * 0.88;
        const labelStep = majorInterval;
        const fontSize = Math.max(9, Math.min(16, ro * 0.065));
        ctx.font = `${Math.round(fontSize * dpr)}px 'Segoe UI', Tahoma, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = this._colors.labelColor;

        for (let v = this._infMin; v <= this._infMax; v += labelStep) {
            const frac = (v - this._infMin) / Math.max(1, this._infMax - this._infMin);
            const angle = startAngleRad + frac * (endAngleRad - startAngleRad);

            const lx = cx + labelOffset * Math.cos(angle);
            const ly = cy + labelOffset * Math.sin(angle);

            ctx.fillText(Math.round(v).toString(), lx, ly);
        }

        // =============================================
        // 7. POINTER - Circle pointer + garis
        // =============================================
        const pointerOff = ro * 0.38;
        const pointerSize = Math.max(4, ro * 0.045);

        const px = cx + pointerOff * Math.cos(currentAngleRad);
        const py = cy + pointerOff * Math.sin(currentAngleRad);

        // Garis dari center ke pointer
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(px, py);
        ctx.strokeStyle = '#ef6100';
        ctx.lineWidth = 2.5 * dpr;
        ctx.stroke();

        // Circle pointer
        ctx.beginPath();
        ctx.arc(px, py, pointerSize, 0, 2 * Math.PI);
        ctx.fillStyle = '#ef6100';
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5 * dpr;
        ctx.stroke();

        // Center dot
        ctx.beginPath();
        ctx.arc(cx, cy, 3 * dpr, 0, 2 * Math.PI);
        ctx.fillStyle = '#888888';
        ctx.fill();
    }

    /**
     * Update nilai dan trigger events
     */
    _updateValue(value, silent = false) {
        const oldValue = this._currentValue;
        value = Math.max(this._infMin, Math.min(this._infMax, value));

        if (this._options.snapToStep) {
            value = Math.round(value / this._options.step) * this._options.step;
            value = Math.max(this._infMin, Math.min(this._infMax, value));
        }

        if (value === this._currentValue && !this._isDragging) return;

        this._currentValue = value;
        this._animValue = value;

        if (this._valueTextEl) {
            this._valueTextEl.textContent = Math.round(value);
        }

        this._draw();

        if (!silent) {
            this._emit('change', { value, oldValue });
            if (this._options.onChange) {
                this._options.onChange({ value, oldValue });
            }
            this._checkInfinite(value, oldValue);
        }
    }

    /**
     * Cek kondisi infinite scroll
     * 
     * Logika: Jika user memutar melewati batas max (dari max ke min),
     * range bergeser naik. Jika memutar melewati batas min (min ke max),
     * range bergeser turun.
     */
    _checkInfinite(value, oldValue) {
        if (!this._options.infinite) return;

        const min = this._infMin;
        const max = this._infMax;
        const step = this._options.infiniteStep;
        const threshold = 10;

        // Putar melewati max (clockwise terus): dari max-10..max ke min..min+10
        if (value >= min && value <= min + threshold && oldValue >= max - threshold && oldValue <= max) {
            // Shift range up
            const newMin = max;
            const newMax = max + step;
            this._infMin = newMin;
            this._infMax = newMax;
            this._currentValue = newMin;
            this._animValue = newMin;
            if (this._valueTextEl) {
                this._valueTextEl.textContent = Math.round(newMin);
            }
            this._draw();
            this._emit('infinity', { direction: 'up', min: newMin, max: newMax });
            return;
        }

        // Putar melewati min (mundur): dari min..min+10 ke max-10..max
        if (value >= max - threshold && value <= max && oldValue >= min && oldValue <= min + threshold) {
            // Shift range down
            const newMax = min;
            const newMin = min - step;
            this._infMin = newMin;
            this._infMax = newMax;
            this._currentValue = newMax;
            this._animValue = newMax;
            if (this._valueTextEl) {
                this._valueTextEl.textContent = Math.round(newMax);
            }
            this._draw();
            this._emit('infinity', { direction: 'down', min: newMin, max: newMax });
            return;
        }
    }

    // ========================
    //   EVENT HANDLERS
    // ========================

    _onPointerDown(e) {
        this._isDragging = true;
        this._canvas.style.cursor = 'grabbing';
        const value = this._valueFromAngle(e.clientX, e.clientY);
        this._updateValue(value);
    }

    _onPointerMove(e) {
        if (!this._isDragging) {
            const rect = this._canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const dist = Math.sqrt(
                Math.pow(x - rect.width / 2, 2) +
                Math.pow(y - rect.height / 2, 2)
            );
            this._canvas.style.cursor = dist < rect.width / 2 * 0.93 ? 'pointer' : 'default';
            return;
        }
        const value = this._valueFromAngle(e.clientX, e.clientY);
        this._updateValue(value);
    }

    _onPointerUp() {
        if (!this._isDragging) return;
        this._isDragging = false;
        this._canvas.style.cursor = 'pointer';
    }

    _onTouchStart(e) {
        e.preventDefault();
        const touch = e.touches[0];
        this._isDragging = true;
        const value = this._valueFromAngle(touch.clientX, touch.clientY);
        this._updateValue(value);
    }

    _onTouchMove(e) {
        e.preventDefault();
        if (!this._isDragging) return;
        const touch = e.touches[0];
        const value = this._valueFromAngle(touch.clientX, touch.clientY);
        this._updateValue(value);
    }

    _onTouchEnd() {
        this._isDragging = false;
    }

    /**
     * Emit event ke callbacks
     */
    _emit(eventName, data) {
        if (this._callbacks[eventName]) {
            this._callbacks[eventName].forEach(cb => {
                try { cb(data); } catch (err) {
                    console.error(`KnobInfinite: Error di callback "${eventName}":`, err);
                }
            });
        }
    }

    // ========================
    //   PUBLIC METHODS
    // ========================

    /**
     * Set nilai knob
     */
    setValue(value, silent = false) {
        const clamped = Math.max(this._infMin, Math.min(this._infMax, value));
        this._currentValue = clamped;
        this._animValue = clamped;
        if (this._valueTextEl) {
            this._valueTextEl.textContent = Math.round(clamped);
        }
        this._draw();
        if (!silent) {
            this._emit('change', { value: clamped, oldValue: this._currentValue });
        }
    }

    /** Dapatkan nilai saat ini */
    getValue() {
        return this._currentValue;
    }

    /** Dapatkan nilai animasi */
    getAnimValue() {
        return this._animValue;
    }

    /** Dapatkan range saat ini (untuk infinite) */
    getRange() {
        return { min: this._infMin, max: this._infMax };
    }

    /** Daftarkan event listener */
    on(eventName, callback) {
        if (typeof callback !== 'function') return;
        if (!this._callbacks[eventName]) this._callbacks[eventName] = [];
        this._callbacks[eventName].push(callback);
    }

    /** Hapus event listener */
    off(eventName, callback) {
        if (!this._callbacks[eventName]) return;
        if (callback) {
            this._callbacks[eventName] = this._callbacks[eventName].filter(cb => cb !== callback);
        } else {
            delete this._callbacks[eventName];
        }
    }

    /** Render ulang */
    draw() {
        this._updateSize();
        this._draw();
    }

    /** Hancurkan instance */
    destroy() {
        if (this._animId) {
            cancelAnimationFrame(this._animId);
            this._animId = null;
        }
        if (this._resizeObserver) {
            this._resizeObserver.disconnect();
            this._resizeObserver = null;
        }
        if (this._canvas && this._canvas.parentNode) {
            this._canvas.parentNode.removeChild(this._canvas);
        }
        if (this._valueDisplay && this._valueDisplay.parentNode) {
            this._valueDisplay.parentNode.removeChild(this._valueDisplay);
        }
        if (this._container) {
            this._container.classList.remove('knob-infinite-wrapper');
        }
        this._callbacks = {};
    }
}
