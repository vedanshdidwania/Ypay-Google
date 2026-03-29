import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

const CryptoCoin: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    
    const size = 300;
    renderer.setSize(size, size);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    containerRef.current.appendChild(renderer.domElement);

    // Create a coin group to hold everything
    const coinGroup = new THREE.Group();
    scene.add(coinGroup);

    // Create a coin geometry
    const geometry = new THREE.CylinderGeometry(1, 1, 0.2, 64);
    
    // Create materials
    const material = new THREE.MeshStandardMaterial({
      color: 0x0066FF, // Brand blue
      metalness: 0.9,
      roughness: 0.1,
      emissive: 0x0033FF,
      emissiveIntensity: 0.2,
    });

    const coin = new THREE.Mesh(geometry, material);
    coin.rotation.x = Math.PI / 2;
    coinGroup.add(coin);

    // Add a "rim" to the coin
    const rimGeometry = new THREE.TorusGeometry(1, 0.05, 16, 100);
    const rimMaterial = new THREE.MeshStandardMaterial({
      color: 0xFFFFFF,
      metalness: 1,
      roughness: 0,
    });
    const rim = new THREE.Mesh(rimGeometry, rimMaterial);
    rim.rotation.x = Math.PI / 2;
    coinGroup.add(rim);

    // Add lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
    scene.add(ambientLight);

    const pointLight1 = new THREE.PointLight(0x0066FF, 2);
    pointLight1.position.set(5, 5, 5);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0xffffff, 1);
    pointLight2.position.set(-5, -5, 2);
    scene.add(pointLight2);

    camera.position.z = 2.5;

    let time = 0;
    const animate = () => {
      requestAnimationFrame(animate);
      time += 0.01;
      
      coinGroup.rotation.y += 0.01;
      coinGroup.position.y = Math.sin(time) * 0.1; // Floating effect
      
      renderer.render(scene, camera);
    };

    animate();

    return () => {
      if (containerRef.current) {
        containerRef.current.removeChild(renderer.domElement);
      }
      geometry.dispose();
      material.dispose();
    };
  }, []);

  return <div ref={containerRef} className="w-[300px] h-[300px] flex items-center justify-center" />;
};

export default CryptoCoin;
