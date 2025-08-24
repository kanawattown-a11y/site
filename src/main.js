import * as THREE from "https://unpkg.com/three@0.160.0/build/three.module.js";
import { GLTFLoader } from "https://unpkg.com/three@0.160.0/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "https://unpkg.com/three@0.160.0/examples/jsm/loaders/DRACOLoader.js";
import { SceneManager } from "./scene/SceneManager.js";
import { CameraManager } from "./scene/CameraManager.js";
import { LightingManager } from "./scene/LightingManager.js";
import { PhysicsEngine } from "./physics/PhysicsEngine.js";
import { PlayerControls } from "./controls/PlayerControls.js";

// Configuration object for various settings
const CONFIG = {
    MODEL_URL: 'https://raw.githubusercontent.com/kanawattown-a11y/12/f91219369eb76bb2e445f95abaa61860e3b886dd/naj-v1.glb',
    DRACO_DECODER_PATH: 'https://www.gstatic.com/draco/v1/decoders/',
    
    // Physics settings
    MOVE_SPEED: 6.0,
    RUN_MULTIPLIER: 2.0,
    JUMP_FORCE: 12.0,
    GRAVITY: 20.0,
    EYE_HEIGHT: 1.8,
    PLAYER_RADIUS: 0.4,
    MOUSE_SENSITIVITY: 1.0,
    
    // Performance settings
    SHADOW_MAP_SIZE: 2048,
    MAX_PIXEL_RATIO: 2,
    
    // Mobile detection
    IS_MOBILE: /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent),
    
    // Environment settings
    ENVIRONMENTS: {
        showroom: { 
            background: new THREE.Color(0x2d3748), 
            fog: new THREE.Color(0x2d3748),
            ambientIntensity: 0.4,
            directionalIntensity: 1.2
        },
        city: { 
            background: new THREE.Color(0x87ceeb), 
            fog: new THREE.Color(0x87ceeb),
            ambientIntensity: 0.6,
            directionalIntensity: 1.0
        },
        desert: { 
            background: new THREE.Color(0xffd700), 
            fog: new THREE.Color(0xffd700),
            ambientIntensity: 0.8,
            directionalIntensity: 1.5
        },
        night: { 
            background: new THREE.Color(0x0f172a), 
            fog: new THREE.Color(0x0f172a),
            ambientIntensity: 0.2,
            directionalLightColor: 0x808080,
            directionalIntensity: 0.8
        },
        studio: { 
            background: new THREE.Color(0xffffff), 
            fog: new THREE.Color(0xffffff),
            ambientIntensity: 0.9,
            directionalIntensity: 0.6
        }
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
    createParticles();
    setupRenderer();
    
    sceneManager = new SceneManager(renderer);
    cameraManager = new CameraManager(renderer);
    lightingManager = new LightingManager(sceneManager.getScene());
    physicsEngine = new PhysicsEngine(CONFIG.GRAVITY, CONFIG.EYE_HEIGHT, CONFIG.PLAYER_RADIUS);
    playerControls = new PlayerControls(cameraManager.getCamera(), renderer.domElement, CONFIG.IS_MOBILE, gameState, physicsEngine);

    clock = new THREE.Clock();

    setupEventListeners();
    setupSettings();
    
    loadModel();
    animate();
}

function createParticles() {
    const particlesContainer = document.getElementById('particles');
    for (let i = 0; i < 50; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.animationDelay = Math.random() * 6 + 's';
        particle.style.animationDuration = (Math.random() * 3 + 3) + 's';
        particlesContainer.appendChild(particle);
    }
}

function setupRenderer() {
    const container = document.getElementById('app');
    renderer = new THREE.WebGLRenderer({ 
        antialias: true,
        powerPreference: "high-performance",
        alpha: true
    });
    
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, CONFIG.IS_MOBILE ? 1.5 : CONFIG.MAX_PIXEL_RATIO));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.appendChild(renderer.domElement);
}

// Model Loading
function loadModel() {
    const loadingManager = new THREE.LoadingManager();
    
    loadingManager.onProgress = (url, loaded, total) => {
        const progress = (loaded / total) * 100;
        document.getElementById('loadingProgress').style.width = progress + '%';
    };
    
    loadingManager.onLoad = () => {
        setTimeout(() => {
            document.getElementById('loadingScreen').classList.add('hidden');
        }, 800);
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
                        
                        if (child.material.map) {
                            child.material.map.anisotropy = renderer.capabilities.getMaxAnisotropy();
                        }
                        
                        if (child.material.isMeshStandardMaterial) {
                            child.material.metalness = Math.min(child.material.metalness + 0.2, 1.0);
                            child.material.roughness = Math.max(child.material.roughness - 0.1, 0.0);
                        }
                    }
                    
                    sceneManager.addCollisionBox(child);
                }
            });
            
            model.position.set(0, 0, 0);
            sceneManager.getScene().add(model);
            
            console.log('Model loaded successfully. Collision boxes:', sceneManager.collisionBoxes.length);
        },
        (progress) => {},
        (error) => {
            console.error('Error loading model:', error);
            alert('فشل في تحميل النموذج. يرجى المحاولة مرة أخرى.');
        }
    );
}

function updatePositionInfo(position) {
    const x = Math.round(position.x * 10) / 10;
    const y = Math.round(position.y * 10) / 10;
    const z = Math.round(position.z * 10) / 10;
    document.getElementById('positionInfo').textContent = `${x}, ${y}, ${z}`;
}

function animate() {
    requestAnimationFrame(animate);
    
    const deltaTime = clock.getDelta();
    
    if (gameState.isPlaying) {
        const playerObject = playerControls.getControlsObject();
        playerControls.update(deltaTime, playerObject, CONFIG);
        physicsEngine.update(deltaTime, playerObject, sceneManager.collisionBoxes);
        updatePositionInfo(playerObject.position);
    }
    
    sceneManager.animateParticles();
    
    frameCount++;
    const currentTime = performance.now();
    if (currentTime - lastTime >= 1000) {
        fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
        document.getElementById('fpsInfo').textContent = fps;
        frameCount = 0;
        lastTime = currentTime;
    }
    
    renderer.render(sceneManager.getScene(), cameraManager.getCamera());
}

function onWindowResize() {
    cameraManager.getCamera().aspect = window.innerWidth / window.innerHeight;
    cameraManager.getCamera().updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function setupEventListeners() {
    window.addEventListener('resize', onWindowResize);
    
    document.getElementById('enterBtn').addEventListener('click', enterExperience);
    document.getElementById('settingsBtn').addEventListener('click', showSettings);
    document.getElementById('closeSettings').addEventListener('click', hideSettings);
    
    document.querySelectorAll('.env-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            sceneManager.changeEnvironment(btn.dataset.env, CONFIG);
            document.getElementById('currentEnv').textContent = getEnvironmentName(btn.dataset.env);
        });
    });

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

// Mobile Controls
function setupMobileControls() {
    setupJoystick('moveJoystick', 'moveStick', (x, y) => {
        mobileInput.move.x = x;
        mobileInput.move.y = -y; // Invert Y for forward/back
    });
    
    setupJoystick('lookJoystick', 'lookStick', (x, y) => {
        mobileInput.look.x = -x * 2; // Sensitivity adjustment
        mobileInput.look.y = -y * 2;
    });
    
    // Mobile buttons
    document.getElementById('jumpBtn').addEventListener('touchstart', (e) => {
        e.preventDefault();
        jump();
        e.target.classList.add('pressed');
    });
    
    document.getElementById('jumpBtn').addEventListener('touchend', (e) => {
        e.target.classList.remove('pressed');
    });
    
    document.getElementById('runBtn').addEventListener('touchstart', (e) => {
        e.preventDefault();
        keys.run = true;
        e.target.classList.add('pressed');
    });
    
    document.getElementById('runBtn').addEventListener('touchend', (e) => {
        keys.run = false;
        e.target.classList.remove('pressed');
    });
    
    document.getElementById('menuBtn').addEventListener('click', () => {
        gameState.isPlaying = false;
        document.getElementById('welcomeScreen').classList.remove('hidden');
        document.getElementById('mobileControls').classList.remove('show');
        document.getElementById('controlsInfo').classList.remove('show');
        document.getElementById('envControls').style.display = 'none';
        document.getElementById('statusBar').classList.remove('show');
    });
}

// Start Application
init();


