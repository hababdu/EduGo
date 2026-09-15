import { PrismaService } from '../../../prisma/prisma.service';
interface LogParams {
    actorId: string;
    action: string;
    targetType: string;
    targetId: string;
    oldValue?: unknown;
    newValue?: unknown;
}
export declare class AuditService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    log(params: LogParams): Promise<void>;
}
export {};
