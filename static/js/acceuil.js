import * as THREE from 'https://cdn.skypack.dev/three@0.129.0/build/three.module.js';
        import { OrbitControls } from 'https://cdn.skypack.dev/three@0.129.0/examples/jsm/controls/OrbitControls.js';
        import { GLTFLoader } from 'https://cdn.skypack.dev/three@0.129.0/examples/jsm/loaders/GLTFLoader.js';

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 3000);
        const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });

        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.domElement.style.position = 'absolute';
        renderer.domElement.style.top = '0';
        renderer.domElement.style.left = '0';

        document.getElementById("container3D").appendChild(renderer.domElement);

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 1.5);
        const pointLight = new THREE.PointLight(0xffffff, 0.7);
        pointLight.position.set(200, 300, 400);
        scene.add(ambientLight, pointLight);

        const loader = new GLTFLoader();
        let object;

        loader.load(
            '/static/models/eye/scene.glb',
            function (gltf) {
                object = gltf.scene;
                scene.add(object);
                object.scale.set(0.5, 0.5, 0.5);
                object.position.set(0, -800, 0); // Center horizontally
                camera.position.set(0, 300, 1200);
            }
        );

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableZoom = false;
        controls.enablePan = false;

        function animate() {
            requestAnimationFrame(animate);
            if (object) {
                object.rotation.y += 0.002; // Rotate object
            }
            controls.update();
            renderer.render(scene, camera);
        }

        animate();



        // Function to dynamically adjust the scale of the 3D model
        function adjustModelScale() {
            if (object) {
                if (window.innerWidth < 480) {
                    object.scale.set(0.2, 0.2, 0.2); // Extra small screens
                    object.position.y = -200; // Move up for smaller screens
                } else if (window.innerWidth < 768) {
                    object.scale.set(0.3, 0.3, 0.3); // Small screens
                    object.position.y = -400; // Slightly higher for small screens
                } else if (window.innerWidth < 992) {
                    object.scale.set(0.4, 0.4, 0.4); // Medium-small screens
                    object.position.y = -600; // Middle height
                } else if (window.innerWidth < 1200) {
                    object.scale.set(0.5, 0.5, 0.5); // Medium screens
                    object.position.y = -800; // Standard height
                } else if (window.innerWidth < 1600) {
                    object.scale.set(0.6, 0.6, 0.6); // Large screens
                    object.position.y = -1000; // Lower for large screens
                } else {
                    object.scale.set(0.7, 0.7, 0.7); // Extra large screens
                    object.position.y = -1200; // Lowered for extra-large screens
                }
            }
        }

        // Add an event listener for window resize
        window.addEventListener('resize', () => {
            adjustModelScale();
            renderer.setSize(window.innerWidth, window.innerHeight); // Adjust renderer size
            camera.aspect = window.innerWidth / window.innerHeight; // Update camera aspect ratio
            camera.updateProjectionMatrix();
        });

        // Call the function initially to set the scale
        adjustModelScale();