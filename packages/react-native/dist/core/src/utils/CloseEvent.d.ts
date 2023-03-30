/**
 * Class representing a close event.
 * The `ws` package does not expose it so we can easily create one in here.
 *
 * @extends Event
 */
export declare class CloseEvent extends Event {
    code: number;
    reason: string;
    wasClean: boolean;
    constructor(type: string, options?: {
        code?: number;
        reason?: string;
        wasClean?: boolean;
    });
}
//# sourceMappingURL=CloseEvent.d.ts.map