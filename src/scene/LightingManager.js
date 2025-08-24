import * as THREE from 'three';

export class LightingManager {
    constructor(scene) {
        this.scene = scene;
        this.ambientLight = null;
        this.directionalLight = null;
        this.setupLighting();
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
        this.directionalLight.shadow.camera.setFromProjectionMatrix(new THREE.Vector3());
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

    updateLighting(env) {
        this.ambientLight.intensity = env.ambientIntensity;
        this.directionalLight.intensity = env.directionalIntensity;
        if (env.directionalLightColor) {
            this.directionalLight.color.set(env.directionalLightColor);
        }
    }

    getAmbientLight() {
        return this.ambientLight;
    }

    getDirectionalLight() {
        return this.directionalLight;
    }
}


