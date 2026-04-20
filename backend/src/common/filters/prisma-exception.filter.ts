import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Response } from 'express';

/**
 * Traduz erros do Prisma em HTTP responses amigáveis.
 *
 * P2002 unique violation → 409 Conflict com mensagem por campo
 * P2025 record not found → 404
 * P2003 foreign key failed → 400
 *
 * Sem isso, cliente recebe stack trace crua.
 */
@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(PrismaExceptionFilter.name);

  catch(exception: Prisma.PrismaClientKnownRequestError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Erro de banco de dados';

    switch (exception.code) {
      case 'P2002': {
        status = HttpStatus.CONFLICT;
        const target = (exception.meta?.target as string[]) || [];
        const fieldLabels: Record<string, string> = {
          email: 'E-mail',
          referralCode: 'Código de referral',
          slug: 'Slug',
          token: 'Token',
        };
        const label = fieldLabels[target[0]] || target[0] || 'campo';
        message = `${label} já está em uso`;
        break;
      }
      case 'P2025':
        status = HttpStatus.NOT_FOUND;
        message = 'Registro não encontrado';
        break;
      case 'P2003':
        status = HttpStatus.BAD_REQUEST;
        message = 'Referência inválida (foreign key)';
        break;
      default:
        this.logger.error(`Unhandled Prisma code ${exception.code}: ${exception.message}`);
    }

    res.status(status).json({
      success: false,
      statusCode: status,
      message,
      code: exception.code,
      timestamp: new Date().toISOString(),
    });
  }
}
