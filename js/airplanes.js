var AIRPLANES = {data: {}, apiRoute : "http://localhost:9000/getData", mainAirplane : null};


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
        // Lat, Long
        
        // WARINING: This can break if timeout deletes airplane at same time
        AIRPLANES.data[airplaneId]['lastseen'] = new Date();
        AIRPLANES.data[airplaneId]['info'] = airplaneInfo;
        AIRPLANES.data[airplaneId]['airplane'].position.x += 10;
        
    }
    else{
        var airplane = AIRPLANES.getNew();
        AIRPLANES.data[airplaneId] = {info : airplaneInfo, airplane: airplane, lastseen: new Date()};
        // Check if airplane is alive after 2 minutes
        this.setAlive(airplaneId);
    }
}
AIRPLANES.setAlive = function(airplaneId){
    setTimeout(()=>{
        this.checkAlive(airplaneId);
    }, 2000 * 60);
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
            this.updateAirplaneData(airplaneInfo);
        });
    });
}

