#version 300 es
precision mediump float;

/* Input from vShader */
in vec4 fNormal; //Normal vector sent in from vShader
in vec4 fTangent; //Tangent vector sent in from vShader
in vec2 ftexCoord; //Texture Coordinate sent in from vShader
in vec4 eyepos; //Eyespace camera position
in float fShininess; //Specular Exponent for fragment
in float nightTime;
in vec4 position;

/* Other Uniforms */
uniform int MODE;

/* Tecture Uniforms */
uniform sampler2D textureMap; //Uniform Texture Sampler (Texture we get the color from)
uniform sampler2D normalMap; //Uniform Normal Map (We get our Normal Vectors form here)
uniform sampler2D specMap; //Uniform Normal Map
uniform sampler2D nightMap; //Uniform Night Texture Map
uniform sampler2D cloudMap; //Uniform Cloud Texture Map

/* Lighting Uniforms */
uniform vec4 ambLight; //how much ambient light do we want
uniform vec4 highlightColor; //highlight color for specular reflection

/* Sun Uniforms */
uniform vec4 sunPos; //Position of the sun
uniform vec4 sunColor; //Sun's Color

/* Output Values */
out vec4 fColor; //Output color for the fragment

void main() {
    vec4 outColor = vec4(0,0,0,0); //Initialize empty color

    vec3 to = normalize(sunPos.xyz - eyepos.xyz); //Vector to fragment to the light
    vec3 from = normalize(-eyepos.xyz); //Vector from the fragment to the light

    vec3 Normal = normalize(fNormal.xyz); //Normal vector
    vec3 Tangent = normalize(fTangent.xyz); //Tangent vector
    vec3 Binormal = cross(Normal, Tangent); //Binormal Vector
    mat4 changeMatrix = mat4(vec4(Tangent,0),vec4(Binormal,0),vec4(Normal,0),vec4(0,0,0,1)); //This will transform from local space (normal map values) to eye space

    /* Texture Color */
    vec4 textureColor = texture(textureMap, ftexCoord);

    /* Get value from Normal Map */
    vec4 normalMapValue = texture(normalMap,ftexCoord);
    normalMapValue = 2.0 * normalMapValue - 1.0;
    vec4 texNormal = changeMatrix * normalMapValue;

    vec3 reflection = reflect(-to, texNormal.xyz); //reflection vector off of fragment

    if(MODE == 1){ //Full Lighting Mode
        float day = (max(dot(to,texNormal.xyz), 0.0));
        float night  = 1.0 - day;
        vec4 color  = (textureColor * day) + (2.0*texture(nightMap,ftexCoord)*night);
        vec4 amb = color*ambLight;
        vec4 diff = max(dot(to, texNormal.xyz), 0.0) * color * sunColor; //Diffuse light
        vec4 spec = pow(max(dot(reflection, from), 0.0), fShininess) * texture(specMap, ftexCoord) * sunColor; //Specular light
        outColor += amb + diff + (spec*.5);
    }
    if(MODE == 2){ //Just the Map
        outColor += texture(textureMap, ftexCoord);
    }
    if(MODE == 3){ //Normal Map View
        vec4 amb = vec4(.5,.5,.5,1)*ambLight;
        vec4 diff = max(dot(to, texNormal.xyz), 0.0) * vec4(.5,.5,.5,1) * sunColor; //Diffuse light
        vec4 spec = pow(max(dot(reflection, from), 0.0), fShininess) * texture(specMap, ftexCoord) * sunColor; //Specular light
        outColor += amb + diff + (spec*.5);
    }
    if(MODE == 4){ //cloud Map View
        vec4 amb = texture(cloudMap, ftexCoord) * (ambLight);
        vec4 diff = max(dot(to, fNormal.xyz), 0.0) * texture(cloudMap, ftexCoord) * sunColor; //Diffuse light
        outColor += diff;
    }
    if(MODE == 5){ //spec Map View
        vec4 spec = pow(max(dot(reflection, from), 0.0), fShininess) * texture(specMap, ftexCoord) * sunColor; //Specular light
        outColor += vec4(0,0,0,1)+spec;
    }


    fColor = outColor; //Send out the color for this fragment
}