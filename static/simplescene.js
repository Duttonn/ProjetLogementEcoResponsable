import * as THREE from '/node_modules/three/build/three.module.js';
import { VRButton } from '/node_modules/three/examples/jsm/webxr/VRButton.js';

export function createSimpleScene() {
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x505050);

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 10);
    camera.position.set(0, 1.6, 3);

    const renderer = new THREE.WebGLRenderer({ antialias: true, canvas: document.getElementById('device-canvas') });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.xr.enabled = true;
    
    // Add VR button
    document.body.appendChild(VRButton.createButton(renderer));

    // Simple cube
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    const cube = new THREE.Mesh(geometry, material);
    cube.position.set(0, 1, -3);
    scene.add(cube);

    const light = new THREE.HemisphereLight(0xffffff, 0x444444, 1);
    scene.add(light);

    renderer.setAnimationLoop(() => {
        cube.rotation.x += 0.01;
        cube.rotation.y += 0.01;
        renderer.render(scene, camera);
    });

    // Handle resizing
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}
