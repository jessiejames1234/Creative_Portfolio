import * as THREE from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";

const box = new RoundedBoxGeometry(1, 1, 1, 2, 0.075);
const sphere = new THREE.SphereGeometry(0.5, 10, 7);
const cylinder = new THREE.CylinderGeometry(0.5, 0.5, 1, 8);
const cone = new THREE.ConeGeometry(0.5, 1, 8);
const torus = new THREE.TorusGeometry(0.5, 0.08, 7, 16);
const capsule = new THREE.CapsuleGeometry(0.28, 0.44, 4, 8);
const pupilDisc = new THREE.CircleGeometry(0.5, 12);
const segmentDirection = new THREE.Vector3();
const segmentMidpoint = new THREE.Vector3();
const segmentUp = new THREE.Vector3(0, 1, 0);

function alignSegment(mesh, start, end, radius) {
    segmentDirection.subVectors(end, start);
    const length = Math.max(0.001, segmentDirection.length());
    segmentMidpoint.addVectors(start, end).multiplyScalar(0.5);
    mesh.position.copy(segmentMidpoint);
    mesh.scale.set(radius, length, radius);
    mesh.quaternion.setFromUnitVectors(segmentUp, segmentDirection.multiplyScalar(1 / length));
}

function makeMaterial(color, emissive = 0.08, metalness = 0.4) {
    return new THREE.MeshStandardMaterial({
        color,
        roughness: 0.58,
        metalness,
        emissive: color,
        emissiveIntensity: emissive
    });
}

export function createScrapCrawler() {
    const group = new THREE.Group();
    group.name = "E01 Scrap Crawler";

    const parts = {
        armor: [],
        eyes: [],
        feelers: [],
        jaws: [],
        drills: [],
        pistons: [],
        legs: [],
        frontShoulders: [],
        profileBody: [],
        pupils: [],
        head: null
    };

    const bodyMaterial = makeMaterial(0x294d4b, 0.12, 0.66);
    bodyMaterial.emissive.setHex(0x102421);
    bodyMaterial.roughness = 0.48;
    const dark = makeMaterial(0x182126, 0.02, 0.65);
    const accent = makeMaterial(0x52736f, 0.18, 0.72);
    accent.emissive.setHex(0x172e2b);
    accent.roughness = 0.4;
    const oxidized = makeMaterial(0x245f5b, 0.09, 0.62);
    const steel = makeMaterial(0x718481, 0.035, 0.78);
    const rust = makeMaterial(0x713a22, 0.045, 0.58);
    const brass = makeMaterial(0xc08a2b, 0.08, 0.7);
    const rubber = makeMaterial(0x0b1115, 0.01, 0.22);
    const warning = makeMaterial(0xd9a536, 0.1, 0.62);
    const glow = new THREE.MeshBasicMaterial({ color: 0x7e8c82 });
    const redGlow = new THREE.MeshBasicMaterial({ color: 0xff496c });
    const pupilMaterial = new THREE.MeshBasicMaterial({
        color: 0x020305,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -2
    });

    const add = (geometry, material, scale, position, rotation = [0, 0, 0], name = "body") => {
        const mesh = new THREE.Mesh(geometry, material);
        mesh.scale.set(...scale);
        mesh.position.set(...position);
        mesh.rotation.set(...rotation);
        mesh.name = name;
        mesh.userData.basePosition = mesh.position.clone();
        mesh.userData.baseRotation = mesh.rotation.clone();
        mesh.userData.baseScale = mesh.scale.clone();
        group.add(mesh);
        return mesh;
    };

    const coreFrame = add(capsule, dark, [0.7, 0.5, 1.16], [0, 0.39, -0.08], [Math.PI / 2, 0, 0]);
    const coreShell = add(capsule, bodyMaterial, [0.62, 0.42, 1.04], [0, 0.44, -0.07], [Math.PI / 2, 0, 0]);
    const bellyPlate = add(box, rubber, [0.55, 0.105, 0.83], [0, 0.195, -0.07]);
    const upperDeck = add(box, oxidized, [0.64, 0.1, 0.78], [0, 0.555, -0.08]);
    parts.profileBody.push(coreFrame, coreShell, bellyPlate, upperDeck);

    [
        [[0.54, 0.075, 0.25], [0, 0.665, -0.4], [-0.035, 0, 0], accent],
        [[0.59, 0.085, 0.28], [0, 0.69, -0.1], [0.012, 0, 0], bodyMaterial],
        [[0.52, 0.073, 0.23], [0, 0.665, 0.2], [0.04, 0, 0], accent]
    ].forEach(([scale, position, rotation, material]) => parts.armor.push(add(box, material, scale, position, rotation)));
    add(box, rubber, [0.2, 0.035, 0.68], [0, 0.745, -0.09]);
    [-0.36, -0.1, 0.16].forEach((z) => {
        add(box, steel, [0.14, 0.025, 0.018], [0, 0.77, z]);
        [-0.24, 0.24].forEach((x) => add(sphere, brass, [0.022, 0.018, 0.022], [x, 0.735, z]));
    });

    [-1, 1].forEach((side) => {
        const frontShoulder = add(box, oxidized, [0.12, 0.18, 0.2], [side * 0.36, 0.36, 0.45], [0, side * 0.035, side * 0.045]);
        parts.armor.push(frontShoulder);
        parts.frontShoulders.push(frontShoulder);
        parts.armor.push(add(box, side < 0 ? rust : accent, [0.115, 0.25, 0.3], [side * 0.48, 0.42, -0.36], [0, -side * 0.03, -side * 0.04]));
        add(box, rubber, [0.135, 0.12, 0.2], [side * 0.5, 0.285, -0.08]);
        parts.pistons.push(add(cylinder, brass, [0.033, 0.31, 0.033], [side * 0.515, 0.28, -0.08], [Math.PI / 2, 0, 0]));
    });

    add(sphere, oxidized, [0.48, 0.29, 0.4], [0, 0.42, 0.59], [-0.06, 0, 0], "head");
    add(box, dark, [0.49, 0.13, 0.25], [0, 0.31, 0.67], [0.08, 0, 0], "head");
    add(box, rubber, [0.39, 0.075, 0.045], [0, 0.435, 0.79], [-0.04, 0, 0], "head");
    [-0.13, 0, 0.13].forEach((x) => {
        const eye = add(sphere, redGlow, [0.08775, 0.0936, 0.04875], [x, 0.44, 0.822], [0, 0, 0], "head");
        const pupil = new THREE.Mesh(pupilDisc, pupilMaterial);
        pupil.position.set(0, 0, 0.52);
        pupil.scale.setScalar(0.58);
        pupil.renderOrder = 4;
        eye.add(pupil);
        parts.eyes.push(eye);
        parts.pupils.push(pupil);
    });
    add(box, brass, [0.13, 0.055, 0.055], [0, 0.34, 0.81], [0.08, 0, 0], "head");

    [-1, 1].forEach((side) => {
        add(box, warning, [0.09, 0.1, 0.22], [side * 0.31, 0.38, 0.63], [0, 0, side * 0.08], "head");
        const feeler = add(cylinder, dark, [0.018, 0.3, 0.018], [side * 0.18, 0.67, 0.66], [0.66, 0, side * 0.2], "head");
        feeler.userData.side = side;
        parts.feelers.push(feeler);

        const jawRoot = add(box, side < 0 ? rust : oxidized, [0.085, 0.085, 0.265], [side * 0.17, 0.265, 0.9], [0.025, side * 0.12, side * 0.065], "head");
        const drill = add(cone, dark, [0.105, 0.39, 0.105], [side * 0.12, 0.245, 1.18], [Math.PI / 2, 0, side * 0.1], "head");
        const tip = add(cone, brass, [0.07, 0.12, 0.07], [side * 0.12, 0.245, 1.42], [Math.PI / 2, 0, side * 0.1], "head");
        [jawRoot, drill, tip].forEach((jaw) => {
            jaw.userData.side = side;
            parts.jaws.push(jaw);
        });
        add(torus, brass, [0.15, 0.15, 0.15], [side * 0.12, 0.245, 1.0], [Math.PI / 2, 0, 0], "head");
        for (let index = 0; index < 3; index += 1) {
            const angle = index * Math.PI * 0.72 + (side > 0 ? Math.PI * 0.3 : 0);
            const radius = 0.072;
            const tooth = add(box, index === 1 ? steel : brass, [0.018, 0.04, 0.038], [side * 0.12 + Math.cos(angle) * radius, 0.245 + Math.sin(angle) * radius, 1.08 + index * 0.115], [0, 0, angle], "head");
            tooth.userData.drillPhase = angle;
            parts.drills.push(tooth);
        }
    });

    const headPivot = new THREE.Vector3(0, 0.4, 0.61);
    const headRig = new THREE.Group();
    headRig.name = "crawler-head-rig";
    headRig.position.copy(headPivot);
    group.children.filter((child) => child.name === "head").forEach((child) => {
        group.remove(child);
        child.position.sub(headPivot);
        child.userData.basePosition.copy(child.position);
        headRig.add(child);
    });
    group.add(headRig);
    parts.head = headRig;

    const rows = [
        { z: 0.35, sweep: 0.15, reach: 0.76 },
        { z: -0.02, sweep: 0, reach: 0.82 },
        { z: -0.39, sweep: -0.15, reach: 0.75 },
        { z: -0.68, sweep: -0.22, reach: 0.7 }
    ];
    [-1, 1].forEach((side) => rows.forEach((row, rowIndex) => {
        const hip = new THREE.Vector3(side * 0.4, 0.34, row.z);
        const knee = new THREE.Vector3(side * 0.62, 0.2, row.z + row.sweep);
        const ankle = new THREE.Vector3(side * row.reach, 0.055, row.z + row.sweep * 1.75);
        const upper = add(cylinder, steel, [1, 1, 1], [0, 0, 0]);
        const joint = add(sphere, rowIndex === 1 ? rust : brass, [0.092, 0.085, 0.092], knee.toArray());
        const lower = add(cylinder, oxidized, [1, 1, 1], [0, 0, 0]);
        const foot = add(capsule, rubber, [0.19, 0.06, 0.22], [side * (row.reach + 0.065), 0.035, ankle.z + 0.04], [0, side * Math.PI / 2, -row.sweep * 0.65]);
        alignSegment(upper, hip, knee, 0.058);
        alignSegment(lower, knee, ankle, 0.05);
        parts.legs.push({ side, rowIndex, upper, joint, lower, foot });
    }));

    add(box, dark, [0.38, 0.25, 0.22], [0, 0.39, -0.68]);
    add(torus, rust, [0.24, 0.24, 0.24], [0, 0.4, -0.82], [Math.PI / 2, 0, 0]);
    add(sphere, steel, [0.14, 0.14, 0.08], [0, 0.4, -0.845]);
    [-1, 1].forEach((side) => {
        add(cylinder, dark, [0.055, 0.25, 0.055], [side * 0.28, 0.69, -0.48], [0, 0, -side * 0.07]);
        add(torus, glow, [0.07, 0.07, 0.07], [side * 0.28, 0.815, -0.495], [Math.PI / 2, 0, 0]);
    });
    add(box, glow, [0.09, 0.025, 0.04], [0, 0.285, -0.805]);

    return { group, parts };
}

// Stretch the first two left/right leg pairs forward and down. When the front
// rig turns toward the portrait, +Z becomes the cat-like down-left reach.
export function poseFrontLegsAsGrippers(crawler) {
    crawler.parts.legs.filter((leg) => leg.rowIndex <= 1).forEach((leg) => {
        const side = leg.side;
        const secondPair = leg.rowIndex === 1;
        const hip = new THREE.Vector3(side * (secondPair ? 0.34 : 0.22), secondPair ? 0.33 : 0.37, secondPair ? 0.24 : 0.45);
        const fullKnee = new THREE.Vector3(side * (secondPair ? 0.62 : 0.42), secondPair ? 0.1 : 0.06, secondPair ? 0.66 : 0.8);
        const fullAnkle = new THREE.Vector3(side * (secondPair ? 0.88 : 0.64), secondPair ? -0.2 : -0.28, secondPair ? 1 : 1.12);
        const fullFoot = new THREE.Vector3(side * (secondPair ? 0.92 : 0.68), secondPair ? -0.235 : -0.315, secondPair ? 1.025 : 1.145);
        const knee = hip.clone().lerp(fullKnee, 0.6);
        const ankle = hip.clone().lerp(fullAnkle, 0.6);
        const footPosition = hip.clone().lerp(fullFoot, 0.6);

        alignSegment(leg.upper, hip, knee, 0.05);
        alignSegment(leg.lower, knee, ankle, 0.045);
        leg.joint.position.copy(knee);
        leg.joint.scale.multiplyScalar(0.72);
        leg.foot.position.copy(footPosition);
        leg.foot.rotation.set(-0.2, side * Math.PI / 2, side * 0.05);
        leg.foot.scale.multiplyScalar(0.72);

        for (const part of [leg.upper, leg.joint, leg.lower, leg.foot]) {
            part.userData.perchPosition = part.position.clone();
            part.userData.perchRotation = part.rotation.clone();
            part.userData.perchScale = part.scale.clone();
        }
    });
}

export { THREE };

