import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SimulatorController } from './simulator.controller';
import { SimulatorService } from './simulator.service';
import { FlightSearchService } from './flight-search.service';
import { GoogleFlightsService } from './google-flights.service';
import { ScraperClientService } from './scraper-client.service';
import { FlightCacheService } from './flight-cache.service';
import { ScraperWebhookController } from './scraper-webhook.controller';

@Module({
  imports: [PrismaModule],
  controllers: [SimulatorController, ScraperWebhookController],
  providers: [
    SimulatorService,
    FlightSearchService,
    GoogleFlightsService,
    ScraperClientService,
    FlightCacheService,
  ],
})
export class SimulatorModule {}
