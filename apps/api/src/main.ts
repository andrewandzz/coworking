import 'reflect-metadata';
import { existsSync } from 'node:fs';
import { loadEnvFile } from 'node:process';
import { fileURLToPath } from 'node:url';
import { StandardSchemaValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';
import { parsePort } from './config.js';

const envFile = fileURLToPath(new URL('../../../.env', import.meta.url));
if (existsSync(envFile)) {
  loadEnvFile(envFile);
}

const app = await NestFactory.create<NestExpressApplication>(AppModule);
app.setGlobalPrefix('api');
app.useGlobalPipes(new StandardSchemaValidationPipe());
app.enableShutdownHooks();

const browserBuild = new URL('../../web/dist/coworking/browser/', import.meta.url);
if (existsSync(new URL('index.html', browserBuild))) {
  app.useStaticAssets(fileURLToPath(browserBuild));
}

await app.listen(parsePort('PORT', 3000), process.env.HOST ?? '127.0.0.1');
