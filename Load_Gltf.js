"use strict";

import {
    PerspectiveCamera,
    Scene,
    WebGLRenderer,
    BoxGeometry,
    Mesh,
    MeshBasicMaterial,
    MeshStandardMaterial,
    HemisphereLight,
    PlaneGeometry,
    TextureLoader,
    RepeatWrapping,
    DirectionalLight,
    Clock,
    Vector3,
    Raycaster,
    CylinderGeometry,
    Color
} from 'three';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { XRControllerModelFactory } from 'three/examples/jsm/webxr/XRControllerModelFactory.js';

// Scene and renderer setup
const scene = new Scene();
const aspect = window.innerWidth / window.innerHeight;
const camera = new PerspectiveCamera(75, aspect, 0.1, 1000);
camera.position.set(0, 5, 15);

const renderer = new WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.xr.enabled = true;
document.body.appendChild(renderer.domElement);
document.body.appendChild(VRButton.createButton(renderer));

// Lighting
const light = new HemisphereLight(0xffffff, 0x444444, 1);
scene.add(light);

const directionalLight = new DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(50, 100, 50);
scene.add(directionalLight);

// Orbit Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.listenToKeyEvents(window);

// Floor (Grass Texture)
const floorSize = 50;
const grassTexture = new TextureLoader().load('/static/textures/grass.jpg');
grassTexture.wrapS = grassTexture.wrapT = RepeatWrapping;
grassTexture.repeat.set(50, 50);

const floorGeometry = new PlaneGeometry(floorSize, floorSize);
const floorMaterial = new MeshStandardMaterial({ map: grassTexture });
const floor = new Mesh(floorGeometry, floorMaterial);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

// Teleportation Setup
const raycaster = new Raycaster();
let teleportMarker;
const teleportMarkers = [];

// Create teleport marker
function createTeleportMarker(position) {
    const geometry = new CylinderGeometry(0.3, 0.3, 0.1, 32);
    const material = new MeshBasicMaterial({ color: new Color(0x00ff00) });
    teleportMarker = new Mesh(geometry, material);
    teleportMarker.position.copy(position);
    scene.add(teleportMarker);
    teleportMarkers.push(teleportMarker);
}

// Add teleportation points
createTeleportMarker(new Vector3(0, 0.1, -5));
createTeleportMarker(new Vector3(5, 0.1, -10));
createTeleportMarker(new Vector3(-5, 0.1, -10));

// Controller Setup
const controller1 = renderer.xr.getController(0);
const controller2 = renderer.xr.getController(1);
scene.add(controller1);
scene.add(controller2);

// Teleportation Logic
function teleport(target) {
    if (target) {
        camera.position.set(target.x, camera.position.y, target.z);
    }
}

controller1.addEventListener('selectstart', () => {
    raycaster.setFromCamera(new Vector3(0, 0, -1), camera);
    const intersects = raycaster.intersectObjects(teleportMarkers);
    if (intersects.length > 0) {
        teleport(intersects[0].point);
    }
});

controller2.addEventListener('selectstart', () => {
    raycaster.setFromCamera(new Vector3(0, 0, -1), camera);
    const intersects = raycaster.intersectObjects(teleportMarkers);
    if (intersects.length > 0) {
        teleport(intersects[0].point);
    }
});

// GLTF Model Loading
async function fetchAndCreateRooms(housingId) {
    try {
        const response = await fetch(`/rooms/${housingId}`);
        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const rooms = JSON.parse(doc.querySelector('#rooms-data').textContent);

        const loader = new GLTFLoader();

        for (const room of rooms) {
            if (room.gltf_model) {
                const gltfPath = `/static/models/${room.gltf_model.split('/').pop()}`;
                loader.load(gltfPath, (gltf) => {
                    const model = gltf.scene;
                    model.position.set(room.x, room.y, room.z);
                    scene.add(model);
                });
            }
        }
    } catch (error) {
        console.error("Failed to fetch rooms:", error);
    }
}

// Animation Loop
const clock = new Clock();
renderer.setAnimationLoop(() => {
    const delta = clock.getDelta();
    renderer.render(scene, camera);
});

// Handle Window Resize
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

async function fetchLogementsAndCreateRooms() {
    try {
        const response = await fetch('/logements');
        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const logements = JSON.parse(doc.querySelector('#housing-data').textContent);
        for (const logement of logements) {
            await fetchAndCreateRooms(logement.housing_id);
        }
    } catch (error) {
        console.error("Failed to fetch logements:", error);
    }
}

// GLTF Loader (Optional for House Model)
function loadData() {
    // Load 3D house model
    new GLTFLoader()
        .setPath('assets/models/')
        .load('house_model.glb', (gltf) => {
            const model = gltf.scene;
            model.position.set(0, 0, 0);
            scene.add(model);
        });
}

fetchLogementsAndCreateRooms();

export { loadData };
