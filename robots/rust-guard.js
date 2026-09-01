import * as THREE from "three";
import rustGuardDefinition from "./e05/enemies/rust-guard.js";
import { createModelContext, finishModel, setEnemyModelAnisotropy } from "./e05/model-utils.js";
import { applyEnemyPose } from "./e05/animation-runtime.js";

const stage = document.querySelector("[data-rust-guard]");

if (stage) {
    const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "high-performance" });
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;
    renderer.domElement.setAttribute("aria-hidden", "true");
    stage.prepend(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(31, 1, 0.1, 30);
    camera.position.set(0, 1.08, 4.65);
    camera.lookAt(0, 1.05, 0.18);

    scene.add(new THREE.HemisphereLight(0xe8fff2, 0x111722, 2.6));
    const key = new THREE.DirectionalLight(0xffe7d2, 3.2);
    key.position.set(-3, 4, 5);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x72ad8a, 2.5);
    rim.position.set(4, 2, -3);
    scene.add(rim);

    setEnemyModelAnisotropy(Math.min(4, renderer.capabilities.getMaxAnisotropy()));
    const context = createModelContext(rustGuardDefinition, false);
    rustGuardDefinition.model.build(context);
    const model = finishModel(context);
    model.group.scale.setScalar(rustGuardDefinition.stats.scale);
    model.group.rotation.y = 0;
    scene.add(model.group);

    const actor = {
        id: rustGuardDefinition.id,
        typeId: rustGuardDefinition.id,
        type: rustGuardDefinition.stats,
        speed: rustGuardDefinition.stats.speed,
        seed: 0,
        group: model.group,
        bodyMaterial: model.bodyMaterial,
        parts: model.parts,
        flying: model.flying,
        animationBaseY: 0,
        deathBaseY: 0,
        walkPhase: 0
    };

    let width = 0;
    let height = 0;
    let walking = false;
    let frameId = 0;
    let visible = true;
    let themePaused = false;
    let lastTime = performance.now();

    const resize = () => {
        const rect = stage.getBoundingClientRect();
        const nextWidth = Math.max(1, Math.round(rect.width));
        const nextHeight = Math.max(1, Math.round(rect.height));
        if (nextWidth === width && nextHeight === height) return;
        width = nextWidth;
        height = nextHeight;
        renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.15));
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
    };

    const poseAndRender = (time, delta, movementAmount) => {
        if (movementAmount > 0.04) actor.walkPhase += delta * actor.speed * 4.2;
        applyEnemyPose(actor, {
            elapsed: time * 0.001,
            movementAmount,
            walkPhase: actor.walkPhase,
            attackStrength: 0
        });
        renderer.render(scene, camera);
    };

    const render = (time = performance.now()) => {
        frameId = 0;
        if (!walking && time - lastTime < 1000 / 30) {
            frameId = requestAnimationFrame(render);
            return;
        }
        const delta = Math.min(0.05, Math.max(0.001, (time - lastTime) / 1000));
        lastTime = time;
        resize();
        poseAndRender(time, delta, walking && !reducedMotion ? 1 : 0);
        if (visible && !themePaused && !reducedMotion) frameId = requestAnimationFrame(render);
    };

    const requestRender = () => {
        if (!visible || themePaused || frameId) return;
        lastTime = performance.now();
        frameId = requestAnimationFrame(render);
    };
    const startWalking = () => {
        if (reducedMotion) return;
        walking = true;
        requestRender();
    };
    const stopWalking = () => {
        walking = false;
        requestRender();
    };

    stage.addEventListener("pointerenter", startWalking);
    stage.addEventListener("pointerleave", stopWalking);
    stage.addEventListener("focus", startWalking);
    stage.addEventListener("blur", stopWalking);

    const resizeObserver = new ResizeObserver(() => {
        resize();
        poseAndRender(performance.now(), 1 / 60, 0);
    });
    resizeObserver.observe(stage);

    const visibilityObserver = new IntersectionObserver(([entry]) => {
        visible = entry.isIntersecting;
        if (!visible) {
            cancelAnimationFrame(frameId);
            frameId = 0;
            return;
        }
        resize();
        poseAndRender(performance.now(), 1 / 60, 0);
        requestRender();
    });
    visibilityObserver.observe(stage);

    const handleThemeTransition = (event) => {
        themePaused = Boolean(event.detail?.active);
        if (themePaused) {
            cancelAnimationFrame(frameId);
            frameId = 0;
            return;
        }
        poseAndRender(performance.now(), 1 / 60, 0);
        requestRender();
    };
    addEventListener("portfolio-theme-transition", handleThemeTransition);

    resize();
    poseAndRender(performance.now(), 1 / 60, 0);
    requestRender();

    addEventListener("pagehide", () => {
        cancelAnimationFrame(frameId);
        resizeObserver.disconnect();
        visibilityObserver.disconnect();
        removeEventListener("portfolio-theme-transition", handleThemeTransition);
        const geometries = new Set();
        const materials = new Set();
        model.group.traverse((child) => {
            if (!child.isMesh) return;
            if (child.geometry) geometries.add(child.geometry);
            const childMaterials = Array.isArray(child.material) ? child.material : [child.material];
            childMaterials.forEach((material) => materials.add(material));
        });
        geometries.forEach((geometry) => geometry.dispose());
        materials.forEach((material) => {
            material.map?.dispose();
            material.dispose();
        });
        renderer.dispose();
    }, { once: true });
}
