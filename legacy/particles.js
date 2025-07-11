const fs = require('fs');
const path = require('path');
const { createCanvas, loadImage } = require('canvas');
const GIFEncoder = require('gifencoder');

const gridSize = 32;
const PopulationSize = 80;


let encoder = null;
let gifStream = null;

function startGifEncoder(width = gridSize, height = gridSize, fps = 15) {
	const filename = `out/particles_${Math.random().toString(36).slice(2, 8)}.gif`;

	encoder = new GIFEncoder(width, height);
	gifStream = fs.createWriteStream(filename);
	encoder.createReadStream().pipe(gifStream);

	encoder.start();
	encoder.setRepeat(0);                // 0 = infinite loop
	encoder.setDelay(1000 / fps);        // frame delay in ms
	encoder.setQuality(1);               // 1 = best quality

	console.log(`🟠 Started recording GIF → ${filename}`);
}

function writeFrameFromCanvas(canvas) {
	if (!encoder) return;
	const ctx = canvas.getContext('2d');
	encoder.addFrame(ctx);
}

function endGifEncoder() {
	if (!encoder) return;
	encoder.finish();
	console.log(`🟢 Finished GIF recording.`);
}



const storagePath = path.join(__dirname, 'storage');
const datasetPath = path.join(__dirname, 'dataset');

let field;

const populationConfigs = {
	Population1: {
		layers: 6,
		channels: 4,
		bitsPerRule: 512,
		genotypeSize: 512 * 6 * 4,
		mutation: 25,
		mutategen: 16
	},
	Population2: {
		layers: 6,
		channels: 4,
		bitsPerRule: 512,
		genotypeSize: 512 * 6 * 4,
		mutation: 25,
		mutategen: 16
	}
};

let populations = {};

function ensureStorageDir() {
	if (!fs.existsSync(storagePath)) {
		fs.mkdirSync(storagePath);
	}
	if (!fs.existsSync(datasetPath)) {
		fs.mkdirSync(datasetPath);
	}
}

function getPopulationFile(type, key) {
	return path.join(storagePath, `${type.toLowerCase()}_${key}.json`);
}

function getFitnessHistoryFile() {
	return path.join(storagePath, 'fitness_history.json');
}

function saveFitnessHistory(fitnessHistory) {
	ensureStorageDir();
	fs.writeFileSync(getFitnessHistoryFile(), JSON.stringify(fitnessHistory, null, 2));
}

function loadFitnessHistory() {
	ensureStorageDir();
	const historyPath = getFitnessHistoryFile();
	if (fs.existsSync(historyPath)) {
		return JSON.parse(fs.readFileSync(historyPath, 'utf8'));
	}
	return [];
}

function savePopulation(type) {
	ensureStorageDir();
	const pop = populations[type];
	fs.writeFileSync(getPopulationFile(type, "population"), JSON.stringify(pop.population));
	fs.writeFileSync(getPopulationFile(type, "fitness"), JSON.stringify(pop.fitness));
	return true;
}

function resumePopulation(type) {
	ensureStorageDir();
	const popPath = getPopulationFile(type, "population");
	const fitPath = getPopulationFile(type, "fitness");

	if (!fs.existsSync(popPath) || !fs.existsSync(fitPath)) {
		return false;
	}

	const config = populationConfigs[type];
	populations[type] = {
		population: JSON.parse(fs.readFileSync(popPath, 'utf8')),
		fitness: JSON.parse(fs.readFileSync(fitPath, 'utf8')),
		genotypeSize: config.genotypeSize,
		mutation: config.mutation,
		mutategen: config.mutategen
	};

	return true;
}

function newPopulation(type) {
	const config = populationConfigs[type];
	populations[type] = {
		population: [],
		fitness: [],
		genotypeSize: config.genotypeSize,
		mutation: config.mutation,
		mutategen: config.mutategen
	};

	const p = populations[type];

	for (let n = 0; n < PopulationSize; n++) {
		p.population[n] = [];
		p.fitness[n] = 0;
		for (let i = 0; i < p.genotypeSize; i++) {
			p.population[n][i] = Math.round(Math.random());
		}
	}

	savePopulation(type);
}

function randomPositions(gridSize, PopulationSize) {
	const set = new Set();
	const positions = [];

	while (positions.length < PopulationSize) {
		const x = Math.floor(Math.random() * gridSize);
		const y = Math.floor(Math.random() * gridSize);
		const key = `${x},${y}`;

		if (!set.has(key)) {
			positions.push([x, y]);
			set.add(key);
		}
	}

	return positions;
}

function clearFitness(type) {
	const p = populations[type];
	for (let n = 0; n < PopulationSize; n++) {
		p.fitness[n] = 0;
	}
	savePopulation(type);
}

function initPopulation(type) {
	if (!resumePopulation(type)) {
		newPopulation(type);
	}
}

function sortf(a, b) {
	return b[1] - a[1];
}

function shufflePopulation(p) {
	for (let i = p.population.length - 1; i > 0; i--) {
		const j = Math.floor(Math.random() * (i + 1));
		[p.population[i], p.population[j]] = [p.population[j], p.population[i]];
		[p.fitness[i], p.fitness[j]] = [p.fitness[j], p.fitness[i]];
	}
}

function evolute(type) {
	const p = populations[type];
	const sizehalf = PopulationSize / 2;
	const sizequarter = sizehalf / 2;

	let arrayt = [];
	for (let n = 0; n < PopulationSize; n++) {
		arrayt[n] = [p.population[n], p.fitness[n], n];
	}

	arrayt.sort(sortf);
	arrayt.length = sizehalf;

	p.population = [];
	p.fitness = [];

	for (let i = 0; i < sizequarter; i++) {
		const i0 = i * 4;
		const i1 = i * 4 + 1;
		const i2 = i * 4 + 2;
		const i3 = i * 4 + 3;

		const parent1 = arrayt.splice(Math.floor(Math.random() * arrayt.length), 1)[0][0];
		const parent2 = arrayt.splice(Math.floor(Math.random() * arrayt.length), 1)[0][0];

		const child1 = [];
		const child2 = [];

		for (let j = 0; j < p.genotypeSize; j++) {
			const gen = Math.round(Math.random());
			child1[j] = gen === 1 ? parent1[j] : parent2[j];
			child2[j] = gen === 1 ? parent2[j] : parent1[j];
		}

		p.population[i0] = parent1;
		p.population[i1] = parent2;
		p.population[i2] = child1;
		p.population[i3] = child2;

		p.fitness[i0] = 0;
		p.fitness[i1] = 0;
		p.fitness[i2] = 0;
		p.fitness[i3] = 0;
	}

	const m = 100 / p.mutation;
	for (let i = 0; i < PopulationSize; i++) {
		if (Math.floor(Math.random() * m) === 0) {
			const flips = Math.floor(Math.random() * p.mutategen) + 1;
			for (let j = 0; j < flips; j++) {
				const gen = Math.floor(Math.random() * p.genotypeSize);
				p.population[i][gen] ^= 1;
			}
		}
	}
	
	shufflePopulation(p);
	savePopulation(type);
}

function recreatePopulation(type) {
	newPopulation(type);
}


function unflattenRules(flat, type) {
	const config = populationConfigs[type];
	const { layers, channels, bitsPerRule } = config;

	let rulesArray = [];
	let idx = 0;
	for (let i = 0; i < layers; i++) {
		rulesArray[i] = [];
		for (let j = 0; j < channels; j++) {
			rulesArray[i][j] = [];
			for (let k = 0; k < bitsPerRule; k++) {
				rulesArray[i][j][k] = flat[idx++];
			}
		}
	}
	return rulesArray;
}

// Optional helper — not currently needed
// Use only if you want to log, store, or inject rule arrays manually

function flattenRules(rulesArray, type) {
	const config = populationConfigs[type];
	const { layers, channels, bitsPerRule } = config;

	const flat = [];

	for (let i = 0; i < layers; i++) {
		for (let j = 0; j < channels; j++) {
			for (let k = 0; k < bitsPerRule; k++) {
				flat.push(rulesArray[i][j][k]);
			}
		}
	}

	return flat;
}

function getrule(){
	let r=[];
	let r2=[];
	for(let i=0;i<18;i++) r[i]=Math.round(Math.random());
	for(let i=0;i<512;i++){
		let q=((i>>4)&1)*8;
		for(let j=0;j<9;j++){
			q+=(i>>j)&1;
		}
		r2[i]=r[q];
	}
	return r2;
}

function padding(array){
	let temp=[];
	let l2=array[0].length;
	for(let x=0;x<l2;x++){
		temp[x*2+0]=[];
		temp[x*2+1]=[];
		for(let y=0;y<l2;y++){
			temp[x*2+0][y*2+0]=array[0][x][y];
			temp[x*2+0][y*2+1]=array[1][x][y];
			temp[x*2+1][y*2+0]=array[2][x][y];
			temp[x*2+1][y*2+1]=array[3][x][y];
		}
	}
	return temp;
}

function cellular(array, rule) {
	const l2 = array.length;
	const temp = new Array(l2); // Preallocate the result array

	for (let x = 0; x < l2; x++) {
		temp[x] = new Int8Array(l2); // Use Int8Array for better performance
		const xm = (x - 1 + l2) % l2; // Precompute x-1 with periodic boundary
		const xp = (x + 1) % l2; // Precompute x+1 with periodic boundary

		for (let y = 0; y < l2; y++) {
			const ym = (y - 1 + l2) % l2; // Precompute y-1 with periodic boundary
			const yp = (y + 1) % l2; // Precompute y+1 with periodic boundary

			// Combine the 9-cell neighborhood into a single number (q)
			const q =
				(array[xm][ym] << 8) | // Top-left
				(array[x][ym] << 7) | // Top-center
				(array[xp][ym] << 6) | // Top-right
				(array[xm][y] << 5) | // Middle-left
				(array[x][y] << 4) | // Center
				(array[xp][y] << 3) | // Middle-right
				(array[xm][yp] << 2) | // Bottom-left
				(array[x][yp] << 1) | // Bottom-center
				array[xp][yp]; // Bottom-right

			// Apply the rule
			temp[x][y] = rule[q];
		}
	}

	return temp;
}

function downsample(array) {
	let size = array.length / 2;
	let result = [];

	for (let x = 0; x < size; x++) {
		result[x] = [];
		for (let y = 0; y < size; y++) {
			let v0 = array[x * 2][y * 2];
			let v1 = array[x * 2 + 1][y * 2];
			let v2 = array[x * 2][y * 2 + 1];
			let v3 = array[x * 2 + 1][y * 2 + 1];

			// symbolic pooling: majority vote
			let sum = v0 + v1 + v2 + v3;
			result[x][y] = sum > 1 ? 1 : 0; 
			//result[x][y] = sum%2;
		}
	}
	return result;
}

function evaluate(input, rulesArray, x, y) {
	if (!Array.isArray(input) || input.length < 2 || !input[0] || !input[1]) {
		throw new Error("🐸 evaluate(): input must be [layer1, layer2], both defined");
	}
	
	let current = [];

	// Expand 2-layer input to 4 layers
	current[0] = input[0]; // homies
	current[1] = input[1]; // enemies
	current[2] = input[0]; // duplicate homies
	current[3] = input[1]; // duplicate enemies

	for (let i = 0; i < rulesArray.length; i++) {
		const padded = padding(current);

		let evolved = [];
		for (let j = 0; j < rulesArray[i].length; j++) {
			evolved[j] = cellular(padded, rulesArray[i][j]);
		}

		for (let j = 0; j < evolved.length; j++) {
			evolved[j] = downsample(evolved[j]);
		}
		current = evolved;
		
	}

	// Final symbolic output: higher resolution grid
	const finalField = padding(current); // 2×gridSize x 2×gridSize
	const size = finalField.length;

	// Scale coordinates
	const sx = (x * 2) % size;
	const sy = (y * 2) % size;

	// Extract 3×3 patch around (sx, sy) with toroidal wrap
	const patch3x3 = [];
	for (let dx = -1; dx <= 1; dx++) {
		const row = [];
		for (let dy = -1; dy <= 1; dy++) {
			const xx = (sx + dx + size) % size;
			const yy = (sy + dy + size) % size;
			row.push(finalField[xx][yy]);
		}
		patch3x3.push(row);
	}

	return patch3x3;
}

function fillField(gridSize = 256, PopulationSize) {
	const layer1 = []; // Population1
	const layer2 = []; // Population2

	for (let x = 0; x < gridSize; x++) {
		layer1[x] = new Int8Array(gridSize);
		layer2[x] = new Int8Array(gridSize);
	}

	const pop1 = populations["Population1"];
	const pop2 = populations["Population2"];

	// Place particles from Population1
	for (let i = 0; i < PopulationSize; i++) {
		const [x, y] = pop1.positions[i];
		layer1[x][y] = 1;
	}

	// Place particles from Population2
	for (let i = 0; i < PopulationSize; i++) {
		const [x, y] = pop2.positions[i];
		layer2[x][y] = 1;
	}

	return [layer1, layer2]; // shape: [2][256][256]
}

function outputToMovement(patch3x3) {
	const directions = [
		[-1, -1], [0, -1], [1, -1],
		[-1,  0], [0,  0], [1,  0],
		[-1,  1], [0,  1], [1,  1]
	];

	let dx = 0;
	let dy = 0;
	let total = 0;

	for (let i = 0; i < 3; i++) {
		for (let j = 0; j < 3; j++) {
			const weight = patch3x3[i][j];
			const index = i * 3 + j;
			dx += directions[index][0] * weight;
			dy += directions[index][1] * weight;
			total += weight;
		}
	}

	if (total === 0) return [0, 0]; // no signal, stay in place

	dx = Math.round(dx / total);
	dy = Math.round(dy / total);

	// Clamp to -1, 0, 1 (just in case)
	dx = Math.max(-1, Math.min(1, dx));
	dy = Math.max(-1, Math.min(1, dy));

	return [dx, dy];
}

function applyMovements(pop, moveArray, gridSize) {
	for (let j = 0; j < PopulationSize; j++) {
		let [x, y] = pop.positions[j];
		let [dx, dy] = moveArray[j];

		// Apply movement
		let newX = (x + dx + gridSize) % gridSize;
		let newY = (y + dy + gridSize) % gridSize;

		pop.positions[j] = [newX, newY];
	}
}

function countFitness(pop, popType, field, gridSize) {
	const layer1 = field[0]; // Population1
	const layer2 = field[1]; // Population2

	const isPop1 = (popType === "Population1");

	const layerSelf = isPop1 ? layer1 : layer2;
	const layerEnemy = isPop1 ? layer2 : layer1;

	for (let j = 0; j < PopulationSize; j++) {
		let [x, y] = pop.positions[j];
		let fitness = 0;

		// Toroidal neighbors
		const xm = (x - 1 + gridSize) % gridSize;
		const xp = (x + 1) % gridSize;
		const ym = (y - 1 + gridSize) % gridSize;
		const yp = (y + 1) % gridSize;

		if (isPop1) {
			// Population1 wants to connect horizontally with enemy
			if (layerEnemy[xm][y]) fitness += 1;
			if (layerEnemy[xp][y]) fitness += 1;
			if (layerEnemy[x][ym]) fitness -= 1;
			if (layerEnemy[x][yp]) fitness -= 1;
		} else {
			// Population2 wants to connect vertically with enemy
			if (layerEnemy[x][ym]) fitness += 1;
			if (layerEnemy[x][yp]) fitness += 1;
			if (layerEnemy[xm][y]) fitness -= 1;
			if (layerEnemy[xp][y]) fitness -= 1;
		}

		// Penalty for any collision (same cell occupied)
		if (layerEnemy[x][y]) {
			fitness -= 3;
		}

		pop.fitness[j] = fitness;
	}
}

function saveFieldToPng(epoch = 0) {
	const canvas = createCanvas(gridSize, gridSize);
	const ctx = canvas.getContext('2d');

	const layer1 = field[0]; // Population1
	const layer2 = field[1]; // Population2

	const imageData = ctx.createImageData(gridSize, gridSize);
	const data = imageData.data;

	for (let x = 0; x < gridSize; x++) {
		for (let y = 0; y < gridSize; y++) {
			const idx = (y * gridSize + x) * 4;
			const v1 = layer1[x][y];
			const v2 = layer2[x][y];

			if (v1 && v2) {
				// Collision – white
				data[idx + 0] = 255;
				data[idx + 1] = 255;
				data[idx + 2] = 255;
			} else if (v1) {
				// Population1 – red
				data[idx + 0] = 255;
				data[idx + 1] = 0;
				data[idx + 2] = 0;
			} else if (v2) {
				// Population2 – blue
				data[idx + 0] = 0;
				data[idx + 1] = 0;
				data[idx + 2] = 255;
			} else {
				// Background – black
				data[idx + 0] = 0;
				data[idx + 1] = 0;
				data[idx + 2] = 0;
			}
			data[idx + 3] = 255; // alpha
		}
	}

	ctx.putImageData(imageData, 0, 0);

	// Save PNG to disk
	const outPath = path.join(datasetPath, `field_epoch${epoch}.png`);
	const buffer = canvas.toBuffer('image/png');
	fs.writeFileSync(outPath, buffer);

	console.log(`Saved: ${outPath}`);
}

function drawFieldToCanvas(field, scale = 1) {
	const gridSize = field[0].length;
	const canvas = createCanvas(gridSize * scale, gridSize * scale);
	const ctx = canvas.getContext('2d');

	const layer1 = field[0]; // Population1
	const layer2 = field[1]; // Population2

	for (let x = 0; x < gridSize; x++) {
		for (let y = 0; y < gridSize; y++) {
			const v1 = layer1[x][y];
			const v2 = layer2[x][y];

			if (v1 && v2) {
				ctx.fillStyle = 'white'; // collision
			} else if (v1) {
				ctx.fillStyle = 'red';
			} else if (v2) {
				ctx.fillStyle = 'blue';
			} else {
				ctx.fillStyle = 'black'; // background
			}
			ctx.fillRect(x * scale, y * scale, scale, scale);
		}
	}

	return canvas;
}


async function init() {
	startGifEncoder();
	const pop1Type = "Population1";
	const pop2Type = "Population2";
	initPopulation(pop1Type);
	initPopulation(pop2Type);
	const pop1 = populations[pop1Type];
	const pop2 = populations[pop2Type];
	
	pop1.positions = randomPositions(gridSize, PopulationSize);
	pop2.positions = randomPositions(gridSize, PopulationSize);

	for (let epoch = 0; epoch < 500; epoch++) {
		field = fillField(gridSize, PopulationSize);
		//if(epoch%100==0)
		//	saveFieldToPng(epoch);
		const canvas = drawFieldToCanvas(field);
		writeFrameFromCanvas(canvas);
		
		// first cycle to count movements
		let move1=[];
		let move2=[];
		for (let j = 0; j < PopulationSize; j++) {
			

			const pop1Rule = unflattenRules(pop1.population[j], pop1Type);
			const pop2Rule = unflattenRules(pop2.population[j], pop2Type);

			const [x1, y1] = pop1.positions[j];
			const [x2, y2] = pop2.positions[j];
			
			if (!Array.isArray(field) || !field[0] || !field[1]) {
				throw new Error("🐸 field is malformed before evaluate()");
			}
			
			move1[j] = outputToMovement(
				evaluate(field, pop1Rule, x1, y1)
			);

			move2[j] = outputToMovement(
				evaluate(field, pop2Rule, x2, y2)
			);
			
		}
		
		applyMovements(pop1, move1, gridSize);
		applyMovements(pop2, move2, gridSize);
		
		field = fillField(gridSize, PopulationSize);

		countFitness(pop1, "Population1", field, gridSize);
		countFitness(pop2, "Population2", field, gridSize);

		//const pop1Eff = pop1.fitness.reduce((a, b) => a + b, 0) / PopulationSize;
		//const pop2Eff = pop2.fitness.reduce((a, b) => a + b, 0) / PopulationSize;

		//evolute(pop1Type);
		//evolute(pop2Type);

		//console.log(`Epoch ${epoch} – pop1Eff: ${pop1Eff.toFixed(2)}, pop2Eff: ${pop2Eff.toFixed(2)}`);
		
		const fitness1 = pop1.fitness;
		const fitness2 = pop2.fitness;

		const pop1Eff = fitness1.reduce((a, b) => a + b, 0) / PopulationSize;
		const pop2Eff = fitness2.reduce((a, b) => a + b, 0) / PopulationSize;

		const pop1Max = Math.max(...fitness1);
		const pop1Min = Math.min(...fitness1);
		const pop2Max = Math.max(...fitness2);
		const pop2Min = Math.min(...fitness2);

		evolute(pop1Type);
		evolute(pop2Type);

		console.log(
			`Epoch ${epoch} ` +
			`| pop1: avg=${pop1Eff.toFixed(2)}, max=${pop1Max}, min=${pop1Min} ` +
			`| pop2: avg=${pop2Eff.toFixed(2)}, max=${pop2Max}, min=${pop2Min}`
		);
		
	}
	endGifEncoder();
}

init();

module.exports = { init };


