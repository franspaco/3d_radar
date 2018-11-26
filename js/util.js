var imgloader = new THREE.TextureLoader();
async function asyncLoadImg(url){
    return new Promise((resolve, fail) => {
        imgloader.load(url, resolve, null, fail);
    });
}

function deg2rad(val) {
    return (val / 180.0) * Math.PI;
}

function rad2deg(val) {
    return (val / Math.PI) * 180;
}

async function loadJsonAsync(url) {
    return new Promise( (resolve) => {
        $.getJSON(url, resolve);
    });
}

function default_value(value){
    return (value !== undefined)? value : "";
}

function get_route(from, to){
    if( from !== undefined && to !== undefined){
        return from.substring(0, 4) + '-' + to.substring(0, 4);
    }
    else{
        return '';
    }
}

function make_table_data(airplaneInfo){
    return [
        airplaneInfo.Id,
        default_value(airplaneInfo.Icao),
        default_value(airplaneInfo.Call),
        default_value(airplaneInfo.Reg),
        default_value(airplaneInfo.Type),
        get_route(airplaneInfo.From, airplaneInfo.To),
        (airplaneInfo.Lat === undefined) ? "No": "Yes",
    ]
}

function nround(val){
    return Math.round(val*1000) / 1000;
}