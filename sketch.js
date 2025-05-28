let pinceladas = []; // Array para guardar las imágenes de pinceladas
let cantidad = 33; // Cantidad de pinceladas a cargar
let margen = 20; // Margen (no usado en este sketch)
let paletas = []; // Paletas de color (imágenes que extraen colores)
let areaSize = 720; // Tamaño del área de trabajo (canvas principal)
let centroX, centroY; // Coordenadas del centro del canvas
let textura; // Variable no usada
let modoColor = 'oscuro'; // Modo de color actual: claro u oscuro
let lienzo1 // Imagen del lienzo de fondo
let gridCols = 10; // Cantidad de columnas en la grilla
let gridRows = 10; // Cantidad de filas en la grilla
let cellWidth, cellHeight; // Tamaño de cada celda

let composicion; // Buffer donde se dibuja toda la composición
let teclaPresionada = false; // Bandera para saber si se está presionando una tecla

let matrizClaros = []; // Matriz para registrar si una celda es clara (true) u oscura (false)

// Clase para cargar una imagen como paleta y extraer colores
class Paleta {
  constructor(imgPath) {
    this.img = loadImage(imgPath); // Carga de la imagen
    this.colores = []; // Todos los colores
    this.coloresOscuros = []; // Colores oscuros
    this.coloresClaros = []; // Colores claros
    this.cargada = false; // Flag para saber si se cargó
    this.img.loadPixels = this.img.loadPixels || function () { }; // Fallback si no tiene loadPixels
    this.img.loadPixels(); // Cargar píxeles
    this.extraerColores(); // Extraer colores
  }

  // Método que recorre la imagen y guarda colores clasificados por brillo
  extraerColores() {
    if (!this.img.pixels || this.img.pixels.length === 0) return;
    for (let i = 0; i < this.img.width; i += 5) {
      for (let j = 0; j < this.img.height; j += 5) {
        let idx = 4 * (i + j * this.img.width);
        let r = this.img.pixels[idx];
        let g = this.img.pixels[idx + 1];
        let b = this.img.pixels[idx + 2];
        let a = this.img.pixels[idx + 3];
        if (a > 0) {
          let c = color(r, g, b, a);
          this.colores.push(c);
          let luminosidad = brightness(c);
          if (luminosidad < 50) this.coloresOscuros.push(c);
          else this.coloresClaros.push(c);
        }
      }
    }
    this.cargada = true;
  }

  // Devuelve un color según el modo ('oscuro', 'claro' o cualquiera)
  darColor(modo = null) {
    if (this.colores.length === 0) return color(random(360), 100, 100);
    if (modo === 'oscuro' && this.coloresOscuros.length > 0) return random(this.coloresOscuros);
    if (modo === 'claro' && this.coloresClaros.length > 0) return random(this.coloresClaros);
    return random(this.colores);
  }
}

// Carga las imágenes antes de que empiece el programa
function preload() {
  for (let i = 0; i < cantidad; i++) {
    let nombre = 'data/cuadradito_' + nf(i, 4) + '_Capa-' + (i + 3) + '.png';
    pinceladas[i] = loadImage(nombre);
    lienzo1 = loadImage('data/lienzo.png');
  }
  // Cargar las paletas de imágenes
  paletas[0] = new Paleta('data/obra1.png');
  paletas[1] = new Paleta('data/obra2.png');
  paletas[2] = new Paleta('data/obra3.png');
  paletas[3] = new Paleta('data/obra4.png');
}

// Dibuja la grilla al estilo de Paul Klee con líneas curvas e irregulares
function dibujarGrillaEstiloKlee(buffer) {
  // Columnas y filas (agregamos uno para cerrar las formas)
  let cols = gridCols + 1;
  let rows = gridRows + 1;

  // Generar escalas irregulares para deformar la grilla
  let escalasX = [], escalasY = [];
  for (let i = 0; i < cols; i++) escalasX[i] = random(0.8, 1.2);
  for (let j = 0; j < rows; j++) escalasY[j] = random(0.8, 1.2);

  // Calcular posiciones acumuladas para cada punto de grilla
  let posX = [0], posY = [0];
  for (let i = 1; i < cols; i++) posX[i] = posX[i - 1] + cellWidth * escalasX[i - 1];
  for (let j = 1; j < rows; j++) posY[j] = posY[j - 1] + cellHeight * escalasY[j - 1];

  // Aplicar ruido y offsets para generar puntos deformados
  let puntos = [];
  for (let i = 0; i < cols; i++) {
    puntos[i] = [];
    let offsetAcumX = 0;
    for (let j = 0; j < rows; j++) {
      let noiseX = noise(i * 0.3, j * 0.2, frameCount * 0.005);
      let noiseY = noise(i * 0.25 + 100, j * 0.25 + 100, frameCount * 0.005);
      offsetAcumX = lerp(offsetAcumX, map(noiseX, 0, 1, -20, 20), 0.3);
      let offsetY = map(noiseY, 0, 1, -15, 15);
      puntos[i][j] = createVector(posX[i] + offsetAcumX, posY[j] + offsetY);
    }
  }

  // Dibujar líneas horizontales suaves
  buffer.stroke(0, 0, 100, 1);
  buffer.noFill();
  buffer.strokeWeight(1.5);
  for (let j = 0; j < rows; j++) {
    buffer.beginShape();
    buffer.curveVertex(puntos[0][j].x, puntos[0][j].y);
    for (let i = 0; i < cols; i++) buffer.curveVertex(puntos[i][j].x, puntos[i][j].y);
    buffer.curveVertex(puntos[cols - 1][j].x, puntos[cols - 1][j].y);
    buffer.endShape();
  }

  // Dibujar líneas verticales suaves
  for (let i = 0; i < cols; i++) {
    buffer.beginShape();
    buffer.curveVertex(puntos[i][0].x, puntos[i][0].y);
    for (let j = 0; j < rows; j++) buffer.curveVertex(puntos[i][j].x, puntos[i][j].y);
    buffer.curveVertex(puntos[i][rows - 1].x, puntos[i][rows - 1].y);
    buffer.endShape();
  }
}

// Función para verificar si una celda tiene vecinos claros
function vecinosClaros(col, row) {
  let dirs = [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, -1], [-1, 1], [1, 1]];
  for (let d of dirs) {
    let nc = col + d[0], nr = row + d[1];
    if (nc >= 0 && nc < gridCols && nr >= 0 && nr < gridRows) {
      if (matrizClaros[nc][nr]) return true;
    }
  }
  return false;
}

function setup() {
  createCanvas(windowWidth, windowHeight); // Crear canvas que ocupa toda la ventana
  background(255); // Fondo blanco
  imageMode(CENTER); // Centramos las imágenes
  colorMode(HSB, 360, 100, 100, 100); // Usamos HSB para manipular color

  centroX = width / 2;
  centroY = height / 2;

  // Calculamos el tamaño de cada celda
  cellWidth = areaSize / gridCols;
  cellHeight = areaSize / gridRows;

  // Creamos el buffer donde dibujamos la composición final
  composicion = createGraphics(areaSize, areaSize);
  composicion.colorMode(HSB, 360, 100, 100, 100);
  composicion.imageMode(CENTER);
  composicion.background(0); // Fondo negro del buffer

  dibujarGrillaEstiloKlee(composicion); // Dibujar la grilla en el buffer

  // Ajustamos la transparencia de cada pincelada en base al brillo
  for (let i = 0; i < cantidad; i++) {
    let img = pinceladas[i];
    img.filter(INVERT); // Invertimos colores (negro a blanco)
    img.loadPixels();
    for (let j = 0; j < img.pixels.length; j += 4) {
      let r = img.pixels[j];
      let g = img.pixels[j + 1];
      let b = img.pixels[j + 2];
      let brillo = (r + g + b) / 3;
      let alpha = map(brillo, 100, 255, 0, 255); // Más brillo, menos alpha
      img.pixels[j + 3] = constrain(alpha, 0, 255);
    }
    img.updatePixels();
  }

  // Rellenar toda la grilla con pinceladas y colores
  let coloresAsignados = Array(gridRows).fill().map(() => Array(gridCols).fill(null));

  for (let row = 0; row < gridRows; row++) {
    for (let col = 0; col < gridCols; col++) {
      // Seleccionamos paleta según la posición horizontal
      let paletaIndex = floor(map(col * cellWidth, 0, areaSize, 0, paletas.length));
      paletaIndex = constrain(paletaIndex, 0, paletas.length - 1);
      let paleta = paletas[paletaIndex];

      // Decidimos si es claro u oscuro (probabilidad)
      let modo = random() < 0.1 ? 'claro' : 'oscuro';

      // Registramos si es clara u oscura
      if (!matrizClaros[col]) matrizClaros[col] = [];

      if (modo === 'claro') {
        // Intentamos repetir color si hay vecinos claros
        let vecinoColor = null;
        let vecinos = [];
        if (row > 0) vecinos.push(coloresAsignados[row - 1][col]);
        if (col > 0) vecinos.push(coloresAsignados[row][col - 1]);
        vecinos = vecinos.filter(c => c != null && brightness(c) > 30);
        if (vecinos.length > 0 && random() < 0.8) {
          vecinoColor = random(vecinos);
        }
        coloresAsignados[row][col] = vecinoColor || paleta.darColor('claro');
        matrizClaros[col][row] = true;
      } else {
        coloresAsignados[row][col] = paleta.darColor('oscuro');
        matrizClaros[col][row] = false;
      }

      // Ajustamos saturación y brillo del color final
      let c = coloresAsignados[row][col];
      let h = hue(c), s = saturation(c), b = brightness(c);
      if (modo === 'oscuro') {
        s = random(10, 30);
        b = random(5, 30);
      } else {
        s = random(30, 110);
        b = random(30, 75);
      }
      let nuevoColor = color(h, s, b, 100);

      // Elegimos pincelada y la dibujamos centrada en la celda
      let cual = int(random(cantidad));
      let pincel = pinceladas[cual];
      let x = col * cellWidth + cellWidth / 2;
      let y = row * cellHeight + cellHeight / 2;
      composicion.tint(nuevoColor);
      let escalaX = cellWidth / pincel.width * 1.2;
      let escalaY = cellHeight / pincel.height * 1.2;
      let escala = max(escalaX, escalaY);

      composicion.push();
      composicion.translate(x, y);
      composicion.scale(escala);
      composicion.image(pincel, 0, 0);
      composicion.pop();

      composicion.noTint(); // Quitamos el tinte
    }
  }
}

function draw() {
  background(255); // Fondo blanco
  imageMode(CENTER);
  image(composicion, centroX, centroY); // Dibujamos la composición actual

  // Si se mantiene una tecla presionada, se pinta en una celda aleatoria
  if (teclaPresionada) {
    let col = floor(random(gridCols));
    let row = floor(random(gridRows));

    // Centro de la celda elegida
    let x = col * cellWidth + cellWidth / 2;
    let y = row * cellHeight + cellHeight / 2;

    // Elegimos una pincelada al azar
    let cual = int(random(cantidad));
    let pincel = pinceladas[cual];

    // Elegimos una paleta según la posición X
    let paletaIndex = floor(map(x, 0, areaSize, 0, paletas.length));
    paletaIndex = constrain(paletaIndex, 0, paletas.length - 1);

    let colorOriginal = paletas[paletaIndex].darColor(modoColor);

    // Ajustamos saturación y brillo según modo
    let h = hue(colorOriginal);
    let s, b;
    if (modoColor === 'oscuro') {
      s = random(5, 40);
      b = random(0, 20);
    } else {
      s = random(40, 65);
      b = random(40, 95);
    }

    let nuevoColor = color(h, s, b, 100);

    // Dibujamos pincelada en la celda con escala y color
    composicion.push();
    composicion.translate(x, y);
    let escalaX = cellWidth / pincel.width * 1.2;
    let escalaY = cellHeight / pincel.height * 1.2;
    let escala = max(escalaX, escalaY);

    composicion.scale(escala);
    composicion.tint(nuevoColor);
    composicion.image(pincel, 0, 0); // aplicamos tinte
    composicion.noTint(); // quitamos tinte
    composicion.pop();
  }

  // Volvemos a mostrar la composición (por si se actualizó)
  imageMode(CENTER);
  image(composicion, centroX, centroY);

  // Aplicamos una textura blanca suave (opacidad)
  colorMode(RGB, 255);
  tint(125, 125, 125, 20);
  image(lienzo1, centroX, centroY, areaSize, areaSize);
  noTint();

  // Volvemos a modo HSB para seguir dibujando
  colorMode(HSB, 360, 100, 100, 100);

  // Sombra central negra translúcida
  push();
  noStroke();
  fill(0, 20); // 20% de opacidad
  rectMode(CENTER);
  rect(centroX, centroY, areaSize, areaSize);
  pop();

  // Mostramos las instrucciones en pantalla
  dibujarInstrucciones();
}

function dibujarInstrucciones() {
  colorMode(RGB, 255); // Cambiamos a RGB para texto

  // Fondo negro con transparencia
  push();
  fill(0, 0, 0, 150);
  noStroke();
  rect(20, 20, 280, 120, 10); // cuadro de fondo
  pop();

  // Texto blanco con instrucciones
  push();
  fill(255);
  textAlign(LEFT);
  textSize(14);
  textFont('Arial');
  text("CONTROLES:", 35, 45);
  text("← Flecha izquierda: Modo color oscuro", 35, 65);
  text("→ Flecha derecha: Modo color claro", 35, 85);
  text("Mantener presionado: Pintar", 35, 105);
  text("Recargar página: Nuevo canvas", 35, 125);

  // Indicador visual del modo actual
  fill(modoColor === 'oscuro' ? color(100, 100, 150) : color(255, 220, 100));
  text("Modo actual: " + (modoColor === 'oscuro' ? 'OSCURO' : 'CLARO'), 35, 150);
  pop();

  colorMode(HSB, 360, 100, 100, 100); // Volver a HSB
}

// Se ejecuta cuando presionás una tecla
function keyPressed() {
  teclaPresionada = true;
  if (keyCode === LEFT_ARROW) {
    modoColor = 'oscuro'; // Cambia a modo oscuro
    console.log("Modo oscuro activado");
    
  } else if (keyCode === RIGHT_ARROW) {
    modoColor = 'claro'; // Cambia a modo claro
    console.log("Modo claro activado");
   
  }
}

// Se ejecuta cuando soltás una tecla
function keyReleased() {
  teclaPresionada = false;
}