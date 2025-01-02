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
} from 'https://cdn.skypack.dev/three@0.129.0/build/three.module.js';
import { OrbitControls } from 'https://cdn.skypack.dev/three@0.129.0/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'https://cdn.skypack.dev/three@0.129.0/examples/jsm/loaders/GLTFLoader.js';

const scene = new Scene();
const camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 5, 15);

const renderer = new WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.getElementById("container3D").appendChild(renderer.domElement);

const light = new HemisphereLight(0xffffff, 0x444444, 1);
scene.add(light);

const controls = new OrbitControls(camera, renderer.domElement);
controls.listenToKeyEvents(window);

const floorSize = 50;
const grassTexture = new TextureLoader().load('/static/textures/grass.jpg');
grassTexture.wrapS = grassTexture.wrapT = RepeatWrapping;
grassTexture.repeat.set(50, 50);

const floorGeometry = new PlaneGeometry(floorSize, floorSize);
const floorMaterial = new MeshStandardMaterial({ map: grassTexture });
const floor = new Mesh(floorGeometry, floorMaterial);
floor.rotation.x = -Math.PI / 2;
scene.add(floor);

const roomDictionary = {};
let housingOffset = new Vector3(0, 0, 0);

async function fetchAndCreateRooms(housingId) {
    try {
        const response = await fetch(`/floormap/${housingId}`);
        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const roomsDataElement = doc.querySelector('#rooms-data');
        
        if (!roomsDataElement) {
            console.error("No rooms data found.");
            return;
        }
        
        const rooms = JSON.parse(roomsDataElement.textContent);

        const loader = new GLTFLoader();

        for (const room of rooms) {
            let modelSize = new Vector3(2, 2, 2);

            if (room.gltf_model) {
                const gltfPath = `/static/models/${room.gltf_model.split('/').pop()}`;

                loader.load(gltfPath, (gltf) => {
                    const model = gltf.scene;
                    const box = new Box3().setFromObject(model);
                    modelSize = box.getSize(new Vector3());
                    const position = new Vector3(room.x, 0, room.z).add(housingOffset);
                    model.position.set(position.x, position.y - box.min.y, position.z);
                    scene.add(model);
                });
            }
        }
    } catch (error) {
        console.error("Failed to fetch rooms:", error);
    }
}

fetchAndCreateRooms({{ selected_id }});

const clock = new Clock();
renderer.setAnimationLoop(() => {
    const delta = clock.getDelta();
    renderer.render(scene, camera);
});

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});