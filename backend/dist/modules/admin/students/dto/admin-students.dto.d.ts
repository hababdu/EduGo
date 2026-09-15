export declare class ListStudentsQueryDto {
    search?: string;
    groupId?: string;
    status?: 'ACTIVE' | 'BLOCKED' | 'PENDING';
    page: number;
    pageSize: number;
}
export declare class AdjustScoreDto {
    amount: number;
    reason: string;
}
