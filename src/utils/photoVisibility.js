// Narrowest to widest
const LEVELS = ["private", "friends", "link"];

// Photos are never shown more widely than their recipe
export const effectivePhotoVisibility = (recipeVisibility, photoVisibility) =>
  LEVELS[
    Math.min(
      Math.max(LEVELS.indexOf(recipeVisibility), 0),
      Math.max(LEVELS.indexOf(photoVisibility), 0)
    )
  ];

export const friendsCanSeePhotos = (photoVisibility) =>
  photoVisibility === "friends" || photoVisibility === "link";
