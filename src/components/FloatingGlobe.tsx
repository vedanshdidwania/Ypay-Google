import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

const FloatingGlobe: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    
    const resize = () => {
      const width = containerRef.current?.clientWidth || 300;
      const height = containerRef.current?.clientHeight || 300;
      renderer.setSize(width, height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };

    window.addEventListener('resize', resize);
    resize();
    containerRef.current.appendChild(renderer.domElement);

    // Create a globe
    const geometry = new THREE.SphereGeometry(1, 64, 64);
    const material = new THREE.MeshStandardMaterial({
      color: 0x0066FF,
      metalness: 0.5,
      roughness: 0.5,
      wireframe: true,
      emissive: 0x0033FF,
      emissiveIntensity: 0.5,
    });

    const globe = new THREE.Mesh(geometry, material);
    scene.add(globe);

    // Add some "points" on the globe
    const pointsGeometry = new THREE.BufferGeometry();
    const pointsCount = 500;
    const positions = new Float32Array(pointsCount * 3);
    for (let i = 0; i < pointsCount; i++) {
      const phi = Math.acos(-1 + (2 * i) / pointsCount);
      const theta = Math.sqrt(pointsCount * Math.PI) * phi;
      positions[i * 3] = Math.cos(theta) * Math.sin(phi) * 1.05;
      positions[i * 3 + 1] = Math.sin(theta) * Math.sin(phi) * 1.05;
      positions[i * 3 + 2] = Math.cos(phi) * 1.05;
    }
    pointsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const pointsMaterial = new THREE.PointsMaterial({
      color: 0xFFFFFF,
      size: 0.02,
      transparent: true,
      opacity: 0.8,
    });
    const points = new THREE.Points(pointsGeometry, pointsMaterial);
    globe.add(points);

    // Add lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0x0066FF, 2);
    pointLight.position.set(5, 5, 5);
    scene.add(pointLight);

    camera.position.z = 2.5;

    const animate = () => {
      requestAnimationFrame(animate);
      globe.rotation.y += 0.002;
      globe.rotation.x += 0.001;
      renderer.render(scene, camera);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resize);
      if (containerRef.current) {
        containerRef.current.removeChild(renderer.domElement);
      }
      geometry.dispose();
      material.dispose();
      pointsGeometry.dispose();
      pointsMaterial.dispose();
    };
  }, []);

  return <div ref={containerRef} className="w-full h-full min-h-[300px]" />;
};

export default FloatingGlobe;
