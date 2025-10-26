import { ROOM_STYLES, ROOM_TYPES, type RoomStyle, type RoomType } from "@/lib/constants";

export function isRoomType(value: string): value is RoomType {
  return (ROOM_TYPES as readonly string[]).includes(value);
}

export function isRoomStyle(value: string): value is RoomStyle {
  return (ROOM_STYLES as readonly string[]).includes(value);
}

export function assertEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is not configured`);
  }
  return value;
}
