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

APP.setup = async function () {
    this.tag = $("#tag");
    this.canvas = document.getElementById("webglcanvas");
    var container = $("#container");
    this.canvas.width = container.width();
    this.canvas.height = container.height();
    this.canvas_bounds = this.canvas.getBoundingClientRect();

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

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();
    this.canvas.addEventListener( 'mousemove', this.onMouseMove );
    this.canvas.addEventListener( 'click', this.onMouseClick );

    console.log('Render');
    APP.lastUpdate = Date.now();
    window.requestAnimationFrame(this.tick);

    // Set up data table
    this.table = $("#data").DataTable({
        "scrollY":        "50%",
        "scrollCollapse": true,
        "paging":         false,
        "columnDefs": [
            {
                "targets": 0,
                "visible": false
            }
        ]
    });
    // Handle table select logic
    $('#data tbody').on( 'click', 'tr', function () {
        if ( $(this).hasClass('selected') ) {
            $(this).removeClass('selected');
            AIRPLANES.setSelected(null);
        }
        else {
            APP.table.$('tr.selected').removeClass('selected');
            $(this).addClass('selected');
            var id = APP.table.row(this).data()[0];
            AIRPLANES.setSelected(id);
        }
    });
}

APP.tick = function(){
    window.requestAnimationFrame(this.tick);
    var now = Date.now();
    var delta = now - this.lastUpdate;
    this.lastUpdate = now;
    // Render the scene
    this.renderer.render(this.scene, this.camera);
    // Update the camera controller
    this.controls.update();
    this.update(delta);
}.bind(APP);

APP.createMaterials = async function(){
    this.materials = {};
    this.materials['background'] = new THREE.MeshBasicMaterial({color: 0x032602, side: THREE.DoubleSide});
    this.materials.line = new THREE.LineBasicMaterial({color:0xffff00});
    this.materials.line_from = new THREE.LineBasicMaterial({color:0x00ff00});
    this.materials.line_to = new THREE.LineBasicMaterial({color:0x00ffff});
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

APP.update = function(delta){
    for (const airplaneId in AIRPLANES.data) {
        if (AIRPLANES.data.hasOwnProperty(airplaneId)){
            var airplane = AIRPLANES.data[airplaneId].airplane;
            var spd = AIRPLANES.data[airplaneId].info.Spd;
            var vspd = AIRPLANES.data[airplaneId].info.Vsi;
            var hdg = deg2rad(AIRPLANES.data[airplaneId].info.Trak-90);
            airplane.position.x += spd *1.852*0.000277778*0.5418*delta/1000*Math.cos(hdg);
            airplane.position.z += spd *1.852*0.000277778*0.5418*delta/1000*Math.sin(hdg);
            airplane.position.y += vspd/60*0.0003048*APP.constants.height_scaling*delta/1000;
        }
    }
}


APP.onMouseMove = function(event) {
    event.preventDefault();
    this.mouse.x = (event.clientX-this.canvas_bounds.left)/this.canvas.width  * 2 - 1;
    this.mouse.y = -(event.clientY-this.canvas_bounds.top )/this.canvas.height * 2 + 1;
    this.raycaster.setFromCamera( this.mouse, this.camera );
    var showTag = false;
    for (const key in AIRPLANES.data) {
        if (AIRPLANES.data.hasOwnProperty(key)) {
            var intersects = this.raycaster.intersectObject(AIRPLANES.data[key].airplane, true);
            if(intersects.length > 0){
                this.selected_aircraft = key;
                if(AIRPLANES.data[key].info.Call){
                    this.tag.text(AIRPLANES.data[key].info.Call);
                }
                else {
                    this.tag.text(AIRPLANES.data[key].info.Icao);
                }
                showTag = true;
                break;
            }
        }
    }
    if(showTag){
        this.tag.removeClass('hidden');
        this.tag.css({
            top:  event.clientY-30 + 'px',
            left: event.clientX + 'px'
        });
    }
    else {
        this.tag.addClass('hidden');
        this.selected_aircraft = null;
    }
}.bind(APP);

APP.onMouseClick = function(event) {
    event.preventDefault();
    if(this.selected_aircraft != null){
        this.table.$('tr.selected').removeClass('selected');
        this.table.$(AIRPLANES.data[this.selected_aircraft].node).addClass('selected');
        AIRPLANES.setSelected(this.selected_aircraft);
        console.log(AIRPLANES.data[this.selected_aircraft].info);
    }
    else{
        // this.table.search('').draw();
        AIRPLANES.setSelected(null);
        this.table.$('tr.selected').removeClass('selected');
    }
}.bind(APP);
