import type { RoomStyle, RoomType } from "@/lib/constants";

export function buildPrompt(roomType: RoomType, roomStyle: RoomStyle): string {
  const friendlyType = roomType.replace(/_/g, " ");
  const friendlyStyle = roomStyle.replace(/_/g, " ");
  return `A ${friendlyStyle} ${friendlyType} interior scene staged for e-commerce with natural lighting, high realism, photo studio quality`;
}
