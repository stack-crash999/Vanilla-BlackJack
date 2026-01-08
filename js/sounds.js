/**
 * Casino Sound System - Realistic Audio Effects
 * Designed to replicate the sounds from modern online casinos like Roobet
 */

class CasinoSounds {
    constructor() {
        this.audioContext = null;
        this.enabled = true;
        this.masterVolume = 0.6;

        // Pre-generated noise buffers for realistic textures
        this.noiseBuffer = null;
        this.pinkNoiseBuffer = null;
    }

    init() {
        if (this.audioContext) return;

        try {
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            this.generateNoiseBuffers();
        } catch (e) {
            console.warn('Web Audio API not supported');
        }
    }

    generateNoiseBuffers() {
        const ctx = this.audioContext;
        const sampleRate = ctx.sampleRate;

        // White noise buffer (2 seconds)
        const whiteLength = sampleRate * 2;
        this.noiseBuffer = ctx.createBuffer(1, whiteLength, sampleRate);
        const whiteData = this.noiseBuffer.getChannelData(0);
        for (let i = 0; i < whiteLength; i++) {
            whiteData[i] = Math.random() * 2 - 1;
        }

        // Pink noise buffer for softer textures
        const pinkLength = sampleRate * 2;
        this.pinkNoiseBuffer = ctx.createBuffer(1, pinkLength, sampleRate);
        const pinkData = this.pinkNoiseBuffer.getChannelData(0);
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        for (let i = 0; i < pinkLength; i++) {
            const white = Math.random() * 2 - 1;
            b0 = 0.99886 * b0 + white * 0.0555179;
            b1 = 0.99332 * b1 + white * 0.0750759;
            b2 = 0.96900 * b2 + white * 0.1538520;
            b3 = 0.86650 * b3 + white * 0.3104856;
            b4 = 0.55000 * b4 + white * 0.5329522;
            b5 = -0.7616 * b5 - white * 0.0168980;
            pinkData[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
            b6 = white * 0.115926;
        }
    }

    /**
     * Card dealing sound - realistic card sliding on felt
     * Like the smooth "fwip" sound when a dealer slides a card
     */
    playCardDeal() {
        if (!this.enabled) return;
        this.init();

        const ctx = this.audioContext;
        const now = ctx.currentTime;

        // Main card slide body - filtered noise
        const noiseSource = ctx.createBufferSource();
        noiseSource.buffer = this.pinkNoiseBuffer;

        // Highpass filter to simulate card edge friction
        const highpass = ctx.createBiquadFilter();
        highpass.type = 'highpass';
        highpass.frequency.setValueAtTime(800, now);
        highpass.frequency.exponentialRampToValueAtTime(2500, now + 0.04);
        highpass.Q.value = 0.7;

        // Lowpass for smoothness
        const lowpass = ctx.createBiquadFilter();
        lowpass.type = 'lowpass';
        lowpass.frequency.setValueAtTime(6000, now);
        lowpass.frequency.exponentialRampToValueAtTime(3000, now + 0.08);
        lowpass.Q.value = 0.5;

        // Envelope - quick attack, short decay
        const gainNode = ctx.createGain();
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(0.25 * this.masterVolume, now + 0.008);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

        noiseSource.connect(highpass);
        highpass.connect(lowpass);
        lowpass.connect(gainNode);
        gainNode.connect(ctx.destination);

        noiseSource.start(now);
        noiseSource.stop(now + 0.15);

        // Subtle "thud" when card lands on table
        const thud = ctx.createOscillator();
        const thudGain = ctx.createGain();
        const thudFilter = ctx.createBiquadFilter();

        thud.type = 'sine';
        thud.frequency.setValueAtTime(150, now + 0.06);
        thud.frequency.exponentialRampToValueAtTime(60, now + 0.12);

        thudFilter.type = 'lowpass';
        thudFilter.frequency.value = 200;
        thudFilter.Q.value = 1;

        thudGain.gain.setValueAtTime(0, now + 0.06);
        thudGain.gain.linearRampToValueAtTime(0.15 * this.masterVolume, now + 0.065);
        thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

        thud.connect(thudFilter);
        thudFilter.connect(thudGain);
        thudGain.connect(ctx.destination);

        thud.start(now + 0.06);
        thud.stop(now + 0.2);
    }

    /**
     * Chip click sound - mini golf style pop
     * A satisfying hollow "pop" like a ball dropping in the hole
     */
    playChipClick() {
        if (!this.enabled) return;
        this.init();

        const ctx = this.audioContext;
        const now = ctx.currentTime;

        // Main pop - hollow, resonant sound
        const pop = ctx.createOscillator();
        const popGain = ctx.createGain();

        pop.type = 'sine';
        // Quick pitch drop for that hollow pop feel
        pop.frequency.setValueAtTime(400, now);
        pop.frequency.setValueAtTime(280, now + 0.015);
        pop.frequency.setValueAtTime(220, now + 0.04);

        popGain.gain.setValueAtTime(0.3 * this.masterVolume, now);
        popGain.gain.setValueAtTime(0.2 * this.masterVolume, now + 0.02);
        popGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

        pop.connect(popGain);
        popGain.connect(ctx.destination);

        pop.start(now);
        pop.stop(now + 0.12);

        // Hollow resonance - gives it that "cup" sound
        const resonance = ctx.createOscillator();
        const resGain = ctx.createGain();

        resonance.type = 'sine';
        resonance.frequency.value = 180;

        resGain.gain.setValueAtTime(0.1 * this.masterVolume, now + 0.01);
        resGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

        resonance.connect(resGain);
        resGain.connect(ctx.destination);

        resonance.start(now + 0.01);
        resonance.stop(now + 0.1);
    }

    /**
     * Win sound - celebratory but not obnoxious
     * Similar to modern casino sites - pleasant ascending tones with shimmer
     */
    playWin() {
        if (!this.enabled) return;
        this.init();

        const ctx = this.audioContext;
        const now = ctx.currentTime;

        // Celebratory arpeggio - C major with added 9th for sparkle
        const notes = [
            { freq: 523.25, delay: 0 },      // C5
            { freq: 659.25, delay: 0.08 },   // E5
            { freq: 783.99, delay: 0.16 },   // G5
            { freq: 1046.50, delay: 0.24 },  // C6
            { freq: 1174.66, delay: 0.32 }   // D6 (the 9th for sparkle)
        ];

        notes.forEach(note => {
            // Main tone
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.value = note.freq;

            gain.gain.setValueAtTime(0, now + note.delay);
            gain.gain.linearRampToValueAtTime(0.12 * this.masterVolume, now + note.delay + 0.02);
            gain.gain.setValueAtTime(0.1 * this.masterVolume, now + note.delay + 0.1);
            gain.gain.exponentialRampToValueAtTime(0.001, now + note.delay + 0.4);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start(now + note.delay);
            osc.stop(now + note.delay + 0.5);

            // Harmonic shimmer (slight detuned octave)
            const shimmer = ctx.createOscillator();
            const shimmerGain = ctx.createGain();

            shimmer.type = 'sine';
            shimmer.frequency.value = note.freq * 2.01; // Slightly detuned octave

            shimmerGain.gain.setValueAtTime(0, now + note.delay);
            shimmerGain.gain.linearRampToValueAtTime(0.03 * this.masterVolume, now + note.delay + 0.03);
            shimmerGain.gain.exponentialRampToValueAtTime(0.001, now + note.delay + 0.3);

            shimmer.connect(shimmerGain);
            shimmerGain.connect(ctx.destination);

            shimmer.start(now + note.delay);
            shimmer.stop(now + note.delay + 0.4);
        });

        // Subtle "cha-ching" high frequency sparkle
        const sparkle = ctx.createBufferSource();
        sparkle.buffer = this.noiseBuffer;

        const sparkleFilter = ctx.createBiquadFilter();
        sparkleFilter.type = 'bandpass';
        sparkleFilter.frequency.value = 8000;
        sparkleFilter.Q.value = 5;

        const sparkleGain = ctx.createGain();
        sparkleGain.gain.setValueAtTime(0, now + 0.35);
        sparkleGain.gain.linearRampToValueAtTime(0.04 * this.masterVolume, now + 0.37);
        sparkleGain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

        sparkle.connect(sparkleFilter);
        sparkleFilter.connect(sparkleGain);
        sparkleGain.connect(ctx.destination);

        sparkle.start(now + 0.35);
        sparkle.stop(now + 0.6);
    }

    /**
     * Lose sound - subtle, not punishing
     * Modern casinos use soft sounds that don't discourage continued play
     */
    playLose() {
        if (!this.enabled) return;
        this.init();

        const ctx = this.audioContext;
        const now = ctx.currentTime;

        // Soft descending two-note motif
        const notes = [
            { freq: 392, delay: 0 },      // G4
            { freq: 329.63, delay: 0.12 }  // E4
        ];

        notes.forEach(note => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const filter = ctx.createBiquadFilter();

            osc.type = 'sine';
            osc.frequency.value = note.freq;

            filter.type = 'lowpass';
            filter.frequency.value = 1500;
            filter.Q.value = 0.5;

            gain.gain.setValueAtTime(0, now + note.delay);
            gain.gain.linearRampToValueAtTime(0.08 * this.masterVolume, now + note.delay + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, now + note.delay + 0.25);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(ctx.destination);

            osc.start(now + note.delay);
            osc.stop(now + note.delay + 0.3);
        });
    }

    /**
     * Shuffle/reshuffle sound - deck being shuffled
     */
    playShuffle() {
        if (!this.enabled) return;
        this.init();

        const ctx = this.audioContext;
        const now = ctx.currentTime;

        // Multiple rapid card sounds to simulate riffle shuffle
        for (let i = 0; i < 8; i++) {
            const delay = i * 0.03 + Math.random() * 0.02;

            const noise = ctx.createBufferSource();
            noise.buffer = this.pinkNoiseBuffer;

            const filter = ctx.createBiquadFilter();
            filter.type = 'bandpass';
            filter.frequency.value = 2500 + Math.random() * 1000;
            filter.Q.value = 1;

            const gain = ctx.createGain();
            gain.gain.setValueAtTime(0, now + delay);
            gain.gain.linearRampToValueAtTime((0.08 + Math.random() * 0.04) * this.masterVolume, now + delay + 0.01);
            gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.06);

            noise.connect(filter);
            filter.connect(gain);
            gain.connect(ctx.destination);

            noise.start(now + delay);
            noise.stop(now + delay + 0.08);
        }
    }

    setEnabled(enabled) {
        this.enabled = enabled;
    }

    setVolume(volume) {
        this.masterVolume = Math.max(0, Math.min(1, volume));
    }
}

// Create global instance
window.casinoSounds = new CasinoSounds();
