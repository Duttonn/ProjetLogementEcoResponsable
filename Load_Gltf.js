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
let controllerLeft, controllerRight;
let controllerGrip1, controllerGrip2;

let room, marker, floor, baseReferenceSpace;

let lastIntersectionData = {
    roomId: null,
    housingId: null,
    intersectPoint: null,
    normal: null
};



let INTERSECTION;
let normal;
const tempMatrix = new THREE.Matrix4();

const loader = new GLTFLoader();


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

    function onSelectStartSensor() {

        this.userData.isPlacingSensor = true;

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






    function onSelectEndSensor() {
        this.userData.isPlacingSensor = false;
    
        if (lastIntersectionData.intersectPoint) {
            const intersectPoint = lastIntersectionData.intersectPoint;
            const intersectNormal = lastIntersectionData.normal;
            const intersectedRoomId = lastIntersectionData.roomId || -1;
    
            const gltfPath = `/static/models/sensor.glb`;
    
            loader.load(gltfPath, (gltf) => {
                const model = gltf.scene;
    
                model.scale.set(0.01, 0.01, 0.01);
                model.position.copy(intersectPoint);
    
                const quaternion = new THREE.Quaternion();
                quaternion.setFromUnitVectors(new Vector3(0, 1, 0), intersectNormal);
                model.quaternion.copy(quaternion);
    
                scene.add(model);
                console.log(`Added sensor at: ${model.position.toArray()}, Room ID: ${intersectedRoomId}`);
    
                // POST request to backend
                const sensorData = {
                    room_id: intersectedRoomId,
                    type_id: 1,  // temp sensor
                    commercial_reference: Math.floor(Math.random() * 100000).toString(),
                    communication_port: "default_port",
                    x_coordinate: intersectPoint.x || 0,
                    y_coordinate: intersectPoint.y || 0,
                    z_coordinate: intersectPoint.z || 0
                };
    
                fetch("/sensors", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(sensorData)
                })
                .then(response => {
                    if (response.ok) {
                        console.log("Sensor added successfully.");
                    } else {
                        console.error("Failed to add sensor.");
                    }
                })
                .catch(error => {
                    console.error("Error posting sensor:", error);
                });
    
                // Reset intersection data
                lastIntersectionData = {
                    roomId: null,
                    housingId: null,
                    intersectPoint: null,
                    normal: null
                };
            });
        } else {
            console.error("No valid intersection data for sensor placement.");
        }
    }
    



    controllerLeft = renderer.xr.getController(0);
    controllerLeft.addEventListener('selectstart', onSelectStartSensor);
    controllerLeft.addEventListener('selectend', onSelectEndSensor);
    controllerLeft.addEventListener('connected', function (event) {

        this.add(buildController(event.data));

    });
    controllerLeft.addEventListener('disconnected', function () {

        this.remove(this.children[0]);

    });
    scene.add(controllerLeft);

    controllerRight = renderer.xr.getController(1);
    controllerRight.addEventListener('selectstart', onSelectStart);
    controllerRight.addEventListener('selectend', onSelectEnd);
    controllerRight.addEventListener('connected', function (event) {

        this.add(buildController(event.data));

    });
    controllerRight.addEventListener('disconnected', function () {

        this.remove(this.children[0]);

    });
    scene.add(controllerRight);

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

    if (controllerLeft.userData.isPlacingSensor === true) {
        tempMatrix.identity().extractRotation(controllerLeft.matrixWorld);

        raycaster.ray.origin.setFromMatrixPosition(controllerLeft.matrixWorld);
        raycaster.ray.direction.set(0, 0, - 1).applyMatrix4(tempMatrix);

        const intersects = raycaster.intersectObjects(modelList, true);

        if (intersects.length > 0) {
            INTERSECTION = intersects[0].point;
            normal = intersects[0].face.normal;  // Get the normal of the intersection

            const quaternion = new THREE.Quaternion();
            quaternion.setFromUnitVectors(new Vector3(0, 1, 0), normal);

            const intersectObject = intersects[0].object;

            // Store intersection data globally
            lastIntersectionData.roomId = intersectObject.userData.roomId;
            lastIntersectionData.housingId = intersectObject.userData.housingId;
            lastIntersectionData.intersectPoint = INTERSECTION.clone();
            lastIntersectionData.normal = normal.clone();

            marker.position.copy(INTERSECTION);
            marker.quaternion.copy(quaternion);
        }
    } else if (controllerRight.userData.isSelecting === true) {
        tempMatrix.identity().extractRotation(controllerRight.matrixWorld);

        raycaster.ray.origin.setFromMatrixPosition(controllerRight.matrixWorld);
        raycaster.ray.direction.set(0, 0, - 1).applyMatrix4(tempMatrix);
        const obj = modelList;
        obj.push(floor);
        const intersects = raycaster.intersectObjects(obj);

        if (intersects.length > 0) {
            INTERSECTION = intersects[0].point;
            normal = intersects[0].face.normal;  // Get the normal of the intersection

            const quaternion = new THREE.Quaternion();
            quaternion.setFromUnitVectors(new Vector3(0, 1, 0), normal);

            const intersectObject = intersects[0].object;
            console.log("Intersected Object (full):", intersectObject);
            console.log("Intersected Mesh Name:", intersectObject.name);
            console.log("Room ID (userData):", intersectObject.userData.roomId);
            console.log("Parent Room ID (fallback):", intersectObject.parent?.userData?.roomId);
        
            const intersectedRoomId = intersectObject.userData.roomId ||
                intersectObject.parent?.userData?.roomId || -1;

            marker.position.copy(INTERSECTION);
            marker.quaternion.copy(quaternion);
        }


    }

    marker.visible = INTERSECTION !== undefined;
    marker.position.y += 0.1;

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


        for (const room of rooms) {

            if (room.gltf_model) {
                const gltfPath = `/static/models/${room.gltf_model.split('/').pop()}`;

                loader.load(gltfPath, (gltf) => {
                    const model = gltf.scene;
                    //add all models to modelList
                    modelList.push(model);

                    // Attach room_id to userData
                    model.traverse((child) => {
                        if (child.isMesh) {
                            child.userData.roomId = room.room_id;
                            child.userData.housingId = housingId;
                            modelList.push(child);
                        }
                    });

                    model.userData.roomId = room.room_id;
                    model.userData.housingId = housingId;

                    // Calculate model position

                    // Align model to the ground or upper floor by adjusting bounding box
                    model.position.set(
                        room.x,
                        room.y,  // Ensure model sits on the floor
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