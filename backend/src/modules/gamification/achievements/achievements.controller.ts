import { Controller, Get } from '@nestjs/common';
import { CurrentUser, CurrentUserPayload } from '../../../common/decorators/current-user.decorator';
import { AchievementsService } from './achievements.service';

@Controller('api/v1/achievements')
export class AchievementsController {
  constructor(private readonly achievementsService: AchievementsService) {}

  /** Barcha mavjud achievement'lar ro'yxati (galereya sifatida ko'rsatish uchun) */
  @Get()
  listAll() {
    return this.achievementsService.listAll();
  }

  /** O'zim qo'lga kiritganlarim */
  @Get('me')
  listMine(@CurrentUser() user: CurrentUserPayload) {
    return this.achievementsService.listForStudent(user.id);
  }
}
