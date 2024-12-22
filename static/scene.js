import * as THREE from '/node_modules/three/build/three.module.js';
import { VRButton } from '/node_modules/three/examples/jsm/webxr/VRButton.js';

export function createThreeJSSceneWithHousings(housings) {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x505050);

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10);
    camera.position.set(0, 1.6, 3);  // User height at ~1.6m

    const renderer = new THREE.WebGLRenderer({ antialias: true, canvas: document.getElementById('device-canvas') });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;

    // VR Button for entering XR mode
    document.body.appendChild(VRButton.createButton(renderer));

    // Add ambient lighting
    const light = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
    scene.add(light);

    // --- Grass Floor (Minecraft Style) ---
    const floorSize = 50;  // Large enough to cover surroundings
    const grassTexture = new THREE.TextureLoader().load('/static/textures/grass.jpg');  // Grass texture
    grassTexture.wrapS = grassTexture.wrapT = THREE.RepeatWrapping;
    grassTexture.repeat.set(50, 50);  // Tile the texture across the plane

    const floorGeometry = new THREE.PlaneGeometry(floorSize, floorSize);
    const floorMaterial = new THREE.MeshStandardMaterial({ map: grassTexture });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);

    floor.rotation.x = -Math.PI / 2;  // Lay flat
    floor.position.y = 0;  // Align with feet
    scene.add(floor);

    // --- Create a Cube for Each Housing ---
    housings.forEach((housing, index) => {
        const geometry = new THREE.BoxGeometry(1, 1, 1);
        const material = new THREE.MeshBasicMaterial({ color: Math.random() * 0xffffff });
        const cube = new THREE.Mesh(geometry, material);
        
        // Position cubes evenly along X-axis
        cube.position.set(index * 2 - housings.length, 0.5, -4);
        cube.userData = { address: housing.address };
        
        scene.add(cube);
    });

    // Animation loop (rotate cubes)
    renderer.setAnimationLoop(() => {
        scene.children.forEach((child) => {
            if (child.isMesh && child.geometry.type === 'BoxGeometry') {
                child.rotation.y += 0.01;
            }
        });
        renderer.render(scene, camera);
    });

    // Handle window resizing
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}
