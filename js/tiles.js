/// <reference path="../types/three/index.d.ts" />

function makeTile(data, tile_size, material, scaling, heigh_scale){
    var geometry = new THREE.PlaneGeometry(scaling, scaling, tile_size-1, tile_size-1);
    var index = 0;
    for (let i = 0; i < data.length; i++) {
        for (let j = 0; j < data.length; j++) {
            geometry.vertices[index].z = data[i][j]*heigh_scale;
            index++;
        }
    }
    var mesh = new THREE.Mesh(geometry, material);
    mesh.rotateX(deg2rad(-90));
    return mesh;
}

