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
    imgApiRoute: "https://franspaco.azurewebsites.net/api/plane-pictures?m=",
    rate: 3000, // miliseconds
    // Airplane Object, later copied
    mainAirplane : null,
    mainHeli : null,
    selected: null,
    hid_time: 1.5, // minutes
    delete_time: 5, //minutes
    airplane_colors: {
        default: 0xff0000,
        selected: 0xffffff,
    },
    trail_colors: {
        selected:   new THREE.Color(0xffffff),
        arrivals:   new THREE.Color(0x00d0ff),
        departures: new THREE.Color(0x88ff00),
        unknown:    new THREE.Color(0xff00c3),
        other:      new THREE.Color(0xff8800),
    },
};



AIRPLANES.setup = async function(){
    $('#c-selected').css({'background-color': '#'+this.trail_colors.selected.getHexString()});
    $('#c-arrivals').css({'background-color': '#'+this.trail_colors.arrivals.getHexString()});
    $('#c-departures').css({'background-color': '#'+this.trail_colors.departures.getHexString()});
    $('#c-other').css({'background-color': '#'+this.trail_colors.other.getHexString()});
    $('#c-unknown').css({'background-color': '#'+this.trail_colors.unknown.getHexString()});

    var loader = new THREE.FBXLoader();

    // Base Airplane Model
    var texture_787 = THREE.ImageUtils.loadTexture('objects/Boeing_787/texture.png');
    AIRPLANES.mainAirplane = await loader.asyncLoad('objects/Boeing_787/787_1.fbx');
    AIRPLANES.mainAirplane.scale.multiplyScalar(0.0002);
    AIRPLANES.mainAirplane.traverse((child) =>{
        if(child.isMesh){
            child.material.transparent = false;
            child.material.color.setHex(AIRPLANES.airplane_colors.default);
            child.material.map = texture_787;
        }
    });

    // Base Helicopter Model
    AIRPLANES.mainHeli = await loader.asyncLoad('objects/Helicopter/heli.fbx');
    AIRPLANES.mainHeli.traverse((child) =>{
        if(child.isMesh){
            child.material.transparent = false;
            child.material.color.setHex(AIRPLANES.airplane_colors.default);
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

AIRPLANES.get_trail_color = function(airplaneInfo){
    var trail_color = AIRPLANES.trail_colors.unknown;
    if(airplaneInfo.To && airplaneInfo.To.startsWith("MMMX")){
        trail_color = AIRPLANES.trail_colors.arrivals;
    }
    else if(airplaneInfo.From && airplaneInfo.From.startsWith("MMMX")){
        trail_color = AIRPLANES.trail_colors.departures;
    }
    else if(airplaneInfo.To || airplaneInfo.From){
        trail_color = AIRPLANES.trail_colors.other;
    }
    return trail_color;
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
            // Check if we have new route data
            if(AIRPLANES.data[airplaneId].route === ''){
                if(airplaneInfo.To && airplaneInfo.From){
                    AIRPLANES.data[airplaneId].route = get_route(airplaneInfo.From, airplaneInfo.To);
                    AIRPLANES.data[airplaneId].trail_color = this.get_trail_color(airplaneInfo);
                    AIRPLANES.data[airplaneId].trail.material.color = AIRPLANES.data[airplaneId].trail_color;
                }
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
        var trail_color = this.get_trail_color(airplaneInfo);
        var material = new THREE.LineBasicMaterial({color: trail_color});
        // Create trail object
        var trail = new THREE.Line(geometry, material);
        // This makes lines not dissappear
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
            status: 'alive',
            trail_color: trail_color,
            route: get_route(airplaneInfo),
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
        var coordinates = this.transformCoordinates(airplaneInfo['Long'], airplaneInfo['Lat'], airplaneInfo['GAlt']);

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
        y: alt * 0.0003048 * APP.constants.height_scaling
    };   
}

// Checks if an airplane's last update is within mins_limit of a given timestamp
AIRPLANES.checkAlive = function(airplaneId, timestamp, mins_limit){
    return !((timestamp - AIRPLANES.data[airplaneId]['lastseen'])/60000 > mins_limit);
}

AIRPLANES.query = function(value = null, max_age=Infinity){
    var now = new Date();
    var out = [];
    // Iterate over all the planes in the cache
    for (const airplaneId in AIRPLANES.data) {
        if (AIRPLANES.data.hasOwnProperty(airplaneId)) {
            const airplane = AIRPLANES.data[airplaneId];
            if(value === null || airplane.status === value){
                if(this.checkAlive(airplaneId, now, max_age)){
                    out.push(airplane);
                }
            }
        }
    }
    return out;
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
                child.material.color.setHex(AIRPLANES.airplane_colors.default);
            }
        });
        AIRPLANES.data[this.selected].trail.material.color = AIRPLANES.data[this.selected].trail_color;
    }
    this.selected = id;
    if(this.selected != null && AIRPLANES.data.hasOwnProperty(this.selected)){
        AIRPLANES.data[this.selected].airplane.traverse((child) => {
            if(child.isMesh){
                child.material.color.setHex(AIRPLANES.airplane_colors.selected);
            }
        });
        AIRPLANES.data[this.selected].trail.material.color = AIRPLANES.trail_colors.selected;
    }
    this.display_selected_data(id);
}.bind(AIRPLANES);

AIRPLANES.display_selected_data = function(id){
    if(id != null && AIRPLANES.data.hasOwnProperty(id)){
        const data = AIRPLANES.data[id].info;
        APP.panel.icao.text(data.Icao);
        APP.panel.callsign.text(data.Call);
        APP.panel.op.text(data.Op);
        APP.panel.model.text(data.Mdl);
        APP.panel.altitude.text(data.GAlt + ' ft');
        APP.panel.speed.text(default_value(data.Spd) + ' knots');
        APP.panel.from.text(default_value(data.From));
        APP.panel.to.text(default_value(data.To));
        APP.show_panel(true);
        $.getJSON(this.imgApiRoute + data.Icao, (data) => {
            console.log(data);
            if(data.status === 200 && data.data){
                APP.panel.img.attr('src', data.data[0].image);
                APP.panel.img.attr('alt', 'Copyright © ' + data.data[0].photographer);
                APP.panel.img.attr('title', 'Copyright © ' + data.data[0].photographer);
                APP.panel.imglink.attr('href', data.data[0].link);
            }
            else {
                APP.panel.img.attr('src', '');
                APP.panel.img.attr('alt', '');
                APP.panel.img.attr('title', '');
                APP.panel.imglink.attr('href', '');
            }
        });
    }
    else {
        APP.show_panel(false);
    }
}

