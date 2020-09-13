import { canvas, context, GRAVITY, SPEED_UNIT, WORLD_SIZE } from "./Consts";
import { Circle } from "./Geometry";
import { between, sign } from "./Helpers";
import RenderablePolygon from "./RenderablePolygon";
import { Url } from "./Url";
import { Matrix, Vector2D } from "./Vectorial";

const ROBOT_ACCELERATION = GRAVITY * 10;

export class Robot
{
    private static readonly collisionPosition = new Vector2D();
    private static readonly collisionSpeedProjection = new Vector2D();
    private static readonly collisionSpeed = new Vector2D();
    private static readonly directionFromCenterOfMassToCollisionPoint = new Vector2D();
    private readonly gradient: CanvasGradient;

    polygons: RenderablePolygon[];
    position: Vector2D = new Vector2D();
    speed: Vector2D = new Vector2D();
    dead: boolean = false;
    head: Circle;
    headRelative = new Vector2D(0, 30);

    constructor (public readonly width: number, public readonly height: number, public readonly skew: number, public readonly thickness) {
        this.head = new Circle(50, new Vector2D(0, 0));

        const points1 = [
            [-width / 2 + skew, 0, 1],
            [-width / 2, -height, 1],
            [-width / 2 + thickness, -height, 1],
            [-width / 2 + thickness + skew, 0, 1],
        ];

        const points3 = Matrix.multiply(points1, Matrix.setToScale(Matrix.identity(3), -1, 1));

        const thicknessHeightRatio = thickness / height;

        const points2 = [
            points1[0],
            [-width / 2 + skew * (1 - thicknessHeightRatio), -thickness],
            [width / 2 - skew * (1 - thicknessHeightRatio), -thickness],
            points3[0]
        ];

        this.polygons = [
            new RenderablePolygon(this.position, points2, 'white'),
            new RenderablePolygon(this.position, points1, '#08f'),
            new RenderablePolygon(this.position, points3, '#08f'),
        ];


        this.gradient = context.createRadialGradient(0, -30, 10, 0, 0, 100);
        this.gradient.addColorStop(0.2, '#fff');
        this.gradient.addColorStop(0.51, '#ddd');
        this.gradient.addColorStop(1, '#eee');
    }

    render(context: CanvasRenderingContext2D) {

        for (let i = 0; i < this.polygons.length; i++) {
            context.strokeStyle = 'black';
            context.lineWidth = 2;
            this.polygons[i].render(context);
            context.stroke();
        }

        context.save();
        context.translate(this.position.x, this.position.y + this.headRelative.y);

        context.fillStyle = this.gradient;
        context.beginPath();
        context.arc(0, 0, 50, 0, 6.3, true);
        context.fill();
        context.stroke();

        context.fillStyle = 'black';
        context.save();
        context.scale(1, 0.6);
        context.beginPath();
        context.arc(0, -30, 40, 0, 6.3, true);
        context.fill();
        context.restore();

        context.fillStyle = 'blue';
        context.beginPath();
        context.arc(-13, -25, 6, 0, 6.3, true);
        context.arc(13, -25, 6, 0, 6.3, true);
        context.fill();
        context.restore();


        context.restore();
    }

    step() {
        this.head.position.copyFrom(this.position).add(this.headRelative);
        for (let i = 0; i < this.polygons.length; i++) {
            this.polygons[i].direction = -(this.speed.x * Math.PI * 0.00001) / SPEED_UNIT;
            this.polygons[i].preStep();
        }

        const robotDirection = sign(this.speed.x);
        const translatedMouseX = this.width / 2 + (WORLD_SIZE - this.width) * mouseX;
        const mouseDirection = sign(translatedMouseX - this.position.x);
        const isWrongDirection = mouseDirection !== robotDirection;


        if (isWrongDirection) {
            this.speed.x += ROBOT_ACCELERATION * mouseDirection;
        } else {
            const timeToFullStop = Math.abs(this.speed.x / ROBOT_ACCELERATION);
            const destinationAtFullStop = this.position.x + 2 * this.speed.x * timeToFullStop - robotDirection * ROBOT_ACCELERATION * timeToFullStop * timeToFullStop / 2;
            const mouseDirectionAtFullStop = sign(translatedMouseX - destinationAtFullStop);

            if (mouseDirectionAtFullStop === robotDirection) {
                this.speed.x += ROBOT_ACCELERATION * robotDirection;
            } else {
                this.speed.x -= ROBOT_ACCELERATION * robotDirection;
            }
        }
    }

    checkCollision(nextUrl: Url) {
        if (this.head.intersectsWithCircle(nextUrl.circle, Robot.collisionPosition)) {
            this.collide(nextUrl);
        }

        for (let i = 0; i < this.polygons.length; i++) {
            if (this.polygons[i].transformedPolygon.intersectsWithCircle(nextUrl.circle, Robot.collisionPosition)) {
                this.collide(nextUrl);
            }
        }
    }

    collide(nextUrl: Url) {
        Robot.collisionSpeed.copyFrom(nextUrl.speed).subtract(this.speed);
        Robot.directionFromCenterOfMassToCollisionPoint.copyFrom(Robot.collisionPosition).subtract(nextUrl.position);
        Robot.collisionSpeedProjection.copyFrom(Robot.directionFromCenterOfMassToCollisionPoint).setAsProjectionWith(Robot.collisionSpeed);

        if (Robot.directionFromCenterOfMassToCollisionPoint.scalarProduct(Robot.collisionSpeed) > 0) {
            nextUrl.speed.subtract(Robot.collisionSpeedProjection.setAsScaledBy(1.1));
        }
    }
}

let mouseX = 0.5;
document.querySelector('#game').addEventListener('mousemove', (ev: MouseEvent) => {
    mouseX = between(0, 1, ev.x / canvas.width);
});

document.querySelector('#game').addEventListener('touchmove', (ev: TouchEvent) => {
    mouseX = ev.touches[0].clientX / canvas.width;
});
