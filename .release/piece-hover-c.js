// PC hover C: four-segment floor ring; approved preview opacity x 0.70.
// Presentation only: never changes selection, rules, hidden identities or network state.
const PieceHoverC = (() => {
  const OPACITY_SCALE = 0.70;
  function create({ core = Core, board = Board, enabled = () => true } = {}) {
    const canvas = core.renderer.domElement, group = new THREE.Group();
    group.name = 'piece-hover-c'; group.visible = false; board.root.add(group);
    const geometries = [], materials = [], gap = 17 * Math.PI / 180, radius = 0.507;
    function arcs(width, color, y, order) {
      const material = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0,
        depthWrite: false, depthTest: true, toneMapped: false, side: THREE.DoubleSide,
        polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
      materials.push(material);
      for (let i = 0; i < 4; i++) {
        const geometry = new THREE.RingGeometry(radius - width / 2, radius + width / 2,
          24, 1, i * Math.PI / 2 + gap / 2, Math.PI / 2 - gap);
        geometries.push(geometry);
        const mesh = new THREE.Mesh(geometry, material);
        mesh.rotation.x = -Math.PI / 2; mesh.position.y = y; mesh.renderOrder = order;
        mesh.raycast = () => {}; group.add(mesh);
      }
    }
    arcs(0.054, 0x493722, 0, 12);
    arcs(0.029, 0xfff1d4, 0.0007, 13);
    const reduce = matchMedia('(prefers-reduced-motion: reduce)');
    const pointer = { active: false, x: 0, y: 0 }, listeners = [];
    let target = null, opacity = 0, disposed = false, last = performance.now();
    function listen(obj, name, fn, options) {
      obj.addEventListener(name, fn, options);
      listeners.push(() => obj.removeEventListener(name, fn, options));
    }
    function clear(immediate = false) {
      pointer.active = false; target = null;
      if (immediate) { opacity = 0; group.visible = false; materials.forEach(m => { m.opacity = 0; }); }
    }
    listen(canvas, 'pointermove', e => {
      if (e.pointerType !== 'mouse' || e.buttons) { clear(true); return; }
      pointer.x = e.clientX; pointer.y = e.clientY; pointer.active = true; core.poke(180);
    }, { passive: true });
    listen(canvas, 'pointerleave', () => clear(), { passive: true });
    listen(document, 'pointerdown', () => clear(true), { capture: true, passive: true });
    listen(document, 'pointercancel', () => clear(true), { capture: true, passive: true });
    listen(canvas, 'wheel', () => clear(true), { passive: true });
    listen(window, 'blur', () => clear(true));
    listen(window, 'resize', () => clear(true));
    listen(document, 'visibilitychange', () => { if (document.hidden) clear(true); });
    const offFrame = core.onFrame(() => {
      if (disposed) return;
      const now = performance.now(), dt = Math.min((now - last) / 1000, 0.25); last = now;
      if (!pointer.active && opacity === 0) return;
      if (!enabled() || core.Cam.cine || document.hidden || !board.root.visible) { clear(true); return; }
      let hit = null;
      if (pointer.active && document.elementFromPoint(pointer.x, pointer.y) === canvas) {
        const q = board.pick(pointer.x, pointer.y), m = q && board.meshAt(q[0], q[1]);
        if (m && m.visible && m.parent && board.pieces.get(m.userData.id) === m)
          hit = { id: m.userData.id, f: q[0], r: q[1], mesh: m };
      }
      if (hit && (!target || hit.mesh !== target.mesh || hit.f !== target.f || hit.r !== target.r)) {
        opacity = 0; group.position.set(board.X(hit.f), board.TOP + 0.019, board.Z(hit.r));
      }
      target = hit;
      opacity = reduce.matches ? (target ? 1 : 0) : target ? Math.min(1, opacity + dt / 0.12) : Math.max(0, opacity - dt / 0.09);
      group.visible = opacity > 0;
      if (!group.visible) { materials.forEach(m => { m.opacity = 0; }); return; }
      const scale = reduce.matches ? 1 : 0.94 + 0.06 * (1 - Math.pow(1 - opacity, 3));
      group.scale.set(scale, 1, scale);
      materials[0].opacity = 0.62 * OPACITY_SCALE * opacity;
      materials[1].opacity = 0.98 * OPACITY_SCALE * opacity;
    });
    return {
      clear,
      get state() { return { target: target ? { id: target.id, f: target.f, r: target.r } : null,
        opacity, visible: group.visible, layerOpacity: materials.map(m => m.opacity) }; },
      dispose() {
        if (disposed) return; disposed = true; clear(true); offFrame(); listeners.forEach(fn => fn());
        group.removeFromParent(); geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose());
      },
    };
  }
  return { create };
})();
// Loaded after main.js. Uses existing read-only diagnostics for lifecycle gating.
if (typeof window !== 'undefined' && window.__xq && !window.__xq.pieceHoverC) {
  window.__xq.pieceHoverC = PieceHoverC.create({ enabled: () => {
    const xq = window.__xq, lobby = document.getElementById('lobby');
    return !!xq && xq.started && !xq.busy && !Core.Time.hold && !!xq.game && !xq.game.result
      && !xq.Ending.running && !(xq.RP && (xq.RP.playing || xq.RP.busy))
      && !document.querySelector('.modal:not(.hidden)') && !!lobby && lobby.classList.contains('hidden');
  } });
}
