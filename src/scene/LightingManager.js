// src/scene/LightingManager.js
import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.153.0/build/three.module.js';

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
        
        // Hemisphere light (sky / ground)
        const hemisphereLight = new THREE.HemisphereLight(0x87CEEB, 0x362d1d, 0.8);
        this.scene.add(hemisphereLight);
        
        // Main directional light (sun)
        this.directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
        this.directionalLight.position.set(50, 100, 50);
        this.directionalLight.castShadow = true;

        // Shadow map resolution (use set for clarity)
        if (this.directionalLight.shadow && this.directionalLight.shadow.mapSize) {
            try {
                this.directionalLight.shadow.mapSize.set(2048, 2048);
            } catch (e) {
                // fallback: ignore if not supported
            }
        }

        // Configure directional light's shadow camera (OrthographicCamera)
        const cam = this.directionalLight.shadow && this.directionalLight.shadow.camera;
        if (cam) {
            // Tune these values according to scene scale
            const d = 100; // half-size of orthographic shadow camera
            cam.left = -d;
            cam.right = d;
            cam.top = d;
            cam.bottom = -d;

            cam.near = 0.1;
            cam.far = 500;

            // Correctly update projection matrix after changing bounds
            if (typeof cam.updateProjectionMatrix === 'function') {
                cam.updateProjectionMatrix();
            } else {
                console.warn('LightingManager: shadow camera missing updateProjectionMatrix().');
            }

            // optional: helper for debugging shadows
            // const helper = new THREE.CameraHelper(cam);
            // this.scene.add(helper);
            // this._helper = helper;
        } else {
            console.warn('LightingManager: directionalLight.shadow.camera not available on this THREE build.');
        }

        // Reduce shadow acne with small bias / normalBias
        if (this.directionalLight.shadow) {
            // bias can be negative small number; adjust if you see peter-panning
            this.directionalLight.shadow.bias = -0.0005;
            // normalBias supported in newer three versions
            if ('normalBias' in this.directionalLight.shadow) {
                this.directionalLight.shadow.normalBias = 0.05;
            }
        }

        this.scene.add(this.directionalLight);
        
        // Fill lights with colors (accent / warm / cool)
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
        if (this.ambientLight && env.ambientIntensity !== undefined) {
            this.ambientLight.intensity = env.ambientIntensity;
        }
        if (this.directionalLight && env.directionalIntensity !== undefined) {
            this.directionalLight.intensity = env.directionalIntensity;
        }
        if (this.directionalLight && env.directionalLightColor !== undefined) {
            this.directionalLight.color.set(env.directionalLightColor);
        }
    }

    getAmbientLight() {
        return this.ambientLight;
    }

    getDirectionalLight() {
        return this.directionalLight;
    }

    dispose() {
        if (this._helper) {
            this.scene.remove(this._helper);
            this._helper = null;
        }
        if (this.directionalLight) {
            this.scene.remove(this.directionalLight);
            this.directionalLight = null;
        }
        if (this.ambientLight) {
            this.scene.remove(this.ambientLight);
            this.ambientLight = null;
        }
    }
}
