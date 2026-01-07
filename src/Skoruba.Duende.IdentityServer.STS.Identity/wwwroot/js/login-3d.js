
// UC Capital 3D Login Scene
// Dependencies: Three.js (r128+)

document.addEventListener('DOMContentLoaded', () => {
    initThreeJS();
});

function initThreeJS() {
    const container = document.getElementById('canvas-container');
    if (!container) return;

    // SCENE SETUP
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050510); // Deep dark blue/black
    scene.fog = new THREE.FogExp2(0x050510, 0.02);

    const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    camera.position.z = 20;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    container.appendChild(renderer.domElement);

    // CONTROLS / INTERACTION
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;

    const windowHalfX = container.clientWidth / 2;
    const windowHalfY = container.clientHeight / 2;

    document.addEventListener('mousemove', (event) => {
        mouseX = (event.clientX - windowHalfX) * 0.001;
        mouseY = (event.clientY - windowHalfY) * 0.001;
    });

    const clock = new THREE.Clock();

    // 1. WIREFRAME GLOBE
    const globeGroup = new THREE.Group();
    scene.add(globeGroup);

    const sphereGeometry = new THREE.IcosahedronGeometry(12, 2);
    const wireframeGeometry = new THREE.WireframeGeometry(sphereGeometry);
    const globeMaterial = new THREE.LineBasicMaterial({
        color: 0xFFD700, // Gold
        transparent: true,
        opacity: 0.15
    });
    const globeLine = new THREE.LineSegments(wireframeGeometry, globeMaterial);
    globeGroup.add(globeLine);

    // Add a secondary inner globe for depth
    const innerSphereGeo = new THREE.IcosahedronGeometry(11.5, 1);
    const innerWireframe = new THREE.WireframeGeometry(innerSphereGeo);
    const innerMaterial = new THREE.LineBasicMaterial({ color: 0x88AAFF, transparent: true, opacity: 0.05 });
    const innerLine = new THREE.LineSegments(innerWireframe, innerMaterial);
    globeGroup.add(innerLine);

    // 2. CORE LOGO & RINGS
    const coreGroup = new THREE.Group();
    scene.add(coreGroup);

    // Logo Plane
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load('/images/logo_gold.png', (texture) => {
        const material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            side: THREE.DoubleSide
        });
        // Assuming square logo or adjust aspect ratio
        const geometry = new THREE.PlaneGeometry(6, 6);
        const logoMesh = new THREE.Mesh(geometry, material);
        coreGroup.add(logoMesh);

        // Add glow sprite behind logo
        const spriteMaterial = new THREE.SpriteMaterial({
            map: texture,
            color: 0xFFD700,
            transparent: true,
            opacity: 0.5,
            blending: THREE.AdditiveBlending
        });
        const sprite = new THREE.Sprite(spriteMaterial);
        sprite.scale.set(10, 10, 1);
        coreGroup.add(sprite);
    });

    // Orbiting Rings (TubeGeometry feel)
    function createOrbitRing(radius, tubeRadius, color, speedX, speedY) {
        const geometry = new THREE.TorusGeometry(radius, tubeRadius, 16, 100);
        const material = new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.6, wireframe: true });
        const ring = new THREE.Mesh(geometry, material);

        const ringObj = { mesh: ring, speedX: speedX, speedY: speedY };
        coreGroup.add(ring);
        return ringObj;
    }

    const rings = [
        createOrbitRing(4.5, 0.05, 0xFFD700, 0.2, 0.1),
        createOrbitRing(5.2, 0.03, 0x4488FF, -0.15, 0.2),
        createOrbitRing(6.0, 0.02, 0xFFAA00, 0.1, -0.1)
    ];

    // 3. PARTICLES
    const particleCount = 800;
    const particleGeometry = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    const particleSizes = new Float32Array(particleCount);

    for (let i = 0; i < particleCount; i++) {
        const i3 = i * 3;
        particlePositions[i3] = (Math.random() - 0.5) * 80;     // x
        particlePositions[i3 + 1] = (Math.random() - 0.5) * 80; // y
        particlePositions[i3 + 2] = (Math.random() - 0.5) * 60; // z

        particleSizes[i] = Math.random() < 0.1 ? 0.3 : 0.1; // Some larger stars
    }

    particleGeometry.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    particleGeometry.setAttribute('size', new THREE.BufferAttribute(particleSizes, 1));

    // Custom shader for twinkling particles would be nice, but PointsMaterial is simpler
    const particleMaterial = new THREE.PointsMaterial({
        color: 0xFFFFFF,
        size: 0.15,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending
    });

    const particles = new THREE.Points(particleGeometry, particleMaterial);
    scene.add(particles);

    // ANIMATION LOOP
    function animate() {
        requestAnimationFrame(animate);
        const delta = clock.getDelta();
        const time = clock.getElapsedTime();

        // 1. Globe Rotation (Slow)
        globeGroup.rotation.y += 0.0005;
        globeGroup.rotation.x += 0.0002;

        // 2. Core Logo Auto Rotation (Small angles)
        // Swaying effect
        coreGroup.rotation.y = Math.sin(time * 0.5) * 0.15; // +/- 0.15 radians
        coreGroup.rotation.x = Math.sin(time * 0.3) * 0.1;

        // Animate Rings
        rings.forEach(ring => {
            ring.mesh.rotation.x += ring.speedX * delta;
            ring.mesh.rotation.y += ring.speedY * delta;
        });

        // 3. Particles Parallax & Flow
        targetX = mouseX * 2;
        targetY = mouseY * 2;

        particles.rotation.x += 0.0001;
        particles.rotation.y += 0.0001;

        // Gentle camera float for particles parallax
        particles.position.x += (targetX - particles.position.x) * 0.05;
        particles.position.y += (-targetY - particles.position.y) * 0.05;

        // Rotate globe slightly with mouse too
        globeGroup.rotation.y += mouseX * 0.01;
        globeGroup.rotation.x += mouseY * 0.01;

        renderer.render(scene, camera);
    }

    animate();

    // RESIZE HANDLER
    window.addEventListener('resize', () => {
        const width = container.clientWidth;
        const height = container.clientHeight;

        camera.aspect = width / height;
        camera.updateProjectionMatrix();

        renderer.setSize(width, height);
    });
}
