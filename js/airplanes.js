/// <reference path="../types/three/index.d.ts" />

var AIRPLANES = {
    // Store airplane data
    data: {}, 
    // API route
    apiRoute : "https://franspaco.azurewebsites.net/airplanes", 
    // Airplane Object, later copied
    mainAirplane : null,
    selected: null,
};



AIRPLANES.setup = async function(){
    var loader = new THREE.FBXLoader();
    AIRPLANES.mainAirplane = await loader.asyncLoad('objects/Boeing_787/B_787_8.fbx');
    // AIRPLANES.mainAirplane = await loader.asyncLoad('objects/Boeing_787/787_no_gear_2.fbx');
    AIRPLANES.mainAirplane.scale.multiplyScalar(0.0002);

    console.log(AIRPLANES.mainAirplane);

    AIRPLANES.mainAirplane.traverse((child) =>{
        if(child.isMesh){
            child.material.transparent = false;
            child.material.color.setHex(0xff0000);
        }
    });

    AIRPLANES.updateData();

    setInterval(()=>{
        AIRPLANES.updateData();
    }, 1000 * 3);
}

AIRPLANES.getNew = function(){
    // return this.mainAirplane.clone();
    return cloneFbx(this.mainAirplane);
}

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
            AIRPLANES.data[airplaneId].status = 'alive';
            APP.scene.add(AIRPLANES.data[airplaneId].airplane);
        }
        
    }
    else{
        var airplane = AIRPLANES.getNew();
        var geometry = new THREE.BufferGeometry();
        var positions = new Float32Array( APP.constants.max_trail_length * 3 );
        geometry.addAttribute( 'position', new THREE.BufferAttribute( positions, 3 ) );
        geometry.setDrawRange( 0, 0 );
        var material = APP.materials.line;
        if(airplaneInfo.To && airplaneInfo.To.startsWith("MMMX")){
            material = APP.materials.line_to;
        }
        else if(airplaneInfo.From && airplaneInfo.From.startsWith("MMMX")){
            material = APP.materials.line_from;
        }
        var trail = new THREE.Line(geometry, material);

        var table_data = [
            airplaneId,
            default_value(airplaneInfo.Icao),
            default_value(airplaneInfo.Call),
            default_value(airplaneInfo.Reg),
            default_value(airplaneInfo.Type),
            get_route(airplaneInfo.From, airplaneInfo.To)
        ];

        airplane.name = airplaneId;
        AIRPLANES.data[airplaneId] = {
            info : airplaneInfo,
            airplane: airplane,
            lastseen: new Date(),
            trail: trail,
            trailLength: 0,
            status: 'alive',
            table_data: table_data
        };
        APP.scene.add(airplane);
        APP.scene.add(trail);

        AIRPLANES.data[airplaneId].node = APP.table.row.add(table_data).draw(false).node();
    }
    
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
    }
}
AIRPLANES.setAlive = function(airplaneId){
    setTimeout(()=>{
        this.checkAlive(airplaneId);
    }, 2000 * 60);
}

AIRPLANES.mapDomain = function(value, Imax, Imin, Omax, Omin){
    return (value - Imin) / (Imax - Imin) * ( Omax - Omin) + Omin;
}


AIRPLANES.transformCoordinates = function(long, lat, alt){
    return {
        x: this.mapDomain(long, APP.constants.range_long.a, APP.constants.range_long.b, APP.constants.range_map.b, APP.constants.range_map.a), 
        z: this.mapDomain(lat, APP.constants.range_lat.a, APP.constants.range_lat.b, APP.constants.range_map.b, APP.constants.range_map.a),
        // Feet to Km by the scaling factor for the height
        y: alt * 0.0003048 * APP.constants.height_scaling + 0.1
    };   
}

AIRPLANES.checkAlive = function(airplaneId, timestamp, mins_limit){
    // If 2 minutes have passed since last seen airplane, delete from data. Else, check again in 2 minues
    if((timestamp - AIRPLANES.data[airplaneId]['lastseen'])/60000 > mins_limit){
        return false;
    }
    return true;
    
}

AIRPLANES.remove_old = function(){
    var now = new Date();
    for (const airplaneId in AIRPLANES.data) {
        if (AIRPLANES.data.hasOwnProperty(airplaneId) && AIRPLANES.data[airplaneId].status == 'alive') {
            // Check if alive and we haven't received anything in the last 1.5 minutes
            if(AIRPLANES.data[airplaneId].status == 'alive' && !this.checkAlive(airplaneId, now, 1.5)) {
                console.log('Hiding: ' + AIRPLANES.data[airplaneId].info.Icao);
                    // Remove the airplane model
                    APP.scene.remove(AIRPLANES.data[airplaneId].airplane);
                    // Trail is left in the scene until permanent removal
                    // Set status to removed
                    AIRPLANES.data[airplaneId].status = 'removed';

                    //
                    APP.table.row(AIRPLANES.data[airplaneId].status.node).remove().draw(false);
            }
            // Check if removed and we haven't received anything in the last 5 minutes
            else if(AIRPLANES.data[airplaneId].status == 'removed' && !this.checkAlive(airplaneId, now, 5)){
                // If we haven't seen it in >5 minutes delete all data
                console.log('Erasing: ' + AIRPLANES.data[airplaneId].info.Icao);
                // Remove the trail
                APP.scene.remove(AIRPLANES.data[airplaneId].airplane);
                // Delete all remaining data
                delete AIRPLANES.data[airplaneId];
            }
        }
    }
}

AIRPLANES.updateData = function(){
    $.getJSON(this.apiRoute,(data)=>{
        data.acList.forEach(airplaneInfo => {
            this.updateAirplaneData(airplaneInfo);
        });
    });
    this.remove_old();
}

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

