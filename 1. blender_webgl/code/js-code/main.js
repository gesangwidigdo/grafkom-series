function main(){
  var canvas = document.getElementById("myCanvas");
  var gl = canvas.getContext("webgl");

  var vertexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);

  var colorBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);

  var indexBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
  gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(indices), gl.STATIC_DRAW);

  var vertexShaderCode = document.getElementById("vertexShaderCode").text;

  var vertexShader = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vertexShader, vertexShaderCode);
  gl.compileShader(vertexShader);

  var fragmentShaderCode = `
      precision mediump float;
      varying vec3 vColor;
      void main(){
          gl_FragColor = vec4(vColor, 1.0);
      }
  `;

  var fragmentShader = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fragmentShader, fragmentShaderCode);
  gl.compileShader(fragmentShader);    

  var program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  gl.useProgram(program);

  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
  var aPos = gl.getAttribLocation(program, "aPosition");
  gl.vertexAttribPointer(aPos, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(aPos);

  gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
  var aColor = gl.getAttribLocation(program, "aColor");
  gl.vertexAttribPointer(aColor, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(aColor);

  var Pmatrix = gl.getUniformLocation(program, "uProj");
  var Vmatrix = gl.getUniformLocation(program, "uView");
  var Mmatrix = gl.getUniformLocation(program, "uModel");
  gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);

  var projMatrix = glMatrix.mat4.create();
  var modMatrix = glMatrix.mat4.create();
  var viewMatrix = glMatrix.mat4.create();

  glMatrix.mat4.perspective(projMatrix,
      glMatrix.glMatrix.toRadian(90), //fov dalam radian
      1.0,    //aspek rasio
      0.5,    //near
      10.0    //far
  )

  glMatrix.mat4.lookAt(viewMatrix,
      [0.0, 0.0, .5], //posisi kamera
      [0.0, 0.0, 0.0], //kemana kamera menghadap
      [0.0, 1.0, 0.0] //kemana arah atas kamera
  );

  var angle = glMatrix.glMatrix.toRadian(1);
  function render(time){
      if (!freeze){
          glMatrix.mat4.rotate(modMatrix, modMatrix, angle, [1.0,1.0,1.0]);
      }

      gl.enable(gl.DEPTH_TEST);
      gl.depthFunc(gl.LEQUAL);

      gl.clearColor(1.0, 1.0, 1.0, 1.0);
      gl.clearDepth(1.0);

      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      gl.uniformMatrix4fv(Pmatrix, false, projMatrix);
      gl.uniformMatrix4fv(Vmatrix, false, viewMatrix);
      gl.uniformMatrix4fv(Mmatrix, false, modMatrix);
  
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
      gl.drawElements(gl.TRIANGLES, indices.length, gl.UNSIGNED_SHORT, 0);
      window.requestAnimationFrame(render);
  }

  render(1);    
}