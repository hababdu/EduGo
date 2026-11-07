import { Controller, Get } from '@nestjs/common';
import { CurrentUser, CurrentUserPayload } from '../../common/decorators/current-user.decorator';
import { PanelService } from './panel.service';

@Controller('api/v1/panel')
export class PanelController {
  constructor(private readonly svc: PanelService) {}
  /** Barcha panellar va mobil ilova uchun yagona boshlang'ich ma'lumot */
  @Get('context') context(@CurrentUser() u: CurrentUserPayload) { return this.svc.context(u); }
}
