export const ROOM_TYPES = [
  "living_room",
  "bedroom",
  "dining_room",
  "patio",
  "entryway",
  "nursery"
] as const;

export type RoomType = (typeof ROOM_TYPES)[number];

export const ROOM_STYLES = [
  "modern",
  "contemporary",
  "boho",
  "coastal",
  "industrial",
  "farmhouse",
  "luxury"
] as const;

export type RoomStyle = (typeof ROOM_STYLES)[number];

export const MAX_FILE_SIZE_MB = 15;
export const PREVIEW_SIZE_PX = 1024;
export const EXPORT_SIZE_PX = 2048;
