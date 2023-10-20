import * as THREE from 'three';

var scene, camera, renderer;
var globe, extraLayer, globeRotationSpeed = 0.005;
var extraLayerRotationSpeed = 0.0005; 
var isDragging = false;
var previousMousePosition = {
  x: 0,
  y: 0
};
var interactivePoints = [];

init();
animate();

function init() {
  scene = new THREE.Scene();

  camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  camera.position.z = 3;

  // Create a sphere for the space background
  var spaceTexture = new THREE.TextureLoader().load('space.png');
  var spaceGeometry = new THREE.SphereGeometry(10, 32, 32);
  var spaceMaterial = new THREE.MeshBasicMaterial({ map: spaceTexture, side: THREE.BackSide });
  var spaceSphere = new THREE.Mesh(spaceGeometry, spaceMaterial);
  scene.add(spaceSphere);

  // Create the Earth
  var loader = new THREE.TextureLoader();
  var earthGeometry = new THREE.SphereGeometry(1, 32, 32);
  var earthMaterial = new THREE.MeshBasicMaterial({ map: loader.load('earth.jpg') });
  globe = new THREE.Mesh(earthGeometry, earthMaterial);
  scene.add(globe);

  // Create the extra layer
  var extraLayerGeometry = new THREE.SphereGeometry(1.01, 32, 32); // Slightly larger radius
  var extraLayerMaterial = new THREE.MeshBasicMaterial({
    map: loader.load('clouds.jpg'), // Replace with the path to your extra layer image
    transparent: true,
    opacity: 0.5, // Adjust the opacity as needed
  });
  extraLayer = new THREE.Mesh(extraLayerGeometry, extraLayerMaterial);
  scene.add(extraLayer);

  
  renderer = new THREE.WebGLRenderer();
  renderer.setSize(window.innerWidth, window.innerHeight);
  document.body.appendChild(renderer.domElement);

  document.addEventListener('mousedown', onMouseDown, false);
  document.addEventListener('mouseup', onMouseUp, false);
  document.addEventListener('mousemove', onMouseMove, false);

  window.addEventListener('resize', onWindowResize, true);
}

function updateInteractivePoints() {
  for (var i = 0; i < interactivePoints.length; i++) {
    var point = interactivePoints[i];

    // Update the point's position based on the sphere's rotation
    var originalPosition = point.userData.originalPosition.clone();
    originalPosition.applyAxisAngle(new THREE.Vector3(0, 1, 0), globe.rotation.y); // Rotate around the Y axis
    originalPosition.applyAxisAngle(new THREE.Vector3(1, 0, 0), globe.rotation.x); // Rotate around the X axis

    point.position.copy(originalPosition);
  }
}

function createInteractivePoint() {
  var pointGeometry = new THREE.SphereGeometry(0.05, 32, 32);
  var pointMaterial = new THREE.MeshBasicMaterial({ color: 0xff0000 });
  var point = new THREE.Mesh(pointGeometry, pointMaterial);

  // Randomly position the point on the sphere's surface
  var phi = Math.acos(Math.random() * 2 - 1); // Latitude
  var theta = Math.random() * 2 * Math.PI; // Longitude

  point.userData.originalPosition = new THREE.Vector3(
    Math.sin(phi) * Math.cos(theta),
    Math.sin(phi) * Math.sin(theta),
    Math.cos(phi)
  );

  // Add the point to the scene
  scene.add(point);

  // Store the point in the array
  interactivePoints.push(point);

  point.addEventListener('mousemove', function () {
    document.body.style.cursor = 'pointer';
  });

  // Add event listener for mouseout event to revert cursor
  point.addEventListener('mouseout', function () {
    document.body.style.cursor = 'auto';
  });

  // Return the point for further use if needed
  return point;
}

createInteractivePoint();
createInteractivePoint();
createInteractivePoint();

function onClick(event) {
  // Convert mouse coordinates to normalized device coordinates
  var mouse = new THREE.Vector2();
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  // Raycasting to check for intersections with interactive points
  var raycaster = new THREE.Raycaster();
  raycaster.setFromCamera(mouse, camera);

  var intersects = raycaster.intersectObjects(interactivePoints);

  if (intersects.length > 0) {
    // Perform some action when an interactive point is clicked
    console.log('Interactive point clicked!');
  }
}

document.addEventListener('click', onClick, false);

function onMouseDown(event) {
  isDragging = true;
  previousMousePosition = {
    x: event.clientX,
    y: event.clientY
  };
}

function onMouseUp() {
  isDragging = false;
}

function onMouseMove(event) {
  if (!isDragging) return;

  var deltaX = event.clientX - previousMousePosition.x;
  var deltaY = event.clientY - previousMousePosition.y;

  globe.rotation.x += deltaY * 0.005;
  globe.rotation.y += deltaX * 0.005;

  extraLayer.rotation.copy(globe.rotation);

  previousMousePosition = {
    x: event.clientX,
    y: event.clientY
  };
}

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjection();
  renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
  requestAnimationFrame(animate);
  // Rotate the extra layer slowly
  extraLayer.rotation.y += extraLayerRotationSpeed;
  updateInteractivePoints();
  renderer.render(scene, camera);
}
