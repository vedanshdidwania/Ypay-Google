import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

const FloatingUSDT: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    
    const size = 400;
    renderer.setSize(size, size);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerRef.current.appendChild(renderer.domElement);

    // Create Coin
    const geometry = new THREE.CylinderGeometry(2, 2, 0.3, 64);
    const material = new THREE.MeshStandardMaterial({ 
      color: 0x26A17B, // USDT Green
      metalness: 0.8,
      roughness: 0.2,
    });
    const coin = new THREE.Mesh(geometry, material);
    coin.rotation.x = Math.PI / 2;
    scene.add(coin);

    // Add USDT Symbol (Simplified as a T)
    const tGeometry = new THREE.BoxGeometry(0.5, 2.5, 0.1);
    const tMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const tBar = new THREE.Mesh(tGeometry, tMaterial);
    tBar.position.z = 0.2;
    coin.add(tBar);

    const tTopGeometry = new THREE.BoxGeometry(1.5, 0.5, 0.1);
    const tTop = new THREE.Mesh(tTopGeometry, tMaterial);
    tTop.position.y = 1;
    tTop.position.z = 0.2;
    coin.add(tTop);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffffff, 1);
    pointLight.position.set(5, 5, 5);
    scene.add(pointLight);

    const pointLight2 = new THREE.PointLight(0x26A17B, 2);
    pointLight2.position.set(-5, -5, 5);
    scene.add(pointLight2);

    camera.position.z = 5;

    const animate = () => {
      requestAnimationFrame(animate);
      coin.rotation.z += 0.01;
      coin.position.y = Math.sin(Date.now() * 0.002) * 0.2;
      renderer.render(scene, camera);
    };

    animate();

    return () => {
      if (containerRef.current) {
        containerRef.current.removeChild(renderer.domElement);
      }
      geometry.dispose();
      material.dispose();
      tGeometry.dispose();
      tTopGeometry.dispose();
      tMaterial.dispose();
    };
  }, []);

  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <div ref={containerRef} className="relative z-10" />
      <div className="absolute inset-0 bg-brand/20 blur-[100px] rounded-full scale-50" />
    </div>
  );
};

export default FloatingUSDT;
