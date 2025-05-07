const gameTitle = 'Fillit';
const ship = new Image();
ship.src = './img/ship-up.png';

const canvas = document.querySelector('canvas')
const ctx = canvas.getContext("2d")

const highScoreText = document.getElementById("high-score-text")
const currentScoreText = document.getElementById("current-score-text")
const livesText = document.getElementById("lives-text")
const leftToFillText = document.getElementById("leftToFill-text")
const stageText = document.getElementById("stage-text")

const angle = 90;
let shipX = 0;
let shipY = 0;
let highscore = 1000000;
let score = 0;
let lives = 3;
let percentageCompleted = 0;
let stage = 1;
let speed = 10;

highScoreText.innerHTML = `${highscore}`
currentScoreText.innerHTML = `${score}`
livesText.innerHTML = `${lives}`
leftToFillText.innerHTML = `${percentageCompleted}`
stageText.innerHTML = `${stage}`

function checkBoundries(){
    if(shipX > (canvas.width - 60)){
        console.log('runescape')
    }
}

function controller(e){
    e.preventDefault();

    console.log(e.key)
    const key = e.key;
    const LEFT = "a";
    const RIGHT = "d";
    const UP = "w";
    const DOWN = "s";

    if(key == LEFT){
        console.log('ddddd')
        ship.src = './img/ship-left.png';
        shipX -= speed;
    }
    if(key == RIGHT){
        checkBoundries()
        console.log('WHAT')
        ship.src = './img/ship-right.png';
        shipX += speed;
    }
    if(key == UP){
        ship.src = './img/ship-up.png';
        shipY -= speed;
    }
    if(key == DOWN){
        ship.src = './img/ship-down.png';
        shipY += speed;
    }
}

document.addEventListener('keydown', (e) => controller(e));

function reDraw(){
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(ship, shipX, shipY, 20, 20);
    requestAnimationFrame(reDraw)
}

requestAnimationFrame(reDraw)