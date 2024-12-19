"use strict";

import { parseOBJ, parseMTL } from './parser.js';
import { vs, fs } from './shaders.js';

// Adjust bg color
const bgColor = document.getElementById('bg-color');
let clearColor = [255, 255, 255, 1];
if (bgColor) {
  bgColor.addEventListener('input', (e) => {
    const color = e.target.value;
    const r = parseInt(color.substr(1, 2), 16) / 255;
    const g = parseInt(color.substr(3, 2), 16) / 255;
    const b = parseInt(color.substr(5, 2), 16) / 255;
    clearColor = [r, g, b, 1];
  });

  // Set initial background color
  const initialColor = bgColor.value;
  console.log(initialColor);
  const r = parseInt(initialColor.substr(1, 2), 16) / 255;
  const g = parseInt(initialColor.substr(3, 2), 16) / 255;
  const b = parseInt(initialColor.substr(5, 2), 16) / 255;
  clearColor = [r, g, b, 1];
} else {
  console.warn('Element with id "bg-color" not found');
}

// Adjust light color
const lightColor = document.getElementById('light-color');
let lightColorInput = [255, 255, 255];
if (lightColor) {
  lightColor.addEventListener('input', (e) => {
    const color = e.target.value;
    const r = parseInt(color.substr(1, 2), 16);
    const g = parseInt(color.substr(3, 2), 16);
    const b = parseInt(color.substr(5, 2), 16);
    lightColorInput = [r, g, b];
    console.log(lightColorInput);
  });

  // Set initial light color
  const initialColor = lightColor.value;
  const r = parseInt(initialColor.substr(1, 2), 16);
  const g = parseInt(initialColor.substr(3, 2), 16);
  const b = parseInt(initialColor.substr(5, 2), 16);
  lightColorInput = [r, g, b];
} else {
  console.warn('Element with id "light-color" not found');
}

const intensity = document.getElementById('light-intensity');
let defaultIntensity = 1;

if (intensity) {
  intensity.addEventListener('input', (e) => {
    defaultIntensity = parseFloat(e.target.value);
  });
}

async function main() {
  const canvas = document.getElementById('myCanvas');
  const gl = canvas.getContext('webgl');
  
  if (!gl) {
    console.error('WebGL is not supported in your browser');
    return;
  }

  const meshProgramInfo = webglUtils.createProgramInfo(gl, [vs, fs]);
  const objHref = './obj/dust_bin.obj';
  const response = await fetch(objHref);
  const text = await response.text();
  
  const obj = parseOBJ(text);
  const baseHref = new URL(objHref, window.location.href);
  const matTexts = await Promise.all(obj.materialLibs.map(async filename => {
    const matHref = new URL(filename, baseHref).href;
    const response = await fetch(matHref);
    return await response.text();
  }));
  const materials = parseMTL(matTexts.join('\n'));

  const defaultMaterial = {
    diffuse: [1, 1, 1],
    ambient: [0, 0, 0],
    specular: [1, 1, 1],
    shininess: 400,
    opacity: 1,
  };

  const parts = obj.geometries.map(({ material, data }) => {
    if (data.color) {
      if (data.position.length === data.color.length) {
        data.color = { numComponents: 3, data: data.color };
      }
    } else {
      data.color = { value: [1, 1, 1, 1] };
    }

    const bufferInfo = webglUtils.createBufferInfoFromArrays(gl, data);
    return {
      material: materials[material],
      bufferInfo,
    };
  });

  function getExtents(positions) {
    const min = positions.slice(0, 3);
    const max = positions.slice(0, 3);
    for (let i = 3; i < positions.length; i += 3) {
      for (let j = 0; j < 3; ++j) {
        const v = positions[i + j];
        min[j] = Math.min(v, min[j]);
        max[j] = Math.max(v, max[j]);
      }
    }
    return {min, max};
  }

  function getGeometriesExtents(geometries) {
    return geometries.reduce(({min, max}, {data}) => {
      const minMax = getExtents(data.position);
      return {
        min: min.map((min, ndx) => Math.min(minMax.min[ndx], min)),
        max: max.map((max, ndx) => Math.max(minMax.max[ndx], max)),
      };
    }, {
      min: Array(3).fill(Number.POSITIVE_INFINITY),
      max: Array(3).fill(Number.NEGATIVE_INFINITY),
    });
  }

  const extents = getGeometriesExtents(obj.geometries);
  const range = m4.subtractVectors(extents.max, extents.min);

  const objOffset = m4.scaleVector(
    m4.addVectors(
      extents.min, 
      m4.scaleVector(range, 0.5)), 
      -1
  );

  const cameraTarget = [0, 0, 0];

  let radius = m4.length(range) * 1.2;
  // const cameraPosition = m4.addVectors(cameraTarget, [0, 3, radius]);
  let cameraAngleX = 0;
  let cameraAngleY = 0;

  const zNear = radius / 100;
  const zFar = radius * 3;

  function degToRad(deg) {
    return deg * Math.PI / 180;
  }

  const minZoom = m4.length(range) * 0.3;
  const maxZoom = m4.length(range) * 3;

  const maxVerticalAngle = Math.PI / 2.1;
  const minVerticalAngle = -Math.PI / 2.1;

  const defaultState = {
    radius: radius,
    cameraAngleX: 0,
    cameraAngleY: 0,
  }

  let isDrag = false;
  let lastMousePosition = {x: 0, y: 0};

  canvas.addEventListener('mousedown', (e) => {
    isDrag = true;
    lastMousePosition = {x: e.clientX, y: e.clientY};
  });

  canvas.addEventListener('mouseup', () => {
    isDrag = false;
  });

  canvas.addEventListener('mousemove', (e) => {
    if (isDrag) {
      const dx = e.clientX - lastMousePosition.x;
      const dy = e.clientY - lastMousePosition.y;

      cameraAngleY -= dx * 0.01;

      cameraAngleX += dy * 0.01;
      cameraAngleX = Math.max(minVerticalAngle, Math.min(maxVerticalAngle, cameraAngleX));

      lastMousePosition = {x: e.clientX, y: e.clientY};
    }
  });

  canvas.addEventListener('wheel', (e) => {
    radius *= e.deltaY > 0 ? 1.1 : 0.9;

    if (radius < minZoom) radius = minZoom;
    if (radius > maxZoom) radius = maxZoom;

    e.preventDefault();
  });

  function render() {
    // time *= 0.001;

    webglUtils.resizeCanvasToDisplaySize(gl.canvas);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.enable(gl.DEPTH_TEST);
    
    gl.clearColor(...clearColor);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    const fieldOfViewRadians = degToRad(60);
    const aspect = gl.canvas.clientWidth / gl.canvas.clientHeight;
    const projectionMatrix = m4.perspective(fieldOfViewRadians, aspect, zNear, zFar);

    const cameraPosition = [
      radius * Math.sin(cameraAngleY) * Math.cos(cameraAngleX),
      radius * Math.sin(cameraAngleX),
      radius * Math.cos(cameraAngleY) * Math.cos(cameraAngleX),
    ];

    const up = [0, 1, 0];
    const cameraMatrix = m4.lookAt(cameraPosition, cameraTarget, up);

    const viewMatrix = m4.inverse(cameraMatrix);

    const sharedUniforms = {
      u_lightDirection: m4.normalize([-1, 3, 5]),
      u_view: viewMatrix,
      u_projection: projectionMatrix,
      u_viewWorldPosition: cameraPosition,
    };

    gl.useProgram(meshProgramInfo.program);

    const lightColor = gl.getUniformLocation(meshProgramInfo.program, 'u_lightColor');
    gl.uniform3fv(lightColor, lightColorInput);

    const lightIntensity = gl.getUniformLocation(meshProgramInfo.program, 'u_lightIntensity');
    gl.uniform1f(lightIntensity, defaultIntensity);

    webglUtils.setUniforms(meshProgramInfo, sharedUniforms);

    let u_world = m4.translate(m4.identity(), ...objOffset);

    for (const { bufferInfo, material } of parts) {
      webglUtils.setBuffersAndAttributes(gl, meshProgramInfo, bufferInfo);
      webglUtils.setUniforms(meshProgramInfo, { u_world } , material);
      webglUtils.drawBufferInfo(gl, bufferInfo);
    }

    requestAnimationFrame(render);
  }
  requestAnimationFrame(render);
}

main();