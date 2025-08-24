import * as THREE from 'three';

export class SceneManager {
    constructor(renderer) {
        this.scene = new THREE.Scene();
        this.renderer = renderer;
        this.camera = null;
        this.ambientLight = null;
        this.directionalLight = null;
        this.collisionBoxes = [];
        this.ground = null;
        this.particles = null;
        this.setupScene();
        this.setupLighting();
    }

    setupScene() {
        this.scene.background = new THREE.Color(0x2d3748);
        this.scene.fog = new THREE.Fog(0x2d3748, 50, 200);
    }

    setupLighting() {
        // Ambient light
        this.ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(this.ambientLight);
        
        // Hemisphere light
        const hemisphereLight = new THREE.HemisphereLight(0x87CEEB, 0x362d1d, 0.8);
        this.scene.add(hemisphereLight);
        
        // Main directional light (sun)
        this.directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
        this.directionalLight.position.set(50, 100, 50);
        this.directionalLight.castShadow = true;
        this.directionalLight.shadow.mapSize.setScalar(2048);
        this.directionalLight.shadow.camera.near = 0.1;
        this.directionalLight.shadow.camera.far = 500;
        this.directionalLight.shadow.camera.left = -100;
        this.directionalLight.shadow.camera.right = 100;
        this.directionalLight.shadow.camera.top = 100;
        this.directionalLight.shadow.camera.bottom = -100;
        this.scene.add(this.directionalLight);
        
        // Fill lights with colors
        const fillLight1 = new THREE.PointLight(0xffd700, 0.3, 50);
        fillLight1.position.set(-20, 10, -20);
        this.scene.add(fillLight1);
        
        const fillLight2 = new THREE.PointLight(0x87ceeb, 0.3, 50);
        fillLight2.position.set(20, 10, 20);
        this.scene.add(fillLight2);
        
        const fillLight3 = new THREE.PointLight(0xff6b6b, 0.2, 30);
        fillLight3.position.set(0, 15, -30);
        this.scene.add(fillLight3);
    }

    setupEnvironment() {
        // Enhanced ground with texture-like appearance
        const groundGeometry = new THREE.PlaneGeometry(500, 500, 50, 50);
        const groundMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x2d3748,
            transparent: true,
            opacity: 0.9
        });
        
        // Add some vertex displacement for more interesting ground
        const positions = groundGeometry.attributes.position;
        for (let i = 0; i < positions.count; i++) {
            const y = Math.sin(positions.getX(i) * 0.1) * Math.cos(positions.getZ(i) * 0.1) * 0.1;
            positions.setY(i, y);
        }
        groundGeometry.computeVertexNormals();
        
        this.ground = new THREE.Mesh(groundGeometry, groundMaterial);
        this.ground.rotation.x = -Math.PI / 2;
        this.ground.receiveShadow = true;
        this.scene.add(this.ground);
        
        this.addAtmosphericElements();
    }

    addAtmosphericElements() {
        // Add floating particles in 3D space
        const particleGeometry = new THREE.BufferGeometry();
        const particleCount = 1000;
        const positions = new Float32Array(particleCount * 3);
        
        for (let i = 0; i < particleCount * 3; i += 3) {
            positions[i] = (Math.random() - 0.5) * 200;     // x
            positions[i + 1] = Math.random() * 50;          // y
            positions[i + 2] = (Math.random() - 0.5) * 200; // z
        }
        
        particleGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
        
        const particleMaterial = new THREE.PointsMaterial({
            color: 0xffffff,
            size: 0.5,
            transparent: true,
            opacity: 0.6,
            blending: THREE.AdditiveBlending
        });
        
        this.particles = new THREE.Points(particleGeometry, particleMaterial);
        this.scene.add(this.particles);
    }

    animateParticles() {
        if (this.particles) {
            const positions = this.particles.geometry.attributes.position.array;
            for (let i = 1; i < positions.length; i += 3) {
                positions[i] += 0.01; // Move up
                if (positions[i] > 50) {
                    positions[i] = 0; // Reset to ground level
                }
            }
            this.particles.geometry.attributes.position.needsUpdate = true;
        }
    }

    changeEnvironment(envName, CONFIG) {
        const env = CONFIG.ENVIRONMENTS[envName];
        if (env) {
            // Smooth transition
            const currentBg = this.scene.background.clone();
            const targetBg = env.background.clone();
            
            let progress = 0;
            const transitionDuration = 1000; // 1 second
            const startTime = performance.now();
            
            const animateTransition = () => {
                const elapsed = performance.now() - startTime;
                progress = Math.min(elapsed / transitionDuration, 1);
                
                // Interpolate background color
                this.scene.background.lerpColors(currentBg, targetBg, progress);
                this.scene.fog.color.lerpColors(currentBg, targetBg, progress);
                
                // Update lighting
                this.ambientLight.intensity = 0.4 + (env.ambientIntensity - 0.4) * progress;
                this.directionalLight.intensity = 1.2 + (env.directionalIntensity - 1.2) * progress;
                
                if (progress < 1) {
                    requestAnimationFrame(animateTransition);
                }
            };
            
            animateTransition();
        }
    }

    addCollisionBox(mesh) {
        mesh.updateWorldMatrix(true, true);
        const box = new THREE.Box3().setFromObject(mesh);
        if (!box.isEmpty()) {
            this.collisionBoxes.push(box);
        }
    }

    handleCollisions(position, playerRadius) {
        for (const box of this.collisionBoxes) {
            const expandedBox = box.clone().expandByScalar(playerRadius);
            if (expandedBox.containsPoint(position)) {
                const closestPoint = expandedBox.clampPoint(position.clone(), new THREE.Vector3());
                const pushVector = position.clone().sub(closestPoint);
                if (pushVector.length() > 0) {
                    pushVector.normalize().multiplyScalar(playerRadius + 0.01);
                    position.copy(closestPoint.add(pushVector));
                }
            }
        }
    }

    getScene() {
        return this.scene;
    }

    getAmbientLight() {
        return this.ambientLight;
    }

    getDirectionalLight() {
        return this.directionalLight;
    }
}
