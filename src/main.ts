import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DomainExceptionFilter } from './shared/DomainExceptionFilter';

/**
 * Application bootstrap.
 *
 * Hosts an HTTP server (NestFactory.create) so the identity and game-records
 * controllers can be reached. NOTE: the SDD apply prompt suggested
 * createApplicationContext, but that does not bind a port; a backend with
 * REST controllers needs create() + app.listen(). Reconciled here and noted
 * in the apply-progress deviation list.
 *
 * The global DomainExceptionFilter is registered here (design Decision #10):
 * typed DomainError subclasses are mapped to HTTP responses in one chokepoint.
 * The global AuthGuard is registered as an APP_GUARD provider in AppModule.
 */
async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: true,
    credentials: true,
  });
  app.useGlobalFilters(new DomainExceptionFilter());
  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  // eslint-disable-next-line no-console
  console.log(`Air-Pilote backend listening on :${port}`);
}

void bootstrap();