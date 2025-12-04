#!/usr/bin/env bun
import { secrets } from 'bun';

const SERVICE = 'trader-analyzer';

async function setSecret(name: string, value: string) {
  await secrets.set({ service: SERVICE, name, value });
  console.log(`✅ Secret '${name}' stored`);
}

async function getSecret(name: string) {
  return (await secrets.get({ service: SERVICE, name })) || null;
}

async function initFromEnv() {
  if (process.env.TELEGRAM_BOT_TOKEN) {
    await setSecret('telegram-bot-token', process.env.TELEGRAM_BOT_TOKEN);
  }
  if (process.env.TELEGRAM_CHAT_ID) {
    await setSecret('telegram-chat-id', process.env.TELEGRAM_CHAT_ID);
  }
  console.log('✅ Secrets initialized from env');
}

const [cmd, name, value] = process.argv.slice(2);

switch (cmd) {
  case 'set':
    if (!name || !value) {
      console.error('Usage: bun run scripts/secrets-manager.ts set <name> <value>');
      process.exit(1);
    }
    await setSecret(name, value);
    break;
  case 'get':
    if (!name) {
      console.error('Usage: bun run scripts/secrets-manager.ts get <name>');
      process.exit(1);
    }
    const secret = await getSecret(name);
    console.log(secret || 'Not found');
    break;
  case 'init':
    await initFromEnv();
    break;
  default:
    console.log('Usage: bun run scripts/secrets-manager.ts <set|get|init> [name] [value]');
}
