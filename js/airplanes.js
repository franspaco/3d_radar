/// <reference path="../types/three/index.d.ts" />

var AIRPLANES = {
    // Store airplane data
    data: {}, 
    // API route
    apiRoute : "https://franspaco.azurewebsites.net/airplanes", 
    // Airplane Object, later copied
    mainAirplane : null,
};



AIRPLANES.setup = async function(){
    var loader = new THREE.FBXLoader();
    AIRPLANES.mainAirplane = await loader.asyncLoad('objects/Boeing_787/B_787_8.fbx');
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

    // loader.load( 'objects/Boeing_787/B_787_8.fbx', function ( airplane ){
    //     // airplane.scale.set(.0001,.0001,.0001);
    //     airplane.scale.multiplyScalar(0.0005)
    //     // airplane.scale.set(.001,.001,.001);
    //     // airplane.position.y += 10;
        
    //     AIRPLANES.mainAirplane = airplane;
        
    //     AIRPLANES.updateData();

    //     setInterval(()=>{
    //         AIRPLANES.updateData();
    //     }, 1000 * 3);
    // });
    // console.log(this.transformCoordinates(-99.052734375, 19.38796726493158, 0));
    // var pos = this.transformCoordinates(-99.136610, 19.784679, 0);
    // console.log(pos);
    // var lol = new THREE.Mesh(new THREE.SphereGeometry(2, 10, 10), new THREE.MeshBasicMaterial({color:0xffffff}))
    // APP.scene.add(lol);
    // lol.position.x = pos.x;
    // lol.position.z = pos.z;
    // lol.position.y = 1;

}

AIRPLANES.getNew = function(){
    return this.mainAirplane.clone();
}

AIRPLANES.previouslySeen = function(airplaneId){
    return (airplaneId in AIRPLANES.data);
}

AIRPLANES.updateAirplaneData = function(airplaneInfo){
    airplaneId = airplaneInfo['Id'];

    if(this.previouslySeen(airplaneId)){
        // WARINING: This can break if timeout deletes airplane at same time
        AIRPLANES.data[airplaneId]['lastseen'] = new Date();
        AIRPLANES.data[airplaneId]['info'] = airplaneInfo;        
    }
    else{
        var airplane = AIRPLANES.getNew();
        airplane.name = airplaneId;
        AIRPLANES.data[airplaneId] = {info : airplaneInfo, airplane: airplane, lastseen: new Date()};
        // Check if airplane is alive after 2 minutes
        // this.setAlive(airplaneId);
        APP.scene.add(airplane);
    }
    
    if(airplaneInfo['Long'] && airplaneInfo['Lat'] && airplaneInfo['Alt']){
        var coordinates = this.transformCoordinates(airplaneInfo['Long'], airplaneInfo['Lat'], airplaneInfo['Alt']);
        AIRPLANES.data[airplaneId]['airplane'].position.x = coordinates.x;
        AIRPLANES.data[airplaneId]['airplane'].position.z = coordinates.z;
        AIRPLANES.data[airplaneId]['airplane'].position.y = coordinates.y + 0.1;
        AIRPLANES.data[airplaneId]['airplane'].rotation.y = deg2rad( 180 - airplaneInfo['Trak']);
        // console.log(airplaneInfo['Icao']);
        // console.log(180 - airplaneInfo['Trak']);
        // console.log(airplaneInfo['Trak']);
        // console.log(airplaneInfo['TrkH'])
        // console.log('\n\n')
    }
    // console.log(AIRPLANES.data[853987]);
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
        y: alt * 0.0003048 * APP.constants.height_scaling
    };   
}

AIRPLANES.checkAlive = function(airplaneId, timestamp){
    // If 2 minutes have passed since last seen airplane, delete from data. Else, check again in 2 minues
    if((timestamp - AIRPLANES.data[airplaneId]['lastseen'])/60000 > 2){
        return false;
        // delete AIRPLANES.data[airplaneId];
    }
    return true;
    
}

AIRPLANES.remove_old = function(){
    var now = new Date();
    for (const airplaneId in AIRPLANES.data) {
        if (AIRPLANES.data.hasOwnProperty(airplaneId)) {
            if(!this.checkAlive(airplaneId)){
                delete AIRPLANES.data[airplaneId];
                APP.scene.remove(airplaneId);
            }
        }
    }
}

// Should be called every 10 sec.
AIRPLANES.updateData = function(){
    $.getJSON(this.apiRoute,(data)=>{
        data.acList.forEach(airplaneInfo => {
            this.updateAirplaneData(airplaneInfo);
        });
    });
    this.remove_old();
}

