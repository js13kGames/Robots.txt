export const STEPS_PER_SECOND = 240;
export const STEPS_PER_MILISECOND = STEPS_PER_SECOND / 1000;
export const SPEED_UNIT = 1 / STEPS_PER_SECOND;
export const ACCELERATION_UNIT = SPEED_UNIT / STEPS_PER_SECOND;
export const GRAVITY = 1000 * ACCELERATION_UNIT;
export const TERMINAL_VELOCITY = 5000 * SPEED_UNIT;
export const WORLD_SIZE = 1000;
export const URL_RADIUS = WORLD_SIZE / 50;
export const canvas = <HTMLCanvasElement>document.querySelector('#game-canvas');
export const scene = {
    width: 1000,
    height: 1000,
    scale: 1
};
export const context = canvas.getContext('2d');
