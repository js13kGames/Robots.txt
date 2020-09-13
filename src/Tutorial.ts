import { start as gameStart, createGame } from "./Game";
import { STEPS_PER_SECOND, WORLD_SIZE } from "./Consts";
import { Url } from "./Url";
import { Vector2D } from "./Vectorial";
import { LocalStorage } from "./LocalStorage";

const convertWorldToCss = (world: number) => {
    const value = 100 * (world / WORLD_SIZE - 0.5);

    return value < 0 ? `- ${-value}vmin` : `+ ${value}vmin`;
};

export const start = () => {
    const game = createGame();

    const introStep = {
        condition: () => true,

        message: () => `
            <h3>Welcome to the tutorial!</h3>
            <p>The objective of the game is to improve the website's ranking.</p>
        `,

        focus: () => null,

        next: () => robotStep,
    };

    const robotStep = {
        condition: () => true,

        message: () => `
            <p>Control the robot with the mouse or finger for touch devices.</p>
        `,

        focus: () => new Vector2D().copyFrom(game.state.robot.position).subtract(new Vector2D(0, game.state.robot.height / 2)),

        next: () => url200Step,
    };

    let stepUrl: Url;

    const url200Step = {
        condition: () => {
            for (const url of game.state.urls) {
                if (url.code === 200 && url.position.y > WORLD_SIZE * 0.2) {
                    stepUrl = url;
                    return true;
                }
            }
        },

        message: () => `
            <h3>200 URLs</h3>
            <p>New content is good!</p>
            <p>You should let them fall on the Search engine.</p>
        `,

        focus: () => stepUrl.position,

        next: () => url200OnSearchEngineStep,
    };

    const url200OnSearchEngineStep = {
        condition: () => game.state.lastUrlDelete && game.state.lastUrlDelete.fellOnSearch,

        message: () => `
            <p>
                When a 200 URL falls on the Search engine the ranking
                <br>
                is increased, and you earn score points.
            </p>
        `,

        focus: () => game.state.lastUrlDelete.url.position,

        next: () => url404Step,
    };

    const url404Step = {
        condition: () => {
            for (const url of game.state.urls) {
                if (url.code === 404 && url.position.y > WORLD_SIZE * 0.2) {
                    stepUrl = url;
                    return true;
                }
            }
        },

        message: () => `
            <h3>404 URLs</h3>
            <p>You must prevent them from falling on the Search engine.</p>
        `,

        focus: () => stepUrl.position,

        next: () => url404ThrownStep,
    };

    const url404ThrownStep = {
        condition: () => game.state.lastUrlDelete && game.state.lastUrlDelete.url.code === 404 && !game.state.lastUrlDelete.fellOnSearch,

        message: () => `
            <h3>Good job!</h3>
            <p>Get rid of 404 URLs quickly to make a combo.</p>
        `,

        focus: () => game.state.lastUrlDelete.url.position,

        next: () => comboStep,
    };

    const comboStep = {
        condition: () => game.state.multiplier >= 2,

        message: () => `
            <p>During a combo every score point you earn will be multiplied.</p>
        `,

        focus: () => new Vector2D(WORLD_SIZE * 0.95, WORLD_SIZE * 0.24),

        next: () => endStep,
    };

    const endStep = {
        condition: () => true,

        message: () => `
            <p>This is the end of the tutorial.</p>
        `,

        focus: () => null,

        next: () => null,
    };

    let step = introStep;


    const continueTutorial = () => {
        step = step.next();
        document.querySelector('#popup').classList.add('hidden');
        (<HTMLDivElement>document.querySelector('#popup__overlay')).style.background = null;
        game.resumeLoop();
    };

    game.loop = (currentTime: number) => {
        game.animate(currentTime);

        if (!step || !step.condition()) {
            if (!game.state.over && !game.state.paused) {
                window.requestAnimationFrame(game.loop);
            }

            return;
        }

        const message = step.message();
        if (!message) {
            continueTutorial();
            return;
        }

        document.querySelector('#popup__dialog').innerHTML = `
            ${message}
            <div id="popup__okay" class="button">Okay</div>
        `;
        document.querySelector('#popup').classList.remove('hidden');
        document.querySelector('#popup__okay').addEventListener(
            'click',
            continueTutorial,
            {once: true}
        );

        const focus = step.focus();
        if (focus) {
            (<HTMLDivElement>document.querySelector('#popup__overlay')).style.background = `
                radial-gradient(
                    circle at calc(50vw ${convertWorldToCss(focus.x)}) calc(50vh ${convertWorldToCss(focus.y)}),
                    rgba(0, 0, 0, 0.1) 0%,
                    rgba(0, 0, 0, 0.1) 10vmin,
                    rgba(0, 0, 0, 0.5) 11vmin
                )
            `;
        }
    };

    game.spawnUrlCode = () => {
        if (step === url200Step || step === url200OnSearchEngineStep) {
            return 200;
        }

        if (step === url404Step || step === url404ThrownStep || step === comboStep || step === endStep) {
            return 404;
        }

        return Math.random() > 0.6 ? 404 : 200;
    };

    game.deteriorateRanking = () => {
        if (step) {
            game.state.ranking = Math.max(game.state.ranking - 1, 20);
        } else {
            game.state.ranking -= 5;
        }
    };

    game.scheduleNextSpawn = () => {
        if (step === comboStep || step === endStep) {
            game.state.nextSpawn += 1 * STEPS_PER_SECOND;
        } else {
            game.state.nextSpawn += 5 * STEPS_PER_SECOND;
        }
    };

    game.afterEnd = () => {
        if (LocalStorage.get().playedTutorial) {
            setTimeout(() => document.querySelector('#menu').classList.remove('hidden'), 2000);
        } else {
            LocalStorage.update(storage => storage.playedTutorial = true);
            (<HTMLDivElement>document.querySelector('#menu__tutorial')).style.display = 'initial';
            document.querySelector('#get-ready').classList.remove('hidden');
            setTimeout(
                () => {
                    document.querySelector('#get-ready').classList.add('hidden');
                    gameStart();
                },
                4500
            );
        }
        setTimeout(() => game.state.over = true, 2500);
    };

    requestAnimationFrame((currentTime: number) => {
        const startDelay = 1000;
        game.state.nextSpawn = 5 * STEPS_PER_SECOND;
        game.initialize(currentTime + startDelay);
        window.requestAnimationFrame(game.loop);
    });
};