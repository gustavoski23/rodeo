'use client';
function faceToTurnedPages(face, totalPages) {
  const maxFace = Math.max(0, totalPages * 2 - 1);
  const clamped = Math.max(0, Math.min(face, maxFace));
  return Math.min(totalPages, Math.ceil(clamped / 2));
}
function turnedPagesToFace(turned) {
  return Math.max(0, 2 * turned - 1);
}

export { faceToTurnedPages, turnedPagesToFace };
