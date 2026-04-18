import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class SimulatorService {
  private readonly logger = new Logger(SimulatorService.name);

  constructor(private prisma: PrismaService) {}

  async simulateDestinations(
    milesQty: number,
    programSlug: string,
    flightClass: string,
    maxStops?: number,
    origin?: string,
  ) {
    const program = await this.prisma.loyaltyProgram.findUnique({
      where: { slug: programSlug },
    });
    if (!program) return [];

    const requestedOrigin = (origin || 'GRU').toUpperCase();

    const where: any = {
      programId: program.id,
      origin: requestedOrigin,
      cabinClass: flightClass.toLowerCase(),
      isActive: true,
      milesRequired: { lte: milesQty },
    };

    if (maxStops === 0) where.isDirectFlight = true;

    const charts = await this.prisma.awardChart.findMany({
      where,
      orderBy: { milesRequired: 'asc' },
      include: { program: true },
    });

    return charts.map((c) => ({
      name: c.destinationName,
      iataCode: c.destination,
      country: c.country,
      milesRequired: c.milesRequired,
      class: c.cabinClass,
      isDirectFlight: c.isDirectFlight,
      lat: c.lat,
      lng: c.lng,
    }));
  }

  async getDestinationsMap(
    milesQty: number,
    programSlug: string,
    flightClass: string,
    origin?: string,
  ) {
    const program = await this.prisma.loyaltyProgram.findUnique({
      where: { slug: programSlug },
    });
    if (!program) return [];

    const requestedOrigin = (origin || 'GRU').toUpperCase();

    const charts = await this.prisma.awardChart.findMany({
      where: {
        programId: program.id,
        origin: requestedOrigin,
        cabinClass: flightClass.toLowerCase(),
        isActive: true,
      },
      orderBy: { milesRequired: 'asc' },
    });

    return charts.map((c) => ({
      name: c.destinationName,
      iataCode: c.destination,
      country: c.country,
      milesRequired: c.milesRequired,
      lat: c.lat,
      lng: c.lng,
      reachable: c.milesRequired <= milesQty,
      isDirectFlight: c.isDirectFlight,
    }));
  }
}
