import * as THREE from 'three';

export class PhysicsEngine {
    constructor(gravity, eyeHeight, playerRadius) {
        this.gravity = gravity;
        this.eyeHeight = eyeHeight;
        this.playerRadius = playerRadius;
        this.velocity = new THREE.Vector3();
        this.canJump = false;
    }

    update(deltaTime, playerObject, collisionBoxes) {
        // Apply gravity
        this.velocity.y -= this.gravity * deltaTime;

        // Apply vertical movement
        const newY = playerObject.position.y + this.velocity.y * deltaTime;

        // Ground collision
        if (newY <= this.eyeHeight) {
            playerObject.position.y = this.eyeHeight;
            this.velocity.y = 0;
            this.canJump = true;
        } else {
            playerObject.position.y = newY;
        }

        // Handle collisions with other objects
        this.handleCollisions(playerObject.position, collisionBoxes);
    }

    handleCollisions(position, collisionBoxes) {
        for (const box of collisionBoxes) {
            const expandedBox = box.clone().expandByScalar(this.playerRadius);
            if (expandedBox.containsPoint(position)) {
                const closestPoint = expandedBox.clampPoint(position.clone(), new THREE.Vector3());
                const pushVector = position.clone().sub(closestPoint);
                if (pushVector.length() > 0) {
                    pushVector.normalize().multiplyScalar(this.playerRadius + 0.01);
                    position.copy(closestPoint.add(pushVector));
                }
            }
        }
    }

    jump(jumpForce) {
        if (this.canJump) {
            this.velocity.y = jumpForce;
            this.canJump = false;
        }
    }

    resetVelocity() {
        this.velocity.set(0, 0, 0);
    }
}


