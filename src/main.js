import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.153.0/build/three.module.js';
import { GLTFLoader } from "./build/GLTFLoader.js";
import { DRACOLoader } from "./build/DRACOLoader.js";
import { SceneManager } from "./scene/SceneManager.js";
import { CameraManager } from "./scene/CameraManager.js";
import { LightingManager } from "./scene/LightingManager.js";
import { PhysicsEngine } from "./physics/PhysicsEngine.js";
import { PlayerControls } from "./controls/PlayerControls.js";

// Configuration object for various settings
const CONFIG = {
    MODEL_URL: 'https://raw.githubusercontent.com/kanawattown-a11y/12/f91219369eb76bb2e445f95abaa61860e3b886dd/naj-v1.glb',
    DRACO_DECODER_PATH: 'https://www.gstatic.com/draco/v1/decoders/',
    MOVE_SPEED: 6.0,
    RUN_MULTIPLIER: 2.0,
    JUMP_FORCE: 12.0,
    GRAVITY: 20.0,
    EYE_HEIGHT: 1.8,
    PLAYER_RADIUS: 0.4,
    MOUSE_SENSITIVITY: 1.0,
    SHADOW_MAP_SIZE: 2048,
    MAX_PIXEL_RATIO: 2,
    IS_MOBILE: /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent),
    ENVIRONMENTS: {
        showroom: { background: new THREE.Color(0x2d3748), fog: new THREE.Color(0x2d3748), ambientIntensity: 0.4, directionalIntensity: 1.2 },
        city: { background: new THREE.Color(0x87ceeb), fog: new THREE.Color(0x87ceeb), ambientIntensity: 0.6, directionalIntensity: 1.0 },
        desert: { background: new THREE.Color(0xffd700), fog: new THREE.Color(0xffd700), ambientIntensity: 0.8, directionalIntensity: 1.5 },
        night: { background: new THREE.Color(0x0f172a), fog: new THREE.Color(0x0f172a), ambientIntensity: 0.2, directionalLightColor: 0x808080, directionalIntensity: 0.8 },
        studio: { background: new THREE.Color(0xffffff), fog: new THREE.Color(0xffffff), ambientIntensity: 0.9, directionalIntensity: 0.6 }
    }
};

// Global State
let sceneManager, cameraManager, lightingManager, physicsEngine, playerControls;
let renderer, clock;
let gameState = {
    isPlaying: false,
    currentEnvironment: 'showroom',
    playerPosition: new THREE.Vector3(0, CONFIG.EYE_HEIGHT, 5),
    settings: {
        mouseSensitivity: CONFIG.MOUSE_SENSITIVITY,
        moveSpeed: CONFIG.MOVE_SPEED,
        jumpForce: CONFIG.JUMP_FORCE,
        shadowQuality: 2
    }
};

// Performance monitoring
let frameCount = 0;
let lastTime = performance.now();
let fps = 60;

// Initialization
function init() {
    // Safety: create particles and renderer only after DOM ready (we call init on DOMContentLoaded)
    createParticles();
    setupRenderer();

    // Initialize scene / camera / lighting / physics / controls
    sceneManager = new SceneManager(renderer);
    cameraManager = new CameraManager(renderer);
    lightingManager = new LightingManager(sceneManager.getScene());
    physicsEngine = new PhysicsEngine(CONFIG.GRAVITY, CONFIG.EYE_HEIGHT, CONFIG.PLAYER_RADIUS);
    playerControls = new PlayerControls(cameraManager.getCamera(), renderer.domElement, CONFIG.IS_MOBILE, gameState, physicsEngine);

    clock = new THREE.Clock();

    setupEventListeners();
    setupSettingsSafely();

    loadModel();
    animate();
}

/**
 * Create simple DOM particles. If container missing, create fallback and append to body.
 */
function createParticles() {
    let particlesContainer = document.getElementById('particles');
    if (!particlesContainer) {
        particlesContainer = document.createElement('div');
        particlesContainer.id = 'particles';
        // minimal styles so it doesn't break layout if CSS missing
        particlesContainer.style.position = 'absolute';
        particlesContainer.style.top = '0';
        particlesContainer.style.left = '0';
        particlesContainer.style.width = '100%';
        particlesContainer.style.height = '100%';
        particlesContainer.style.pointerEvents = 'none';
        document.body.appendChild(particlesContainer);
        console.warn('particles container not found — created fallback #particles appended to body');
    }

    // remove existing children to avoid duplicates on hot-reload
    while (particlesContainer.firstChild) particlesContainer.removeChild(particlesContainer.firstChild);

    for (let i = 0; i < 50; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.position = 'absolute';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.top = Math.random() * 100 + '%';
        particle.style.pointerEvents = 'none';
        particle.style.animationDelay = Math.random() * 6 + 's';
        particle.style.animationDuration = (Math.random() * 3 + 3) + 's';
        particlesContainer.appendChild(particle);
    }
}

/**
 * Setup WebGL renderer and attach to container #app or fallback to body.
 */
function setupRenderer() {
    const container = document.getElementById('app') || document.body;

    renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: "high-performance",
        alpha: true
    });

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, CONFIG.IS_MOBILE ? 1.5 : CONFIG.MAX_PIXEL_RATIO));
    renderer.setSize(window.innerWidth, window.innerHeight);

    // Some environments may not have these enums (older three builds) — guard with optional chaining
    try {
        renderer.outputColorSpace = THREE.SRGBColorSpace;
    } catch (err) {
        // ignore if not supported
    }

    if (renderer.shadowMap) {
        renderer.shadowMap.enabled = true;
        if (THREE.PCFSoftShadowMap !== undefined) renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }

    if (THREE.ACESFilmicToneMapping !== undefined) renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;

    container.appendChild(renderer.domElement);
}

/**
 * Load GLTF model with DRACO support — all DOM updates guarded.
 */
function loadModel() {
    const loadingManager = new THREE.LoadingManager();

    loadingManager.onProgress = (url, loaded, total) => {
        const progress = total ? (loaded / total) * 100 : 0;
        const progressEl = document.getElementById('loadingProgress');
        if (progressEl) progressEl.style.width = progress + '%';
    };

    loadingManager.onLoad = () => {
        const ls = document.getElementById('loadingScreen');
        if (ls) {
            setTimeout(() => {
                ls.classList.add('hidden');
            }, 800);
        }
    };

    const dracoLoader = new DRACOLoader(loadingManager);
    dracoLoader.setDecoderPath(CONFIG.DRACO_DECODER_PATH);

    const gltfLoader = new GLTFLoader(loadingManager);
    gltfLoader.setDRACOLoader(dracoLoader);

    gltfLoader.load(
        CONFIG.MODEL_URL,
        (gltf) => {
            const model = gltf.scene;

            model.traverse((child) => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;

                    if (child.material) {
                        child.material.side = THREE.FrontSide;

                        if (child.material.map && renderer && renderer.capabilities) {
                            try {
                                child.material.map.anisotropy = renderer.capabilities.getMaxAnisotropy();
                            } catch (e) {
                                // ignore if capability not available
                            }
                        }

                        if (child.material.isMeshStandardMaterial) {
                            child.material.metalness = Math.min((child.material.metalness || 0) + 0.2, 1.0);
                            child.material.roughness = Math.max((child.material.roughness || 1) - 0.1, 0.0);
                        }
                    }

                    if (sceneManager && typeof sceneManager.addCollisionBox === 'function') {
                        sceneManager.addCollisionBox(child);
                    }
                }
            });

            if (sceneManager && sceneManager.getScene) {
                model.position.set(0, 0, 0);
                sceneManager.getScene().add(model);
                console.log('Model loaded successfully. Collision boxes:', sceneManager.collisionBoxes ? sceneManager.collisionBoxes.length : 0);
            } else {
                console.warn('SceneManager not ready — model loaded but not added to scene.');
            }
        },
        (progress) => {
            // optional progress handling
        },
        (error) => {
            console.error('Error loading model:', error);
            try {
                alert('فشل في تحميل النموذج. يرجى المحاولة مرة أخرى.');
            } catch (e) { /* ignore if alert blocked */ }
        }
    );
}

function updatePositionInfo(position) {
    const posEl = document.getElementById('positionInfo');
    if (!posEl) return;
    const x = Math.round(position.x * 10) / 10;
    const y = Math.round(position.y * 10) / 10;
    const z = Math.round(position.z * 10) / 10;
    posEl.textContent = `${x}, ${y}, ${z}`;
}

function animate() {
    requestAnimationFrame(animate);

    if (!clock) return;
    const deltaTime = clock.getDelta();

    if (gameState.isPlaying && playerControls && typeof playerControls.update === 'function') {
        const playerObject = playerControls.getControlsObject ? playerControls.getControlsObject() : null;
        if (playerObject) {
            playerControls.update(deltaTime, playerObject, CONFIG);
            if (physicsEngine && typeof physicsEngine.update === 'function') {
                physicsEngine.update(deltaTime, playerObject, sceneManager ? sceneManager.collisionBoxes : []);
            }
            updatePositionInfo(playerObject.position);
        }
    }

    if (sceneManager && typeof sceneManager.animateParticles === 'function') {
        sceneManager.animateParticles();
    }

    frameCount++;
    const currentTime = performance.now();
    if (currentTime - lastTime >= 1000) {
        fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
        const fpsEl = document.getElementById('fpsInfo');
        if (fpsEl) fpsEl.textContent = fps;
        frameCount = 0;
        lastTime = currentTime;
    }

    if (renderer && sceneManager && cameraManager) {
        const scene = sceneManager.getScene ? sceneManager.getScene() : null;
        const camera = cameraManager && typeof cameraManager.getCamera === 'function' ? cameraManager.getCamera() : null;
        if (scene && camera) renderer.render(scene, camera);
    }
}

function onWindowResize() {
    if (!cameraManager || !cameraManager.getCamera || !renderer) return;
    const cam = cameraManager.getCamera();
    cam.aspect = window.innerWidth / window.innerHeight;
    cam.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function setupEventListeners() {
    window.addEventListener('resize', onWindowResize);

    const enterBtn = document.getElementById('enterBtn');
    if (enterBtn) enterBtn.addEventListener('click', enterExperience);

    const settingsBtn = document.getElementById('settingsBtn');
    if (settingsBtn) settingsBtn.addEventListener('click', showSettings);

    const closeSettings = document.getElementById('closeSettings');
    if (closeSettings) closeSettings.addEventListener('click', hideSettings);

    const envBtns = document.querySelectorAll('.env-btn');
    if (envBtns && envBtns.length) {
        envBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                if (sceneManager && typeof sceneManager.changeEnvironment === 'function') {
                    sceneManager.changeEnvironment(btn.dataset.env, CONFIG);
                    const currentEnvEl = document.getElementById('currentEnv');
                    if (currentEnvEl) currentEnvEl.textContent = getEnvironmentName(btn.dataset.env);
                }
            });
        });
    }

    if (CONFIG.IS_MOBILE) {
        setupMobileControls();
    }
}

function getEnvironmentName(envName) {
    const names = {
        'showroom': 'معرض',
        'city': 'مدينة',
        'desert': 'صحراء',
        'night': 'ليل',
        'studio': 'استوديو'
    };
    return names[envName] || 'معرض';
}

// Mobile Controls — guarded: only run if helpers/variables exist
function setupMobileControls() {
    if (typeof setupJoystick === 'function' && typeof mobileInput !== 'undefined') {
        setupJoystick('moveJoystick', 'moveStick', (x, y) => {
            mobileInput.move.x = x;
            mobileInput.move.y = -y;
        });

        setupJoystick('lookJoystick', 'lookStick', (x, y) => {
            mobileInput.look.x = -x * 2;
            mobileInput.look.y = -y * 2;
        });
    } else {
        console.warn('Mobile joystick setup skipped: setupJoystick or mobileInput not available.');
    }

    const jumpBtn = document.getElementById('jumpBtn');
    if (jumpBtn) {
        jumpBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (typeof jump === 'function') jump();
            e.target.classList.add('pressed');
        });
        jumpBtn.addEventListener('touchend', (e) => {
            e.target.classList.remove('pressed');
        });
    }

    const runBtn = document.getElementById('runBtn');
    if (runBtn) {
        runBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            if (typeof keys !== 'undefined') keys.run = true;
            e.target.classList.add('pressed');
        });
        runBtn.addEventListener('touchend', (e) => {
            if (typeof keys !== 'undefined') keys.run = false;
            e.target.classList.remove('pressed');
        });
    }

    const menuBtn = document.getElementById('menuBtn');
    if (menuBtn) {
        menuBtn.addEventListener('click', () => {
            gameState.isPlaying = false;
            const welcome = document.getElementById('welcomeScreen');
            if (welcome) welcome.classList.remove('hidden');
            const mobileControlsEl = document.getElementById('mobileControls');
            if (mobileControlsEl) mobileControlsEl.classList.remove('show');
            const controlsInfo = document.getElementById('controlsInfo');
            if (controlsInfo) controlsInfo.classList.remove('show');
            const envControls = document.getElementById('envControls');
            if (envControls) envControls.style && (envControls.style.display = 'none');
            const statusBar = document.getElementById('statusBar');
            if (statusBar) statusBar.classList.remove('show');
        });
    }
}

// Safe placeholder for settings setup in case original function missing
function setupSettingsSafely() {
    if (typeof setupSettings === 'function') {
        setupSettings();
    } else {
        // minimal fallback: apply saved mouse sensitivity if any
        const savedMs = (gameState.settings && gameState.settings.mouseSensitivity) || CONFIG.MOUSE_SENSITIVITY;
        gameState.settings.mouseSensitivity = savedMs;
    }
}

// Ensure init runs after DOM content is ready
window.addEventListener('DOMContentLoaded', () => {
    try {
        init();
    } catch (err) {
        console.error('Initialization error:', err);
    }
});
