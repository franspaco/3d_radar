/// <reference path="../types/three/index.d.ts" />

var scene = null;
var renderer = null;
var materials = {};
var controls = null;
var lastUpdate = null;
var imgloader = new THREE.TextureLoader();


async function asyncLoadImg(url){
    return new Promise((resolve, fail) => {
        imgloader.load(url, resolve, null, fail);
    });
}

function deg2rad(val) {
    return (val / 180.0) * Math.PI;
}

/** * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * Basic stuff
 */


/**
 * Initialized everything
 */
async function startUp(){
    var canvas = document.getElementById("webglcanvas");
    var container = $("#container");
    canvas.width = container.width();
    canvas.height = container.height();
    // create the scene
    createScene(canvas);

    // Create materials
    await createMaterials();

    // Create objects
    await createObjects();
    
    lastUpdate = Date.now();

    run();
}

/** * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * Rendering & animation 
 */

/**
 * Main render function
 */
function run() {
    requestAnimationFrame(run);

    // Render the scene
    renderer.render(scene, camera);

    // Update the camera controller
    // orbitControls.update();
    controls.update();
}


/** * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * * *
 * Objects & materials
 */

/**
 * Create materials
 */
async function createMaterials() {
    
}

/**
 * Set up scene
 */
function createScene(canvas) {
    // Create the Three.js renderer and attach it to our canvas
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true });
    renderer.shadowMapEnabled = true;
    renderer.shadowMapType = THREE.PCFSoftShadowMap;

    // Set the viewport size
    renderer.setSize(canvas.width, canvas.height);

    // Create a new Three.js scene
    scene = new THREE.Scene();

    // Image background
    scene.background = new THREE.Color(0.0, 0.0, 0.0);

    // Add  a camera so we can view the scene
    camera = new THREE.PerspectiveCamera(
        45,
        canvas.width / canvas.height,
        1,
        4000
    );
    controls = new THREE.OrbitControls(camera, canvas);
    camera.position.set(8, 15, 10);
    camera.rotation.set(-0.9827937232473292, 0.41765276918141875, 0.546590715404528);
    controls.update();
    scene.add(camera);

    
    // ambientLight = new THREE.AmbientLight ( 0xc1bfbf);
    ambientLight = new THREE.AmbientLight ( 0xffffff);
    scene.add(ambientLight);
    loadBlock();


}

function createObjects(){

}

function loadBlock() {
    var material = new THREE.MeshBasicMaterial( {color: 0xdddddd, wireframe: true,side: THREE.DoubleSide} );
    var geometry = new THREE.PlaneGeometry(60, 60, 255, 255);
    $.getJSON('objects/terrainHeights.json',function (data) {
        console.log(geometry.vertices.length);
            var index = 0;
            for (let i = 0; i < data.length; i++) {
                for (let j = 0; j < data[i].length; j++) {
                    geometry.vertices[index].z = data[i][j];
                    index++;
                }
            }
            var plane = new THREE.Mesh(geometry, material);
            scene.add(plane);
    });
}