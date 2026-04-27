/**
 * main.js - Demo aplikasi Infinite Knob
 * Menggunakan class KnobInfinite dari asset/knob/knob.js
 */

document.addEventListener('DOMContentLoaded', () => {
    // Inisialisasi KnobInfinite
    const knob = new KnobInfinite('knob-container', {
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
        animationDuration: 300
    });

    // Element references
    const slider = document.getElementById('value-slider');
    const sliderValue = document.getElementById('slider-value');
    const rangeMinEl = document.getElementById('range-min');
    const rangeMaxEl = document.getElementById('range-max');
    const statusEl = document.getElementById('status-text');
    const currentValEl = document.getElementById('current-value');

    // Update slider range display
    function updateRangeDisplay() {
        const range = knob.getRange();
        if (rangeMinEl) rangeMinEl.textContent = range.min;
        if (rangeMaxEl) rangeMaxEl.textContent = range.max;
    }

    // Update status
    function updateStatus(msg) {
        if (statusEl) statusEl.innerHTML = msg;
    }

    // Sinkron slider
    function updateSlider(value) {
        if (slider) {
            slider.value = value;
            slider.min = knob.getRange().min;
            slider.max = knob.getRange().max;
        }
        if (sliderValue) sliderValue.textContent = Math.round(value);
        if (currentValEl) currentValEl.textContent = Math.round(value);
    }

    // Initial sync
    updateSlider(knob.getValue());
    updateRangeDisplay();
    updateStatus('🔘 Drag pointer untuk mengubah nilai');

    // Slider event
    if (slider) {
        slider.addEventListener('input', (e) => {
            const val = Number(e.target.value);
            knob.setValue(val, true);
            updateSlider(val);
            updateStatus(`🔘 Nilai: <span class="highlight">${Math.round(val)}</span>`);
        });
    }

    // Knob change event
    knob.on('change', (data) => {
        updateSlider(data.value);
        updateStatus(`🔘 Nilai: <span class="highlight">${Math.round(data.value)}</span>`);
    });

    // Knob infinity event
    knob.on('infinity', (data) => {
        updateRangeDisplay();
        updateSlider(knob.getValue());
        const dir = data.direction === 'up' ? '↗️ Naik' : '↘️ Turun';
        updateStatus(`♾️ Infinite Scroll ${dir}: range [${data.min}, ${data.max}]`);
    });

    // Buttons
    let simInterval = null;

    document.getElementById('btn-start')?.addEventListener('click', () => {
        if (simInterval) clearInterval(simInterval);
        simInterval = setInterval(() => {
            const range = knob.getRange();
            const randomVal = Math.floor(Math.random() * (range.max - range.min + 1)) + range.min;
            knob.setValue(randomVal, true);
            updateSlider(randomVal);
            updateStatus(`🎲 Acak: <span class="highlight">${Math.round(randomVal)}</span>`);
        }, 1200);
        updateStatus('▶️ Simulasi acak berjalan...');
    });

    document.getElementById('btn-stop')?.addEventListener('click', () => {
        if (simInterval) {
            clearInterval(simInterval);
            simInterval = null;
        }
        updateStatus('⏸️ Simulasi dihentikan');
    });

    document.getElementById('btn-reset')?.addEventListener('click', () => {
        if (simInterval) {
            clearInterval(simInterval);
            simInterval = null;
        }
        knob.setValue(0);
        updateSlider(0);
        updateStatus('↩️ Reset ke 0');
    });

    // Window resize handler
    window.addEventListener('resize', () => {
        // Knob.handle resize sendiri via ResizeObserver
    });
});
