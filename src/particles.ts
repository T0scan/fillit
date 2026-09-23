import * as PIXI from 'pixi.js';

export class ParticleSystem {
    container: PIXI.Container;
    particles: {
        sprite: PIXI.Graphics;
        vx: number;
        vy: number;
        life: number;
        maxLife: number;
        size: number;
        gravity?: number;
    }[] = [];

    constructor(container: PIXI.Container) {
        this.container = container;
    }

    emit(x: number, y: number, color: number, count: number = 20, speedMult: number = 1, gravity: number = 0) {
        for (let i = 0; i < count; i++) {
            const sprite = new PIXI.Graphics();
            const size = Math.random() * 4 + 2;
            sprite.beginFill(color);
            sprite.drawCircle(0, 0, size / 2);
            sprite.endFill();
            sprite.x = x;
            sprite.y = y;
            
            const angle = Math.random() * Math.PI * 2;
            const speed = (Math.random() * 6 + 2) * speedMult;
            const maxLife = Math.random() * 0.5 + 0.5;
            
            this.particles.push({
                sprite,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: maxLife,
                maxLife,
                size,
                gravity
            });
            this.container.addChild(sprite);
        }
    }

    update(delta: number) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.sprite.x += p.vx * delta;
            p.sprite.y += p.vy * delta;
            if (p.gravity) {
                p.vy += p.gravity * delta;
            }
            p.life -= 0.02 * delta;

            const lifeRatio = Math.max(0, p.life / p.maxLife);
            p.sprite.alpha = lifeRatio;
            p.sprite.scale.set(lifeRatio);

            if (p.life <= 0) {
                this.container.removeChild(p.sprite);
                this.particles.splice(i, 1);
            }
        }
    }
}
