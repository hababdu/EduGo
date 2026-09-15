export interface CurrentUserPayload {
    id: string;
    telegramId: string;
    role: string;
    status: string;
}
export declare const CurrentUser: (...dataOrPipes: unknown[]) => ParameterDecorator;
