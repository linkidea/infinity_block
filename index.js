

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

// --- 게임 상수 (Game Constants) ---
// 이 값들은 게임의 기본적인 규칙과 크기를 정의합니다.
// CSS와 동기화하기 위해 뷰포트 너비(vw) 단위를 사용합니다.
const LANE_COUNT = 5; // 레인(블록이 놓일 수 있는 가로 위치)의 수
const STAIR_HEIGHT_VW = 20; // 블록 하나의 세로 높이 (vw)
const LANE_WIDTH_VW = 20;   // 레인 하나의 가로 너비 (vw)
const TOTAL_STAIRS = 1000; // 게임 승리를 위한 최종 블록 수
const HIGH_SCORE_KEY = 'infinityStairHighScore_v4'; // 로컬 저장소에 최고 점수를 저장하기 위한 키 (버전 업데이트)

// --- 캐릭터 에셋 (Character Assets) ---
const CHARACTER_ASSETS = {
    BOY: './assets/boy.png',
    GIRL: './assets/girl.png'
};

// --- 아이템 설정 (Item Configuration) ---
const SCORING_ITEMS = [
    { type: 'score', value: 5, src: './assets/cooper.webp', id: 'cooper', rarity: 10 },
    { type: 'score', value: 10, src: './assets/iron.webp', id: 'iron', rarity: 8 },
    { type: 'score', value: 20, src: './assets/gold.png', id: 'gold', rarity: 5 },
    { type: 'score', value: 30, src: './assets/emerald.png', id: 'emerald', rarity: 3 },
    { type: 'score', value: 50, src: './assets/dia.png', id: 'dia', rarity: 1 }
];

const JUMP_ITEMS = [
    { type: 'jump', value: 10, src: './assets/upitem.png', id: 'up', rarity: 5 },
    { type: 'jump', value: 30, src: './assets/plain.png', id: 'plane', rarity: 3 },
    { type: 'jump', value: 50, src: './assets/rocket.png', id: 'rocket', rarity: 1 }
];
const ALL_ITEMS = [...SCORING_ITEMS, ...JUMP_ITEMS];
const ITEM_SPAWN_CHANCE = 0.2; // 20% 확률로 계단에 아이템 생성

// --- DOM 요소 (DOM Elements) ---
const scoreDisplay = document.getElementById('score-display');
const highScoreDisplay = document.getElementById('high-score-display');
const difficultyDisplay = document.getElementById('difficulty-display');
const timerContainer = document.getElementById('timer-container');
const timerBar = document.getElementById('timer-bar');
const stairsContainer = document.getElementById('stairs-container');
const character = document.getElementById('character');
const characterModel = document.getElementById('character-model');
const characterSprite = document.getElementById('character-sprite');
const overlay = document.getElementById('overlay');
const idleContent = document.getElementById('idle-content');
const gameOverContent = document.getElementById('game-over-content');
const winContent = document.getElementById('win-content');
const finalScoreDisplay = document.getElementById('final-score');
const finalHighScoreDisplay = document.getElementById('final-high-score');
const winHighScoreDisplay = document.getElementById('win-high-score');
const startButton = document.getElementById('start-button');
const characterSelectButton = document.getElementById('character-select-button');
const winCharacterSelectButton = document.getElementById('win-character-select-button');
const controls = document.getElementById('controls');
const changeDirectionButton = document.getElementById('change-direction-button');
const moveButton = document.getElementById('move-button');
const characterSelectionContainer = document.getElementById('character-selection');
const boyCharPreview = document.querySelector('[data-char-preview="BOY"]');
const girlCharPreview = document.querySelector('[data-char-preview="GIRL"]');
const bgCity = document.getElementById('bg-city');
const bgSky = document.getElementById('bg-sky');
const bgSpace = document.getElementById('bg-space');


// --- 게임 상태 변수 (Game State Variables) ---
let gameState = 'IDLE';
let score = 0;
let highScore = 0;
let stairs = [];
let currentStairIndex = 0;
let timeLeft = 0;
let timerInterval = null;
let nextDirection = 'RIGHT';
let lastGeneratedDirection = 1;
let selectedCharacter = 'BOY';
let isJumping = false; // 점프 중 입력 방지 플래그

// --- 게임 로직 함수 (Game Logic Functions) ---

function getDifficulty(currentScore) {
    if (currentScore >= 700) return 'HARD';
    if (currentScore >= 300) return 'MEDIUM';
    return 'EASY';
}

function getDifficultyText(difficulty) {
    switch (difficulty) {
        case 'EASY': return '쉬움';
        case 'MEDIUM': return '보통';
        case 'HARD': return '어려움';
        default: return '쉬움';
    }
}

function getTimeLimitForDifficulty(difficulty) {
    switch(difficulty) {
        case 'EASY': return 10000;
        case 'MEDIUM': return 7000;
        case 'HARD': return 5000;
        default: return 10000;
    }
}

/**
 * 난이도에 따라 동적으로 배경을 업데이트합니다.
 */
function updateBackground() {
    const difficulty = getDifficulty(score);

    // 모든 배경 비활성화
    bgCity.classList.remove('active');
    bgSky.classList.remove('active');
    bgSpace.classList.remove('active');

    // 현재 난이도에 맞는 배경 활성화
    if (gameState !== 'PLAYING') {
        bgCity.classList.add('active'); // 게임 중이 아닐 때는 기본 배경
        return;
    }

    switch (difficulty) {
        case 'EASY':
            bgCity.classList.add('active');
            break;
        case 'MEDIUM':
            bgSky.classList.add('active');
            break;
        case 'HARD':
            bgSpace.classList.add('active');
            break;
    }
}


function generateNextStair(existingStairs, score) {
    const lastStair = existingStairs[existingStairs.length - 1];
    const { id, lane } = lastStair;
    const difficulty = getDifficulty(score);
    let continueProbability;

    switch(difficulty) {
        case 'EASY': continueProbability = 0.9; break;
        case 'MEDIUM': continueProbability = 0.5; break;
        case 'HARD': continueProbability = 0.2; break;
        default: continueProbability = 0.9;
    }

    if (Math.random() > continueProbability) {
        lastGeneratedDirection *= -1;
    }
    
    let nextLane = lane + lastGeneratedDirection;

    if (nextLane < 0) {
        nextLane = 1;
        lastGeneratedDirection = 1;
    } else if (nextLane >= LANE_COUNT) {
        nextLane = LANE_COUNT - 2;
        lastGeneratedDirection = -1;
    }

    return { id: id + 1, lane: nextLane, item: null }; // 아이템 정보 추가
}

/**
 * 아이템 목록에서 가중치 기반으로 무작위 아이템을 선택합니다.
 * @returns {object | null} 선택된 아이템 객체 또는 null
 */
function selectRandomItem() {
    const totalRarity = ALL_ITEMS.reduce((sum, item) => sum + item.rarity, 0);
    let randomValue = Math.random() * totalRarity;

    for (const item of ALL_ITEMS) {
        if (randomValue < item.rarity) {
            return { ...item }; // 객체 복사본 반환
        }
        randomValue -= item.rarity;
    }
    return null;
}


function getStairXOffset(lane) {
    // vw 단위를 사용하여 x축 오프셋 계산
    return (lane - Math.floor(LANE_COUNT / 2)) * LANE_WIDTH_VW;
}


/**
 * 아이템 획득 시 피드백 텍스트를 화면에 표시합니다.
 * @param {string} text - 표시할 텍스트 (예: "+10 점수!")
 */
function showFloatingText(text) {
    const textEl = document.createElement('div');
    textEl.className = 'floating-text';
    textEl.textContent = text;
    characterModel.appendChild(textEl);

    textEl.addEventListener('animationend', () => {
        textEl.remove();
    });
}


/**
 * 아이템 획득을 처리합니다.
 */
function handleItemCollection() {
    const currentStair = stairs[currentStairIndex];
    if (!currentStair || !currentStair.item) return;

    const collectedItem = currentStair.item;
    currentStair.item = null; // 아이템 수집 처리 (중복 방지)

    if (collectedItem.type === 'score') {
        score += collectedItem.value;
        showFloatingText(`+${collectedItem.value} 점수!`);
        updateUI();
    } else if (collectedItem.type === 'jump') {
        showFloatingText(`+${collectedItem.value} JUMP!`);
        performJump(collectedItem.value);
    }
}

/**
 * 지정된 수만큼 블록을 점프하는 애니메이션과 로직을 수행합니다.
 * @param {number} blocksToJump - 점프할 블록의 수
 */
function performJump(blocksToJump) {
    if (isJumping) return;
    isJumping = true;

    const targetIndex = Math.min(currentStairIndex + blocksToJump, TOTAL_STAIRS);
    
    // 점프하는 동안은 난이도에 상관없이 시간 고정
    timeLeft = getTimeLimitForDifficulty('EASY');
    
    // 점프하는 동안 계단 이동 애니메이션 속도를 빠르게 설정
    stairsContainer.style.transition = 'bottom 0.7s cubic-bezier(0.25, 1, 0.5, 1)';
    
    // 점프 후 위치로 점수와 인덱스를 즉시 업데이트
    score = targetIndex;
    currentStairIndex = targetIndex;
    
    if (score >= TOTAL_STAIRS) {
        // 애니메이션이 끝난 후 게임 승리 처리
        setTimeout(() => {
            isJumping = false;
            setGameWin();
        }, 700);
    } else {
        // 애니메이션이 끝난 후 원래 상태로 복귀
        setTimeout(() => {
            isJumping = false;
            stairsContainer.style.transition = 'bottom 150ms ease-out';
            // 점프가 끝난 후 아이템이 있는지 다시 확인
            handleItemCollection(); 
        }, 700);
    }

    updateUI(); // 점프 후 UI 즉시 업데이트
}


function updateUI() {
    scoreDisplay.textContent = score.toString();
    highScoreDisplay.textContent = `최고 점수: ${highScore}`;
    const currentDifficulty = getDifficulty(score);
    difficultyDisplay.textContent = getDifficultyText(currentDifficulty);
    difficultyDisplay.style.display = gameState === 'PLAYING' ? 'block' : 'none';

    // 배경 업데이트 호출
    updateBackground();

    const currentTimeLimit = getTimeLimitForDifficulty(currentDifficulty);
    if (currentTimeLimit > 0) {
        timerBar.style.width = `${(timeLeft / currentTimeLimit) * 100}%`;
    }

    if (gameState === 'IDLE' || gameState === 'GAME_OVER' || gameState === 'GAME_WON') {
        overlay.classList.remove('hidden');
        controls.classList.add('hidden');
        timerContainer.style.display = 'none';
        
        startButton.style.display = 'block';
        characterSelectButton.style.display = 'none';
        winCharacterSelectButton.style.display = 'none';
        winContent.style.display = 'none';
        idleContent.style.display = 'none';
        gameOverContent.style.display = 'none';

        if (gameState === 'IDLE') {
            idleContent.style.display = 'flex';
            startButton.textContent = '게임 시작';
        } else if (gameState === 'GAME_OVER') {
            gameOverContent.style.display = 'flex';
            characterSelectButton.style.display = 'inline-block';
            finalScoreDisplay.textContent = `점수: ${score}`;
            finalHighScoreDisplay.textContent = `최고 점수: ${highScore}`;
            startButton.textContent = '다시하기';
        } else if (gameState === 'GAME_WON') {
            winContent.style.display = 'flex';
            winCharacterSelectButton.style.display = 'inline-block';
            winHighScoreDisplay.textContent = `최고 점수: ${highScore}`;
            startButton.textContent = '다시하기';
        }
    } else {
        overlay.classList.add('hidden');
        controls.classList.remove('hidden');
        timerContainer.style.display = 'block';
    }
    
    stairsContainer.innerHTML = '';
    const start = Math.max(0, currentStairIndex - 15);
    const end = Math.min(stairs.length, currentStairIndex + 30);
    for(let i = start; i < end; i++) {
        const stair = stairs[i];
        const stairEl = document.createElement('div');
        stairEl.className = 'stair';
        // vw 단위를 사용하여 위치 계산
        stairEl.style.bottom = `${i * STAIR_HEIGHT_VW}vw`;
        stairEl.style.transform = `translateX(calc(-50% + ${getStairXOffset(stair.lane)}vw))`;

        const stairImg = document.createElement('img');
        stairImg.src = stair.imageSrc;
        stairImg.alt = `블록 ${stair.id}`;
        stairEl.appendChild(stairImg);

        // 아이템 렌더링
        if (stair.item) {
            const itemEl = document.createElement('img');
            itemEl.src = stair.item.src;
            itemEl.className = 'stair-item';
            itemEl.alt = stair.item.id;
            stairEl.appendChild(itemEl);
        }

        stairsContainer.appendChild(stairEl);
    }
    
    // vw 단위를 사용하여 컨테이너 높이와 위치 계산
    stairsContainer.style.height = `${(stairs.length + 5) * STAIR_HEIGHT_VW}vw`;
    stairsContainer.style.bottom = `calc(20vh - ${currentStairIndex * STAIR_HEIGHT_VW}vw)`;

    const currentCharacterStair = stairs[currentStairIndex];
    if (currentCharacterStair) {
        // vw 단위를 사용하여 캐릭터 위치 계산
        character.style.transform = `translateX(calc(-50% + ${getStairXOffset(currentCharacterStair.lane)}vw))`;
        character.style.display = 'block';
    } else {
         character.style.display = 'none';
    }
    
    characterSprite.src = CHARACTER_ASSETS[selectedCharacter];
    if (nextDirection === 'RIGHT') {
        characterSprite.classList.add('flipped');
    } else {
        characterSprite.classList.remove('flipped');
    }
}

function setGameOver() {
     if (gameState === 'PLAYING') {
        gameState = 'GAME_OVER';
        if(timerInterval) clearInterval(timerInterval);
        if (score > highScore) {
            highScore = score;
            localStorage.setItem(HIGH_SCORE_KEY, highScore.toString());
        }
        updateUI();
     }
}

function setGameWin() {
    if (gameState === 'PLAYING') {
        gameState = 'GAME_WON';
        if(timerInterval) clearInterval(timerInterval);
        highScore = Math.max(highScore, TOTAL_STAIRS);
        localStorage.setItem(HIGH_SCORE_KEY, highScore.toString());
        updateUI();
    }
}

function goToCharacterSelect() {
    gameState = 'IDLE';
    score = 0;
    updateUI();
}

function handleChangeDirectionAndMove() {
    if (gameState !== 'PLAYING' || isJumping) return;
    nextDirection = (nextDirection === 'LEFT') ? 'RIGHT' : 'LEFT';
    updateUI(); 
    handleMove();
}

function handleMove() {
    if (gameState !== 'PLAYING' || isJumping) return;

    const currentStair = stairs[currentStairIndex];
    const nextStair = stairs[currentStairIndex + 1];

    if (!currentStair || !nextStair) {
        setGameOver();
        return;
    }

    const expectedLaneChange = nextStair.lane - currentStair.lane;

    if ((nextDirection === 'LEFT' && expectedLaneChange === -1) || (nextDirection === 'RIGHT' && expectedLaneChange === 1)) {
        currentStairIndex++;
        score++;
        
        if (score >= TOTAL_STAIRS) {
            setGameWin();
            return;
        }
        
        const timeLimit = getTimeLimitForDifficulty(getDifficulty(score));
        timeLeft = timeLimit;

        updateUI();
        handleItemCollection(); // 이동 후 아이템 확인
    } else {
        setGameOver();
    }
}

/**
 * 게임을 위한 계단과 아이템을 생성하고 배치합니다.
 */
function initializeStairsWithItems() {
    // 1. 기본 계단 생성
    let imageIndex = 1;
    const initialStair = { id: 0, lane: Math.floor(LANE_COUNT / 2), imageSrc: `./assets/1.webp`, item: null };
    stairs = [initialStair];
    lastGeneratedDirection = Math.random() < 0.5 ? -1 : 1;
    for (let i = 1; i < TOTAL_STAIRS + 50; i++) { // 점프 아이템을 고려해 계단을 더 생성
        if (i > 0 && i % 20 === 0 && imageIndex < 50) {
            imageIndex++;
        }
        const nextStairData = generateNextStair(stairs, i);
        nextStairData.imageSrc = `./assets/${imageIndex}.webp`;
        stairs.push(nextStairData);
    }

    // 2. 모든 아이템이 최소 한 번씩 나타나도록 보장
    const guaranteedItemIndices = new Set();
    while (guaranteedItemIndices.size < ALL_ITEMS.length) {
        // 20층부터 950층 사이에 아이템 배치
        const randomIndex = Math.floor(Math.random() * (930)) + 20;
        guaranteedItemIndices.add(randomIndex);
    }

    const indicesArray = Array.from(guaranteedItemIndices);
    ALL_ITEMS.forEach((item, i) => {
        stairs[indicesArray[i]].item = { ...item };
    });

    // 3. 나머지 계단에 무작위로 아이템 배치
    for (let i = 20; i < TOTAL_STAIRS; i++) {
        if (!stairs[i].item && Math.random() < ITEM_SPAWN_CHANCE) {
            stairs[i].item = selectRandomItem();
        }
    }
}


function resetGame() {
    initializeStairsWithItems();

    score = 0;
    currentStairIndex = 0;
    timeLeft = getTimeLimitForDifficulty('EASY');
    gameState = 'PLAYING';
    isJumping = false;
    nextDirection = 'RIGHT'; 
    
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = window.setInterval(() => {
        if (isJumping) return; // 점프 중에는 타이머 감소 중지
        timeLeft -= 10;
        if (timeLeft <= 0) {
            setGameOver();
        } else {
            const currentTimeLimit = getTimeLimitForDifficulty(getDifficulty(score));
            timerBar.style.width = `${(timeLeft / currentTimeLimit) * 100}%`;
        }
    }, 10);

    updateUI();
}

function handleKeyPress(e) {
    if (e.repeat || isJumping) return;
    
    if ((gameState === 'IDLE' || gameState === 'GAME_OVER' || gameState === 'GAME_WON') && (e.code === 'Space' || e.code === 'Enter')) {
        e.preventDefault();
        resetGame();
        return;
    }

    if (gameState === 'PLAYING') {
         if (e.code === 'ShiftLeft' || e.code === 'ShiftRight' || e.key === 'Shift') {
            e.preventDefault();
            handleChangeDirectionAndMove();
        } else if (e.code === 'Space') {
            e.preventDefault();
            handleMove();
        }
    }
}

function init() {
    const storedHighScore = localStorage.getItem(HIGH_SCORE_KEY);
    if (storedHighScore) {
        highScore = parseInt(storedHighScore, 10);
    }
    
    if (boyCharPreview) boyCharPreview.src = CHARACTER_ASSETS.BOY;
    if (girlCharPreview) girlCharPreview.src = CHARACTER_ASSETS.GIRL;

    const initialStair = { id: 0, lane: Math.floor(LANE_COUNT / 2), imageSrc: './assets/1.webp' };
    stairs = [initialStair];
    currentStairIndex = 0;
    selectedCharacter = 'BOY';
    updateUI();

    characterSelectionContainer.addEventListener('click', (e) => {
        if (gameState !== 'IDLE') return;
        const selectedBtn = e.target.closest('.char-select-btn');
        if (!selectedBtn) return;

        const char = selectedBtn.dataset.char;
        if (char) {
            selectedCharacter = char;
        }

        document.querySelectorAll('.char-select-btn').forEach(btn => btn.classList.remove('active'));
        selectedBtn.classList.add('active');
        updateUI();
    });

    window.addEventListener('keydown', handleKeyPress);
    startButton.addEventListener('click', resetGame);
    changeDirectionButton.addEventListener('click', handleChangeDirectionAndMove);
    moveButton.addEventListener('click', handleMove);
    characterSelectButton.addEventListener('click', goToCharacterSelect);
    winCharacterSelectButton.addEventListener('click', goToCharacterSelect);
}

init();
