import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.153.0/build/three.module.js';
import { PointerLockControls } from './PointerLockControls.js';

export class PlayerControls {
    constructor(camera, domElement, isMobile, gameState, physicsEngine) {
        this.camera = camera;
        this.domElement = domElement;
        this.isMobile = isMobile;
        this.gameState = gameState;
        this.physicsEngine = physicsEngine;

        this.controls = null;
        this.keys = { forward: false, back: false, left: false, right: false, run: false };
        this.mobileInput = { move: { x: 0, y: 0 }, look: { x: 0, y: 0 } };
        this.yaw = 0;
        this.pitch = 0;
        this.maxPitch = Math.PI / 2 - 0.1;

        this.setupControls();
        this.setupEventListeners();
    }

    setupControls() {
        if (!this.isMobile) {
            this.controls = new PointerLockControls(this.camera, this.domElement);
            
            this.controls.addEventListener('lock', () => {
                this.gameState.isPlaying = true;
                document.getElementById('welcomeScreen').classList.add('hidden');
                document.getElementById('controlsInfo').classList.add('show');
                document.getElementById('crosshair').style.display = 'block';
                document.getElementById('envControls').style.display = 'block';
                document.getElementById('statusBar').classList.add('show');
            });
            
            this.controls.addEventListener('unlock', () => {
                this.gameState.isPlaying = false;
                document.getElementById('welcomeScreen').classList.remove('hidden');
                document.getElementById('controlsInfo').classList.remove('show');
                document.getElementById('crosshair').style.display = 'none';
                document.getElementById('envControls').style.display = 'none';
                document.getElementById('statusBar').classList.remove('show');
            });
        }
    }

    setupEventListeners() {
        document.addEventListener('keydown', this.onKeyDown.bind(this));
        document.addEventListener('keyup', this.onKeyUp.bind(this));

        if (this.isMobile) {
            this.setupMobileControls();
        }
    }

    onKeyDown(event) {
        if (!this.gameState.isPlaying) return;
        
        switch(event.code) {
            case 'KeyW':
            case 'ArrowUp':
                this.keys.forward = true;
                break;
            case 'KeyS':
            case 'ArrowDown':
                this.keys.back = true;
                break;
            case 'KeyA':
            case 'ArrowLeft':
                this.keys.left = true;
                break;
            case 'KeyD':
            case 'ArrowRight':
                this.keys.right = true;
                break;
            case 'ShiftLeft':
            case 'ShiftRight':
                this.keys.run = true;
                break;
            case 'Space':
                event.preventDefault();
                this.physicsEngine.jump(this.gameState.settings.jumpForce);
                break;
            case 'Escape':
                if (this.controls && this.controls.isLocked) {
                    this.controls.unlock();
                }
                break;
        }
    }

    onKeyUp(event) {
        switch(event.code) {
            case 'KeyW':
            case 'ArrowUp':
                this.keys.forward = false;
                break;
            case 'KeyS':
            case 'ArrowDown':
                this.keys.back = false;
                break;
            case 'KeyA':
            case 'ArrowLeft':
                this.keys.left = false;
                break;
            case 'KeyD':
            case 'ArrowRight':
                this.keys.right = false;
                break;
            case 'ShiftLeft':
            case 'ShiftRight':
                this.keys.run = false;
                break;
        }
    }

    setupMobileControls() {
        this.setupJoystick('moveJoystick', 'moveStick', (x, y) => {
            this.mobileInput.move.x = x;
            this.mobileInput.move.y = -y; // Invert Y for forward/back
        });
        
        this.setupJoystick('lookJoystick', 'lookStick', (x, y) => {
            this.mobileInput.look.x = -x * 2; // Sensitivity adjustment
            this.mobileInput.look.y = -y * 2;
        });
        
        document.getElementById('jumpBtn').addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.physicsEngine.jump(this.gameState.settings.jumpForce);
            e.target.classList.add('pressed');
        });
        
        document.getElementById('jumpBtn').addEventListener('touchend', (e) => {
            e.target.classList.remove('pressed');
        });
        
        document.getElementById('runBtn').addEventListener('touchstart', (e) => {
            e.preventDefault();
            this.keys.run = true;
            e.target.classList.add('pressed');
        });
        
        document.getElementById('runBtn').addEventListener('touchend', (e) => {
            this.keys.run = false;
            e.target.classList.remove('pressed');
        });
        
        document.getElementById('menuBtn').addEventListener('click', () => {
            this.gameState.isPlaying = false;
            document.getElementById('welcomeScreen').classList.remove('hidden');
            document.getElementById('mobileControls').classList.remove('show');
            document.getElementById('controlsInfo').classList.remove('show');
            document.getElementById('envControls').style.display = 'none';
            document.getElementById('statusBar').classList.remove('show');
        });
    }

    setupJoystick(containerId, stickId, onMove) {
        const container = document.getElementById(containerId);
        const stick = document.getElementById(stickId);
        let isActive = false;
        let startPos = { x: 0, y: 0 };
        const maxDistance = 60;
        
        const handleStart = (e) => {
            isActive = true;
            const rect = container.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            startPos.x = centerX;
            startPos.y = centerY;
            
            if (e.touches) {
                container.setPointerCapture && container.setPointerCapture(e.touches[0].identifier);
            }
        };
        
        const handleMove = (e) => {
            if (!isActive) return;
            
            const clientX = e.touches ? e.touches[0].clientX : e.clientX;
            const clientY = e.touches ? e.touches[0].clientY : e.clientY;
            
            let deltaX = clientX - startPos.x;
            let deltaY = clientY - startPos.y;
            
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
            if (distance > maxDistance) {
                deltaX = (deltaX / distance) * maxDistance;
                deltaY = (deltaY / distance) * maxDistance;
            }
            
            stick.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
            onMove(deltaX / maxDistance, deltaY / maxDistance);
        };
        
        const handleEnd = () => {
            isActive = false;
            stick.style.transform = 'translate(0px, 0px)';
            onMove(0, 0);
        };
        
        container.addEventListener('touchstart', handleStart, { passive: false });
        container.addEventListener('touchmove', handleMove, { passive: false });
        container.addEventListener('touchend', handleEnd);
        container.addEventListener('touchcancel', handleEnd);
        
        container.addEventListener('mousedown', handleStart);
        document.addEventListener('mousemove', handleMove);
        document.addEventListener('mouseup', handleEnd);
    }

    update(deltaTime, playerObject, CONFIG) {
        const moveVector = new THREE.Vector3();
        
        if (this.isMobile) {
            moveVector.x = this.mobileInput.move.x;
            moveVector.z = this.mobileInput.move.y;
            
            this.yaw += this.mobileInput.look.x * deltaTime * 3 * this.gameState.settings.mouseSensitivity;
            this.pitch += this.mobileInput.look.y * deltaTime * 3 * this.gameState.settings.mouseSensitivity;
            this.pitch = Math.max(-this.maxPitch, Math.min(this.maxPitch, this.pitch));
            
            this.camera.rotation.order = 'YXZ';
            this.camera.rotation.y = this.yaw;
            this.camera.rotation.x = this.pitch;
        } else {
            if (this.keys.forward) moveVector.z -= 1;
            if (this.keys.back) moveVector.z += 1;
            if (this.keys.left) moveVector.x -= 1;
            if (this.keys.right) moveVector.x += 1;
        }
        
        if (moveVector.length() > 0) {
            moveVector.normalize();
            const speed = this.gameState.settings.moveSpeed * (this.keys.run ? CONFIG.RUN_MULTIPLIER : 1.0) * deltaTime;
            
            if (this.isMobile) {
                const movement = new THREE.Vector3(moveVector.x, 0, moveVector.z);
                movement.multiplyScalar(speed);
                playerObject.position.add(movement);
            } else {
                const direction = new THREE.Vector3();
                this.camera.getWorldDirection(direction);
                direction.y = 0;
                direction.normalize();
                
                const right = new THREE.Vector3();
                right.crossVectors(direction, this.camera.up).normalize();
                
                const movement = new THREE.Vector3();
                movement.addScaledVector(direction, -moveVector.z);
                movement.addScaledVector(right, moveVector.x);
                movement.multiplyScalar(speed);
                
                playerObject.position.add(movement);
            }
        }
    }

    getControlsObject() {
        return this.controls ? this.controls.getObject() : this.camera;
    }

    getControls() {
        return this.controls;
    }
}


