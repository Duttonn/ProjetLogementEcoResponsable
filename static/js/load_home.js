import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

let scene, camera, renderer, model;

function init() {
    const container = document.getElementById('three-container');

    // Crée la scène
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);

    // Caméra
    camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.set(0, 2, 5);

    // Lumières
    const light = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(light);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(5, 10, 7.5);
    scene.add(directionalLight);

    // Rendu
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    container.appendChild(renderer.domElement);

    // Charger le modèle GLTF
    const loader = new GLTFLoader();
    loader.load('/static/models/model.glb', (gltf) => {
        model = gltf.scene;
        scene.add(model);
        animate();
    });

    // Orbit Controls (rotation à la souris)
    const controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.rotateSpeed = 0.7;

    window.addEventListener('resize', onWindowResize, false);
}

// Animation continue pour faire tourner le modèle
function animate() {
    requestAnimationFrame(animate);

    if (model) {
        model.rotation.y += 0.01;  // Rotation continue
    }

    renderer.render(scene, camera);
}

// Gestion du redimensionnement
function onWindowResize() {
    const container = document.getElementById('three-container');
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
}

init();
