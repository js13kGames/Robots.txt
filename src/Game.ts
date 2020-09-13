import { Url } from "./Url";
import { WORLD_SIZE, GRAVITY, TERMINAL_VELOCITY, STEPS_PER_MILISECOND, SPEED_UNIT, STEPS_PER_SECOND, URL_RADIUS, scene as scene, canvas, context } from "./Consts";
import { Vector2D } from "./Vectorial";
import { Robot } from "./Robot";
import { Polygon } from "./Geometry";
import { between } from "./Helpers";
import { LocalStorage } from "./LocalStorage";

interface GameState {
    paused: boolean;
    over: boolean;
    urls: Set<Url>;
    robot: Robot;
    previousTime: number;
    nextSpawn: number;
    initialSpawnInterval: number;
    finalSpawnInterval: number;
    lastUrlDelete: {
        url: Url;
        fellOnSearch: boolean;
    };
    ranking: number;
    multiplier: number;
}

const resize = () => {
    scene.width = window.innerWidth;
    scene.height = window.innerHeight;
    scene.scale = Math.min(scene.width / WORLD_SIZE, scene.height / WORLD_SIZE);
};
window.addEventListener('resize', resize);
resize();

interface MovableObject {
    position: Vector2D;
    speed: Vector2D
}

const speed = (objectState: MovableObject) => {
    objectState.position.add(objectState.speed);
};

/*
let sps: number = 0;
let fps: number = 0;
let spsCounter: number = 0;
let fpsCounter: number = 0;
*/

const render = (current: GameState) => {
    context.font = '14px monospace';
    context.clearRect(0, 0, scene.width, scene.height);

    context.save();
    context.translate(scene.width / 2, 0);
    context.scale(scene.scale, scene.scale);
    context.translate(-WORLD_SIZE / 2, 0);

    for (const url of current.urls) {
        url.render(context);
    }

    current.robot.render(context);

    context.restore();

    /*
    context.strokeText(`SPS ${sps}`, 20, 20);
    context.strokeText(`FPS ${fps}`, 20, 40);
    */
};

const SEARCH_WIDTH = 0.8 * WORLD_SIZE;
const SEARCH_HEIGHT = 0.08 * WORLD_SIZE;
const search = new Polygon(
    [
        [(WORLD_SIZE - SEARCH_WIDTH) / 2, WORLD_SIZE - SEARCH_HEIGHT],
        [(WORLD_SIZE + SEARCH_WIDTH) / 2, WORLD_SIZE - SEARCH_HEIGHT],
        [(WORLD_SIZE + SEARCH_WIDTH) / 2, WORLD_SIZE],
        [(WORLD_SIZE - SEARCH_WIDTH) / 2, WORLD_SIZE],
    ]
);

const collidesWithSearch = (url: Url) => {
    return search.intersectsWithCircle(url.circle);
};

export const start = () => {
    const game = createGame();

    requestAnimationFrame((currentTime: number) => {
        const startDelay = 1000;
        game.initialize(currentTime + startDelay);
        window.requestAnimationFrame(game.loop);
    });
};

export const createRobot = () => {
    const settings = LocalStorage.get().robotSettings;
    const width = 80 + 350 * settings.width;
    const skew = width * (0.1 + 0.3 * settings.skew);
    const thickness = width * (0.1 + 0.2 * settings.thickness);
    const height = thickness + 10 + 90 * settings.height;

    return new Robot(width, height, skew, thickness);
};

const updateMultiplierDom = (multiplier: number) => {
    const container = <HTMLDivElement>document.querySelector('#multiplier-container');
    if (multiplier <= 1) {
        container.classList.add('hidden');
    } else {
        container.classList.remove('hidden');
        const number = <HTMLDivElement>document.querySelector('#multiplier');
        number.innerText = multiplier.toString();
    }
};

export const createGame = () => {
    const updateRankingValue = () => {
        const bar = <HTMLDivElement>document.querySelector('#ranking-bar__filled');
        bar.style.transform = `translate(${game.state.ranking}%, 0)`;
    };

    const updateScore = (newValue: number) => {
        score = newValue;
        const label = <HTMLDivElement>document.querySelector('#score');
        label.innerText = newValue.toString();
    };

    const increaseCombo = () => {
        combo = comboTime >= currentStep ? combo + 1 : 1;
        comboTime = currentStep + 3 * STEPS_PER_SECOND;
        updateMultiplier(combo);
    };

    const updateMultiplier = (newValue: number) => {
        if (multiplierTime >= currentStep && newValue <= state.multiplier) {
            return;
        }

        state.multiplier = newValue;
        multiplierTime = currentStep + 10 * STEPS_PER_SECOND;

        updateMultiplierDom(state.multiplier);
    };

    const tick = () => {
        speed(state.robot);
        state.robot.step();

        for (const url of state.urls) {
            if (collidesWithSearch(url)) {
                if (!state.robot.dead) {
                    if (url.code === 404) {
                        state.ranking -= 3;
                    } else {
                        state.ranking = Math.min(100, state.ranking + 10);
                        updateScore(score + 10 * state.multiplier);
                    }
                }

                state.urls.delete(url);
                state.lastUrlDelete = { fellOnSearch: true, url };
                continue;
            }

            if (url.position.y > WORLD_SIZE + URL_RADIUS) {
                state.urls.delete(url);
                state.lastUrlDelete = { fellOnSearch: false, url };

                if (url.code === 404 && !state.robot.dead) {
                    increaseCombo();
                }

                continue;
            }

            speed(url);
            url.speed.y = Math.min(url.speed.y + GRAVITY, TERMINAL_VELOCITY);
        }

        if (!state.robot.dead) {
            for (const url1 of state.urls) {
                for (const url2 of state.urls) {
                    if (url1.id < url2.id) {
                        url1.checkCollision(url2);
                    }
                }
            }
        }

        for (const url of state.urls) {
            state.robot.checkCollision(url);
        }
    };

    let gameTimeGap = 0;
    let currentStep: number = 0;
    let score: number;
    let combo: number;
    let comboTime: number;
    let multiplierTime: number;
    let nextRankingDeterioration;

    const state: GameState = {
        paused: false,
        over: false,
        urls: new Set(),
        robot: createRobot(),
        previousTime: 0,
        nextSpawn: 0,
        initialSpawnInterval: 2 * STEPS_PER_SECOND,
        finalSpawnInterval: 0.5 * STEPS_PER_SECOND,
        lastUrlDelete: null,
        ranking: 100,
        multiplier: 1,
    };

    const animate = (currentTime: number) => {
        render(state);

        const timeGap = Math.min(500, currentTime - state.previousTime + gameTimeGap);
        const stepsTorun = (timeGap * STEPS_PER_MILISECOND) | 0;
        gameTimeGap = timeGap - (stepsTorun / STEPS_PER_MILISECOND);
        //spsCounter += stepsTorun;
        state.previousTime = currentTime;
        const targetStep = currentStep + stepsTorun;
        const previousRanking = state.ranking;
        for (; currentStep < targetStep; currentStep++) {
            tick();
        }

        if (state.nextSpawn < currentStep) {
            const spawnX = (0.1 + 0.8 * Math.random()) * WORLD_SIZE;
            const newUrl = new Url();
            newUrl.position.x = spawnX;
            newUrl.position.y = -URL_RADIUS;
            newUrl.code = game.spawnUrlCode();
            state.urls.add(newUrl);

            if (state.robot.dead) {
                newUrl.speed.x = (Math.random() - 0.5) * 1000 * SPEED_UNIT;
                state.nextSpawn += 0.02 * STEPS_PER_SECOND;
            } else {
                game.scheduleNextSpawn();
            }
        }

        if (!state.robot.dead && nextRankingDeterioration < currentStep) {
            nextRankingDeterioration += 0.2 * STEPS_PER_SECOND;
            game.deteriorateRanking();
        }

        if (state.multiplier > 0 && multiplierTime < currentStep) {
            updateMultiplier(comboTime >= currentStep ? combo : 1);
        }

        if (state.ranking !== previousRanking) {
            updateRankingValue();
            if (state.ranking <= 0) {
                game.end();
            }
        }

        //fpsCounter++;
    };

    const game = {
        initialize: (currentTime: number) => {
            state.previousTime = currentTime;
            state.nextSpawn = currentStep + 2 * STEPS_PER_SECOND;
            nextRankingDeterioration = currentStep + 0.2 * STEPS_PER_SECOND;
            state.robot.position.x = WORLD_SIZE / 2;
            state.robot.position.y = WORLD_SIZE * 0.83;
            updateScore(0);
            updateMultiplier(1);
            render(state);
        },

        animate,

        state,

        loop: (currentTime: number) => {
            game.animate(currentTime);

            if (!game.state.over && !game.state.paused) {
                window.requestAnimationFrame(game.loop);
            }
        },

        resumeLoop: () => {
            game.state.paused = false;
            window.requestAnimationFrame((currentTime: number) => {
                state.previousTime = currentTime;
                game.loop(currentTime);
            });
        },

        spawnUrlCode: () => Math.random() > 0.6 ? 404 : 200,

        deteriorateRanking: () => {
            const progress = between(0, 1, currentStep / (120 * STEPS_PER_SECOND));
            game.state.ranking -= 0.5 + 2 * progress;
        },

        scheduleNextSpawn: () => {
            const progress = between(0, 1, currentStep / (60 * STEPS_PER_SECOND));
            state.nextSpawn += state.initialSpawnInterval + (state.finalSpawnInterval - state.initialSpawnInterval) * progress;
        },

        end: () => {
            state.robot.dead = true;
            state.nextSpawn = currentStep;
            window.removeEventListener('keydown', handleEscape);
            document.querySelector('#game__abort').removeEventListener('click', displayAbort);
            game.afterEnd();
        },

        afterEnd: () => {
            (<HTMLDivElement>document.querySelector('#game-over__score')).innerText = score.toString();
            const highScore = LocalStorage.update(storage => storage.highScore = Math.max(score, storage.highScore));
            (<HTMLDivElement>document.querySelector('#game-over__high-score')).innerText = highScore.toString();
            setTimeout(() => document.querySelector('#game-over').classList.remove('hidden'), 1500);
            setTimeout(() => state.over = true, 2500);
        },
    };

    const displayAbort = () => {
        if (!document.querySelector('#popup').classList.contains('hidden')) {
            return;
        }

        game.state.paused = true;
        document.querySelector('#popup__dialog').innerHTML = document.querySelector('#abort').innerHTML;
        document.querySelector('#popup').classList.remove('hidden');
        document.querySelector('#abort__yes').addEventListener('click', () => {
            game.end();
            game.resumeLoop();
            document.querySelector('#popup').classList.add('hidden');
        });

        document.querySelector('#abort__no').addEventListener('click', () => {
            game.resumeLoop();
            document.querySelector('#popup').classList.add('hidden');
        });
    };

    const handleEscape = (ev: KeyboardEvent) => {
        if (ev.key !== 'Escape') {
            return;
        }

        displayAbort();
    };

    document.querySelector('#game__abort').addEventListener('click', displayAbort);

    window.addEventListener('keydown', handleEscape);

    return game;
}

/*
setInterval(() => {
    sps = spsCounter;
    fps = fpsCounter;
    spsCounter = 0;
    fpsCounter = 0;
}, 1000);
*/
