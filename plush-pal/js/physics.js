// Matter.js world: floor/walls, props, collision routing. Soft plush lives in plush.js.
import { G } from './game.js';
const { Engine, Composite, Bodies, Body, Events, Vector } = Matter;
export const CAT = { WORLD: 1, PLUSH: 2, PROP: 4 };

export const P = {
  engine: null, world: null, W: 520, props: [], statics: [], floor: null, walls: [], room: null,
  init() {
    this.engine = Engine.create({ positionIterations: 6, velocityIterations: 4, constraintIterations: 3 });
    this.world = this.engine.world; this.engine.gravity.y = 1.0; this.engine.gravity.scale = 0.0011;
    this.setBounds(520);
    Events.on(this.engine, 'collisionStart', e => this.collide(e, 'start'));
    Events.on(this.engine, 'collisionActive', e => this.collide(e, 'active'));
  },
  setBounds(W) {
    this.W = W;
    [this.floor, ...this.walls].forEach(b => b && Composite.remove(this.world, b));
    this.floor = Bodies.rectangle(0, 150, 60000, 300, { isStatic: true, friction: 0.9, restitution: 0.1, label: 'floor' });
    const L = Bodies.rectangle(-W / 2 - 100, -4000, 200, 12000, { isStatic: true, label: 'wall', restitution: 0.4 });
    const Rr = Bodies.rectangle(W / 2 + 100, -4000, 200, 12000, { isStatic: true, label: 'wall', restitution: 0.4 });
    this.walls = [L, Rr]; Composite.add(this.world, [this.floor, L, Rr]);
  },
  applyRoom(room) {
    this.room = room; const p = room.phys;
    this.engine.gravity.y = p.g; this.floor.friction = p.floorFriction; this.floor.restitution = p.bounce;
    if (G.plush) G.plush.setAir(p.air);
  },
  addProp(o) {
    const base = { friction: o.friction ?? 0.5, restitution: o.restitution ?? 0.3, density: o.density ?? 0.002, frictionAir: o.frictionAir ?? 0.01, isSensor: !!o.sensor, isStatic: !!o.static, angle: o.a || 0, label: o.tag || 'prop' };
    const body = o.shape === 'rect' ? Bodies.rectangle(o.x, o.y, o.w, o.h, base) : Bodies.circle(o.x, o.y, o.r, base);
    if (o.noPlush) body.collisionFilter = { group: 0, category: CAT.PROP, mask: CAT.WORLD };
    if (o.vx || o.vy) Body.setVelocity(body, { x: o.vx || 0, y: o.vy || 0 });
    if (o.av) Body.setAngularVelocity(body, o.av);
    const prop = Object.assign({ ttl: 25, age: 0, size: o.r ? o.r * 2 : Math.max(o.w, o.h) }, o, { body });
    body.prop = prop; this.props.push(prop); Composite.add(this.world, body); return prop;
  },
  removeProp(p) { Composite.remove(this.world, p.body); const i = this.props.indexOf(p); if (i >= 0) this.props.splice(i, 1); },
  clearProps() { [...this.props].forEach(p => !p.keep && this.removeProp(p)); },
  addStatic(body) { this.statics.push(body); Composite.add(this.world, body); return body; },
  removeStatic(body) { Composite.remove(this.world, body); const i = this.statics.indexOf(body); if (i >= 0) this.statics.splice(i, 1); },
  updateProps(dt) {
    for (const p of [...this.props]) {
      p.age += dt; const b = p.body;
      if (p.update) p.update(p, dt);
      if ((p.ttl && p.age > p.ttl) || b.position.y > 2500 || Math.abs(b.position.x) > 4000 || p.dead) {
        if (p.onExpire) p.onExpire(p); this.removeProp(p);
      }
    }
  },
  collide(e, phase) {
    for (const pr of e.pairs) {
      const a = pr.bodyA, b = pr.bodyB;
      if (a.device || b.device) { G.contraptions && G.contraptions.onCollide(a.device ? a : b, a.device ? b : a, pr, phase); }
      if (phase !== 'start') continue;
      const rel = Vector.magnitude(Vector.sub(a.velocity, b.velocity));
      const na = a.plushNode, nb = b.plushNode;
      if ((na || nb) && !(na && nb)) { G.onPlushHit && G.onPlushHit(na ? a : b, na ? b : a, rel, pr); }
      else if (!na && !nb) { const pa = a.prop, pb = b.prop; if (pa && pa.onHit) pa.onHit(pa, b, rel); if (pb && pb.onHit) pb.onHit(pb, a, rel); }
    }
  },
  step(ms) { Engine.update(this.engine, ms); },
};
