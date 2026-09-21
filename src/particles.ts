import * as PIXI from 'pixi.js';

export class ParticleSystem {
    container: PIXI.Container;
    particles: { sprite: PIXI.Graphics; vx: number; vy: number; life: number }[] = [];

    constructor(container: PIXI.Container) {
        this.container = container;
    }

    emit(x: number, y: number, color: number, count: number = 20) {
        for (let i = 0; i < count; i++) {
            const sprite = new PIXI.Graphics();
            sprite.beginFill(color);
            sprite.drawRect(0, 0, 4, 4);
            sprite.endFill();
            sprite.x = x;
            sprite.y = y;
            
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 5 + 2;
            
            this.particles.push({
                sprite,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1.0
            });
            this.container.addChild(sprite);
        }
    }

    update(delta: number) {
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.sprite.x += p.vx * delta;
            p.sprite.y += p.vy * delta;
            p.life -= 0.02 * delta;
            p.sprite.alpha = p.life;

            if (p.life <= 0) {
                this.container.removeChild(p.sprite);
                this.particles.splice(i, 1);
            }
        }
    }
}
