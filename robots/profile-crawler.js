import { THREE, createScrapCrawler, poseFrontLegsAsGrippers } from "./scrap-crawler.js";

const frontStage = document.querySelector("[data-profile-crawler-front]");

if (frontStage) {
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const makeRenderer = (stage) => {
        const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "high-performance" });
        renderer.setClearColor(0x000000, 0);
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.2;
        renderer.domElement.setAttribute("aria-hidden", "true");
        stage.appendChild(renderer.domElement);
        return renderer;
    };

    const frontRenderer = makeRenderer(frontStage);
    const frontScene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 30);
    camera.position.set(0.15, 1.25, 5.15);
    camera.lookAt(0, 0.48, 0.45);

    const lightScene = (scene) => {
        scene.add(new THREE.HemisphereLight(0xdfffee, 0x111827, 2.4));
        const key = new THREE.DirectionalLight(0xc7ffe1, 3.2);
        key.position.set(-3, 4, 5);
        scene.add(key);
        const rim = new THREE.DirectionalLight(0x6b9b7a, 2.8);
        rim.position.set(4, 2, -3);
        scene.add(rim);
    };
    lightScene(frontScene);

    const frontCrawler = createScrapCrawler();
    poseFrontLegsAsGrippers(frontCrawler);

    const foregroundMeshes = new Set();
    frontCrawler.parts.head.traverse((child) => {
        if (child.isMesh) foregroundMeshes.add(child);
    });
    frontCrawler.parts.legs.filter((leg) => leg.rowIndex <= 1).forEach((leg) => {
        [leg.upper, leg.joint, leg.lower, leg.foot].forEach((part) => foregroundMeshes.add(part));
    });
    frontCrawler.parts.frontShoulders.forEach((part) => foregroundMeshes.add(part));
    frontCrawler.group.traverse((child) => {
        if (child.isMesh) child.visible = foregroundMeshes.has(child);
    });

    const frontPivot = new THREE.Vector3(0, 0.38, 0.35);
    const frontRig = new THREE.Group();
    frontRig.position.copy(frontPivot);
    const frontObjects = [frontCrawler.parts.head, ...frontCrawler.parts.frontShoulders];
    frontCrawler.parts.legs.filter((leg) => leg.rowIndex <= 1).forEach((leg) => {
        frontObjects.push(leg.upper, leg.joint, leg.lower, leg.foot);
    });
    frontObjects.forEach((part) => {
        frontCrawler.group.remove(part);
        part.position.sub(frontPivot);
        frontRig.add(part);
    });
    frontRig.rotation.set(0.25, -1.28, -0.06);
    frontCrawler.group.add(frontRig);

    const modelScale = 1.14;
    const perchX = -0.04;
    const perchY = 0.42;
    frontCrawler.group.scale.setScalar(modelScale);
    frontCrawler.group.rotation.set(-0.08, 0.7, 0.18);
    frontCrawler.group.position.set(perchX, perchY, 0);
    frontCrawler.parts.head.rotation.set(0, 0, 0);
    frontScene.add(frontCrawler.group);

    const pupilTarget = new THREE.Vector2();
    let width = 0;
    let height = 0;
    let frameId = 0;
    let visible = true;
    let themePaused = false;

    const resize = () => {
        const rect = frontStage.getBoundingClientRect();
        const nextWidth = Math.max(1, Math.round(rect.width));
        const nextHeight = Math.max(1, Math.round(rect.height));
        if (nextWidth === width && nextHeight === height) return;
        width = nextWidth;
        height = nextHeight;
        frontRenderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
        frontRenderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
    };

    const render = (time = 0) => {
        resize();
        const seconds = time * 0.001;
        if (!reducedMotion) {
            const bob = Math.sin(seconds * 1.25) * 0.018;
            const roll = Math.sin(seconds * 0.82) * 0.012;
            frontCrawler.group.position.y = perchY + bob;
            frontCrawler.group.rotation.z = 0.18 + roll;
            frontRig.rotation.x = 0.25 + Math.sin(seconds * 0.9) * 0.008;
            frontRig.rotation.z = -0.06 + Math.sin(seconds * 0.72) * 0.006;
            frontCrawler.parts.feelers.forEach((feeler, index) => {
                feeler.rotation.x = feeler.userData.baseRotation.x + Math.sin(seconds * 1.8 + index) * 0.045;
            });
        }
        frontCrawler.parts.pupils.forEach((pupil) => {
            pupil.position.x = THREE.MathUtils.lerp(pupil.position.x, pupilTarget.x * 0.18, 0.24);
            pupil.position.y = THREE.MathUtils.lerp(pupil.position.y, pupilTarget.y * 0.14, 0.24);
        });
        frontRenderer.render(frontScene, camera);
        if (!reducedMotion && visible && !themePaused) frameId = requestAnimationFrame(render);
    };

    const trackPointer = (event) => {
        const rect = frontStage.getBoundingClientRect();
        pupilTarget.set(
            THREE.MathUtils.clamp(((event.clientX - rect.left) / rect.width) * 2 - 1, -1, 1),
            THREE.MathUtils.clamp(-(((event.clientY - rect.top) / rect.height) * 2 - 1), -1, 1)
        );
        if (reducedMotion) render(performance.now());
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(frontStage);
    const visibilityObserver = new IntersectionObserver(([entry]) => {
        const wasVisible = visible;
        visible = entry.isIntersecting;
        if (visible && !wasVisible && !reducedMotion && !themePaused) frameId = requestAnimationFrame(render);
        if (!visible) cancelAnimationFrame(frameId);
    });
    visibilityObserver.observe(frontStage);
    const handleThemeTransition = (event) => {
        themePaused = Boolean(event.detail?.active);
        cancelAnimationFrame(frameId);
        if (!themePaused && visible && !reducedMotion) frameId = requestAnimationFrame(render);
    };
    window.addEventListener("portfolio-theme-transition", handleThemeTransition);
    window.addEventListener("pointermove", trackPointer, { passive: true });
    render();

    window.addEventListener("pagehide", () => {
        cancelAnimationFrame(frameId);
        resizeObserver.disconnect();
        visibilityObserver.disconnect();
        window.removeEventListener("portfolio-theme-transition", handleThemeTransition);
        window.removeEventListener("pointermove", trackPointer);
        frontRenderer.dispose();
    }, { once: true });
}
