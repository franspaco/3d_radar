/// <reference path="../types/three/index.d.ts" />

var APP = {}

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
    this.scene.background = new THREE.Color(0.0, 0.0, 0.0);

    // Create materials
    await APP.createMaterials();

    // Setup scene
    this.camera = new THREE.PerspectiveCamera(
        45,
        this.canvas.width / this.canvas.height,
        1,
        4000
    );
    this.controls = new THREE.OrbitControls(this.camera, this.canvas);
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
}

APP.createObjects = async function(){
    var data = await loadJsonAsync('mapdata/map_meta.json');
    var elevation = await loadJsonAsync('mapdata/elevations.json');
    var x_offset = Math.floor(data.size_x/2);
    var y_offset = Math.floor(data.size_y/2);
    var loader = new THREE.TextureLoader();
    var scaling = 10;
    for (let index = 0; index < data.items.length; index++) {
        const item = data.items[index];
        var material = new THREE.MeshBasicMaterial({
            map: THREE.ImageUtils.loadTexture('mapdata/images/' + item.name + '_texture.png')
        });
        var tile = makeTile(elevation[item.x + "_" + item.y], data.tile_size, material, scaling, 1.5);
        this.scene.add(tile);
        var X = scaling*(item.x - x_offset);
        var Z = scaling*(item.y - y_offset);
        tile.position.set(X, 0, Z);
    }
    console.log('woop');
}

APP.update = function(){}
