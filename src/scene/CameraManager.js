import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.153.0/build/three.module.js';

export class CameraManager {
    constructor(renderer) {
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.renderer = renderer;
        this.controls = null;
    }

    setupCamera(playerPosition) {
        this.camera.position.copy(playerPosition);
    }

    setupControls(domElement, isMobile, camera, gameState) {
        if (!isMobile) {
            this.controls = new PointerLockControls(camera, domElement);
            
            this.controls.addEventListener('lock', () => {
                gameState.isPlaying = true;
                document.getElementById('welcomeScreen').style.display = 'none';
                document.getElementById('controlsInfo').classList.add('show');
                document.getElementById('crosshair').style.display = 'block';
                document.getElementById('envControls').style.display = 'block';
                document.getElementById('statusBar').classList.add('show');
            });
            
            this.controls.addEventListener('unlock', () => {
                gameState.isPlaying = false;
                document.getElementById('welcomeScreen').style.display = 'grid';
                document.getElementById('controlsInfo').classList.remove('show');
                document.getElementById('crosshair').style.display = 'none';
                document.getElementById('envControls').style.display = 'none';
                document.getElementById('statusBar').classList.remove('show');
            });
        }
    }

    getCamera() {
        return this.camera;
    }

    getControls() {
        return this.controls;
    }

    onWindowResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }
}


