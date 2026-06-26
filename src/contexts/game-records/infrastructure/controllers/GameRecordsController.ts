/**
 * GameRecordsController — HTTP adapter for the game-records use cases
 * (spec: "Persist Game Record", "High Score per Player",
 * "List Game Records by User", "Authentication Enforcement").
 *
 * Routes (ALL protected — NO @Public; the global AuthGuard handles access
 * token verification + UserExists existence check, CRITICAL Decision #5):
 *   POST /game-records          -> PersistGameRecord -> 201 { id, score, durationMs, timestamp }
 *   GET  /game-records/high-score -> GetHighScore      -> 200 { highScore: number | null }
 *   GET  /game-records          -> ListGameRecords    -> 200 { items, total, hasMore }
 *
 * The userId is ALWAYS taken from the verified access token via `req.user`
 * (set by the global AuthGuard) — NEVER from the request body or a query
 * param. This guarantees "Cannot access other players' records": a caller can
 * only persist/read their own records.
 *
 * Design data flow (c): AuthGuard -> UserExists (NonExistentUserError on
 * deleted user) -> PersistGameRecord -> Score VO (rejects negative ->
 * ValidationError) -> repository save -> 201.
 *
 * Infrastructure layer: framework allowed (NestJS).
 */
import { Body, Controller, Get, Post, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { AuthenticatedUser } from '@shared/AuthGuard';
import { GetHighScore } from '../../application/usecases/GetHighScore';
import { ListGameRecords } from '../../application/usecases/ListGameRecords';
import { PersistGameRecord } from '../../application/usecases/PersistGameRecord';

interface PersistGameRecordDto {
  score?: number;
  durationMs?: number;
}

@Controller('game-records')
export class GameRecordsController {
  constructor(
    private readonly persistGameRecord: PersistGameRecord,
    private readonly getHighScore: GetHighScore,
    private readonly listGameRecords: ListGameRecords,
  ) {}

  @Post()
  async persist(
    @Req() req: Request,
    @Body() body: PersistGameRecordDto,
  ): Promise<{ id: string; score: number; durationMs: number; timestamp: Date }> {
    const userId = this.userIdOf(req);
    const record = await this.persistGameRecord.execute({
      userId,
      score: body.score ?? 0,
      durationMs: body.durationMs ?? 0,
    });
    return {
      id: record.id,
      score: record.score.value,
      durationMs: record.durationMs,
      timestamp: record.timestamp,
    };
  }

  @Get('high-score')
  async highScore(@Req() req: Request): Promise<{ highScore: number | null }> {
    const userId = this.userIdOf(req);
    const highScore = await this.getHighScore.execute({ userId });
    return { highScore };
  }

  @Get()
  async list(
    @Req() req: Request,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ): Promise<{
    items: { id: string; score: number; durationMs: number; timestamp: Date }[];
    total: number;
    hasMore: boolean;
  }> {
    const userId = this.userIdOf(req);
    const page = await this.listGameRecords.execute({
      userId,
      limit: this.parseOptionalInt(limit),
      offset: this.parseOptionalInt(offset),
    });
    return {
      items: page.items.map((r) => ({
        id: r.id,
        score: r.score.value,
        durationMs: r.durationMs,
        timestamp: r.timestamp,
      })),
      total: page.total,
      hasMore: page.hasMore,
    };
  }

  // --- helpers ---

  /** Always the authenticated caller — never a body/query value. */
  private userIdOf(req: Request): string {
    const user = (req as Request & { user?: AuthenticatedUser }).user;
    if (!user || typeof user.userId !== 'string' || user.userId.length === 0) {
      // The global AuthGuard guarantees `req.user` is set for protected routes;
      // reaching here means the guard was bypassed — fail closed.
      throw new Error('authenticated_user_missing');
    }
    return user.userId;
  }

  private parseOptionalInt(raw: string | undefined): number | undefined {
    if (raw === undefined || raw === '') return undefined;
    const n = Number(raw);
    return Number.isFinite(n) ? n : undefined;
  }
}