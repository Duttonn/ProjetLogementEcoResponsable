import * as THREE from 'three';

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
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

import { BoxLineGeometry } from 'three/addons/geometries/BoxLineGeometry.js';
import { VRButton } from 'three/addons/webxr/VRButton.js';
import { XRControllerModelFactory } from 'three/addons/webxr/XRControllerModelFactory.js';

let camera, scene, raycaster, renderer;
let controller1, controller2;
let controllerGrip1, controllerGrip2;

let room, marker, floor, baseReferenceSpace;

let INTERSECTION;
const tempMatrix = new THREE.Matrix4();

init();

function init() {

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x505050);

    camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 1, 3);

    scene.add(new THREE.HemisphereLight(0xa5a5a5, 0x898989, 3));

    const light = new THREE.DirectionalLight(0xffffff, 3);
    light.position.set(1, 1, 1).normalize();
    scene.add(light);

    marker = new THREE.Mesh(
        new THREE.CircleGeometry(0.25, 32).rotateX(- Math.PI / 2),
        new THREE.MeshBasicMaterial({ color: 0xbcbcbc })
    );
    scene.add(marker);



    // Floor (Grass Texture)
    const floorSize = 50;
    const grassTexture = new THREE.TextureLoader().load('/static/textures/grass.jpg');
    grassTexture.wrapS = grassTexture.wrapT = THREE.RepeatWrapping;
    grassTexture.repeat.set(50, 50);
    
    const floorGeometry = new THREE.PlaneGeometry(floorSize, floorSize);
    const floorMaterial = new THREE.MeshStandardMaterial({ map: grassTexture });
    floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    scene.add(floor);

    raycaster = new THREE.Raycaster();

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setAnimationLoop(animate);

    renderer.xr.addEventListener('sessionstart', () => baseReferenceSpace = renderer.xr.getReferenceSpace());
    renderer.xr.enabled = true;

    document.body.appendChild(renderer.domElement);
    document.body.appendChild(VRButton.createButton(renderer));

    // controllers

    function onSelectStart() {

        this.userData.isSelecting = true;

    }

    function onSelectEnd() {

        this.userData.isSelecting = false;

        if (INTERSECTION) {

            const offsetPosition = { x: - INTERSECTION.x, y: - INTERSECTION.y, z: - INTERSECTION.z, w: 1 };
            const offsetRotation = new THREE.Quaternion();
            const transform = new XRRigidTransform(offsetPosition, offsetRotation);
            const teleportSpaceOffset = baseReferenceSpace.getOffsetReferenceSpace(transform);

            renderer.xr.setReferenceSpace(teleportSpaceOffset);

        }

    }

    controller1 = renderer.xr.getController(0);
    controller1.addEventListener('selectstart', onSelectStart);
    controller1.addEventListener('selectend', onSelectEnd);
    controller1.addEventListener('connected', function (event) {

        this.add(buildController(event.data));

    });
    controller1.addEventListener('disconnected', function () {

        this.remove(this.children[0]);

    });
    scene.add(controller1);

    controller2 = renderer.xr.getController(1);
    controller2.addEventListener('selectstart', onSelectStart);
    controller2.addEventListener('selectend', onSelectEnd);
    controller2.addEventListener('connected', function (event) {

        this.add(buildController(event.data));

    });
    controller2.addEventListener('disconnected', function () {

        this.remove(this.children[0]);

    });
    scene.add(controller2);

    // The XRControllerModelFactory will automatically fetch controller models
    // that match what the user is holding as closely as possible. The models
    // should be attached to the object returned from getControllerGrip in
    // order to match the orientation of the held device.

    const controllerModelFactory = new XRControllerModelFactory();

    controllerGrip1 = renderer.xr.getControllerGrip(0);
    controllerGrip1.add(controllerModelFactory.createControllerModel(controllerGrip1));
    scene.add(controllerGrip1);

    controllerGrip2 = renderer.xr.getControllerGrip(1);
    controllerGrip2.add(controllerModelFactory.createControllerModel(controllerGrip2));
    scene.add(controllerGrip2);

    //

    window.addEventListener('resize', onWindowResize, false);

}

function buildController(data) {

    let geometry, material;

    switch (data.targetRayMode) {

        case 'tracked-pointer':

            geometry = new THREE.BufferGeometry();
            geometry.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, - 1], 3));
            geometry.setAttribute('color', new THREE.Float32BufferAttribute([0.5, 0.5, 0.5, 0, 0, 0], 3));

            material = new THREE.LineBasicMaterial({ vertexColors: true, blending: THREE.AdditiveBlending });

            return new THREE.Line(geometry, material);

        case 'gaze':

            geometry = new THREE.RingGeometry(0.02, 0.04, 32).translate(0, 0, - 1);
            material = new THREE.MeshBasicMaterial({ opacity: 0.5, transparent: true });
            return new THREE.Mesh(geometry, material);

    }

}

function onWindowResize() {

    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);

}

//

function animate() {

    INTERSECTION = undefined;

    if (controller1.userData.isSelecting === true) {

        tempMatrix.identity().extractRotation(controller1.matrixWorld);

        raycaster.ray.origin.setFromMatrixPosition(controller1.matrixWorld);
        raycaster.ray.direction.set(0, 0, - 1).applyMatrix4(tempMatrix);

        const intersects = raycaster.intersectObjects([floor]);

        if (intersects.length > 0) {

            INTERSECTION = intersects[0].point;

        }

    } else if (controller2.userData.isSelecting === true) {

        tempMatrix.identity().extractRotation(controller2.matrixWorld);

        raycaster.ray.origin.setFromMatrixPosition(controller2.matrixWorld);
        raycaster.ray.direction.set(0, 0, - 1).applyMatrix4(tempMatrix);
        const obj = modelList
        obj.push(floor)
        const intersects = raycaster.intersectObjects(obj);

        if (intersects.length > 0) {

            INTERSECTION = intersects[0].point;

        }

    }

    if (INTERSECTION) marker.position.copy(INTERSECTION);
    marker.position.y += 0.1

    marker.visible = INTERSECTION !== undefined;

    renderer.render(scene, camera);
}


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


let modelList = []

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
                    //add all models to modelList
                    modelList.push(model);


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