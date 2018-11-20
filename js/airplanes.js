/// <reference path="../types/three/index.d.ts" />

var VRS = {
    Species: {
        None: 0,
        LandPlane: 1,
        SeaPlane: 2,
        Amphibian: 3,
        Helicopter: 4,
        Gyrocopter: 5,
        Tiltwing: 6,
        GroundVehicle: 7,
        Tower: 8
    }
}

var AIRPLANES = {
    // Store airplane data
    data: {}, 
    // API route
    apiRoute: "https://franspaco.azurewebsites.net/api/plane-json",
    rate: 3000, // miliseconds
    // Airplane Object, later copied
    mainAirplane : null,
    mainHeli : null,
    selected: null,
    hid_time: 1.5, // minutes
    delete_time: 5, //minutes
};



AIRPLANES.setup = async function(){
    var loader = new THREE.FBXLoader();

    // Base Airplane Model
    var texture_787 = THREE.ImageUtils.loadTexture('objects/Boeing_787/texture.png');
    AIRPLANES.mainAirplane = await loader.asyncLoad('objects/Boeing_787/787_1.fbx');
    AIRPLANES.mainAirplane.scale.multiplyScalar(0.0002);
    AIRPLANES.mainAirplane.traverse((child) =>{
        if(child.isMesh){
            child.material.transparent = false;
            child.material.color.setHex(0xff0000);
            child.material.map = texture_787;
        }
    });

    // Base Helicopter Model
    AIRPLANES.mainHeli = await loader.asyncLoad('objects/Helicopter/heli.fbx');
    AIRPLANES.mainHeli.traverse((child) =>{
        if(child.isMesh){
            child.material.transparent = false;
            child.material.color.setHex(0xff0000);
        }
    });

    AIRPLANES.updateData();

    // setInterval(()=>{
    //     AIRPLANES.updateData();
    // }, this.rate);
}

// Clone model for each new aircraft
AIRPLANES.getNew = function(species = 1){
    switch(species){
        case 4:
            return cloneFbx(this.mainHeli);
        case 1:
        default:
            return cloneFbx(this.mainAirplane);
    }
}

// Returns whether aircraft is in the local cache
AIRPLANES.previouslySeen = function(airplaneId){
    return (airplaneId in AIRPLANES.data);
}

AIRPLANES.updateAirplaneData = function(airplaneInfo){
    airplaneId = airplaneInfo['Id'];

    if(this.previouslySeen(airplaneId)){
        // Update last seen
        AIRPLANES.data[airplaneId]['lastseen'] = new Date();
        // Update aircraft info
        AIRPLANES.data[airplaneId]['info'] = airplaneInfo;
        // Set status to alive (revives any removed airplanes still in memory)
        if(AIRPLANES.data[airplaneId].status == 'removed'){
            // Revive
            AIRPLANES.data[airplaneId].status = 'alive';
            // Readd to scene
            APP.scene.add(AIRPLANES.data[airplaneId].airplane);
            // Readd to table
            AIRPLANES.data[airplaneId].node = APP.table.row.add(make_table_data(airplaneInfo)).draw(false).node();
        }
        else {
            // Airplane is alive, therefore in the table, check for updates
            var new_data = make_table_data(airplaneInfo);
            // Get table row
            var row = APP.table.row(AIRPLANES.data[airplaneId].node);
            // Get current data
            var prev_data = row.data();
            // Get newest data
            var new_data = make_table_data(airplaneInfo);

            // Check if data has changed
            var update = false;
            for (let index = 0; index < prev_data.length; index++) {
                if(prev_data[index] !== new_data[index]){
                    update = true;
                    break;
                }
            }
            // Update data if there were changes
            if(update){
                row.data(new_data).draw();
            }
        }
    }
    else{
        // Airplane is new
        // Make new model
        var airplane = AIRPLANES.getNew(airplaneInfo.Species);
        // Make geometry for trail
        var geometry = new THREE.BufferGeometry();
        var positions = new Float32Array( APP.constants.max_trail_length * 3 );
        geometry.addAttribute( 'position', new THREE.BufferAttribute( positions, 3 ) );
        geometry.setDrawRange( 0, 0 );
        // Decide what material to use for trail, depends on route
        var material = APP.materials.line;
        if(airplaneInfo.To && airplaneInfo.To.startsWith("MMMX")){
            material = APP.materials.line_to;
        }
        else if(airplaneInfo.From && airplaneInfo.From.startsWith("MMMX")){
            material = APP.materials.line_from;
        }
        // Create trail object
        var trail = new THREE.Line(geometry, material);
        trail.frustumCulled = false;

        // set object name to id
        airplane.name = airplaneId;
        // Create aircraft record
        AIRPLANES.data[airplaneId] = {
            info : airplaneInfo,
            airplane: airplane,
            lastseen: new Date(),
            trail: trail,
            trailLength: 0,
            status: 'alive'
        };
        // Add aircraft and trail to scene
        APP.scene.add(airplane);
        APP.scene.add(trail);
        // Add aircraft to table
        AIRPLANES.data[airplaneId].node = APP.table.row.add(make_table_data(airplaneInfo)).draw(false).node();
    }
    
    // If we have sufficient location information update the model's location
    if(airplaneInfo['Long'] && airplaneInfo['Lat'] && airplaneInfo['Alt']){
        // Translate IRL position to scene position
        var coordinates = this.transformCoordinates(airplaneInfo['Long'], airplaneInfo['Lat'], airplaneInfo['Alt']);

        // Set the aircraft object's position & rotation
        AIRPLANES.data[airplaneId]['airplane'].position.x = coordinates.x;
        AIRPLANES.data[airplaneId]['airplane'].position.z = coordinates.z;
        AIRPLANES.data[airplaneId]['airplane'].position.y = coordinates.y;
        AIRPLANES.data[airplaneId]['airplane'].rotation.y = deg2rad( 180 - airplaneInfo['Trak']);

        // Add new points to trail array
        var positions = AIRPLANES.data[airplaneId].trail.geometry.attributes.position.array;
        var indx = AIRPLANES.data[airplaneId].trailLength;
        positions[3 * indx + 0] = coordinates.x;
        positions[3 * indx + 1] = coordinates.y;
        positions[3 * indx + 2] = coordinates.z;
        // Tell the renderer it needs to update the geometry
        AIRPLANES.data[airplaneId].trail.geometry.setDrawRange( 0, ++AIRPLANES.data[airplaneId].trailLength );
        AIRPLANES.data[airplaneId].trail.geometry.attributes.position.needsUpdate = true;
        // Apparently this makes lines not dissappear
        // AIRPLANES.data[airplaneId].trail.geometry.computeBoundingSphere();
    }
}

// Linear transforma a value in range [Imin, Imax] to range [Omin, Omax]
AIRPLANES.mapDomain = function(value, Imax, Imin, Omax, Omin){
    return (value - Imin) / (Imax - Imin) * ( Omax - Omin) + Omin;
}

// Transform IRL coordinates into scene coordinates
AIRPLANES.transformCoordinates = function(long, lat, alt){
    return {
        x: this.mapDomain(long, APP.constants.range_long.a, APP.constants.range_long.b, APP.constants.range_map.b, APP.constants.range_map.a), 
        z: this.mapDomain(lat, APP.constants.range_lat.a, APP.constants.range_lat.b, APP.constants.range_map.b, APP.constants.range_map.a),
        // Feet to Km by the scaling factor for the height
        y: alt * 0.0003048 * APP.constants.height_scaling + 0.1
    };   
}

// Checks if an airplane's last update is within mins_limit of a given timestamp
AIRPLANES.checkAlive = function(airplaneId, timestamp, mins_limit){
    return !((timestamp - AIRPLANES.data[airplaneId]['lastseen'])/60000 > mins_limit);
}

// Deals with old airplanes
AIRPLANES.remove_old = function(){
    // Get current timestamp
    var now = new Date();
    // Iterate over all the planes in the cache
    for (const airplaneId in AIRPLANES.data) {
        if (AIRPLANES.data.hasOwnProperty(airplaneId)) {
            // Check if alive and we haven't received anything in the last 1.5 minutes
            if(AIRPLANES.data[airplaneId].status === 'alive' && !this.checkAlive(airplaneId, now, this.hid_time)) {
                console.log('Hiding: ' + airplaneId);
                    // Remove the airplane model
                    APP.scene.remove(AIRPLANES.data[airplaneId].airplane);
                    // Trail is left in the scene until permanent removal
                    // Set status to removed
                    AIRPLANES.data[airplaneId].status = 'removed';
                    // Remove airplane from table
                    APP.table.row(AIRPLANES.data[airplaneId].node).remove().draw();
            }
            // Check if removed and we haven't received anything in the last 5 minutes
            else if(AIRPLANES.data[airplaneId].status === 'removed' && !this.checkAlive(airplaneId, now, this.delete_time)){
                // If we haven't seen it in >5 minutes delete all data
                console.log('Erasing: ' + AIRPLANES.data[airplaneId].info.Icao);
                // Remove the trail
                APP.scene.remove(AIRPLANES.data[airplaneId].trail);
                // Delete all remaining data
                delete AIRPLANES.data[airplaneId];
            }
        }
    }
}

// Retrieves airplane data from the server
AIRPLANES.updateData = async function(){
    var before = Date.now();
    await new Promise((resolve, reject) => {
        $.ajax({
            url: this.apiRoute,
            timeout: 3500,
            success: (data) => {
                data.acList.forEach(airplaneInfo => {
                    this.updateAirplaneData(airplaneInfo);
                });
                resolve();
            },
            error: ( jqXHR, textStatus, errorThrown ) => {
                console.log(textStatus);
                resolve();
            }
        });
    });

    // Deal with old airplanes
    this.remove_old();

    // Calculate timeout to call update on a 3 second period
    var time_out = this.rate - (Date.now() - before);

    // Call function after a timeout
    setTimeout( () => {
        this.updateData()
    }, (time_out > 0) ? time_out : 0)
}.bind(AIRPLANES);

// Set the selected airplane
// Clears previous selected and colors the new one
// Only clears if null
AIRPLANES.setSelected = function(id){
    console.log('Selected: ' + id);
    if(this.selected != null && AIRPLANES.data.hasOwnProperty(this.selected)){
        AIRPLANES.data[this.selected].airplane.traverse((child) => {
            if(child.isMesh){
                child.material.color.setHex(0xff0000);
            }
        });
    }
    this.selected = id;
    if(this.selected != null && AIRPLANES.data.hasOwnProperty(this.selected)){
        AIRPLANES.data[this.selected].airplane.traverse((child) => {
            if(child.isMesh){
                child.material.color.setHex(0xffffff);
            }
        });
    }
}.bind(AIRPLANES);

