import {
  AfterViewInit,
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  ViewChild,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';

type GameState = 'ready' | 'running' | 'paused' | 'gameover';

interface Star {
  x: number;
  y: number;
  size: number;
  speed: number;
}

interface Asteroid {
  x: number;
  y: number;
  radius: number;
  speed: number;
  rotation: number;
  rotationSpeed: number;
  shape: number[];
}

interface Orb {
  x: number;
  y: number;
  radius: number;
  speed: number;
  pulse: number;
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="page-shell">
      <section class="hud-bar">
        <div class="brand-block">
          <span class="eyebrow">Angular arcade build</span>
          <h1>Neon Dodge</h1>
          <p>
            Steer the ship, dodge asteroids, grab energy orbs.
          </p>
        </div>

        <div class="stats-grid">
          <div class="stat-card">
            <span>Score</span>
            <strong>{{ score() }}</strong>
          </div>
          <div class="stat-card">
            <span>Lives</span>
            <strong>{{ lives() }}</strong>
          </div>
          <div class="stat-card">
            <span>Best</span>
            <strong>{{ highScore() }}</strong>
          </div>
        </div>
      </section>

      <section class="game-panel">
        <div class="canvas-wrap">
          <canvas
            #gameCanvas
            class="game-canvas"
            [attr.width]="logicalWidth"
            [attr.height]="logicalHeight"
            aria-label="Neon Dodge game canvas"
          ></canvas>

          <div class="overlay" *ngIf="state() !== 'running'">
            <div class="overlay-card">
              <h2>{{ overlayTitle() }}</h2>
              <p>{{ overlayBody() }}</p>

              <div class="control-pills">
                <span>Move: WASD / Arrow Keys</span>
                <span>Pause: Space</span>
                <span>Restart: Enter</span>
              </div>

              <div class="button-row">
                <button type="button" class="primary-btn" (click)="startOrRestart()">
                  {{ state() === 'paused' ? 'Resume game' : state() === 'gameover' ? 'Play again' : 'Start game' }}
                </button>
                <button
                  type="button"
                  class="ghost-btn"
                  *ngIf="state() === 'gameover'"
                  (click)="resetToReady()"
                >
                  Back to title
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="controls-panel">
          <div class="controls-card">
            <h3>How it works</h3>
            <p>
              Asteroids cost a life. Energy orbs add points. Survive longer and the field gets
              faster.
            </p>
          </div>

          <div class="controls-card">
            <h3>Quick actions</h3>
            <div class="button-stack">
              <button type="button" class="primary-btn" (click)="startOrRestart()">
                {{ state() === 'running' ? 'Restart run' : 'Start / Resume' }}
              </button>
              <button type="button" class="ghost-btn" (click)="togglePause()">
                {{ state() === 'paused' ? 'Resume' : 'Pause' }}
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        min-height: 100vh;
        color: #f5f7ff;
        background:
          radial-gradient(circle at top, rgba(118, 77, 255, 0.25), transparent 35%),
          radial-gradient(circle at bottom right, rgba(0, 214, 201, 0.18), transparent 30%),
          linear-gradient(180deg, #080a14 0%, #05070d 100%);
        font-family: Inter, Arial, Helvetica, sans-serif;
      }

      * {
        box-sizing: border-box;
      }

      .page-shell {
        width: min(1200px, calc(100% - 32px));
        margin: 0 auto;
        padding: 24px 0 40px;
      }

      .hud-bar {
        display: grid;
        grid-template-columns: 1.6fr 1fr;
        gap: 20px;
        align-items: stretch;
        margin-bottom: 20px;
      }

      .brand-block,
      .stat-card,
      .controls-card,
      .overlay-card {
        border: 1px solid rgba(255, 255, 255, 0.08);
        background: rgba(11, 15, 27, 0.84);
        backdrop-filter: blur(12px);
        box-shadow: 0 18px 60px rgba(0, 0, 0, 0.32);
      }

      .brand-block {
        border-radius: 28px;
        padding: 24px;
      }

      .eyebrow {
        display: inline-block;
        margin-bottom: 8px;
        font-size: 0.76rem;
        letter-spacing: 0.14em;
        text-transform: uppercase;
        color: #8db5ff;
      }

      h1,
      h2,
      h3,
      p {
        margin: 0;
      }

      h1 {
        font-size: clamp(2rem, 4vw, 3.4rem);
        line-height: 1;
        margin-bottom: 10px;
      }

      .brand-block p,
      .controls-card p,
      .overlay-card p {
        color: rgba(235, 241, 255, 0.78);
        line-height: 1.5;
      }

      .stats-grid {
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 12px;
      }

      .stat-card {
        border-radius: 24px;
        padding: 18px;
        display: flex;
        flex-direction: column;
        justify-content: center;
        min-height: 120px;
      }

      .stat-card span {
        color: rgba(198, 212, 255, 0.72);
        font-size: 0.85rem;
        text-transform: uppercase;
        letter-spacing: 0.08em;
      }

      .stat-card strong {
        margin-top: 10px;
        font-size: clamp(1.9rem, 3vw, 2.8rem);
      }

      .game-panel {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 320px;
        gap: 20px;
        align-items: start;
      }

      .canvas-wrap {
        position: relative;
        border-radius: 32px;
        overflow: hidden;
        border: 1px solid rgba(255, 255, 255, 0.08);
        background: rgba(7, 10, 20, 0.9);
        box-shadow: 0 24px 60px rgba(0, 0, 0, 0.38);
      }

      .game-canvas {
        display: block;
        width: 100%;
        height: auto;
        aspect-ratio: 16 / 10;
      }

      .overlay {
        position: absolute;
        inset: 0;
        display: grid;
        place-items: center;
        background: rgba(3, 5, 12, 0.6);
        padding: 24px;
      }

      .overlay-card {
        width: min(92%, 540px);
        border-radius: 28px;
        padding: 28px;
        text-align: center;
      }

      .overlay-card h2 {
        font-size: clamp(1.8rem, 3vw, 2.8rem);
        margin-bottom: 12px;
      }

      .control-pills {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 10px;
        margin: 20px 0 24px;
      }

      .control-pills span {
        border: 1px solid rgba(143, 181, 255, 0.18);
        background: rgba(115, 134, 255, 0.08);
        border-radius: 999px;
        padding: 8px 12px;
        font-size: 0.9rem;
      }

      .controls-panel {
        display: grid;
        gap: 16px;
      }

      .controls-card {
        border-radius: 28px;
        padding: 22px;
      }

      .controls-card h3 {
        margin-bottom: 10px;
        font-size: 1.15rem;
      }

      .button-row,
      .button-stack {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
        justify-content: center;
      }

      .button-stack {
        flex-direction: column;
      }

      button {
        appearance: none;
        border: 0;
        border-radius: 16px;
        padding: 12px 18px;
        font: inherit;
        font-weight: 700;
        cursor: pointer;
        transition:
          transform 0.18s ease,
          opacity 0.18s ease,
          box-shadow 0.18s ease;
      }

      button:hover {
        transform: translateY(-1px);
      }

      .primary-btn {
        color: #08101d;
        background: linear-gradient(135deg, #8db5ff 0%, #6af0de 100%);
        box-shadow: 0 12px 30px rgba(106, 240, 222, 0.2);
      }

      .ghost-btn {
        color: #f5f7ff;
        background: rgba(255, 255, 255, 0.08);
        border: 1px solid rgba(255, 255, 255, 0.08);
      }

      @media (max-width: 980px) {
        .hud-bar,
        .game-panel {
          grid-template-columns: 1fr;
        }

        .stats-grid {
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }
      }

      @media (max-width: 640px) {
        .page-shell {
          width: min(100% - 20px, 1200px);
          padding-top: 12px;
        }

        .brand-block,
        .controls-card,
        .overlay-card,
        .stat-card {
          border-radius: 22px;
        }

        .stats-grid {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class AppComponent implements AfterViewInit, OnDestroy {
  @ViewChild('gameCanvas', { static: true })
  private readonly canvasRef!: ElementRef<HTMLCanvasElement>;

  readonly logicalWidth = 960;
  readonly logicalHeight = 600;

  readonly score = signal(0);
  readonly lives = signal(3);
  readonly highScore = signal(this.readHighScore());
  readonly state = signal<GameState>('ready');

  private ctx!: CanvasRenderingContext2D;
  private animationFrameId = 0;
  private lastTime = 0;
  private asteroidTimer = 0;
  private orbTimer = 0;
  private survivalTimer = 0;
  private difficulty = 1;
  private invincibleUntil = 0;
  private readonly keys: Record<string, boolean> = {};

  private player = {
    x: this.logicalWidth / 2,
    y: this.logicalHeight - 90,
    width: 42,
    height: 42,
    speed: 360,
  };

  private stars: Star[] = [];
  private asteroids: Asteroid[] = [];
  private orbs: Orb[] = [];

  ngAfterViewInit(): void {
    const canvas = this.canvasRef.nativeElement;
    const context = canvas.getContext('2d');

    if (!context) {
      throw new Error('Canvas 2D context could not be created.');
    }

    this.ctx = context;
    this.resizeForHiDpi();
    this.seedStars();
    this.resetRound();
    this.draw(performance.now());
  }

  ngOnDestroy(): void {
    cancelAnimationFrame(this.animationFrameId);
  }

  @HostListener('window:resize')
  onResize(): void {
    if (!this.ctx) {
      return;
    }

    this.resizeForHiDpi();
    this.draw(performance.now());
  }

  @HostListener('window:keydown', ['$event'])
  onKeyDown(event: KeyboardEvent): void {
    const key = event.key.toLowerCase();

    if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(key)) {
      event.preventDefault();
    }

    if (key === 'enter') {
      event.preventDefault();
      this.startOrRestart();
      return;
    }

    if (key === ' ') {
      this.togglePause();
      return;
    }

    this.keys[key] = true;
  }

  @HostListener('window:keyup', ['$event'])
  onKeyUp(event: KeyboardEvent): void {
    this.keys[event.key.toLowerCase()] = false;
  }

  startOrRestart(): void {
    if (this.state() === 'running') {
      this.resetRound();
      this.startLoop();
      return;
    }

    if (this.state() === 'gameover' || this.state() === 'ready') {
      this.resetRound();
    }

    this.state.set('running');
    this.startLoop();
  }

  togglePause(): void {
    if (this.state() === 'running') {
      this.state.set('paused');
      cancelAnimationFrame(this.animationFrameId);
      this.draw(performance.now());
      return;
    }

    if (this.state() === 'paused') {
      this.state.set('running');
      this.startLoop();
    }
  }

  resetToReady(): void {
    cancelAnimationFrame(this.animationFrameId);
    this.resetRound();
    this.state.set('ready');
    this.draw(performance.now());
  }

  overlayTitle(): string {
    switch (this.state()) {
      case 'paused':
        return 'Paused';
      case 'gameover':
        return 'Run Over';
      default:
        return 'Neon Dodge';
    }
  }

  overlayBody(): string {
    switch (this.state()) {
      case 'paused':
        return 'Catch your breath. The asteroid field will still be extremely rude when you come back.';
      case 'gameover':
        return `Final score: ${this.score()}. Dodge better. Or at least more dramatically.`;
      default:
        return 'Fly with WASD or arrow keys, survive the swarm, and collect glowing orbs for bonus points.';
    }
  }

  private startLoop(): void {
    cancelAnimationFrame(this.animationFrameId);
    this.lastTime = performance.now();
    this.animationFrameId = requestAnimationFrame(this.loop);
  }

  private readonly loop = (timestamp: number): void => {
    const deltaTime = Math.min((timestamp - this.lastTime) / 1000, 0.033);
    this.lastTime = timestamp;

    if (this.state() === 'running') {
      this.update(deltaTime, timestamp);
    }

    this.draw(timestamp);
    this.animationFrameId = requestAnimationFrame(this.loop);
  };

  private update(deltaTime: number, timestamp: number): void {
    this.survivalTimer += deltaTime;
    if (this.survivalTimer >= 0.1) {
      const add = Math.floor(this.survivalTimer * 10);
      this.score.update((value) => value + add);
      this.survivalTimer -= add / 10;
    }

    this.difficulty = 1 + Math.min(this.score() / 250, 4.5);

    this.updatePlayer(deltaTime);
    this.updateStars(deltaTime);
    this.updateAsteroids(deltaTime);
    this.updateOrbs(deltaTime);
    this.spawnEntities(deltaTime);
    this.handleCollisions(timestamp);
  }

  private updatePlayer(deltaTime: number): void {
    let moveX = 0;
    let moveY = 0;

    if (this.keys['arrowleft'] || this.keys['a']) moveX -= 1;
    if (this.keys['arrowright'] || this.keys['d']) moveX += 1;
    if (this.keys['arrowup'] || this.keys['w']) moveY -= 1;
    if (this.keys['arrowdown'] || this.keys['s']) moveY += 1;

    if (moveX !== 0 && moveY !== 0) {
      const normalize = Math.SQRT1_2;
      moveX *= normalize;
      moveY *= normalize;
    }

    this.player.x += moveX * this.player.speed * deltaTime;
    this.player.y += moveY * this.player.speed * deltaTime;

    const halfW = this.player.width / 2;
    const halfH = this.player.height / 2;

    this.player.x = Math.max(halfW + 14, Math.min(this.logicalWidth - halfW - 14, this.player.x));
    this.player.y = Math.max(halfH + 14, Math.min(this.logicalHeight - halfH - 14, this.player.y));
  }

  private updateStars(deltaTime: number): void {
    for (const star of this.stars) {
      star.y += star.speed * deltaTime * this.difficulty;
      if (star.y > this.logicalHeight) {
        star.y = -4;
        star.x = Math.random() * this.logicalWidth;
      }
    }
  }

  private updateAsteroids(deltaTime: number): void {
    for (const asteroid of this.asteroids) {
      asteroid.y += asteroid.speed * deltaTime * this.difficulty;
      asteroid.rotation += asteroid.rotationSpeed * deltaTime;
    }

    this.asteroids = this.asteroids.filter(
      (asteroid) => asteroid.y - asteroid.radius < this.logicalHeight + 40,
    );
  }

  private updateOrbs(deltaTime: number): void {
    for (const orb of this.orbs) {
      orb.y += orb.speed * deltaTime * (0.85 + this.difficulty * 0.15);
      orb.pulse += deltaTime * 5;
    }

    this.orbs = this.orbs.filter((orb) => orb.y - orb.radius < this.logicalHeight + 30);
  }

  private spawnEntities(deltaTime: number): void {
    this.asteroidTimer += deltaTime;
    this.orbTimer += deltaTime;

    const asteroidInterval = Math.max(0.22, 0.95 - this.difficulty * 0.11);
    const orbInterval = Math.max(1.8, 4.2 - this.difficulty * 0.25);

    if (this.asteroidTimer >= asteroidInterval) {
      this.asteroidTimer = 0;
      this.spawnAsteroid();
    }

    if (this.orbTimer >= orbInterval) {
      this.orbTimer = 0;
      this.spawnOrb();
    }
  }

  private spawnAsteroid(): void {
    const radius = 16 + Math.random() * 26;
    this.asteroids.push({
      x: radius + Math.random() * (this.logicalWidth - radius * 2),
      y: -radius - 10,
      radius,
      speed: 140 + Math.random() * 200,
      rotation: Math.random() * Math.PI * 2,
      rotationSpeed: -2 + Math.random() * 4,
      shape: Array.from({ length: 8 }, () => 0.72 + Math.random() * 0.34),
    });
  }

  private spawnOrb(): void {
    const radius = 11 + Math.random() * 8;
    this.orbs.push({
      x: radius + Math.random() * (this.logicalWidth - radius * 2),
      y: -radius - 20,
      radius,
      speed: 120 + Math.random() * 70,
      pulse: Math.random() * Math.PI * 2,
    });
  }

  private handleCollisions(timestamp: number): void {
    const playerRadius = this.player.width * 0.38;

    if (timestamp >= this.invincibleUntil) {
      for (const asteroid of this.asteroids) {
        if (this.circleHitsPlayer(asteroid.x, asteroid.y, asteroid.radius, playerRadius)) {
          this.invincibleUntil = timestamp + 1400;
          this.lives.update((value) => value - 1);
          this.asteroids = this.asteroids.filter((item) => item !== asteroid);

          if (this.lives() <= 0) {
            this.finishGame();
          }
          break;
        }
      }
    }

    const collectedOrbs: Orb[] = [];
    for (const orb of this.orbs) {
      if (this.circleHitsPlayer(orb.x, orb.y, orb.radius, playerRadius + 2)) {
        collectedOrbs.push(orb);
      }
    }

    if (collectedOrbs.length > 0) {
      this.orbs = this.orbs.filter((orb) => !collectedOrbs.includes(orb));
      this.score.update((value) => value + collectedOrbs.length * 40);
    }
  }

  private circleHitsPlayer(
    circleX: number,
    circleY: number,
    circleRadius: number,
    playerRadius: number,
  ): boolean {
    const dx = circleX - this.player.x;
    const dy = circleY - this.player.y;
    return dx * dx + dy * dy <= (circleRadius + playerRadius) ** 2;
  }

  private finishGame(): void {
    this.state.set('gameover');
    cancelAnimationFrame(this.animationFrameId);

    if (this.score() > this.highScore()) {
      this.highScore.set(this.score());
      this.writeHighScore(this.score());
    }
  }

  private resetRound(): void {
    this.score.set(0);
    this.lives.set(3);

    this.asteroids = [];
    this.orbs = [];
    this.asteroidTimer = 0;
    this.orbTimer = 0;
    this.survivalTimer = 0;
    this.difficulty = 1;
    this.invincibleUntil = 0;

    this.player.x = this.logicalWidth / 2;
    this.player.y = this.logicalHeight - 90;
    this.clearMovement();
  }

  private seedStars(): void {
    this.stars = Array.from({ length: 90 }, () => ({
      x: Math.random() * this.logicalWidth,
      y: Math.random() * this.logicalHeight,
      size: 1 + Math.random() * 2.5,
      speed: 20 + Math.random() * 80,
    }));
  }

  private clearMovement(): void {
    for (const key of Object.keys(this.keys)) {
      this.keys[key] = false;
    }
  }

  private resizeForHiDpi(): void {
    const canvas = this.canvasRef.nativeElement;
    const dpr = Math.max(1, window.devicePixelRatio || 1);

    canvas.width = Math.floor(this.logicalWidth * dpr);
    canvas.height = Math.floor(this.logicalHeight * dpr);

    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.ctx.imageSmoothingEnabled = true;
  }

  private draw(timestamp: number): void {
    const ctx = this.ctx;

    ctx.clearRect(0, 0, this.logicalWidth, this.logicalHeight);

    const sky = ctx.createLinearGradient(0, 0, 0, this.logicalHeight);
    sky.addColorStop(0, '#08101f');
    sky.addColorStop(1, '#050814');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, this.logicalWidth, this.logicalHeight);

    this.drawGrid(ctx);
    this.drawStars(ctx);
    this.drawOrbs(ctx, timestamp);
    this.drawAsteroids(ctx);
    this.drawPlayer(ctx, timestamp);
    this.drawStatusBar(ctx);
  }

  private drawGrid(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.strokeStyle = 'rgba(110, 142, 255, 0.08)';
    ctx.lineWidth = 1;

    for (let x = 0; x <= this.logicalWidth; x += 48) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, this.logicalHeight);
      ctx.stroke();
    }

    for (let y = 0; y <= this.logicalHeight; y += 48) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(this.logicalWidth, y);
      ctx.stroke();
    }

    ctx.restore();
  }

  private drawStars(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    for (const star of this.stars) {
      ctx.fillStyle = `rgba(189, 220, 255, ${0.5 + star.size * 0.15})`;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private drawAsteroids(ctx: CanvasRenderingContext2D): void {
    ctx.save();

    for (const asteroid of this.asteroids) {
      ctx.save();
      ctx.translate(asteroid.x, asteroid.y);
      ctx.rotate(asteroid.rotation);

      const rock = ctx.createRadialGradient(-6, -6, 3, 0, 0, asteroid.radius + 8);
      rock.addColorStop(0, '#7d879f');
      rock.addColorStop(1, '#2b3245');
      ctx.fillStyle = rock;

      ctx.beginPath();
      for (let i = 0; i < 8; i++) {
        const angle = (Math.PI * 2 * i) / 8;
        const variance = asteroid.radius * asteroid.shape[i];
        const px = Math.cos(angle) * variance;
        const py = Math.sin(angle) * variance;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = 'rgba(255,255,255,0.16)';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore();
  }

  private drawOrbs(ctx: CanvasRenderingContext2D, timestamp: number): void {
    ctx.save();

    for (const orb of this.orbs) {
      const pulse = 0.82 + Math.sin(timestamp / 180 + orb.pulse) * 0.18;
      const radius = orb.radius * pulse;
      const glow = ctx.createRadialGradient(orb.x, orb.y, 1, orb.x, orb.y, radius * 2.3);
      glow.addColorStop(0, 'rgba(122, 255, 234, 0.95)');
      glow.addColorStop(0.5, 'rgba(59, 181, 255, 0.55)');
      glow.addColorStop(1, 'rgba(59, 181, 255, 0)');
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(orb.x, orb.y, radius * 2.3, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#b9fff5';
      ctx.beginPath();
      ctx.arc(orb.x, orb.y, radius, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  private drawPlayer(ctx: CanvasRenderingContext2D, timestamp: number): void {
    const flicker = timestamp < this.invincibleUntil ? 0.25 + Math.abs(Math.sin(timestamp / 65)) * 0.75 : 1;

    ctx.save();
    ctx.translate(this.player.x, this.player.y);
    ctx.globalAlpha = flicker;

    const engineGlow = ctx.createRadialGradient(0, 18, 2, 0, 18, 28);
    engineGlow.addColorStop(0, 'rgba(106, 240, 222, 0.9)');
    engineGlow.addColorStop(1, 'rgba(106, 240, 222, 0)');
    ctx.fillStyle = engineGlow;
    ctx.beginPath();
    ctx.ellipse(0, 22, 16, 26, 0, 0, Math.PI * 2);
    ctx.fill();

    const body = ctx.createLinearGradient(0, -22, 0, 22);
    body.addColorStop(0, '#dff4ff');
    body.addColorStop(0.45, '#84a9ff');
    body.addColorStop(1, '#4960d4');
    ctx.fillStyle = body;

    ctx.beginPath();
    ctx.moveTo(0, -24);
    ctx.lineTo(18, 16);
    ctx.lineTo(8, 14);
    ctx.lineTo(0, 24);
    ctx.lineTo(-8, 14);
    ctx.lineTo(-18, 16);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = 'rgba(255,255,255,0.55)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#6af0de';
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  private drawStatusBar(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.fillStyle = 'rgba(4, 7, 14, 0.72)';
    ctx.fillRect(16, 16, 235, 54);

    ctx.strokeStyle = 'rgba(141, 181, 255, 0.22)';
    ctx.strokeRect(16, 16, 235, 54);

    ctx.fillStyle = '#dce8ff';
    ctx.font = '700 18px Inter, Arial, sans-serif';
    ctx.fillText(`Score  ${this.score()}`, 30, 39);
    ctx.fillText(`Lives  ${this.lives()}`, 30, 62);

    ctx.fillStyle = 'rgba(220, 232, 255, 0.7)';
    ctx.font = '600 15px Inter, Arial, sans-serif';
    ctx.fillText(`Difficulty  ${this.difficulty.toFixed(1)}x`, this.logicalWidth - 180, 39);
    ctx.fillText(`Best  ${this.highScore()}`, this.logicalWidth - 180, 62);
    ctx.restore();
  }

  private readHighScore(): number {
    if (typeof localStorage === 'undefined') {
      return 0;
    }

    const raw = localStorage.getItem('neon-dodge-high-score');
    const parsed = Number(raw ?? 0);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  private writeHighScore(score: number): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    localStorage.setItem('neon-dodge-high-score', String(score));
  }
}
