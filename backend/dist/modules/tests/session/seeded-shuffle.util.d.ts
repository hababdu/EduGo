export declare function seededShuffle<T extends {
    id: string;
}>(items: T[], sessionSeed: number, questionId: string): T[];
