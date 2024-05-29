"use strict";
import { vec4, vec2, flatten, perspective, lookAt, rotateX, rotateY, scalem, rotateZ, initFileShaders } from './helperfunctions.js';
/* Canvas and webGl */
let gl;
let canvas;
let program;
let bufferID;
/* VShader Attributes */
let vPosition;
let vTexCoord;
let vNormal;
let vShininess;
let vTangent;
/* Uniform Locations */
let umv; //index of my shader uniform
let uproj; //index of projection shader uniform
let uTextureSampler; //Textrue Sampler in fShader
let uNormalSampler; //Textrue Sampler in fShader
let uSpecSampler; //Textrue Sampler in fShader
let uCloudSampler; //Textrue Sampler in fShader
let uNightSampler; //Textrue Sampler in fShader
let MODE; //Lighting Mode
/* Lighting Uniforms */
let ambLight;
let highlightColor;
//Sun Light Uniforms
let sunPos;
let sunColor;
/* Texture Vars */
let earthtex;
let earthimg;
let earthnormaltex;
let earthnormalimg;
let earthspectex;
let earthspecimg;
let earthnighttex;
let earthnightimg;
let cloudtex;
let cloudimg;
/* Matricies */
let MV; //Model View Matrix
let P; //Projection Matrix
/* interaction and rotation state */
let xAngle;
let yAngle;
let mouse_button_down = false;
let prevMouseX = 0;
let prevMouseY = 0;
/* Other vars */
let verts;
let rotation1;
let rotation2;
let curMode;
window.onload = function init() {
    //initialize rotation angles
    xAngle = 0;
    yAngle = 0;
    rotation1 = 0;
    rotation2 = 0;
    curMode = 1;
    /* Setup Canvas and WegGL program */
    canvas = document.getElementById("canvas");
    gl = canvas.getContext('webgl2');
    if (!gl)
        alert("WebGL isn't available");
    program = initFileShaders(gl, "vShader.glsl", "fShader.glsl");
    gl.useProgram(program);
    /* Initialize User interaction Functions */
    canvas.addEventListener("mousedown", mouse_down);
    canvas.addEventListener("mousemove", mouse_drag);
    canvas.addEventListener("mouseup", mouse_up);
    document.getElementById("zoom").oninput = zoom;
    document.getElementById("mode0").onclick = () => { gl.uniform1i(MODE, 1); curMode = 0; };
    document.getElementById("mode1").onclick = () => { gl.uniform1i(MODE, 1); curMode = 1; };
    document.getElementById("mode2").onclick = () => { gl.uniform1i(MODE, 2); curMode = 2; };
    document.getElementById("mode3").onclick = () => { gl.uniform1i(MODE, 3); curMode = 3; };
    document.getElementById("mode5").onclick = () => { gl.uniform1i(MODE, 5); curMode = 5; };
    //Get VShader Attribute Locations
    vPosition = gl.getAttribLocation(program, "vPosition");
    vTexCoord = gl.getAttribLocation(program, "vTexCoord");
    vNormal = gl.getAttribLocation(program, "vNormal");
    vShininess = gl.getAttribLocation(program, "vShininess");
    vTangent = gl.getAttribLocation(program, "vTangent");
    /* Get Uniform locations */
    umv = gl.getUniformLocation(program, "model_view");
    uproj = gl.getUniformLocation(program, "projection");
    uTextureSampler = gl.getUniformLocation(program, "textureMap"); //get reference to sampler2D
    uNormalSampler = gl.getUniformLocation(program, "normalMap"); //get reference to sampler2D
    uSpecSampler = gl.getUniformLocation(program, "specMap"); //get reference to sampler2D
    uNightSampler = gl.getUniformLocation(program, "nightMap"); //get reference to sampler2D
    uCloudSampler = gl.getUniformLocation(program, "cloudMap"); //get reference to sampler2D
    MODE = gl.getUniformLocation(program, "MODE"); //Lighting Mode
    gl.uniform1i(MODE, 1);
    //Initialize ambient light uniform
    ambLight = gl.getUniformLocation(program, "ambLight");
    gl.uniform4fv(ambLight, [.25, .25, .25, 1]); //25% ambient light
    //Initialize Specular Light Uniform
    highlightColor = gl.getUniformLocation(program, "highlightColor");
    gl.uniform4fv(highlightColor, [1, 1, 1, 1]);
    /* Sun Light Uniform Locations */
    sunPos = gl.getUniformLocation(program, "sunPos");
    sunColor = gl.getUniformLocation(program, "sunColor");
    //Initialize Matricies
    MV = lookAt(new vec4(0, 0, 15, 1), //where is the camera positioned
    new vec4(0, 0, 0, 1), // where am i looking at
    new vec4(0, 1, 0, 0)); //which direction is up
    P = perspective(45.0, canvas.clientWidth / canvas.clientHeight, 1.0, 100.0);
    initTextures();
    generateSphere(36, 4);
    requestAnimationFrame(render);
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.enable(gl.DEPTH_TEST);
    window.setInterval(update, 16);
};
/* grab texture files */
function initTextures() {
    earthtex = gl.createTexture();
    earthimg = new Image();
    earthimg.onload = function () { handleTextureLoaded(earthimg, earthtex); };
    earthimg.src = 'earthImages/Earth.png';
    earthnormaltex = gl.createTexture();
    earthnormalimg = new Image();
    earthnormalimg.onload = function () { handleTextureLoaded(earthnormalimg, earthnormaltex); };
    earthnormalimg.src = 'earthImages/EarthNormal.png';
    earthspectex = gl.createTexture();
    earthspecimg = new Image();
    earthspecimg.onload = function () { handleTextureLoaded(earthspecimg, earthspectex); };
    earthspecimg.src = 'earthImages/EarthSpec.png';
    earthnighttex = gl.createTexture();
    earthnightimg = new Image();
    earthnightimg.onload = function () { handleTextureLoaded(earthnightimg, earthnighttex); };
    earthnightimg.src = 'earthImages/EarthNight.png';
    cloudtex = gl.createTexture();
    cloudimg = new Image();
    cloudimg.onload = function () { handleTextureLoaded(cloudimg, cloudtex); };
    cloudimg.src = 'earthImages/earthcloudmap-visness.png';
}
/* handle the texture */
function handleTextureLoaded(image, texture) {
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    let anisotropic_ext = gl.getExtension('EXT_texture_filter_anisotropic');
    gl.texParameterf(gl.TEXTURE_2D, anisotropic_ext.TEXTURE_MAX_ANISOTROPY_EXT, 4);
    gl.bindTexture(gl.TEXTURE_2D, null);
}
//update rotation angles based on mouse movement
function mouse_drag(event) {
    let thetaY, thetaX;
    if (mouse_button_down) {
        thetaY = 360.0 * (event.clientX - prevMouseX) / canvas.clientWidth;
        thetaX = 360.0 * (event.clientY - prevMouseY) / canvas.clientHeight;
        prevMouseX = event.clientX;
        prevMouseY = event.clientY;
        xAngle += thetaX;
        yAngle += thetaY;
    }
    requestAnimationFrame(render);
}
//record that the mouse button is now down
function mouse_down(event) {
    //establish point of reference for dragging mouse in window
    mouse_button_down = true;
    prevMouseX = event.clientX;
    prevMouseY = event.clientY;
    requestAnimationFrame(render);
}
//record that the mouse button is now up, so don't respond to mouse movements
function mouse_up() {
    mouse_button_down = false;
    requestAnimationFrame(render);
}
/* zoom into the scene */
function zoom() {
    var slider = document.getElementById("zoom");
    MV = lookAt(new vec4(0, 0, 15 - slider.valueAsNumber, 1), //where is the camera positioned
    new vec4(0, 0, 0, 1), // where am i looking at
    new vec4(0, 1, 0, 0)); //which direction is up
    document.getElementById("zoomLevel").innerHTML = "Zoom: " + (slider.valueAsNumber).toString();
}
/* Make a sphere and send it over to the graphics card */
function generateSphere(subdiv, radius) {
    let step = (360.0 / subdiv) * (Math.PI / 180.0);
    let sphereverts = [];
    verts = 0;
    for (let lat = 0; lat <= Math.PI; lat += step) { //latitude
        for (let lon = 0; lon + step <= 2 * Math.PI; lon += step) { //longitude
            //triangle 1
            sphereverts.push(new vec4(Math.sin(lat) * Math.cos(lon) * radius, Math.sin(lon) * Math.sin(lat) * radius, Math.cos(lat) * radius, 1.0)); //position
            sphereverts.push(new vec2(1 - (lon / (2 * Math.PI)), lat / Math.PI)); //texture Coordinates
            sphereverts.push(new vec4(Math.sin(lat) * Math.cos(lon) * radius, Math.sin(lon) * Math.sin(lat) * radius, Math.cos(lat) * radius, 0)); //normal
            sphereverts.push(new vec4(-Math.sin(lat) * Math.sin(lon) * radius, Math.cos(lon) * Math.sin(lat) * radius, -Math.sin(lat) * radius, 0)); //tangent
            sphereverts.push(new vec4(Math.sin(lat) * Math.cos(lon + step) * radius, Math.sin(lat) * Math.sin(lon + step) * radius, Math.cos(lat) * radius, 1.0));
            sphereverts.push(new vec2(1 - ((lon + step) / (2 * Math.PI)), lat / Math.PI));
            sphereverts.push(new vec4(Math.sin(lat) * Math.cos(lon + step) * radius, Math.sin(lat) * Math.sin(lon + step) * radius, Math.cos(lat) * radius, 0));
            sphereverts.push(new vec4(-Math.sin(lat) * Math.sin(lon + step) * radius, Math.cos(lat) * Math.sin(lon + step) * radius, -Math.sin(lat) * radius, 0));
            sphereverts.push(new vec4(Math.sin(lat + step) * Math.cos(lon + step) * radius, Math.sin(lon + step) * Math.sin(lat + step) * radius, Math.cos(lat + step) * radius, 1.0));
            sphereverts.push(new vec2(1 - ((lon + step) / (2 * Math.PI)), (lat + step) / Math.PI));
            sphereverts.push(new vec4(Math.sin(lat + step) * Math.cos(lon + step) * radius, Math.sin(lon + step) * Math.sin(lat + step) * radius, Math.cos(lat + step) * radius, 0));
            sphereverts.push(new vec4(-Math.sin(lat + step) * Math.sin(lon + step) * radius, Math.cos(lon + step) * Math.sin(lat + step) * radius, -Math.sin(lat + step) * radius, 0));
            //triangle 2
            sphereverts.push(new vec4(Math.sin(lat + step) * Math.cos(lon + step) * radius, Math.sin(lon + step) * Math.sin(lat + step) * radius, Math.cos(lat + step) * radius, 1.0));
            sphereverts.push(new vec2(1 - ((lon + step) / (2 * Math.PI)), (lat + step) / Math.PI));
            sphereverts.push(new vec4(Math.sin(lat + step) * Math.cos(lon + step) * radius, Math.sin(lon + step) * Math.sin(lat + step) * radius, Math.cos(lat + step) * radius, 0));
            sphereverts.push(new vec4(-Math.sin(lat + step) * Math.sin(lon + step) * radius, Math.cos(lon + step) * Math.sin(lat + step) * radius, -Math.sin(lat + step) * radius, 0));
            sphereverts.push(new vec4(Math.sin(lat + step) * Math.cos(lon) * radius, Math.sin(lat + step) * Math.sin(lon) * radius, Math.cos(lat + step) * radius, 1.0));
            sphereverts.push(new vec2(1 - (lon / (2 * Math.PI)), (lat + step) / Math.PI));
            sphereverts.push(new vec4(Math.sin(lat + step) * Math.cos(lon) * radius, Math.sin(lat + step) * Math.sin(lon) * radius, Math.cos(lat + step) * radius, 0));
            sphereverts.push(new vec4(-Math.sin(lat + step) * Math.sin(lon) * radius, Math.cos(lat + step) * Math.sin(lon) * radius, -Math.sin(lat + step) * radius, 0));
            sphereverts.push(new vec4(Math.sin(lat) * Math.cos(lon) * radius, Math.sin(lon) * Math.sin(lat) * radius, Math.cos(lat) * radius, 1.0));
            sphereverts.push(new vec2(1 - (lon / (2 * Math.PI)), lat / Math.PI));
            sphereverts.push(new vec4(Math.sin(lat) * Math.cos(lon) * radius, Math.sin(lon) * Math.sin(lat) * radius, Math.cos(lat) * radius, 0));
            sphereverts.push(new vec4(-Math.sin(lat) * Math.sin(lon) * radius, Math.cos(lon) * Math.sin(lat) * radius, -Math.sin(lat) * radius, 0));
            verts += 6;
        }
    }
    bufferID = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferID);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(sphereverts), gl.STATIC_DRAW);
    gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 56, 0);
    gl.enableVertexAttribArray(vPosition);
    gl.vertexAttribPointer(vTexCoord, 2, gl.FLOAT, false, 56, 16);
    gl.enableVertexAttribArray(vTexCoord);
    gl.vertexAttribPointer(vNormal, 4, gl.FLOAT, false, 56, 24);
    gl.enableVertexAttribArray(vNormal);
    gl.vertexAttribPointer(vTangent, 4, gl.FLOAT, false, 56, 40);
    gl.enableVertexAttribArray(vTangent);
}
/* what to do on each fps */
function update() {
    var scaler = 1;
    rotation1 += scaler * .3;
    rotation2 += scaler * .1;
    requestAnimationFrame(render);
}
/* render a frame */
function render() {
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.uniformMatrix4fv(uproj, false, P.flatten());
    //Grab the base Model View matrix to start with
    let mv = MV;
    //Rotate based on the user input
    mv = mv.mult(rotateY(yAngle));
    mv = mv.mult(rotateX(xAngle));
    //The sun should not be tilted with the earth
    let lightMV = mv;
    //The earth is tilted :)
    mv = mv.mult(rotateZ(-23.5));
    let mv2 = mv;
    mv2 = mv2.mult(rotateY(rotation2));
    mv = mv.mult(rotateY(rotation1));
    mv = mv.mult(rotateX(90));
    gl.uniform4fv(sunPos, lightMV.mult(new vec4(15, 0, 0, 1)).flatten());
    gl.uniform4fv(sunColor, [1, 1, 1, 1]);
    gl.uniformMatrix4fv(umv, false, mv.flatten());
    gl.vertexAttrib1f(vShininess, 15);
    /* Bind Textures */
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, earthtex);
    gl.uniform1i(uTextureSampler, 0);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, earthnighttex);
    gl.uniform1i(uNightSampler, 1);
    gl.activeTexture(gl.TEXTURE2);
    gl.bindTexture(gl.TEXTURE_2D, earthnormaltex);
    gl.uniform1i(uNormalSampler, 2);
    gl.activeTexture(gl.TEXTURE3);
    gl.bindTexture(gl.TEXTURE_2D, earthspectex);
    gl.uniform1i(uSpecSampler, 3);
    gl.activeTexture(gl.TEXTURE4);
    gl.bindTexture(gl.TEXTURE_2D, cloudtex);
    gl.uniform1i(uCloudSampler, 4);
    /* End Bind Textures */
    //bind the buffer
    gl.bindBuffer(gl.ARRAY_BUFFER, bufferID);
    //Draw all our verts in the buffer
    gl.drawArrays(gl.TRIANGLES, 0, verts);
    mv2 = mv2.mult(rotateY(rotation2));
    mv2 = mv2.mult(rotateX(90));
    if (curMode == 1) {
        gl.uniformMatrix4fv(umv, false, mv2.mult(scalem(1.01, 1.01, 1.01)).flatten());
        gl.uniform1i(MODE, 4);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        gl.depthMask(false);
        gl.bindBuffer(gl.ARRAY_BUFFER, bufferID);
        gl.drawArrays(gl.TRIANGLES, 0, verts);
        gl.disable(gl.BLEND);
        gl.depthMask(true);
        gl.uniform1i(MODE, 1);
    }
}
//# sourceMappingURL=helloWorld.js.map