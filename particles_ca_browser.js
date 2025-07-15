const gridSize = 64;
const scale = 4;
const PopulationSize = 40;

let field;
let canvas, ctx;

const populationConfigs = {
	Population1: {
		layers: 6,
		channels: 4,
		bitsPerRule: 512,
		genotypeSize: 512 * 6 * 4,
		mutation: 25,
		mutategen: 16
	}
};

const pop1Type = "Population1";

let populations = {};
let pop1;

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
	
	let current = [];

	// Expand 1-layer input to 4 layers
	current[0] = input; // homies
	current[1] = input; // homies
	current[2] = input; // duplicate homies
	current[3] = input; // duplicate homies

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

	for (let x = 0; x < gridSize; x++) {
		layer1[x] = new Int8Array(gridSize);
	}

	const pop1 = populations["Population1"];

	// Place particles from Population1
	for (let i = 0; i < PopulationSize; i++) {
		const [x, y] = pop1.positions[i];
		layer1[x][y] = 1;
	}

	return layer1;
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

	// 👉 Use sign instead of rounding
	dx = Math.sign(dx);
	dy = Math.sign(dy);

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

function countFitness(pop, field, gridSize) {
	const layer1 = field;

	for (let j = 0; j < PopulationSize; j++) {
		let [x, y] = pop.positions[j];
		let fitness = 0;

		// Toroidal neighbors
		const xm = (x - 1 + gridSize) % gridSize;
		const xp = (x + 1) % gridSize;
		const ym = (y - 1 + gridSize) % gridSize;
		const yp = (y + 1) % gridSize;

		// Bonus for having neighbors
		if (layer1[xm][y]) fitness += 1;
		if (layer1[xp][y]) fitness += 1;
		if (layer1[x][ym]) fitness += 1;
		if (layer1[x][yp]) fitness += 1;

		// Penalty for collision
		const count = pop.positions.filter(([xx, yy], idx) =>
			idx !== j && xx === x && yy === y).length;
		if (count > 0) fitness -= 3 * count;

		//pop.fitness[j] = fitness;
		pop.fitness[j] += fitness;
	}
}

function drawFieldToCanvas(field) {
	ctx.fillStyle = 'rgb(0,0,0)';
	ctx.fillRect(0, 0, canvas.width, canvas.height);
	ctx.fillStyle = 'rgb(255,255,255)';
	
	const layer1 = field; // Population1

	for (let x = 0; x < gridSize; x++) {
		for (let y = 0; y < gridSize; y++) {
			if (layer1[x][y])
				ctx.fillRect(x * scale, y * scale, scale, scale);
		}
	}
}

let timerId;
function start(){
	if(!timerId){
		timerId = setInterval(function() {
			countpoints(); //here
		}, 1);
	}
	
};
function stop(){
	if(timerId){
		clearInterval(timerId);
		timerId=false;
	}
};
let epoch = 0;
function countpoints(){
	document.getElementById('console-log1').innerHTML=epoch;
	field = fillField(gridSize, PopulationSize);
	
	drawFieldToCanvas(field);
	
	// first cycle to count movements
	let move1=[];
	for (let j = 0; j < PopulationSize; j++) {
		

		const pop1Rule = unflattenRules(pop1.population[j], pop1Type);

		const [x1, y1] = pop1.positions[j];
		
		//if(j==0) console.log(JSON.stringify(evaluate(field, pop1Rule, x1, y1)));
		move1[j] = outputToMovement(
			evaluate(field, pop1Rule, x1, y1)
		);
		//if(j==0) console.log(move1[j]);
	}
	
	applyMovements(pop1, move1, gridSize);
	
	field = fillField(gridSize, PopulationSize);

	countFitness(pop1, field, gridSize);
	
	const fitness1 = pop1.fitness;

	const pop1Eff = fitness1.reduce((a, b) => a + b, 0) / PopulationSize;

	const pop1Max = Math.max(...fitness1);
	const pop1Min = Math.min(...fitness1);
	

	if (epoch % 500 === 0 && epoch !== 0) {
		evolute(pop1Type);
		pop1.fitness.fill(0); // reset fitness after evolution
		document.getElementById('console-log0').innerHTML=`Evolved at epoch ${epoch}, average fitness=${pop1Eff}`;
		console.log(`Evolved at epoch ${epoch}, average fitness=${pop1Eff}`);
	}
	epoch++;
}

function init() {

	canvas = document.getElementById('myCanvas');
	canvas.width=gridSize * scale;
	canvas.height=gridSize * scale;
	ctx = canvas.getContext('2d');
	
	newPopulation(pop1Type);
	pop1 = populations[pop1Type];
	
	pop1.positions = randomPositions(gridSize, PopulationSize);
	pop1.fitness.fill(0);

	countpoints();

}

