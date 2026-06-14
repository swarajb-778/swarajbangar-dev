'use client';

import { useEffect, useRef } from 'react';

/**
 * ParticleField — the Three.js point cloud behind the landing hero.
 * Ported from templates/landing/landing.js. Guards: skipped entirely
 * under prefers-reduced-motion, fewer points on mobile, pauses when the
 * tab is hidden, and fades out as the page scrolls past the hero.
 */
export function ParticleField() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    let disposed = false;
    let raf = 0;
    let cleanup = () => {};

    void (async () => {
      const THREE = await import('three');
      if (disposed) return;

      const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100);
      camera.position.z = 10;

      const isMobile = window.innerWidth < 720;
      const N = isMobile ? 350 : 900;
      const pos = new Float32Array(N * 3);
      const col = new Float32Array(N * 3);
      const purple = new THREE.Color('#6C5CE7');
      const teal = new THREE.Color('#00CEC9');
      const dim = new THREE.Color('#3A3A55');
      for (let i = 0; i < N; i++) {
        pos[i * 3] = (Math.random() - 0.5) * 26;
        pos[i * 3 + 1] = (Math.random() - 0.5) * 16;
        pos[i * 3 + 2] = (Math.random() - 0.5) * 12;
        const r = Math.random();
        const c = r < 0.12 ? teal : r < 0.34 ? purple : dim;
        col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
      const mat = new THREE.PointsMaterial({
        size: 0.05, vertexColors: true, transparent: true, opacity: 0.85,
        blending: THREE.AdditiveBlending, depthWrite: false,
      });
      const points = new THREE.Points(geo, mat);
      scene.add(points);

      let mx = 0, my = 0, tx = 0, ty = 0;
      const onPointer = (e: PointerEvent) => {
        tx = (e.clientX / window.innerWidth - 0.5) * 0.6;
        ty = (e.clientY / window.innerHeight - 0.5) * 0.4;
      };
      window.addEventListener('pointermove', onPointer, { passive: true });

      const resize = () => {
        const w = window.innerWidth, h = window.innerHeight;
        renderer.setSize(w, h, false);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      };
      resize();
      window.addEventListener('resize', resize);

      let scrollFade = 1;
      const onScroll = () => {
        scrollFade = Math.max(0.25, 1 - window.scrollY / (window.innerHeight * 1.6));
      };
      window.addEventListener('scroll', onScroll, { passive: true });

      let running = true;
      const onVis = () => { running = !document.hidden; };
      document.addEventListener('visibilitychange', onVis);

      const clock = new THREE.Clock();
      const tick = () => {
        raf = requestAnimationFrame(tick);
        if (!running) return;
        const t = clock.getElapsedTime();
        mx += (tx - mx) * 0.04; my += (ty - my) * 0.04;
        points.rotation.y = t * 0.018 + mx * 0.5;
        points.rotation.x = Math.sin(t * 0.05) * 0.04 + my * 0.4;
        mat.opacity = 0.85 * scrollFade;
        renderer.render(scene, camera);
      };
      tick();

      cleanup = () => {
        cancelAnimationFrame(raf);
        window.removeEventListener('pointermove', onPointer);
        window.removeEventListener('resize', resize);
        window.removeEventListener('scroll', onScroll);
        document.removeEventListener('visibilitychange', onVis);
        geo.dispose();
        mat.dispose();
        renderer.dispose();
      };
    })();

    return () => { disposed = true; cleanup(); };
  }, []);

  return <canvas id="bg3d" ref={canvasRef} aria-hidden="true" />;
}
