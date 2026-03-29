import React, { useRef, useMemo, useEffect } from 'react';
import * as THREE from 'three';

export default function NeuralNetwork() {
  const containerRef = useRef<HTMLDivElement>(null);
  const mouse = useRef({ x: 0, y: 0 });

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerRef.current.appendChild(renderer.domElement);

    const particleCount = 150;
    const particles = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const velocities = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 10;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 10;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 10;

      velocities[i * 3] = (Math.random() - 0.5) * 0.01;
      velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.01;
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.01;
    }

    particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.PointsMaterial({
      size: 0.05,
      color: '#3b82f6',
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
    });

    const points = new THREE.Points(particles, material);
    scene.add(points);

    // Lines
    const lineMaterial = new THREE.LineBasicMaterial({
      color: '#3b82f6',
      transparent: true,
      opacity: 0.2,
      blending: THREE.AdditiveBlending,
    });

    const lineGeometry = new THREE.BufferGeometry();
    const linePositions = new Float32Array(particleCount * particleCount * 6);
    lineGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
    const lines = new THREE.LineSegments(lineGeometry, lineMaterial);
    scene.add(lines);

    camera.position.z = 5;

    const handleMouseMove = (event: MouseEvent) => {
      mouse.current.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.current.y = -(event.clientY / window.innerHeight) * 2 + 1;
    };

    window.addEventListener('mousemove', handleMouseMove);

    const animate = () => {
      requestAnimationFrame(animate);

      const positions = particles.attributes.position.array as Float32Array;
      let lineIdx = 0;

      for (let i = 0; i < particleCount; i++) {
        positions[i * 3] += velocities[i * 3];
        positions[i * 3 + 1] += velocities[i * 3 + 1];
        positions[i * 3 + 2] += velocities[i * 3 + 2];

        // Boundary check
        if (Math.abs(positions[i * 3]) > 5) velocities[i * 3] *= -1;
        if (Math.abs(positions[i * 3 + 1]) > 5) velocities[i * 3 + 1] *= -1;
        if (Math.abs(positions[i * 3 + 2]) > 5) velocities[i * 3 + 2] *= -1;

        // Interaction with mouse
        const dx = positions[i * 3] - mouse.current.x * 2;
        const dy = positions[i * 3 + 1] - mouse.current.y * 2;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 1) {
          positions[i * 3] += dx * 0.01;
          positions[i * 3 + 1] += dy * 0.01;
        }

        // Connect lines
        for (let j = i + 1; j < particleCount; j++) {
          const dx = positions[i * 3] - positions[j * 3];
          const dy = positions[i * 3 + 1] - positions[j * 3 + 1];
          const dz = positions[i * 3 + 2] - positions[j * 3 + 2];
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

          if (dist < 1.5) {
            linePositions[lineIdx++] = positions[i * 3];
            linePositions[lineIdx++] = positions[i * 3 + 1];
            linePositions[lineIdx++] = positions[i * 3 + 2];
            linePositions[lineIdx++] = positions[j * 3];
            linePositions[lineIdx++] = positions[j * 3 + 1];
            linePositions[lineIdx++] = positions[j * 3 + 2];
          }
        }
      }

      particles.attributes.position.needsUpdate = true;
      lineGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions.slice(0, lineIdx), 3));
      
      points.rotation.y += 0.001;
      lines.rotation.y += 0.001;

      renderer.render(scene, camera);
    };

    animate();

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      containerRef.current?.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={containerRef} className="absolute inset-0 z-0 pointer-events-none opacity-40" />;
}
