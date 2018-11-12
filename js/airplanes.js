var AIRPLANES = {
    // Store airplane data
    data: {}, 
    // API route
    apiRoute : "https://franspaco.azurewebsites.net/api/JSON_Out", 
    // Airplane Object, later copied
    mainAirplane : null,
    // Map ranges
    range_long : {a: -97.55859375, b: -100.546875},
    range_lat : {a: 20.79720143430699, b: 17.97873309555617},
    range_map : {c: 85, d: -85}
};



AIRPLANES.setup = async function(){
    var loader = new THREE.FBXLoader();
    loader.load( 'objects/Boeing_787/B_787_8.fbx', function ( airplane ){
        // airplane.scale.set(.0001,.0001,.0001);
        airplane.scale.set(.001,.001,.001);
        airplane.position.y += 10;
        
        AIRPLANES.mainAirplane = airplane;
        
        AIRPLANES.updateData();

        setInterval(()=>{
            AIRPLANES.updateData();
        }, 1000 * 10);
    });
}

AIRPLANES.getNew = function(){
    return this.mainAirplane.clone();
}

AIRPLANES.previouslySeen = function(airplaneId){
    return (airplaneId in AIRPLANES.data);
}

AIRPLANES.updateAirplaneData = function(airplaneInfo){
    airplaneId = airplaneInfo['Icao'];

    if(this.previouslySeen(airplaneId)){
        // WARINING: This can break if timeout deletes airplane at same time
        AIRPLANES.data[airplaneId]['lastseen'] = new Date();
        AIRPLANES.data[airplaneId]['info'] = airplaneInfo;        
    }
    else{
        var airplane = AIRPLANES.getNew();
        AIRPLANES.data[airplaneId] = {info : airplaneInfo, airplane: airplane, lastseen: new Date()};
        // Check if airplane is alive after 2 minutes
        this.setAlive(airplaneId);
        APP.scene.add(airplane);
    }
    
    if(airplaneInfo['Long'] && airplaneInfo['Lat'] && airplaneInfo['Alt']){
        var coordinates = this.transformCoordinates(airplaneInfo['Long'], airplaneInfo['Lat'], airplaneInfo['Alt']);
        AIRPLANES.data[airplaneId]['airplane'].position.x = coordinates.x;
        AIRPLANES.data[airplaneId]['airplane'].position.z = coordinates.z;
        AIRPLANES.data[airplaneId]['airplane'].position.y = coordinates.y;
    }
}
AIRPLANES.setAlive = function(airplaneId){
    setTimeout(()=>{
        this.checkAlive(airplaneId);
    }, 2000 * 60);
}

AIRPLANES.mapDomain = function(e, a, b, c, d){
    return (e - b) / (a-b) * (c-d) + d;
}


AIRPLANES.transformCoordinates = function(long, lat, alt){
    return {
        x: this.mapDomain(long, this.range_long.a, this.range_long.b, this.range_map.c, this.range_map.d), 
        z: this.mapDomain(lat, this.range_lat.a, this.range_lat.b, this.range_map.c, this.range_map.d),
        y: alt * 0.0003048 * 1.5
    };   
}

AIRPLANES.checkAlive = function(airplaneId){
    // If 2 minutes have passed since last seen airplane, delete from data. Else, check again in 2 minues
    if((new Date() - AIRPLANES.data[airplaneId]['lastseen'])/60000 > 2){
        delete AIRPLANES.data[airplaneId];
    }
    else this.setAlive(airplaneId);
    
}

// Should be called every 10 sec.
AIRPLANES.updateData = function(){
    $.getJSON(this.apiRoute,(airplanes)=>{
        airplanes.forEach(airplaneInfo => {
            console.log(airplaneInfo['Alt']);
            this.updateAirplaneData(airplaneInfo);
        });
    });
}

