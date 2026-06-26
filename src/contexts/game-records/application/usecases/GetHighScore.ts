/**
 * GetHighScore — return the highest score recorded for the authenticated
 * player (spec: "High Score per Player").
 *
 * Returns `number | null`: `null` when the player has no stored records
 * (spec: "No records exist" -> returns a null high score indicating no records
 * exist), otherwise the maximum score (e.g. 3000 over 1200/950).
 *
 * Application layer: framework-agnostic — depends only on ports.
 */
import { UseCase } from '@shared/application/UseCase';
import { GameRecordRepository } from '../ports/GameRecordRepository.port';

export interface GetHighScoreCommand {
  readonly userId: string;
}

export class GetHighScore extends UseCase<GetHighScoreCommand, number | null> {
  constructor(private readonly repository: GameRecordRepository) {
    super();
  }

  async execute(command: GetHighScoreCommand): Promise<number | null> {
    return this.repository.highScoreOf(command.userId);
  }
}