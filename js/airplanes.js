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
        }, 10000);
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
        AIRPLANES.data[airplaneId]['info'] = airplaneInfo;
        AIRPLANES.data[airplaneId]['airplane'].position.x += 10;
    }else{
        var airplane = AIRPLANES.getNew();
        AIRPLANES.data[airplaneId] = {info : airplaneInfo, airplane: airplane};
    }
}

// Should be called every 10 sec.
AIRPLANES.updateData = function(){
    $.getJSON(this.apiRoute,(airplanes)=>{
        airplanes.forEach(airplaneInfo => {
            this.updateAirplaneData(airplaneInfo);
        });
    });
}

