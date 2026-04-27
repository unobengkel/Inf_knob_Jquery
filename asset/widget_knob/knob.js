import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

/**
 * Knob Widget JavaScript
 * Ultra Premium 3D Color Knob Animation
 *
 * A standalone, reusable 3D knob widget that can be integrated into any web project.
 *
 * @example
 * // Basic usage
 * KnobWidget.init('#knob-container', {
 *     outputCallback: (hexColor) => console.log(hexColor)
 * });
 */

const KnobWidget = (function() {
    'use strict';

    // Default configuration
    const DEFAULT_CONFIG = {
        defaultTheme: 'gelap',
        minValue: 0,
        maxValue: 360,
        outputCallback: null,
        onThemeChange: null,
        onAngleChange: null
    };

    // Theme configurations
    const THEMES = {
        gelap: {
            toneMappingExposure: 1.0,
            environmentIntensity: 0.6,
            ambientLightIntensity: 0.5,
            directionalLightIntensity: 2.0,
            bodyColor: 0x111111,
            bodyRoughness: 0.3,
            accentColor: 0x050505,
            saturation: 1.0,
            lightness: 0.5,
            cssGlowAlpha: 0.25
        },
        glow: {
            toneMappingExposure: 1.1,
            environmentIntensity: 0.8,
            ambientLightIntensity: 0.6,
            directionalLightIntensity: 2.5,
            bodyColor: 0x1a1a20,
            bodyRoughness: 0.2,
            accentColor: 0x111111,
            saturation: 1.0,
            lightness: 0.5,
            cssGlowAlpha: 0.35
        },
        gloomy: {
            toneMappingExposure: 0.9,
            environmentIntensity: 0.5,
            ambientLightIntensity: 0.8,
            directionalLightIntensity: 1.5,
            bodyColor: 0x3a3d42,
            bodyRoughness: 0.45,
            accentColor: 0x1e2024,
            saturation: 0.7,
            lightness: 0.6,
            cssGlowAlpha: 0.35
        },
        cerah: {
            toneMappingExposure: 1.1,
            environmentIntensity: 1.2,
            ambientLightIntensity: 1.5,
            directionalLightIntensity: 3.0,
            bodyColor: 0xdddddd,
            bodyRoughness: 0.15,
            accentColor: 0x999999,
            saturation: 1.0,
            lightness: 0.45,
            cssGlowAlpha: 0.15
        }
    };

    // Instances storage
    const instances = new Map();

    class KnobInstance {
        constructor(container, config = {}) {
            this.container = typeof container === 'string'
                ? document.querySelector(container)
                : container;

            if (!this.container) {
                throw new Error('KnobWidget: Container not found');
            }

            this.config = { ...DEFAULT_CONFIG, ...config };
            this.currentTheme = this.config.defaultTheme;
            this.currentAngle = 0;
            this.targetAngle = 0;
            this.isDragging = false;
            this.isCameraLocked = true;

            this.init();
        }

        init() {
            this.setupScene();
            this.setupLighting();
            this.createKnob();
            this.setupInteraction();
            this.setupResizeObserver();
            this.animate();
            this.updateColorFromAngle(0);
        }

        setupScene() {
            // Scene
            this.scene = new THREE.Scene();

            // Camera
            this.camera = new THREE.PerspectiveCamera(
                40,
                this.container.clientWidth / this.container.clientHeight,
                0.1,
                100
            );

            // Renderer
            this.renderer = new THREE.WebGLRenderer({
                antialias: true,
                alpha: true,
                powerPreference: "high-performance"
            });
            this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
            this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
            this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
            this.renderer.toneMappingExposure = 1.0;
            this.container.appendChild(this.renderer.domElement);

            // Canvas container
            this.canvasContainer = this.renderer.domElement;
            this.canvasContainer.classList.add('knob-canvas-container');

            // Environment
            const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
            this.envMap = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
            this.scene.environment = this.envMap;

            // Clock for animations
            this.clock = new THREE.Clock();
        }

        setupLighting() {
            // Ambient light
            this.ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
            this.scene.add(this.ambientLight);

            // Directional light
            this.dirLight = new THREE.DirectionalLight(0xffffff, 2.0);
            this.dirLight.position.set(-2, 5, 5);
            this.scene.add(this.dirLight);

            // LED point light (follows knob position)
            this.ledPointLight = new THREE.PointLight(0x00ffff, 2.0, 3);
            this.ledPointLight.position.set(0, 0, 1.2);
            this.scene.add(this.ledPointLight);
        }

        createKnob() {
            this.knobGroup = new THREE.Group();
            this.knobGroup.position.y = -0.3;
            this.scene.add(this.knobGroup);

            // Materials
            this.bodyMaterial = new THREE.MeshPhysicalMaterial({
                color: 0x111111,
                metalness: 0.9,
                roughness: 0.25,
                clearcoat: 0.3,
                clearcoatRoughness: 0.1
            });

            this.accentMaterial = new THREE.MeshPhysicalMaterial({
                color: 0x050505,
                metalness: 1.0,
                roughness: 0.1
            });

            this.emissiveMat = new THREE.MeshStandardMaterial({
                color: 0x00ffff,
                emissive: 0x00ffff,
                emissiveIntensity: 3.0,
                roughness: 0.2,
                metalness: 0.1
            });

            // Base cylinder
            const baseGeo = new THREE.CylinderGeometry(2.4, 2.5, 0.2, 128);
            baseGeo.rotateX(Math.PI / 2);
            const baseMesh = new THREE.Mesh(baseGeo, this.bodyMaterial);
            baseMesh.position.z = -0.2;
            this.scene.add(baseMesh);

            // Base ring
            const baseRingGeo = new THREE.TorusGeometry(2.4, 0.03, 32, 128);
            const baseRingMesh = new THREE.Mesh(baseRingGeo, this.accentMaterial);
            baseRingMesh.position.z = -0.1;
            this.scene.add(baseRingMesh);

            // Main knob (lathe geometry)
            const points = [];
            points.push(new THREE.Vector2(0, 0));
            points.push(new THREE.Vector2(2.3, 0));
            points.push(new THREE.Vector2(2.3, 0.8));
            points.push(new THREE.Vector2(2.2, 0.95));
            points.push(new THREE.Vector2(2.0, 1.0));
            points.push(new THREE.Vector2(0, 0.96));

            const latheGeo = new THREE.LatheGeometry(points, 128);
            latheGeo.rotateX(Math.PI / 2);
            const mainKnobMesh = new THREE.Mesh(latheGeo, this.bodyMaterial);
            this.knobGroup.add(mainKnobMesh);

            // Light ring
            const lightRingGeo = new THREE.TorusGeometry(2.1, 0.015, 16, 128);
            this.lightRingMesh = new THREE.Mesh(lightRingGeo, this.emissiveMat);
            this.lightRingMesh.position.z = 0.97;
            this.knobGroup.add(this.lightRingMesh);

            // Indicator capsule
            const indicatorGeo = new THREE.CapsuleGeometry(0.06, 0.6, 16, 32);
            this.indicatorMesh = new THREE.Mesh(indicatorGeo, this.emissiveMat);
            this.indicatorMesh.position.set(0, 1.6, 0.98);
            this.knobGroup.add(this.indicatorMesh);

            // Interaction plane
            const planeGeo = new THREE.PlaneGeometry(100, 100);
            const planeMat = new THREE.MeshBasicMaterial({ visible: false });
            this.interactionPlane = new THREE.Mesh(planeGeo, planeMat);
            this.scene.add(this.interactionPlane);

            // Raycaster for interaction
            this.raycaster = new THREE.Raycaster();
            this.mouse = new THREE.Vector2();
        }

        setupInteraction() {
            this.container.addEventListener('pointerdown', (e) => this.onPointerDown(e));
            window.addEventListener('pointermove', (e) => this.onPointerMove(e));
            window.addEventListener('pointerup', () => this.onPointerUp());
        }

        setupResizeObserver() {
            this.resizeObserver = new ResizeObserver(() => {
                this.camera.aspect = this.container.clientWidth / this.container.clientHeight;
                this.camera.updateProjectionMatrix();
                this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
            });
            this.resizeObserver.observe(this.container);
        }

        onPointerDown(e) {
            if (e.target.closest('.knob-btn')) return;

            if (this.isCameraLocked) {
                this.isDragging = true;
                this.container.style.cursor = 'grabbing';
                this.handlePointer(e);
                this.ledPointLight.intensity = this.currentTheme === 'cerah' ? 2.5 : 4.0;
            }
        }

        onPointerMove(e) {
            if (this.isCameraLocked && this.isDragging) {
                this.handlePointer(e);
            }
        }

        onPointerUp() {
            if (this.isCameraLocked && this.isDragging) {
                this.isDragging = false;
                this.container.style.cursor = 'grab';
                this.ledPointLight.intensity = this.currentTheme === 'cerah' ? 1.5 : 2.0;
            }
        }

        handlePointer(event) {
            let clientX = event.changedTouches ? event.changedTouches[0].clientX : event.clientX;
            let clientY = event.changedTouches ? event.changedTouches[0].clientY : event.clientY;

            const rect = this.renderer.domElement.getBoundingClientRect();
            this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
            this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

            this.raycaster.setFromCamera(this.mouse, this.camera);
            const intersects = this.raycaster.intersectObject(this.interactionPlane);

            if (intersects.length > 0) {
                const intersectPoint = intersects[0].point;
                this.targetAngle = Math.atan2(intersectPoint.y, intersectPoint.x) - Math.PI / 2;
                this.updateColorFromAngle(this.targetAngle);

                if (typeof this.config.onAngleChange === 'function') {
                    this.config.onAngleChange(this.currentAngle);
                }
            }
        }

        updateColorFromAngle(angle) {
            this.currentAngle = angle;

            let normalizedAngle = (angle + Math.PI) / (Math.PI * 2);
            let hue = (1.0 - normalizedAngle) % 1.0;

            const theme = THEMES[this.currentTheme] || THEMES.gelap;
            let s = theme.saturation;
            let l = theme.lightness;

            const baseColor = new THREE.Color().setHSL(hue, s, l);
            const hexColor = '#' + baseColor.getHexString().toUpperCase();

            const cssGlowColor = `rgba(${baseColor.r*255}, ${baseColor.g*255}, ${baseColor.b*255}, ${theme.cssGlowAlpha})`;

            if (this.currentTheme === 'cerah') {
                const pureColor = new THREE.Color().setHSL(hue, 1.0, 0.5);
                this.emissiveMat.color.copy(pureColor);
                this.emissiveMat.emissive.copy(pureColor);
            } else {
                this.emissiveMat.color.copy(baseColor);
                this.emissiveMat.emissive.copy(baseColor);
            }

            this.ledPointLight.color.copy(baseColor);
            this.container.style.setProperty('--glow-color', cssGlowColor);

            if (typeof this.config.outputCallback === 'function') {
                this.config.outputCallback(hexColor, baseColor);
            }
        }

        setTheme(themeName) {
            if (!THEMES[themeName]) return;

            this.currentTheme = themeName;
            this.container.setAttribute('data-theme', themeName);

            const theme = THEMES[themeName];

            this.renderer.toneMappingExposure = theme.toneMappingExposure;
            this.scene.environmentIntensity = theme.environmentIntensity;
            this.ambientLight.intensity = theme.ambientLightIntensity;
            this.dirLight.intensity = theme.directionalLightIntensity;
            this.bodyMaterial.color.setHex(theme.bodyColor);
            this.bodyMaterial.roughness = theme.bodyRoughness;
            this.accentMaterial.color.setHex(theme.accentColor);

            this.updateColorFromAngle(this.targetAngle);

            if (typeof this.config.onThemeChange === 'function') {
                this.config.onThemeChange(themeName);
            }
        }

        getTheme() {
            return this.currentTheme;
        }

        getValue() {
            // Convert angle to value (0-360)
            const normalized = ((this.currentAngle + Math.PI) / (Math.PI * 2)) * 360;
            return Math.round(normalized) % 360;
        }

        setCameraLocked(locked) {
            this.isCameraLocked = locked;
            if (locked) {
                this.container.classList.remove('camera-unlocked');
            } else {
                this.container.classList.add('camera-unlocked');
            }
        }

        animate() {
            requestAnimationFrame(() => this.animate());

            // Smooth angle interpolation
            this.currentAngle += (this.targetAngle - this.currentAngle) * 0.15;
            this.knobGroup.rotation.z = this.currentAngle;

            // LED light follows indicator position
            this.ledPointLight.position.x = Math.cos(this.currentAngle + Math.PI/2) * 1.6;
            this.ledPointLight.position.y = Math.sin(this.currentAngle + Math.PI/2) * 1.6;

            // Pulsing glow effect
            const time = this.clock.getElapsedTime();
            let baseIntensity = this.currentTheme === 'cerah' ? 2.0 : 3.0;
            this.emissiveMat.emissiveIntensity = baseIntensity + Math.sin(time * 3) * 0.5;

            this.renderer.render(this.scene, this.camera);
        }

        destroy() {
            this.resizeObserver.disconnect();
            this.renderer.dispose();
            this.container.innerHTML = '';
            instances.delete(this.container);
        }
    }

    return {
        /**
         * Initialize a new KnobWidget instance
         * @param {string|HTMLElement} container - Container element or selector
         * @param {Object} config - Configuration options
         * @returns {KnobInstance} The created knob instance
         */
        init: function(container, config = {}) {
            const instance = new KnobInstance(container, config);
            const containerEl = typeof container === 'string'
                ? document.querySelector(container)
                : container;
            instances.set(containerEl, instance);
            return instance;
        },

        /**
         * Get an existing instance by container
         * @param {string|HTMLElement} container - Container element or selector
         * @returns {KnobInstance|null}
         */
        getInstance: function(container) {
            const containerEl = typeof container === 'string'
                ? document.querySelector(container)
                : container;
            return instances.get(containerEl) || null;
        },

        /**
         * Get all available themes
         * @returns {string[]} Array of theme names
         */
        getThemes: function() {
            return Object.keys(THEMES);
        },

        /**
         * Version info
         */
        version: '1.0.0'
    };
})();

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = KnobWidget;
}

window.KnobWidget = KnobWidget;
export default KnobWidget;