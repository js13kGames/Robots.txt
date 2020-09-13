import { createRobot, start as gameStart } from "./Game";
import { LocalStorage } from "./LocalStorage";
import { start as tutorialStart } from "./Tutorial";

document.querySelector('#menu__deploy').addEventListener('click', () => {
    document.querySelector('#menu').classList.add('hidden');

    if (!LocalStorage.get().playedTutorial) {
        tutorialStart();
    } else {
        gameStart();
    }
});

const initializeFromLocalStorage = () => {
    const data = LocalStorage.get();

    if (data.playedTutorial) {
        (<HTMLDivElement>document.querySelector('#menu__tutorial')).style.display = 'initial';
    }

    const convertToValue = (n: number) => (n * 100).toString();

    (<HTMLInputElement>document.querySelector('#size')).value = convertToValue(data.robotSettings.width);
    (<HTMLInputElement>document.querySelector('#skew')).value = convertToValue(data.robotSettings.skew);
    (<HTMLInputElement>document.querySelector('#thickness')).value = convertToValue(data.robotSettings.thickness);
    (<HTMLInputElement>document.querySelector('#height')).value = convertToValue(data.robotSettings.height);

}
initializeFromLocalStorage();

document.querySelector('#menu__tutorial').addEventListener('click', () => {
    document.querySelector('#menu').classList.add('hidden');

    tutorialStart();
});

document.querySelector('#game-over__okay').addEventListener('click', () => {
    document.querySelector('#game-over').classList.add('hidden');
    document.querySelector('#menu').classList.remove('hidden');
});

const robotPreview = <HTMLCanvasElement>document.querySelector('#robot-preview');
const context = robotPreview.getContext('2d');

const updateRobotPreview = () => {
    const parseValue = (element: HTMLElement) => parseInt((<HTMLInputElement>element).value) / 100;
    const width = parseValue(document.querySelector('#size'));
    const skew = parseValue(document.querySelector('#skew'));
    const thickness = parseValue(document.querySelector('#thickness'));
    const height = parseValue(document.querySelector('#height'));
    const color = parseValue(document.querySelector('#color'));
    LocalStorage.update(storage => {
        storage.robotSettings = {
            width,
            skew,
            thickness,
            height,
            color,
        }
    });

    const robot = createRobot();
    context.resetTransform();
    context.clearRect(0, 0, robotPreview.width, robotPreview.height);
    context.translate(robotPreview.width / 2, robotPreview.height * 0.75);
    context.scale(robotPreview.width / 700, robotPreview.width / 700);
    robot.render(context);
};

document.querySelectorAll('input[type=range]').forEach(input => input.addEventListener('input', updateRobotPreview));

const resize = () => {
    document.querySelectorAll('canvas').forEach(canvas => {
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
    });

    updateRobotPreview();
};
window.addEventListener('resize', resize);
resize();

const isTouchDevice = () => {
    try {
        document.createEvent("TouchEvent");
        return true;
    } catch (e) {
        return false;
    }
};

if (isTouchDevice()) {
    (<HTMLDivElement>document.querySelector('#game__abort')).style.display = 'initial';
}

const enableSubscriberOnly = () => {
    document.querySelectorAll('.subscriber-only').forEach(element => element.classList.remove('subscriber-only'));
};

const initializeMonetization = () => {
    try {
        const monetization = (document as any).monetization;

        if (!monetization) {
            return;
        }

        monetization.addEventListener('monetizationstart', () => {
            if (monetization.state === 'started') {
                enableSubscriberOnly();
            }
        });
    } catch (error) {
        console.error('Failed to initialize monetization', error);
    }
};
initializeMonetization();
