#version 300 es

in vec4 vPosition; //Vertex Position
in vec2 vTexCoord; //Texture Coordinates for this vertex
in vec4 vNormal; //Normal vector for the vertex
in vec4 vTangent; //Tangent vector for the vertex
in float vShininess; //Specular Exponent for Vertex

uniform mat4 model_view; //Model View matrix
uniform mat4 projection; //Projection Matrix

out vec2 ftexCoord; //Send the texture coordinates to the fShader
out vec4 fNormal; //Send the normal vector to the fShader
out vec4 fTangent; //Send the tangent vector to the fShader
out vec4 eyepos; //Convert to eyespace and send to fShader
out float fShininess; //Specular Exponent sent to fShader
out float nightTime;
out vec4 position;

void main() {
    gl_Position = projection * model_view * vPosition; //Place the vertex

    ftexCoord = vTexCoord; //Send over the texture coordinates
    fNormal = normalize(model_view * vNormal); //normalize the normal vector in eyespace and send to fragment shader
    fTangent = normalize(model_view * vTangent); //normalize the tangent vector in eyespace and send to fragment shader
    eyepos = model_view * vPosition; //convert to eye space
    fShininess = vShininess; //Send spec Exponent to fShader
    position = vPosition;
}