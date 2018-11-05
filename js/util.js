var imgloader = new THREE.TextureLoader();
async function asyncLoadImg(url){
    return new Promise((resolve, fail) => {
        imgloader.load(url, resolve, null, fail);
    });
}

function deg2rad(val) {
    return (val / 180.0) * Math.PI;
}

async function loadJsonAsync(url) {
    return new Promise( (resolve) => {
        $.getJSON(url, resolve);
    });
}