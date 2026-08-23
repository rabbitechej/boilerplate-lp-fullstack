import {
  getLogFormat,
  getLogLevel,
  LOG_FORMATS,
  LOG_LEVELS,
  type LogFormat,
  type LogLevel,
} from '../config/env';
import { getRequestContext } from './requestContext';

export { LOG_FORMATS, LOG_LEVELS, type LogFormat, type LogLevel };

const LEVEL_WEIGHT: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
  silent: 100,
};

export type LogFields = Record<string, unknown>;

export type Logger = {
  debug(message: string, fields?: LogFields): void;
  info(message: string, fields?: LogFields): void;
  warn(message: string, fields?: LogFields): void;
  error(message: string, fields?: LogFields): void;
  /** Cria um logger derivado que sempre inclui os campos informados. */
  child(bindings: LogFields): Logger;
};

export type LoggerOptions = {
  level?: LogLevel;
  format?: LogFormat;
  bindings?: LogFields;
  write?: (line: string, level: LogLevel) => void;
  now?: () => Date;
  /** Desliga a leitura do AsyncLocalStorage (usado nos testes). */
  includeRequestContext?: boolean;
};

// Qualquer chave que "pareca" um segredo e' mascarada antes de virar log.
// Vale para campos aninhados: um `{ body: { password } }` tambem e' coberto.
const SENSITIVE_KEY_PATTERN = /pass|senha|secret|token|authorization|cookie|credential|api[_-]?key/i;
const REDACTED = '[REDACTED]';

const MAX_DEPTH = 4;
const MAX_ARRAY_ITEMS = 20;
const MAX_STRING_LENGTH = 2000;

function truncate(value: string): string {
  return value.length > MAX_STRING_LENGTH ? `${value.slice(0, MAX_STRING_LENGTH)}...[truncado]` : value;
}

export function serializeError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      ...(error.cause !== undefined ? { cause: serializeError(error.cause) } : {}),
    };
  }
  return { message: String(error) };
}

function sanitizeValue(value: unknown, depth: number, seen: WeakSet<object>): unknown {
  if (value === null || value === undefined) return value;
  if (typeof value === 'string') return truncate(value);
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (typeof value === 'bigint') return value.toString();
  if (typeof value === 'function') return '[Function]';
  if (typeof value === 'symbol') return value.toString();
  if (value instanceof Date) return value.toISOString();
  if (value instanceof Error) return serializeError(value);
  if (Buffer.isBuffer(value)) return `[Buffer ${value.length} bytes]`;

  if (typeof value === 'object') {
    if (seen.has(value)) return '[Circular]';
    if (depth >= MAX_DEPTH) return '[Profundidade maxima]';
    seen.add(value);

    if (Array.isArray(value)) {
      const items = value.slice(0, MAX_ARRAY_ITEMS).map((item) => sanitizeValue(item, depth + 1, seen));
      if (value.length > MAX_ARRAY_ITEMS) items.push(`...mais ${value.length - MAX_ARRAY_ITEMS} itens`);
      return items;
    }

    const result: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      result[key] = SENSITIVE_KEY_PATTERN.test(key) ? REDACTED : sanitizeValue(item, depth + 1, seen);
    }
    return result;
  }

  return String(value);
}

/** Mascara segredos, corta strings/arrays gigantes e resolve ciclos. */
export function sanitizeFields(fields: LogFields): LogFields {
  return sanitizeValue(fields, 0, new WeakSet()) as LogFields;
}

function formatPrettyValue(value: unknown): string {
  if (typeof value === 'string') return /\s/.test(value) ? JSON.stringify(value) : value;
  if (value === null || value === undefined) return String(value);
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

export function formatLogEntry(
  format: LogFormat,
  entry: { level: LogLevel; time: string; message: string; fields: LogFields },
): string {
  if (format === 'json') {
    return JSON.stringify({
      level: entry.level,
      time: entry.time,
      message: entry.message,
      ...entry.fields,
    });
  }

  const pairs = Object.entries(entry.fields)
    .map(([key, value]) => `${key}=${formatPrettyValue(value)}`)
    .join(' ');
  const head = `${entry.time} ${entry.level.toUpperCase().padEnd(5)} ${entry.message}`;
  return pairs ? `${head} ${pairs}` : head;
}

function defaultWrite(line: string, level: LogLevel): void {
  const stream = level === 'error' || level === 'warn' ? process.stderr : process.stdout;
  stream.write(`${line}\n`);
}

export function createLogger(options: LoggerOptions = {}): Logger {
  const bindings = options.bindings ?? {};
  const write = options.write ?? defaultWrite;
  const now = options.now ?? (() => new Date());
  const includeRequestContext = options.includeRequestContext ?? true;

  function emit(level: LogLevel, message: string, fields: LogFields = {}): void {
    // Nivel e formato sao resolvidos a cada chamada para que mudar LOG_LEVEL
    // (em testes ou num script) tenha efeito sem recriar o logger.
    const activeLevel = options.level ?? getLogLevel();
    if (LEVEL_WEIGHT[level] < LEVEL_WEIGHT[activeLevel]) return;

    const context = includeRequestContext ? getRequestContext() : undefined;
    const merged: LogFields = {
      ...(context?.requestId ? { requestId: context.requestId } : {}),
      ...(context?.adminId ? { adminId: context.adminId } : {}),
      ...bindings,
      ...fields,
    };

    const line = formatLogEntry(options.format ?? getLogFormat(), {
      level,
      time: now().toISOString(),
      message,
      fields: sanitizeFields(merged),
    });
    write(line, level);
  }

  const logger: Logger = {
    debug: (message, fields) => emit('debug', message, fields),
    info: (message, fields) => emit('info', message, fields),
    warn: (message, fields) => emit('warn', message, fields),
    error: (message, fields) => emit('error', message, fields),
    child: (extraBindings) => createLogger({ ...options, bindings: { ...bindings, ...extraBindings } }),
  };

  return logger;
}

/** Logger padrao da aplicacao. Prefira `logger.child({ ... })` em modulos. */
export const logger = createLogger();
