import { describe, expect, test } from "bun:test";
import type { Message } from "grammy/types";
import { isBotMentioned } from "./mention-parser";

describe("isBotMentioned", () => {
  test("returns false when bot username and user ID are not provided", () => {
    const message = { text: "@someone", entities: [{ type: "mention", offset: 0, length: 8 }] } as Message;
    expect(isBotMentioned(message)).toBe(false);
  });

  test("returns false when message has no entities", () => {
    const message = { text: "hello world" } as Message;
    expect(isBotMentioned(message, "testbot", 123)).toBe(false);
  });

  test("returns true when bot is mentioned by username", () => {
    const message = { text: "@testbot hello", entities: [{ type: "mention", offset: 0, length: 8 }] } as Message;
    expect(isBotMentioned(message, "testbot", 123)).toBe(true);
  });

  test("returns false when other user is mentioned", () => {
    const message = { text: "@john hello", entities: [{ type: "mention", offset: 0, length: 5 }] } as Message;
    expect(isBotMentioned(message, "testbot", 123)).toBe(false);
  });

  test("returns true when bot is mentioned among multiple mentions", () => {
    const message = {
      text: "@john @testbot @alice",
      entities: [
        { type: "mention", offset: 0, length: 5 },
        { type: "mention", offset: 6, length: 8 },
        { type: "mention", offset: 15, length: 6 },
      ],
    } as Message;
    expect(isBotMentioned(message, "testbot", 123)).toBe(true);
  });

  test("returns false when bot is not mentioned among multiple mentions", () => {
    const message = {
      text: "@john @alice",
      entities: [
        { type: "mention", offset: 0, length: 5 },
        { type: "mention", offset: 6, length: 6 },
      ],
    } as Message;
    expect(isBotMentioned(message, "testbot", 123)).toBe(false);
  });

  test("returns true for text_mention with bot user ID", () => {
    const message = {
      text: "Hello bot",
      entities: [{ type: "text_mention", offset: 6, length: 3, user: { id: 123, is_bot: true, first_name: "Bot" } }],
    } as Message;
    expect(isBotMentioned(message, "testbot", 123)).toBe(true);
  });

  test("returns false for text_mention with different user ID", () => {
    const message = {
      text: "Hello user",
      entities: [{ type: "text_mention", offset: 6, length: 4, user: { id: 456, is_bot: false, first_name: "User" } }],
    } as Message;
    expect(isBotMentioned(message, "testbot", 123)).toBe(false);
  });

  test("handles case-insensitive username matching", () => {
    const message = { text: "@TestBot hello", entities: [{ type: "mention", offset: 0, length: 8 }] } as Message;
    expect(isBotMentioned(message, "testbot", 123)).toBe(true);
  });

  test("handles case-insensitive username matching (uppercase bot)", () => {
    const message = { text: "@testbot hello", entities: [{ type: "mention", offset: 0, length: 8 }] } as Message;
    expect(isBotMentioned(message, "TestBot", 123)).toBe(true);
  });

  test("handles caption entities", () => {
    const message = {
      caption: "@testbot check this",
      caption_entities: [{ type: "mention", offset: 0, length: 8 }],
    } as Message;
    expect(isBotMentioned(message, "testbot", 123)).toBe(true);
  });

  test("combines text and caption entities", () => {
    const message = {
      text: "@john",
      entities: [{ type: "mention", offset: 0, length: 5 }],
      caption: "@testbot",
      caption_entities: [{ type: "mention", offset: 0, length: 8 }],
    } as Message;
    expect(isBotMentioned(message, "testbot", 123)).toBe(true);
  });

  test("works with only botUsername when text_mention exists", () => {
    const message = {
      text: "Hello bot",
      entities: [{ type: "text_mention", offset: 6, length: 3, user: { id: 123, is_bot: true, first_name: "Bot" } }],
    } as Message;
    expect(isBotMentioned(message, "testbot")).toBe(false);
  });

  test("works with only botUserId when mention exists", () => {
    const message = { text: "@testbot hello", entities: [{ type: "mention", offset: 0, length: 8 }] } as Message;
    expect(isBotMentioned(message, undefined, 123)).toBe(false);
  });

  test("handles mention in middle of message", () => {
    const message = {
      text: "hey @testbot how are you",
      entities: [{ type: "mention", offset: 4, length: 8 }],
    } as Message;
    expect(isBotMentioned(message, "testbot", 123)).toBe(true);
  });

  test("handles mention at end of message", () => {
    const message = { text: "hello @testbot", entities: [{ type: "mention", offset: 6, length: 8 }] } as Message;
    expect(isBotMentioned(message, "testbot", 123)).toBe(true);
  });
});
