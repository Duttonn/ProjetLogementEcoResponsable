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
    Clock,
    Box3,
    Vector3
} from 'three';
import { VRButton } from 'three/examples/jsm/webxr/VRButton.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

import {
    GLTFLoader
} from 'three/addons/loaders/GLTFLoader.js';

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

// Fetch and Create Room

async function fetchAndCreateRooms() {
    try {
        const response = await fetch(`/rooms/1`);  // Fetch rooms for housing ID 1
        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const rooms = JSON.parse(doc.querySelector('#rooms-data').textContent);

        const spacing = 0.2;  // Smaller spacing for finer adjustment
        const roomPositions = [];  // Track placed room positions

        const loader = new GLTFLoader();

        for (const room of rooms) {
            let modelSize = new Vector3(2, 2, 2);  // Default cube size

            if (room.gltf_model) {
                const gltfPath = `/static/models/${room.gltf_model.split('/').pop()}`;

                loader.load(gltfPath, (gltf) => {
                    const model = gltf.scene;

                    // Compute bounding box
                    const box = new Box3().setFromObject(model);
                    if (box.isEmpty()) {
                        model.traverse((child) => {
                            if (child.isMesh) {
                                child.geometry.computeBoundingBox();
                                child.geometry.boundingBox.applyMatrix4(child.matrixWorld);
                                box.union(child.geometry.boundingBox);
                            }
                        });
                    }

                    modelSize = box.getSize(new Vector3());

                    // Calculate the initial position for the model
                    const position = calculateRoomPosition(room, modelSize, roomPositions, spacing);
                    model.position.set(position.x, -box.min.y, position.z);

                    // Store the room's final position
                    roomPositions.push({ position, size: modelSize });

                    scene.add(model);
                });

            } else {
                // Place a default cube at room coordinates if no GLTF model exists
                const position = calculateRoomPosition(room, modelSize, roomPositions, spacing);
                addCube(position.x, position.y, position.z, roomPositions, modelSize);
            }
        }
    } catch (error) {
        console.error("Failed to fetch rooms:", error);
    }
}

// Calculate the room position with incremental shifts along the room vector
function calculateRoomPosition(room, modelSize, roomPositions, spacing) {
    let position = new Vector3(room.x * (modelSize.x + spacing), 0, room.y * (modelSize.z + spacing));

    // Generate shift vector based on room coordinates
    const shiftVector = new Vector3(room.x, 0, room.y).normalize().multiplyScalar(spacing);

    let collided = true;
    let maxIterations = 200;  // Safety limit to avoid infinite loops

    // Incrementally shift the cube along the room vector until no collision
    while (collided && maxIterations-- > 0) {
        collided = false;

        for (const placedRoom of roomPositions) {
            if (checkOverlap(position, modelSize, placedRoom.position, placedRoom.size, spacing)) {
                position.add(shiftVector);  // Incrementally move in the vector direction
                collided = true;
                break;
            }
        }
    }
    return position;
}

// Helper function to detect cube overlaps
function checkOverlap(pos1, size1, pos2, size2, spacing) {
    return (
        Math.abs(pos1.x - pos2.x) < (size1.x + size2.x) / 2 + spacing &&
        Math.abs(pos1.z - pos2.z) < (size1.z + size2.z) / 2 + spacing
    );
}

// Helper to create and position cubes if no model exists
function addCube(x, y, z, roomPositions, modelSize) {
    const geometry = new BoxGeometry(2, 2, 2);
    const material = new MeshBasicMaterial({ color: Math.random() * 0xffffff });
    const cube = new Mesh(geometry, material);
    cube.position.set(x, y + 1, z);
    scene.add(cube);
    roomPositions.push({ position: new Vector3(x, y, z), size: modelSize });
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

// Load Data on Initialization
// loadData();
fetchAndCreateRooms();

export { loadData };