const gridSize = 512;
const scale = 1;
const PopulationSize = 400;

let field;
let canvas, ctx;

const genotypeSize = 512;
let mutation = 25;
let mutategen = 16;
let evolveEvery = 1000;

function syncParams() {
	const log3 = document.getElementById('console-log2');
	mutation = +document.getElementById("mutatepercent").value;
	mutategen = +document.getElementById("mutategen").value;
	evolveEvery = +document.getElementById("evolveInterval").value;
	log3.innerHTML = `mutation: ${mutation}%, gens: ${mutategen}, evolve every ${evolveEvery}`;
}

const pop1Type = "Population1";

let populations = {};
let pop1;

const fitnessLog = [];

function newPopulation(type) {
	populations[type] = {
		population: [],
		fitness: []
	};

	const p = populations[type];

	for (let n = 0; n < PopulationSize; n++) {
		p.population[n] = [];
		p.fitness[n] = 0;
		for (let i = 0; i < genotypeSize; i++) {
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

		for (let j = 0; j < genotypeSize; j++) {
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

	const m = 100 / mutation;
	for (let i = 0; i < PopulationSize; i++) {
		if (Math.floor(Math.random() * m) === 0) {
			const flips = Math.floor(Math.random() * mutategen) + 1;
			for (let j = 0; j < flips; j++) {
				const gen = Math.floor(Math.random() * genotypeSize);
				p.population[i][gen] ^= 1;
			}
		}
	}
	
}

function unflattenRules(flat) {
	return flat.slice(0, 512);
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

function extractBlock(field, cx, cy, size) {
	const block = Array(size);
	for (let i = 0; i < size; i++) {
		block[i] = new Int8Array(size);
	}

	const fieldSizeX = field.length;
	const fieldSizeY = field[0].length;
	const half = Math.floor(size / 2);

	for (let dx = -half; dx <= half; dx++) {
		for (let dy = -half; dy <= half; dy++) {
			const gx = (cx + dx + fieldSizeX) % fieldSizeX;
			const gy = (cy + dy + fieldSizeY) % fieldSizeY;
			block[dx + half][dy + half] = field[gx][gy];
		}
	}

	return block;
}

function evaluate(field, rule, x, y) {
	let size = 13;
	let current = extractBlock(field, x, y, size);

	while (size > 3) {
		current = cellular(current, rule);
		size -= 2;
		current = extractBlock(current, Math.floor(size / 2), Math.floor(size / 2), size);
	}

	const patch3x3 = cellular(current, rule);
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
	

	if (epoch % evolveEvery === 0 && epoch !== 0) {
		
		fitnessLog.push({
			epoch,
			avg: +pop1Eff.toFixed(4),
			min: pop1Min,
			max: pop1Max
		});
		
		evolute(pop1Type);
		pop1.fitness.fill(0); // reset fitness after evolution
		document.getElementById('console-log0').innerHTML=`Evolved at epoch ${epoch}, average fitness=${pop1Eff}`;
		console.log(`Evolved at epoch ${epoch}, average fitness=${pop1Eff}`);
	}
	epoch++;
}

function init() {
	
	mutation=document.getElementById("mutatepercent").value*1;
	mutategen=document.getElementById("mutategen").value*1;
	
	evolveEvery = +document.getElementById("evolveInterval").value;
	
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







function printArray(array){
	let arraylen=array.length;
	let arraylen1=array[0].length;
	console.log('');
	for(let i=0;i<arraylen;i++){
		console.log(`[${array[i].join(',')}]`);
	}
	console.log('');
}

function saveFitnessLog() {
	const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(fitnessLog, null, 2));
	const downloadAnchorNode = document.createElement('a');
	downloadAnchorNode.setAttribute("href", dataStr);
	downloadAnchorNode.setAttribute("download", "fitness_log.json");
	document.body.appendChild(downloadAnchorNode); // required for Firefox
	downloadAnchorNode.click();
	downloadAnchorNode.remove();
}



let recorder;
let recordedChunks = [];

function startWebmRecording(canvas) {
	const stream = canvas.captureStream(60); // 30 fps
	recorder = new MediaRecorder(stream, { mimeType: 'video/webm' });

	recorder.ondataavailable = e => {
		if (e.data.size > 0) recordedChunks.push(e.data);
	};

	recorder.onstop = () => {
		const blob = new Blob(recordedChunks, { type: 'video/webm' });
		const url = URL.createObjectURL(blob);

		const video = document.createElement('video');
		video.src = url;
		video.controls = true;
		document.body.appendChild(video);
		
		const a = document.createElement('a');
		a.href = url;
		a.download = 'particles.webm';
		a.textContent = '⬇ Download WebM';
		document.body.appendChild(a);
	};

	recorder.start();
	console.log('🟢 WebM recording started');
}

function stopWebmRecording() {
	if (recorder && recorder.state !== "inactive") {
		recorder.stop();
		console.log('🛑 WebM recording stopped');
	}
}


function downloadPopulation(sampleRatio = 0.25) {
	const p = populations[pop1Type];
	const sampleCount = Math.floor(PopulationSize * 0.25);
	const saved = [];

	for (let i = 0; i < sampleCount; i++) {
		saved.push(p.population[i]);
	}

	const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(saved));
	const downloadAnchorNode = document.createElement('a');
	downloadAnchorNode.setAttribute("href", dataStr);
	downloadAnchorNode.setAttribute("download", "population_sample.json");
	document.body.appendChild(downloadAnchorNode);
	downloadAnchorNode.click();
	downloadAnchorNode.remove();
}

function triggerLoad() {
	document.getElementById('loadFile').click();
}

function loadPopulation(evt) {
	const file = event.target.files[0];
	if (!file) return;

	const reader = new FileReader();
	reader.onload = function(e) {
		try {
			const data = JSON.parse(e.target.result);

			// Fill population with repeating sample
			const p = populations[pop1Type];
			for (let i = 0; i < PopulationSize; i++) {
				const sample = data[i % data.length];
				p.population[i] = [...sample]; // clone
				p.fitness[i] = 0;
			}

			console.log("Population loaded from sample:", data.length, "genotypes");
			document.getElementById('console-log0').innerHTML = `Population loaded from sample of ${data.length}`;
		} catch (err) {
			console.error("Failed to load population:", err);
		}
	};

	reader.readAsText(file);
}