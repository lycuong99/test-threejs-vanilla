import * as THREE from "three";
import Stats from "three/examples/jsm/libs/stats.module.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { PointerLockControls } from "three/examples/jsm/controls/PointerLockControls.js";
// import * as dat from 'dat.gui';
// import { GUI } from "https://cdn.skypack.dev/three/examples/jsm/libs/dat.gui.module.js";
import { Sky } from "three/examples/jsm/objects/Sky.js";

const cameraWorldPosition = new THREE.Vector3();
const cameraWorldDirection = new THREE.Vector3();
const dollyVelocity = new THREE.Vector3();
const dollyDirection = new THREE.Vector3();

let camera, scene, renderer, stats, controls, loader, raycaster;
let prevTime = performance.now(),
  time,
  delta,
  video,
  curvedRectangle;

let moveForward = false;
let moveBackward = false;
let moveLeft = false;
let moveRight = false;
let canJump = false;

init();
animate();

function createScene() {
  camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x88ccff);

  camera.position.set(0, 0.2, 2.2);
  camera.lookAt(0, 3, 0);
  scene.add(camera);
  scene.add(new THREE.AxesHelper(5));
}

function createLights() {
  const ambientLight = new THREE.AmbientLight(0xffffff, 0x000000, 1);
  scene.add(ambientLight);
  const hemiLight = new THREE.HemisphereLight(0xffffff, 0x000000, 1);
  scene.add(hemiLight);

  const dirLight = new THREE.DirectionalLight(0xffffff, 0.5);
  dirLight.position.set(20, 20, 20);
  scene.add(dirLight);
}

function createGrid() {
  const helper = new THREE.GridHelper(20, 20);
  helper.position.y = -0.0001;
  //helper.rotateX(Math.PI/2);
  scene.add(helper);
}

function createSky() {
  const sky = new Sky();
  sky.scale.setScalar(450000);

  const sun = new THREE.Vector3();

  const effectController = {
    turbidity: 10,
    rayleigh: 3,
    mieCoefficient: 0.005,
    mieDirectionalG: 0.7,
    elevation: 0.1,
    azimuth: 180,
    exposure: renderer.toneMappingExposure,
  };

  const uniforms = sky.material.uniforms;
  uniforms["turbidity"].value = effectController.turbidity;
  uniforms["rayleigh"].value = effectController.rayleigh;
  uniforms["mieCoefficient"].value = effectController.mieCoefficient;
  uniforms["mieDirectionalG"].value = effectController.mieDirectionalG;

  const phi = THREE.MathUtils.degToRad(90 - effectController.elevation);
  const theta = THREE.MathUtils.degToRad(effectController.azimuth);
  sun.setFromSphericalCoords(1, phi, theta);
  uniforms["sunPosition"].value.copy(sun);

  scene.add(sky);
}

function createRenderer() {
  renderer = new THREE.WebGLRenderer();
  renderer.setPixelRatio(window.devicePixelRatio);
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);
}

function createControls() {
  controls = new OrbitControls(camera, renderer.domElement);
  controls.minDistance = 1;
  controls.maxDistance = 200;
  controls.enableDamping = true;

  // controls = new PointerLockControls(camera, document.body);

  renderer.domElement.addEventListener("click", () => {
    // if (controls.isLocked) return;
    // controls.lock();
  });

  document.addEventListener("keydown", onKeyDown, true);
  document.addEventListener("keyup", onKeyUp, true);

  // camera.position.set(0, 1, 4.2);

  camera.getWorldPosition(cameraWorldPosition);
  camera.getWorldDirection(cameraWorldDirection);


}

function createStats() {
  stats = new Stats();
  document.body.appendChild(stats.dom);
}

function createRaycaster() {
  raycaster = new THREE.Raycaster(cameraWorldPosition, cameraWorldDirection);
  //raycaster = new THREE.Raycaster( new THREE.Vector3(), new THREE.Vector3( 0, - 1, 0 ), 0, 10 );
  raycaster.set(cameraWorldPosition, cameraWorldDirection);
}

function onWebcamInput(stream) {
  video.srcObject = stream;
  video.play();
}

function onWebcamInputError(err) {
  alert("Unable to access the camera/webcam: " + err.message);
}

function initWebcamInput() {
  // if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
  //   alert("MediaDevices interface not available.");
  //   return;
  // }
  // const constraints = {
  //   video: {
  //     width: 1280,
  //     height: 720,
  //     facingMode: "user",
  //   },
  // };
  // navigator.mediaDevices.getUserMedia(constraints).then(onWebcamInput).catch(onWebcamInputError);
}
function createCircle(radius) {
  const geometry = new THREE.CircleGeometry(radius, 32);
  const material = new THREE.MeshBasicMaterial({ color: "#2f1e1e", side: THREE.DoubleSide });
  const circle = new THREE.Mesh(geometry, material);

  geometry.rotateX(Math.PI / 2);
  // geometry.translate(0, 0, radius);
  scene.add(circle);
}
function addLineHelper({ color = 0xff00f0, vector, length = 1 }) {
  const origin = new THREE.Vector3(0, 0, 0);
  const arrowHelper = new THREE.ArrowHelper(vector, origin, length, color);
  scene.add(arrowHelper);
}
function createCurvedPlane({
  imageUrls = ["img/rec1.png", "img/rec2.png", "img/rec3.png", "img/rec4.png"],
  numbSides = 1,
  radius = 1,
} = {}) {
  if (imageUrls) {
    numbSides = imageUrls.length;
  }
  createCircle(radius);
  let chuviCircle = 2 * Math.PI * radius;

  const RATIO = 16 / 9;
  video = document.getElementById("video");

  // const texture = new THREE.VideoTexture(video);
  // texture.minFilter = THREE.LinearFilter;
  // texture.magFilter = THREE.LinearFilter;
  // texture.format = THREE.RGBFormat;

  let width = chuviCircle / numbSides;
  let height = width / RATIO;
  let textureLoader = new THREE.TextureLoader();
  const textures = imageUrls.map((url) => textureLoader.load(url));
  const geometry = new THREE.PlaneGeometry(width, height, 32, 32);
  const positions = geometry.attributes.position;

  const axis = new THREE.Vector3(0, 1, 0);
  //
  const axisPosition = new THREE.Vector3(0, 0, radius);

  addLineHelper({ color: 0xff0000, vector: axis, length: axis.length() });
  addLineHelper({ color: 0xff0000, vector: axisPosition, length: axisPosition.length() });
  const vTemp = new THREE.Vector3(0, 0, 0);
  let lengthOfArc;
  let angleOfArc;

  for (let i = 0; i < positions.count; i++) {
    vTemp.fromBufferAttribute(positions, i);
    lengthOfArc = vTemp.x - axisPosition.x;
    angleOfArc = lengthOfArc / axisPosition.z;
    vTemp.setX(0).setZ(-axisPosition.z).applyAxisAngle(axis, angleOfArc).add(axisPosition);
    positions.setXYZ(i, vTemp.x, vTemp.y, vTemp.z);
  }

  // geometry.rotateY(0);
  geometry.translate(0, 0, -radius);

  const materials = textures.map((texture) => {
    const material = new THREE.MeshStandardMaterial({ map: texture, side: THREE.DoubleSide });
    material.side = THREE.DoubleSide;
    return material;
  });
  const slideGroup = new THREE.Group();

  materials.map((material, i) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.y = height / 2;
    mesh.rotateOnWorldAxis(axis, (Math.PI * 2 * i) / numbSides);
    // mesh.position.z = radius;
    slideGroup.add(mesh);
   
    const helper = new THREE.BoxHelper(mesh, 0xffff00);
    scene.add(helper);
  });
  scene.add(slideGroup);

  // curvedRectangle = mesh;
}

function installListeners() {
  window.addEventListener("resize", onWindowResize);
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();

  renderer.setSize(window.innerWidth, window.innerHeight);
}

function onKeyDown(event) {
  switch (event.code) {
    case "ArrowUp":
    case "KeyW":
      moveForward = true;
      break;

    case "ArrowLeft":
    case "KeyA":
      moveLeft = true;
      break;

    case "ArrowDown":
    case "KeyS":
      moveBackward = true;
      break;

    case "ArrowRight":
    case "KeyD":
      moveRight = true;
      break;

    case "Space":
      if (canJump === true) dollyVelocity.y += 150;
      canJump = false;
      break;
  }
}

function onKeyUp(event) {
  switch (event.code) {
    case "ArrowUp":
    case "KeyW":
      moveForward = false;
      break;

    case "ArrowLeft":
    case "KeyA":
      moveLeft = false;
      break;

    case "ArrowDown":
    case "KeyS":
      moveBackward = false;
      break;

    case "ArrowRight":
    case "KeyD":
      moveRight = false;
      break;
  }
}

function renderControls() {
  if (!controls.isLocked) return;

  time = performance.now();

  camera.getWorldPosition(cameraWorldPosition);
  camera.getWorldDirection(cameraWorldDirection);
  raycaster.set(cameraWorldPosition, cameraWorldDirection);

  const intersections = raycaster.intersectObjects(scene.children);
  const onObject = intersections.length > 0;

  delta = (time - prevTime) / 1000;

  dollyVelocity.x -= dollyVelocity.x * 10.0 * delta;
  dollyVelocity.z -= dollyVelocity.z * 10.0 * delta;
  dollyVelocity.y -= 9.8 * 100.0 * delta; // 100.0 = mass

  dollyDirection.z = Number(moveForward) - Number(moveBackward);
  dollyDirection.x = Number(moveRight) - Number(moveLeft);
  dollyDirection.normalize(); // this ensures consistent movements in all directions

  if (moveForward || moveBackward) dollyVelocity.z -= dollyDirection.z * 50.0 * delta;
  if (moveLeft || moveRight) dollyVelocity.x -= dollyDirection.x * 50.0 * delta;

  if (onObject === true) {
    dollyVelocity.y = Math.max(0, dollyVelocity.y);
    canJump = true;
  }

  controls.moveRight(-dollyVelocity.x * delta);
  controls.moveForward(-dollyVelocity.z * delta);
  controls.getObject().position.y += (dollyVelocity.y * delta) / 10; // new behavior

  if (controls.getObject().position.y < 1.8) {
    dollyVelocity.y = 0;
    controls.getObject().position.y = 1.8;
    canJump = true;
  }

  prevTime = time;
}

function init() {
  createScene();
  createLights();
  createGrid();
  createRenderer();
  createSky();
  // createControls();
  createRaycaster();
  createStats();

  createCurvedPlane();

  installListeners();
  initWebcamInput();
}

function animate() {
  requestAnimationFrame(animate);
  // if (controls && controls.update) controls.update(); // to support damping
  // renderControls();
  renderer.render(scene, camera);
  camera.position.z = 3*Math.sin(performance.now() / 10000) ;
  camera.position.x = 3*Math.cos(performance.now() / 10000) ;
  camera.position.y = 0.3;
  camera.lookAt(0,0.4,0);
  // stats.update();
 
  // console.log(camera);
}

window.addEventListener("click", ()=>{

})