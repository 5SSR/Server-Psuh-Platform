import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { ReconciliationService } from '../payment/reconciliation.service';
import { ReconcileTaskQueryDto } from '../payment/dto/reconcile-task-query.dto';
import { ReconcileItemQueryDto } from '../payment/dto/reconcile-item-query.dto';
import { RunReconcileDto } from '../payment/dto/run-reconcile.dto';
import { ResolveReconcileItemDto } from '../payment/dto/resolve-reconcile-item.dto';

@Controller('admin/payments/reconcile')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class AdminPaymentReconcileController {
  constructor(private readonly reconcileService: ReconciliationService) {}

  @Post('run')
  run(@Body() dto: RunReconcileDto) {
    return this.reconcileService.run(dto.channel, dto.bizDate);
  }

  @Get('tasks')
  tasks(@Query() query: ReconcileTaskQueryDto) {
    return this.reconcileService.listTasks(query);
  }

  @Get('tasks/:taskId/items')
  items(@Param('taskId') taskId: string, @Query() query: ReconcileItemQueryDto) {
    return this.reconcileService.listItems(taskId, query);
  }

  @Patch('items/:itemId')
  resolveItem(@Param('itemId') itemId: string, @Body() dto: ResolveReconcileItemDto) {
    return this.reconcileService.resolveItem(itemId, dto);
  }
}
