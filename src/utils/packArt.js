export const PACK_ART_BY_SET = {
  fin: '/pack-art/fin-play-booster.png',
  dft: '/pack-art/dft-play-booster.png',
  fdn: '/pack-art/fdn-play-booster.png',
  blb: '/pack-art/blb-play-booster.png',
  mh3: '/pack-art/mh3-play-booster.png',
};

export function getPackArtForSet(setCode) {
  return PACK_ART_BY_SET[setCode?.toLowerCase()] || null;
}
