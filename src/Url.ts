import { Vector2D } from "./Vectorial";
import { URL_RADIUS } from "./Consts";
import { Circle } from "./Geometry";

export class Url
{
    private static nextId = 1;
    public readonly id = Url.nextId++;
    private readonly collisionSpeed = new Vector2D();
    private readonly collisionPosition = new Vector2D();
    private readonly directionFromCenterOfMassToCollisionPoint = new Vector2D();
    private readonly collisionSpeedProjection = new Vector2D();
    public code = 404;
    public readonly speed = new Vector2D();
    public readonly circle: Circle;
    public readonly position: Vector2D;

    constructor() {
        this.position = new Vector2D();
        this.circle = new Circle(URL_RADIUS, this.position);
    }

    prepareContext(ctx: CanvasRenderingContext2D) {
        ctx.save();
        ctx.translate(this.position[0], this.position[1]);
    }

    checkCollision(other: Url) {
        if (!this.circle.intersectsWithCircle(other.circle, this.collisionPosition)) {
            return;
        }

        this.collisionSpeed.copyFrom(other.speed).subtract(this.speed);
        this.directionFromCenterOfMassToCollisionPoint.copyFrom(this.collisionPosition).subtract(other.position);
        this.collisionSpeedProjection.copyFrom(this.directionFromCenterOfMassToCollisionPoint).setAsProjectionWith(this.collisionSpeed);

        if (this.directionFromCenterOfMassToCollisionPoint.scalarProduct(this.collisionSpeed) > 0) {
            this.speed.add(this.collisionSpeedProjection.setAsScaledBy(1.1));
            other.speed.subtract(this.collisionSpeedProjection.setAsScaledBy(1.1));
        }
    }

    draw(ctx: CanvasRenderingContext2D) {
        ctx.fillStyle = this.code === 404 ? 'red' : 'green';
        ctx.beginPath();
        ctx.arc(0, 0, URL_RADIUS, 0, 6.3, true);
        ctx.fill();
        ctx.fillStyle = 'white';
        ctx.fillText(this.code.toString(), -12, 3);
    }

    restoreContext(ctx: CanvasRenderingContext2D) {
        ctx.restore();
    }

    render(ctx: CanvasRenderingContext2D) {
        this.prepareContext(ctx);
        this.draw(ctx);
        this.restoreContext(ctx);
    }
}