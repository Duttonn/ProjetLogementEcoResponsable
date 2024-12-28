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
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

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
// Room Dictionary to track positions and sizes
const roomDictionary = {};

// Fetch and Create Room
async function fetchAndCreateRooms() {
    try {
        const response = await fetch(`/rooms/1`);  // Fetch rooms for housing ID 1
        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const rooms = JSON.parse(doc.querySelector('#rooms-data').textContent);

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
                
                    // Calculate model position
                    const position = calculateRoomPosition(room, modelSize);
                
                    // Align model to the ground or upper floor by adjusting bounding box
                    model.position.set(
                        position.x,
                        position.y - box.min.y,  // Ensure model sits on the floor
                        position.z
                    );
                
                    console.log("Added GLTF at:", model.position);
                
                    // Store room details in the dictionary
                    const key = `${room.x},${room.y},${room.z}`;
                    roomDictionary[key] = {
                        position: position,
                        size: modelSize,
                        relative: new Vector3(room.x, room.y, room.z)
                    };

                    scene.add(model);
                });

            } else {
                // Place a default cube at room coordinates if no GLTF model exists
                const position = calculateRoomPosition(room, modelSize);
                addCube(position.x, position.y, position.z, modelSize);
            }
        }
    } catch (error) {
        console.error("Failed to fetch rooms:", error);
    }
}

// Calculate Room Position using relative coordinate dictionary
function calculateRoomPosition(room, modelSize) {
    const relativeKey = `${room.x},${room.y},${room.z}`;

    // If this is the first room, place it at origin
    if (room.x === 0 && room.y === 0 && room.z === 0) {
        return new Vector3(0, 0, 0);
    }

    // Try to find adjacent rooms
    let referenceRoom = null;

    const directions = [
        [1, 0, 0], [-1, 0, 0],  // X-direction neighbors
        [0, 1, 0], [0, -1, 0],  // Y-direction (depth) neighbors
        [0, 0, 1], [0, 0, -1]   // Z-direction (height) neighbors
    ];

    for (const [dx, dy, dz] of directions) {
        const adjacentKey = `${room.x - dx},${room.y - dy},${room.z - dz}`;
        if (roomDictionary[adjacentKey]) {
            referenceRoom = roomDictionary[adjacentKey];
            break;
        }
    }

    if (referenceRoom) {
        const offsetX = (referenceRoom.size.x + modelSize.x) / 2;
        const offsetZ = (referenceRoom.size.z + modelSize.z) / 2;
        const offsetY = (referenceRoom.size.y + modelSize.y) / 2;

        return new Vector3(
            referenceRoom.position.x + offsetX * (room.x - referenceRoom.relative.x),
            room.z * modelSize.y,  // Stack vertically by floor
            referenceRoom.position.z + offsetZ * (room.y - referenceRoom.relative.y)
        );
    }

    return new Vector3(0, 0, 0);  // Fallback to origin if no adjacent room
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