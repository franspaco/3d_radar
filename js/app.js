/// <reference path="../types/three/index.d.ts" />

var APP = {
    constants: {
        range_long : {a: -100.546875, b: -97.55859375},
        range_lat : {a: 20.79720143430699, b: 17.97873309555617},
        range_map : {a: 85, b: -85},
        // height_scaling: 10/18, // Real
        height_scaling: 1.3,
        tile_scaling: 10,
        max_trail_length: 600,
    }
}
console.log(APP);
APP.setup = async function () {
    this.canvas = document.getElementById("webglcanvas");
    var container = $("#container");
    this.canvas.width = container.width();
    this.canvas.height = container.height();

    // Create the Three.js renderer and attach it to our canvas
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
    this.renderer.shadowMapEnabled = true;
    this.renderer.shadowMapType = THREE.PCFSoftShadowMap;

    // Set the viewport size
    this.renderer.setSize(this.canvas.width, this.canvas.height);

    // Create a new Three.js scene
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x7EC0EE);

    // Create materials
    await APP.createMaterials();
    // Load airplane object
    await AIRPLANES.setup();

    // Setup scene
    this.camera = new THREE.PerspectiveCamera(
        45,
        this.canvas.width / this.canvas.height,
        1,
        4000
    );
    this.controls = new THREE.OrbitControls(this.camera, this.canvas);
    this.controls.maxPolarAngle = Math.PI/2-0.1;
    this.camera.position.set(0, 10, 10);
    this.controls.update();
    this.scene.add(this.camera);

    // Create objects
    this.createObjects();

    console.log('Render');
    
    APP.lastUpdate = Date.now();
    window.requestAnimationFrame(this.tick);
}

APP.tick = function(){
    window.requestAnimationFrame(this.tick);
    // Render the scene
    this.renderer.render(this.scene, this.camera);
    // Update the camera controller
    this.controls.update();
    this.update();
}.bind(APP);

APP.createMaterials = async function(){
    this.materials = {};
    this.materials['background'] = new THREE.MeshBasicMaterial({color: 0x032602, side: THREE.DoubleSide});
    this.materials.line = new THREE.LineBasicMaterial({color:0xffff00});
}

APP.createObjects = async function(){
    var backgroundPlane = new THREE.Mesh(new THREE.PlaneGeometry(500, 500, 1, 1), this.materials['background']);
    backgroundPlane.rotateX(deg2rad(-90));
    this.scene.add(backgroundPlane);

    var data = await loadJsonAsync('mapdata/map_meta.json');
    var elevation = await loadJsonAsync('mapdata/elevations.json');
    var x_offset = Math.floor(data.size_x/2);
    var y_offset = Math.floor(data.size_y/2);
    var loader = new THREE.TextureLoader();
    var scaling = APP.constants.tile_scaling;
    for (let index = 0; index < data.items.length; index++) {
        const item = data.items[index];
        var material = new THREE.MeshBasicMaterial({
            map: THREE.ImageUtils.loadTexture('mapdata/images/' + item.name + '_texture.png'),
            color: 0x999999
        });
        var tile = makeTile(elevation[item.x + "_" + item.y], data.tile_size, material, scaling, APP.constants.height_scaling);
        this.scene.add(tile);
        var X = scaling*(item.x - x_offset);
        var Z = scaling*(item.y - y_offset);
        tile.position.set(X, 0, Z);
    }
    // Temp ambient light
    ambientLight = new THREE.AmbientLight ( 0xffffff);
    this.scene.add(ambientLight);
}

APP.update = function(){}
