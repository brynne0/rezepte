import { describe, test, expect } from "vitest";
import {
  effectivePhotoVisibility,
  friendsCanSeePhotos,
} from "./photoVisibility";

describe("effectivePhotoVisibility", () => {
  test.each([
    ["link", "link", "link"],
    ["link", "friends", "friends"],
    ["link", "private", "private"],
    ["friends", "link", "friends"],
    ["friends", "private", "private"],
    ["private", "link", "private"],
    ["link", undefined, "private"],
  ])("recipe %s + photos %s → %s", (recipe, photos, expected) => {
    expect(effectivePhotoVisibility(recipe, photos)).toBe(expected);
  });
});

describe("friendsCanSeePhotos", () => {
  test.each([
    ["link", true],
    ["friends", true],
    ["private", false],
    [undefined, false],
  ])("%s → %s", (value, expected) => {
    expect(friendsCanSeePhotos(value)).toBe(expected);
  });
});
