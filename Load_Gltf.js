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


let offsetStep = new Vector3(0, 0, 0);;

// Fetch and Create Room
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
                
                    // Calculate model position
                
                    // Align model to the ground or upper floor by adjusting bounding box
                    model.position.set(
                        room.x,
                        room.y ,  // Ensure model sits on the floor
                        room.z
                    );
                
                    console.log("Added GLTF at:", model.position);
                

                    scene.add(model);
                });

            } else {
                // Place a default cube at room coordinates if no GLTF model exists
                addCube(room.x, room.y, room.z);
            }
        }
    } catch (error) {
        console.error("Failed to fetch rooms:", error);
    }
}





// Helper to create and position cubes if no model exists
function addCube(x, y, z) {
    const geometry = new BoxGeometry(2, 2, 2);
    const material = new MeshBasicMaterial({ color: Math.random() * 0xffffff });
    const cube = new Mesh(geometry, material);
    cube.position.set(x, y + 1, z);
    scene.add(cube);
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

async function fetchLogementsAndCreateRooms() {
    try {
        const response = await fetch('/logements');
        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const logements = JSON.parse(doc.querySelector('#housing-data').textContent);
        console.log("housing number", logements.length);
        for (const logement of logements) {
            await fetchAndCreateRooms(logement.housing_id);            
               }
    } catch (error) {
        console.error("Failed to fetch logements:", error);
    }
}

fetchLogementsAndCreateRooms();

export { loadData };